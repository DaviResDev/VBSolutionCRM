import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nrbsocawokmihvxfcpso.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yYnNvY2F3b2ttaWh2eGZjcHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzQwNTMsImV4cCI6MjA3MjA1MDA1M30.3SxEVRNNBHhAXgJ7S2BMHm1QWq9kxYamuLjvZm0_OU0';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface WhatsAppMessage {
  id: string;
  conteudo: string;
  tipo: string;
  status: 'AGUARDANDO' | 'ATENDIDO' | 'AI';
  remetente: 'CLIENTE' | 'OPERADOR' | 'AI';
  chat_id: string;
  timestamp: string;
  lida: boolean;
  atendimento_id: string;
}

export interface WhatsAppConversation {
  id: string;
  chat_id: string;
  nome_cliente: string;
  numero_cliente: string;
  lastMessage: WhatsAppMessage | null;
  lastMessageAt: string;
  unread: number;
  status: 'AGUARDANDO' | 'ATENDIDO' | 'AI';
}

export function useWhatsAppConversations(connectionId?: string, ownerId?: string) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!connectionId || !ownerId) return;

    setLoading(true);
    setError(null);

    try {
      // Buscar todas as mensagens para esta conexão
      const { data: messages, error: messagesError } = await supabase
        .from('whatsapp_mensagens')
        .select('*')
        .eq('owner_id', ownerId)
        .order('timestamp', { ascending: false });

      if (messagesError) {
        throw messagesError;
      }

      // Agrupar mensagens por chat_id para criar conversas
      const conversationMap = new Map<string, {
        messages: WhatsAppMessage[];
        chat_id: string;
        nome_cliente: string;
        numero_cliente: string;
        unread: number;
        status: 'AGUARDANDO' | 'ATENDIDO' | 'AI';
      }>();

      messages?.forEach((message: WhatsAppMessage) => {
        const chatId = message.chat_id;
        
        if (!conversationMap.has(chatId)) {
          // Extrair número do chat_id (formato: 559285880257@s.whatsapp.net)
          const phoneNumber = chatId.split('@')[0];
          
          conversationMap.set(chatId, {
            messages: [],
            chat_id: chatId,
            nome_cliente: `Cliente ${phoneNumber}`,
            numero_cliente: phoneNumber,
            unread: 0,
            status: 'AGUARDANDO'
          });
        }

        const conversation = conversationMap.get(chatId)!;
        conversation.messages.push(message);
        
        // Contar mensagens não lidas (apenas mensagens de clientes)
        if (message.remetente === 'CLIENTE' && !message.lida) {
          conversation.unread++;
        }
        
        // Atualizar status baseado na última mensagem
        conversation.status = message.status;
      });

      // Converter para array de conversas
      const conversationsList: WhatsAppConversation[] = Array.from(conversationMap.values()).map(conv => ({
        id: conv.chat_id, // Usar chat_id como ID único
        chat_id: conv.chat_id,
        nome_cliente: conv.nome_cliente,
        numero_cliente: conv.numero_cliente,
        lastMessage: conv.messages[0] || null, // Primeira mensagem é a mais recente
        lastMessageAt: conv.messages[0]?.timestamp || new Date().toISOString(),
        unread: conv.unread,
        status: conv.status
      }));

      // Ordenar por última mensagem
      conversationsList.sort((a, b) => 
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );

      setConversations(conversationsList);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
      setError('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, [connectionId, ownerId]);

  const loadMessages = useCallback(async (conversationId: string): Promise<WhatsAppMessage[]> => {
    try {
      const { data: messages, error } = await supabase
        .from('whatsapp_mensagens')
        .select('*')
        .eq('chat_id', conversationId)
        .order('timestamp', { ascending: true });

      if (error) {
        throw error;
      }

      return messages || [];
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      return [];
    }
  }, []);

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await supabase
        .from('whatsapp_mensagens')
        .update({ lida: true })
        .eq('chat_id', conversationId)
        .eq('remetente', 'CLIENTE');

      // Atualizar estado local
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread: 0 }
            : conv
        )
      );
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  }, []);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    try {
      const newMessage: Omit<WhatsAppMessage, 'id'> = {
        conteudo: content,
        tipo: 'TEXTO',
        status: 'ATENDIDO', // Mensagem enviada pelo operador
        remetente: 'OPERADOR',
        chat_id: conversationId,
        timestamp: new Date().toISOString(),
        lida: true,
        atendimento_id: `00000000-0000-0000-0000-${conversationId.split('@')[0].padStart(12, '0')}`
      };

      const { data, error } = await supabase
        .from('whatsapp_mensagens')
        .insert([newMessage])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Atualizar estado local
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                lastMessage: data,
                lastMessageAt: data.timestamp,
                status: 'ATENDIDO'
              }
            : conv
        )
      );

      return data;
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    loading,
    error,
    loadConversations,
    loadMessages,
    markAsRead,
    sendMessage
  };
}