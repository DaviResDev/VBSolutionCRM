import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface WhatsAppV2Message {
  id: string;
  atendimento_id: string;
  chat_id: string;
  conteudo: string;
  tipo: 'TEXTO' | 'IMAGEM' | 'AUDIO' | 'VIDEO' | 'DOCUMENTO' | 'LOCALIZACAO' | 'STICKER' | 'CONTATO';
  remetente: 'CLIENTE' | 'ATENDENTE';
  timestamp: string;
  lida: boolean;
  media_url?: string;
  media_mime?: string;
  duration_ms?: number;
  raw?: string;
  created_at: string;
}

export function useWhatsAppV2Messages(atendimentoId: string, ownerId: string) {
  const [messages, setMessages] = useState<WhatsAppV2Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  const loadMessages = useCallback(async () => {
    if (!atendimentoId || !ownerId) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data, error: messagesError } = await supabase
        .from('whatsapp_mensagens')
        .select(`
          id,
          atendimento_id,
          chat_id,
          conteudo,
          tipo,
          remetente,
          timestamp,
          lida,
          media_url,
          media_mime,
          duration_ms,
          raw,
          created_at
        `)
        .eq('atendimento_id', atendimentoId)
        .eq('owner_id', ownerId)
        .order('timestamp', { ascending: true })
        .limit(100);

      if (messagesError) {
        throw new Error(`Erro ao buscar mensagens: ${messagesError.message}`);
      }

      setMessages(data || []);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [atendimentoId, ownerId]);

  const sendMessage = useCallback(async (
    conteudo: string,
    tipo: WhatsAppV2Message['tipo'] = 'TEXTO',
    mediaUrl?: string,
    mediaMime?: string,
    durationMs?: number,
    raw?: string
  ) => {
    if (!atendimentoId || !ownerId) return;

    try {
      const messageData = {
        id: crypto.randomUUID(),
        owner_id: ownerId,
        atendimento_id: atendimentoId,
        chat_id: messages[0]?.chat_id || '', // Usar chat_id da primeira mensagem
        conteudo,
        tipo,
        remetente: 'ATENDENTE' as const,
        timestamp: new Date().toISOString(),
        lida: true,
        media_url: mediaUrl,
        media_mime: mediaMime,
        duration_ms: durationMs,
        raw,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('whatsapp_mensagens')
        .insert(messageData)
        .select();

      if (error) {
        throw new Error(`Erro ao enviar mensagem: ${error.message}`);
      }

      // Adicionar mensagem ao estado local
      if (data && data[0]) {
        setMessages(prev => [...prev, data[0]]);
      }

      return data?.[0];
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      throw err;
    }
  }, [atendimentoId, ownerId, messages]);

  const markAsRead = useCallback(async () => {
    if (!atendimentoId || !ownerId) return;

    try {
      const { error } = await supabase
        .from('whatsapp_mensagens')
        .update({ lida: true })
        .eq('atendimento_id', atendimentoId)
        .eq('owner_id', ownerId)
        .eq('remetente', 'CLIENTE');

      if (error) {
        console.error('Erro ao marcar como lida:', error);
        return;
      }

      // Atualizar estado local
      setMessages(prev => 
        prev.map(msg => 
          msg.remetente === 'CLIENTE' 
            ? { ...msg, lida: true }
            : msg
        )
      );
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  }, [atendimentoId, ownerId]);

  // Configurar realtime para mensagens
  useEffect(() => {
    if (!atendimentoId || !ownerId) return;

    // Limpar subscription anterior
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    // Criar nova subscription
    const channel = supabase
      .channel(`whatsapp-messages-${atendimentoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_mensagens',
          filter: `atendimento_id=eq.${atendimentoId}`
        },
        (payload) => {
          console.log('💬 Nova mensagem via realtime:', payload.new);
          const newMessage = payload.new as WhatsAppV2Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_mensagens',
          filter: `atendimento_id=eq.${atendimentoId}`
        },
        (payload) => {
          console.log('💬 Mensagem atualizada via realtime:', payload.new);
          const updatedMessage = payload.new as WhatsAppV2Message;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          );
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [atendimentoId, ownerId]);

  // Carregar mensagens inicialmente
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Marcar como lida quando o componente é montado
  useEffect(() => {
    if (atendimentoId && ownerId) {
      markAsRead();
    }
  }, [atendimentoId, ownerId, markAsRead]);

  return {
    messages,
    loading,
    error,
    reload: loadMessages,
    sendMessage,
    markAsRead
  };
}
