"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { createClient } from "@supabase/supabase-js";

// 🔧 Adjust these imports to your project:
import { useConnections } from "@/contexts/ConnectionsContext";

// If you already have a configured Supabase client, import it instead of creating here.
// Example: import { supabase } from "@/lib/supabase"
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nrbsocawokmihvxfcpso.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yYnNvY2F3b2ttaWh2eGZjcHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzQwNTMsImV4cCI6MjA3MjA1MDA1M30.3SxEVRNNBHhAXgJ7S2BMHm1QWq9kxYamuLjvZm0_OU0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Socket / API base
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL?.trim() || "http://localhost:3000";
const API_URL =
  import.meta.env.VITE_API_URL?.trim() || SOCKET_URL;

/* ============================
   Types
============================ */
export type WhatsAppMessage = {
  id?: string;
  message_id?: string;
  owner_id?: string;
  connection_id?: string;
  connection_phone?: string;
  chat_id: string;                 // e.g. 55999...@s.whatsapp.net
  phone_number?: string;           // e.g. 55999...
  conteudo?: string;
  message_type?: string;           // TEXTO, IMAGEM, VIDEO, etc.
  media_type?: string;
  media_url?: string;
  media_mime?: string;
  duration_ms?: number;
  remetente?: "CLIENTE" | "OPERADOR" | "AI";
  status?: string;                 // AGUARDANDO, ATENDIDO, AI...
  lida?: boolean;
  timestamp: string | Date;
};

export type RawConversation = {
  id?: string;
  owner_id?: string;
  connection_id?: string;
  connection_phone?: string;
  chat_id: string;
  nome_cliente?: string;
  numero_cliente: string;
  status?: string;

  // Either snake or camel may appear from your API:
  last_message?: WhatsAppMessage | null;
  lastMessage?: WhatsAppMessage | null;
  lastMessageAt?: string;
  unread?: number;
  unread_count?: number;

  // Optional server side aggregation:
  total_messages?: number;

  // (Optional) embedded messages if your API returns them
  messages?: WhatsAppMessage[];
};

export type Conversation = {
  id: string;
  owner_id?: string;
  connection_id?: string;
  connection_phone?: string;
  chat_id: string;
  nome_cliente: string;
  numero_cliente: string;
  status?: string;
  lastMessageAt?: string;
  lastMessage?: WhatsAppMessage | null;
  unread: number;
  total_messages?: number;
  messages?: WhatsAppMessage[];
};

type HookReturn = {
  conversations: Conversation[];
  messages: WhatsAppMessage[];
  activeConversation: Conversation | null;
  setActiveConversation: (c: Conversation | null) => void;

  loading: boolean;
  error: string | null;
  connected: boolean;

  connectSocket: (ownerId: string) => void;
  disconnectSocket: () => void;

  loadConversations: (ownerId: string) => Promise<void>;
  loadMessages: (chatId: string, ownerId: string) => Promise<void>;

  joinConversation: (chatId: string) => void;
  leaveConversation: (chatId: string) => void;

  markAsRead: (chatId: string) => void;
  sendMessage: (text: string, type?: "TEXTO" | string, extra?: Record<string, any>) => Promise<void>;
};

/* ============================
   Helpers
============================ */
function normalizeConversation(raw: RawConversation): Conversation {
  const lastMsg = (raw.last_message ?? raw.lastMessage) || null;
  const lastAt =
    (raw as any).last_message?.timestamp ||
    (raw as any).lastMessageAt ||
    (lastMsg?.timestamp as string | undefined);

  return {
    id: raw.id ?? raw.chat_id,
    owner_id: raw.owner_id,
    connection_id: raw.connection_id,
    connection_phone: raw.connection_phone,
    chat_id: raw.chat_id,
    nome_cliente: raw.nome_cliente || raw.numero_cliente || "Contato",
    numero_cliente: raw.numero_cliente,
    status: raw.status,
    lastMessageAt: lastAt ? String(lastAt) : undefined,
    lastMessage: lastMsg || null,
    unread:
      typeof raw.unread_count === "number"
        ? raw.unread_count
        : typeof raw.unread === "number"
        ? raw.unread
        : 0,
    total_messages: raw.total_messages,
    messages: raw.messages || [],
  };
}

function uniqById<T extends { id?: string; message_id?: string }>(arr: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of arr) {
    const k = (it.id || it.message_id || JSON.stringify(it)) as string;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(it);
    }
  }
  return out;
}

/* ============================
   Hook
============================ */
export function useWhatsAppConversations(): HookReturn {
  const { activeConnection } = useConnections(); // must provide id + phoneNumber on that context
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const joinedRoomRef = useRef<string | null>(null);

  /* ---------- Socket ---------- */
  const connectSocket = useCallback((ownerId: string) => {
    // Avoid multiple instances
    if (socketRef.current) return;

    const s = io(SOCKET_URL, {
      transports: ["websocket"],
      path: "/socket.io", // adjust if custom
      auth: { ownerId },
    });

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    // Server emits when a conversation changes (new msg, status change...)
    s.on("conversation:updated", (payload: any) => {
      setConversations(prev => {
        // Try to merge by chat_id
        const idx = prev.findIndex(c => c.chat_id === payload.conversationId || c.chat_id === payload.chat_id);
        if (idx === -1) return prev;
        const copy = prev.slice();
        const target = copy[idx];

        const lastMessageAt = payload.lastMessageAt || payload.last_message?.timestamp || target.lastMessageAt;
        const lastMessage = payload.last_message || target.lastMessage;
        const unread =
          typeof payload.unread_count === "number"
            ? payload.unread_count
            : typeof payload.unread === "number"
            ? payload.unread
            : target.unread;

        copy[idx] = {
          ...target,
          lastMessageAt,
          lastMessage,
          unread,
        };
        return copy;
      });
    });

    // New message for a specific room
    s.on("newMessage", (m: WhatsAppMessage) => {
      // Append to messages if it belongs to current conversation
      if (activeConversation?.chat_id && m.chat_id === activeConversation.chat_id) {
        setMessages(prev => uniqById([...prev, m]));
      }
      // Also update preview in the conversations list
      setConversations(prev =>
        prev.map(c =>
          c.chat_id === m.chat_id
            ? {
                ...c,
                lastMessage: m,
                lastMessageAt: String(m.timestamp),
                unread:
                  m.remetente === "CLIENTE" && !m.lida ? (Number(c.unread) || 0) + 1 : c.unread,
              }
            : c
        )
      );
    });

    socketRef.current = s;
  }, [activeConversation?.chat_id]);

  const disconnectSocket = useCallback(() => {
    try {
      socketRef.current?.disconnect();
    } finally {
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  const joinConversation = useCallback((chatId: string) => {
    if (!socketRef.current || !activeConnection?.id) return;
    const room = `${activeConnection.id}-${chatId}`;
    if (joinedRoomRef.current === room) return;

    // Leave previous room
    if (joinedRoomRef.current) {
      socketRef.current.emit("leave", { room: joinedRoomRef.current });
    }

    socketRef.current.emit("join", {
      connectionId: activeConnection.id,
      conversationId: chatId,
    });

    joinedRoomRef.current = room;
  }, [activeConnection?.id]);

  const leaveConversation = useCallback((chatId: string) => {
    if (!socketRef.current || !activeConnection?.id) return;
    const room = `${activeConnection.id}-${chatId}`;
    socketRef.current.emit("leave", { room });
    if (joinedRoomRef.current === room) {
      joinedRoomRef.current = null;
    }
  }, [activeConnection?.id]);

  /* ---------- Data loaders ---------- */

  /**
   * Load conversations from your backend or directly from Supabase.
   * - Filters by owner and active connection.
   * - If zero rows by connection_id, it retries by connection_phone (fallback).
   */
  const loadConversations = useCallback(
    async (ownerId: string) => {
      if (!activeConnection?.id) return;

      setLoading(true);
      setError(null);

      try {
        // Prefer your REST if you have aggregation (last message, unread counts, etc.)
        // Example route (adjust to your API):
        // const res = await fetch(
        //   `${API_URL}/api/whatsapp/conversations?ownerId=${ownerId}&connectionId=${activeConnection.id}`
        // );
        // if (!res.ok) throw new Error(await res.text());
        // const payload: RawConversation[] = await res.json();

        // Direct Supabase fallback with minimal aggregation:
        let { data: rows, error: err } = await supabase
          .from("whatsapp_mensagens")
          .select("*")
          .eq("owner_id", ownerId)
          .eq("connection_id", activeConnection.id)
          .order("timestamp", { ascending: true });

        if (err) throw err;

        // Fallback by connection_phone when IDs diverge
        if (!rows || rows.length === 0 && activeConnection.phoneNumber) {
          const byPhone = await supabase
            .from("whatsapp_mensagens")
            .select("*")
            .eq("owner_id", ownerId)
            .eq("connection_phone", activeConnection.phoneNumber)
            .order("timestamp", { ascending: true });

          if (byPhone.error) throw byPhone.error;
          rows = byPhone.data || [];
        }

        // Group by chat_id → build conversation previews
        const map = new Map<string, RawConversation>();
        for (const r of rows || []) {
          const key = r.chat_id;
          const current = map.get(key);
          if (!current) {
            map.set(key, {
              chat_id: r.chat_id,
              owner_id: r.owner_id,
              connection_id: r.connection_id,
              connection_phone: (r as any).connection_phone,
              numero_cliente: (r as any).phone_number || r.chat_id?.split("@")[0] || "",
              nome_cliente: (r as any).nome_cliente || "",
              status: r.status,
              last_message: r as any,
              lastMessageAt: String(r.timestamp),
              unread_count: (!r.lida && r.remetente === "CLIENTE") ? 1 : 0,
              total_messages: 1,
            });
          } else {
            // update last message & counters
            const lastTs = new Date(current.lastMessageAt || 0).getTime();
            const rowTs = new Date(r.timestamp as any).getTime();
            if (rowTs >= lastTs) {
              current.last_message = r as any;
              current.lastMessageAt = String(r.timestamp);
            }
            current.total_messages = (current.total_messages || 0) + 1;
            if (!r.lida && r.remetente === "CLIENTE") {
              current.unread_count = (current.unread_count || 0) + 1;
            }
          }
        }

        const list = Array.from(map.values()).map(normalizeConversation);
        // Newest first
        list.sort((a, b) => {
          const A = new Date(a.lastMessageAt || 0).getTime();
          const B = new Date(b.lastMessageAt || 0).getTime();
          return B - A;
        });

        setConversations(list);
      } catch (e: any) {
        console.error("[loadConversations] error:", e);
        setError(e?.message || "Erro ao carregar conversas");
      } finally {
        setLoading(false);
      }
    },
    [activeConnection?.id, activeConnection?.phoneNumber]
  );

  /**
   * Load messages for a conversation (history).
   */
  const loadMessages = useCallback(
    async (chatId: string, ownerId: string) => {
      if (!chatId) return;
      setLoading(true);
      setError(null);
      try {
        // Optionally use your REST:
        // const res = await fetch(`${API_URL}/api/whatsapp/messages?chatId=${chatId}&ownerId=${ownerId}`);
        // if (!res.ok) throw new Error(await res.text());
        // const data: WhatsAppMessage[] = await res.json();

        const { data, error: err } = await supabase
          .from("whatsapp_mensagens")
          .select("*")
          .eq("owner_id", ownerId)
          .eq("chat_id", chatId)
          .order("timestamp", { ascending: true });

        if (err) throw err;

        setMessages(uniqById(data || []));
      } catch (e: any) {
        console.error("[loadMessages] error:", e);
        setError(e?.message || "Erro ao carregar mensagens");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /* ---------- Actions ---------- */

  const markAsRead = useCallback((chatId: string) => {
    // Let the server update read state, & optionally update UI optimistically
    try {
      socketRef.current?.emit("conversation:markAsRead", {
        connectionId: activeConnection?.id,
        conversationId: chatId,
      });

      // Optimistic UI
      setConversations(prev =>
        prev.map(c => (c.chat_id === chatId ? { ...c, unread: 0 } : c))
      );
    } catch (e) {
      // no-op
    }
  }, [activeConnection?.id]);

  const sendMessage = useCallback(
    async (text: string, type: "TEXTO" | string = "TEXTO", extra: Record<string, any> = {}) => {
      if (!activeConversation?.chat_id || !activeConnection?.id) return;

      // Prefer to call your backend which sends via Baileys and persists to Supabase
      // Example route:
      // await fetch(`${API_URL}/api/whatsapp/send`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     connectionId: activeConnection.id,
      //     chatId: activeConversation.chat_id,
      //     type,
      //     text,
      //     ...extra
      //   }),
      // });

      // Optimistic UI insert (so the bubble shows instantly)
      const now = new Date().toISOString();
      const optimistic: WhatsAppMessage = {
        id: `opt-${Date.now()}`,
        chat_id: activeConversation.chat_id,
        owner_id: activeConversation.owner_id,
        connection_id: activeConversation.connection_id,
        conteudo: text,
        message_type: type,
        remetente: "OPERADOR",
        lida: true,
        timestamp: now,
      };

      setMessages(prev => [...prev, optimistic]);
      setConversations(prev =>
        prev.map(c =>
          c.chat_id === activeConversation.chat_id
            ? { ...c, lastMessage: optimistic, lastMessageAt: now }
            : c
        )
      );

      // If your server echoes via socket, you can skip this:
      await supabase.from("whatsapp_mensagens").insert({
        owner_id: activeConversation.owner_id,
        connection_id: activeConnection.id,
        chat_id: activeConversation.chat_id,
        phone_number: activeConversation.numero_cliente,
        connection_phone: activeConversation.connection_phone,
        conteudo: text,
        message_type: type,
        remetente: "OPERADOR",
        lida: true,
        timestamp: now,
        ...extra,
      });
    },
    [activeConversation, activeConnection?.id]
  );

  /* ---------- Memo ---------- */
  const value = useMemo(
    () => ({
      conversations,
      messages,
      activeConversation,
      setActiveConversation,
      loading,
      error,
      connected,

      connectSocket,
      disconnectSocket,

      loadConversations,
      loadMessages,

      joinConversation,
      leaveConversation,

      markAsRead,
      sendMessage,
    }),
    [
      conversations,
      messages,
      activeConversation,
      loading,
      error,
      connected,
      connectSocket,
      disconnectSocket,
      loadConversations,
      loadMessages,
      joinConversation,
      leaveConversation,
      markAsRead,
      sendMessage,
    ]
  );

  return value;
}
