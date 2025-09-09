import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface WhatsAppV2Conversation {
  id: string;
  numero_cliente: string;
  nome_cliente: string | null;
  status: 'AGUARDANDO' | 'ATENDENDO' | 'ENCERRADO';
  ultima_mensagem: string;
  lastPreview: string | null;
  unread: number;
  prioridade: number;
  canal: string;
  created_at: string;
  updated_at: string;
}

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

export function useWhatsAppV2Conversations(ownerId: string) {
  const [conversations, setConversations] = useState<WhatsAppV2Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  const loadConversations = useCallback(async () => {
    if (!ownerId) return;
    
    setLoading(true);
    setError(null);

    try {
      // Buscar atendimentos (conversas) do usuário
      const { data: atendimentos, error: atendimentosError } = await supabase
        .from('whatsapp_atendimentos')
        .select(`
          id,
          numero_cliente,
          nome_cliente,
          status,
          ultima_mensagem,
          prioridade,
          canal,
          created_at,
          updated_at
        `)
        .eq('owner_id', ownerId)
        .order('ultima_mensagem', { ascending: false })
        .limit(100);

      if (atendimentosError) {
        throw new Error(`Erro ao buscar atendimentos: ${atendimentosError.message}`);
      }

      if (!atendimentos || atendimentos.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Buscar última mensagem e contagem de não lidas para cada atendimento
      const atendimentoIds = atendimentos.map(a => a.id);
      
      const { data: messages, error: messagesError } = await supabase
        .from('whatsapp_mensagens')
        .select(`
          id,
          atendimento_id,
          tipo,
          conteudo,
          timestamp,
          remetente,
          lida,
          duration_ms
        `)
        .in('atendimento_id', atendimentoIds)
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (messagesError) {
        throw new Error(`Erro ao buscar mensagens: ${messagesError.message}`);
      }

      // Processar dados para criar preview e contagem de não lidas
      const lastMessageByAtendimento: Record<string, any> = {};
      const unreadByAtendimento: Record<string, number> = {};

      messages?.forEach(message => {
        const atendimentoId = message.atendimento_id;
        
        // Última mensagem por atendimento
        if (!lastMessageByAtendimento[atendimentoId]) {
          lastMessageByAtendimento[atendimentoId] = message;
        }
        
        // Contar mensagens não lidas do cliente
        if (message.remetente === 'CLIENTE' && !message.lida) {
          unreadByAtendimento[atendimentoId] = (unreadByAtendimento[atendimentoId] || 0) + 1;
        }
      });

      // Montar conversas com preview e contagem
      const conversationsWithPreview = atendimentos.map(atendimento => {
        const lastMessage = lastMessageByAtendimento[atendimento.id];
        const unread = unreadByAtendimento[atendimento.id] || 0;
        
        let lastPreview = null;
        if (lastMessage) {
          switch (lastMessage.tipo) {
            case 'TEXTO':
              lastPreview = lastMessage.conteudo;
              break;
            case 'IMAGEM':
              lastPreview = '📷 Imagem';
              break;
            case 'AUDIO':
              lastPreview = '🎵 Áudio';
              break;
            case 'VIDEO':
              lastPreview = '🎥 Vídeo';
              break;
            case 'DOCUMENTO':
              lastPreview = '📄 Documento';
              break;
            case 'LOCALIZACAO':
              lastPreview = '📍 Localização';
              break;
            case 'STICKER':
              lastPreview = '😀 Sticker';
              break;
            case 'CONTATO':
              lastPreview = '👤 Contato';
              break;
            default:
              lastPreview = 'Mensagem';
          }
        }

        return {
          ...atendimento,
          lastPreview,
          unread
        } as WhatsAppV2Conversation;
      });

      setConversations(conversationsWithPreview);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  const markAsRead = useCallback(async (atendimentoId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_mensagens')
        .update({ lida: true })
        .eq('atendimento_id', atendimentoId)
        .eq('remetente', 'CLIENTE');

      if (error) {
        console.error('Erro ao marcar como lida:', error);
        return;
      }

      // Atualizar estado local
      setConversations(prev => 
        prev.map(conv => 
          conv.id === atendimentoId 
            ? { ...conv, unread: 0 }
            : conv
        )
      );
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  }, []);

  const updateAtendimentoStatus = useCallback(async (
    atendimentoId: string, 
    status: 'AGUARDANDO' | 'ATENDENDO' | 'ENCERRADO',
    atendenteId?: string
  ) => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'ATENDENDO' && atendenteId) {
        updateData.atendente_id = atendenteId;
      }

      if (status === 'ENCERRADO') {
        updateData.data_fim = new Date().toISOString();
      }

      const { error } = await supabase
        .from('whatsapp_atendimentos')
        .update(updateData)
        .eq('id', atendimentoId);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        return;
      }

      // Atualizar estado local
      setConversations(prev => 
        prev.map(conv => 
          conv.id === atendimentoId 
            ? { ...conv, status }
            : conv
        )
      );
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  }, []);

  // Configurar realtime
  useEffect(() => {
    if (!ownerId) return;

    // Limpar subscription anterior
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    // Criar nova subscription
    const channel = supabase
      .channel('whatsapp-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_atendimentos',
          filter: `owner_id=eq.${ownerId}`
        },
        (payload) => {
          console.log('📋 Realtime atendimento update:', payload);
          loadConversations(); // Recarregar conversas
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_mensagens',
          filter: `owner_id=eq.${ownerId}`
        },
        (payload) => {
          console.log('💬 Realtime mensagem update:', payload);
          loadConversations(); // Recarregar conversas para atualizar preview
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [ownerId, loadConversations]);

  // Carregar conversas inicialmente
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    loading,
    error,
    reload: loadConversations,
    markAsRead,
    updateAtendimentoStatus
  };
}
