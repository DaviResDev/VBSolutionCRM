import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Socket } from "socket.io-client";

// Debug logging for observer mode
const isObserverMode = import.meta.env.VITE_FEATURE_WHATSAPP_STRICT_OBSERVE === 'true';

export type ConversationItem = {
  id: string;                 // atendimento.id
  numero_cliente: string;     // remote JID
  nome_cliente?: string | null;
  status?: string | null;
  canal?: string | null;

  // derived:
  lastMessageAt?: string | null;
  lastPreview?: string | null;
  unread?: number;
};

function labelPreview(tipo?: string | null, conteudo?: string | null, duration_ms?: number | null) {
  const t = String(tipo || "").toUpperCase();
  switch (t) {
    case "TEXTO": return (conteudo || "").slice(0, 120);
    case "IMAGEM": return `🖼️ Foto${conteudo ? ": " + conteudo.slice(0,80) : ""}`;
    case "VIDEO": return `🎬 Vídeo${conteudo ? ": " + conteudo.slice(0,80) : ""}`;
    case "AUDIO": return `🎧 Áudio${duration_ms ? " (" + Math.round(duration_ms/1000) + "s)" : ""}`;
    case "STICKER": return "💟 Figurinha";
    case "ARQUIVO": return `📎 Arquivo${conteudo ? ": " + conteudo.slice(0,80) : ""}`;
    case "LOCALIZACAO": return "📍 Localização";
    default: return "Mensagem";
  }
}

export function useWhatsAppConversations(opts: {
  connectionId: string;
  ownerId?: string;               // if you filter by owner
  socket: Socket | null;
}) {
  const { connectionId, ownerId, socket } = opts;
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    // 1) fetch atendimentos (left pane list) - buscar todos se não há connectionId
    let q = supabase.from("whatsapp_atendimentos")
      .select("id, numero_cliente, nome_cliente, status, canal, ultima_mensagem");
    
    // Remover filtro de connection_id pois não existe na tabela
    // if (connectionId) {
    //   q = q.eq("connection_id", connectionId);
    // }
    if (ownerId) q = q.eq("owner_id", ownerId);

    const { data: atds, error: e1 } = await q.order("ultima_mensagem", { ascending: false }).limit(200);
    if (e1) { console.error("atendimentos error", e1); setLoading(false); return; }
    
    // Filtrar apenas conversas reais (excluir grupos e broadcasts)
    const filteredAtds = (atds ?? []).filter(a => 
      a.numero_cliente && 
      a.numero_cliente.endsWith('@s.whatsapp.net') && 
      !a.numero_cliente.includes('status@broadcast') &&
      !a.numero_cliente.includes('@g.us')
    );
    
    const base = filteredAtds.map(a => ({ ...a, lastMessageAt: a.ultima_mensagem, lastPreview: null as string|null, unread: 0 }));

    if (base.length === 0) { setItems([]); setLoading(false); return; }

    const ids = base.map(b => b.id);

    // 2) fetch last messages (one batch; newest first, we'll pick first per atendimento)
    const { data: msgs, error: e2 } = await supabase
      .from("whatsapp_mensagens")
      .select("id, atendimento_id, tipo, conteudo, duration_ms, timestamp, remetente, lida")
      .in("atendimento_id", ids)
      .order("timestamp", { ascending: false })
      .limit(2000); // cap for safety
    if (e2) { console.error("mensagens error", e2); setItems(base); setLoading(false); return; }

    // Build maps: last msg per atendimento, and unread count (CLIENTE & !lida)
    const lastBy: Record<string, any> = {};
    const unreadBy: Record<string, number> = {};
    for (const m of (msgs ?? [])) {
      if (!lastBy[m.atendimento_id]) lastBy[m.atendimento_id] = m;
      if (m.remetente === "CLIENTE" && !m.lida) {
        unreadBy[m.atendimento_id] = (unreadBy[m.atendimento_id] || 0) + 1;
      }
    }

    const merged = base.map(b => {
      const lm = lastBy[b.id];
      return {
        ...b,
        lastMessageAt: lm?.timestamp ?? b.ultima_mensagem,
        lastPreview: lm ? labelPreview(lm.tipo, lm.conteudo, lm.duration_ms) : null,
        unread: unreadBy[b.id] || 0
      };
    });

    // sort by lastMessageAt desc (fallback to created order)
    merged.sort((a,b) => (b.lastMessageAt ? +new Date(b.lastMessageAt) : 0) - (a.lastMessageAt ? +new Date(a.lastMessageAt) : 0));
    
    // Debug logging for observer mode
    if (isObserverMode) {
      console.log('🔄 useWhatsAppConversations: loaded', merged.length, 'conversations');
    }
    
    setItems(merged);
    setLoading(false);
  }, [connectionId, ownerId]);

  useEffect(() => {
    // Carregar conversas mesmo sem connectionId para demonstrar dados existentes
    load();
  }, [load]);

  // live: join connection room & react to conversation:updated
  useEffect(() => {
    if (!socket || !connectionId) return;
    socket.emit("joinConnection", { connectionId });

    const onConv = (p: { connectionId: string; conversationId: string; lastMessageAt: string; preview: string; from: 'CLIENTE'|'ATENDENTE' }) => {
      if (p.connectionId !== connectionId) return;
      setItems(prev => {
        let found = false;
        const next = prev.map(c => {
          if (c.id !== p.conversationId) return c;
          found = true;
          const inc = p.from === 'CLIENTE' ? 1 : 0;
          return {
            ...c,
            lastMessageAt: p.lastMessageAt,
            lastPreview: p.preview,
            unread: (c.unread || 0) + inc
          };
        });
        // If not found (new atendimento), reload list
        return found ? next.sort((a,b) => (b.lastMessageAt ? +new Date(b.lastMessageAt) : 0) - (a.lastMessageAt ? +new Date(a.lastMessageAt) : 0)) : prev;
      });
    };

    socket.on("conversation:updated", onConv);
    const handleConversationRead = (p: { connectionId: string; conversationId: string }) => {
      if (p.connectionId !== connectionId) return;
      setItems(prev => prev.map(c => c.id === p.conversationId ? { ...c, unread: 0 } : c));
    };
    socket.on("conversation:read", handleConversationRead);

    return () => {
      socket.off("conversation:updated", onConv);
      socket.off("conversation:read", handleConversationRead);
    };
  }, [socket, connectionId]);

  // mark as read (persist by flipping lida=true for CLIENTE msgs)
  const markRead = useCallback(async (atendimentoId: string) => {
    // Persist on backend and broadcast to all clients
    await fetch(`http://localhost:3000/api/baileys-simple/atendimentos/${atendimentoId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionId })
    });
    // Optimistic local zero
    setItems(prevItems => prevItems.map(item =>
      item.id === atendimentoId ? { ...item, unread: 0 } : item
    ));
  }, [connectionId]);

  return { items, loading, reload: load, markRead };
}
