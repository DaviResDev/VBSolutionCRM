"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import { io, Socket } from 'socket.io-client';

const supabaseUrl = 'https://nrbsocawokmihvxfcpso.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yYnNvY2F3b2ttaWh2eGZjcHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzQwNTMsImV4cCI6MjA3MjA1MDA1M30.3SxEVRNNBHhAXgJ7S2BMHm1QWq9kxYamuLjvZm0_OU0';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface WhatsAppMessage {
  id: string;
  conteudo: string;
  message_type: string;
  media_type?: string;
  status: 'AGUARDANDO' | 'ATENDIDO' | 'AI';
  remetente: 'CLIENTE' | 'OPERADOR' | 'AI';
  chat_id: string;
  phone_number?: string;
  connection_id?: string;
  connection_phone?: string;
  timestamp: string;
  lida: boolean;
  media_url?: string;
  media_mime?: string;
  message_id?: string;
  duration_ms?: number;
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
  messages: WhatsAppMessage[];
}

interface WhatsAppConversationsContextType {
  conversations: WhatsAppConversation[];
  loading: boolean;
  error: string | null;
  selectedConversation: string | null;
  selectedMessages: WhatsAppMessage[];
  setSelectedConversation: (conversationId: string | null) => void;
  setActiveConversation: (conversation: WhatsAppConversation | null) => void;
  sendMessage: (content: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  // Adicionar propriedades que estão sendo usadas na página
  messages: WhatsAppMessage[];
  activeConversation: WhatsAppConversation | null;
  connected: boolean;
  connectSocket: (ownerId: string) => void;
  disconnectSocket: () => void;
  loadConversations: (ownerId: string) => Promise<void>;
  loadMessages: (chatId: string, ownerId: string) => Promise<void>;
  joinConversation: (chatId: string) => void;
  leaveConversation: (chatId: string) => void;
}

const WhatsAppConversationsContext = createContext<WhatsAppConversationsContextType | undefined>(undefined);

interface WhatsAppConversationsProviderProps {
  children: ReactNode;
  connectionId?: string;
}

export function WhatsAppConversationsProvider({ children, connectionId }: WhatsAppConversationsProviderProps) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Obter mensagens da conversa selecionada
  const selectedMessages = conversations.find(conv => conv.chat_id === selectedConversation)?.messages || [];

  // Conectar ao Socket.IO para atualizações em tempo real
  useEffect(() => {
    if (connectionId) {
      console.log('🔌 Conectando ao Socket.IO para connectionId:', connectionId);
      const newSocket = io('http://localhost:3000');
      setSocket(newSocket);

      // Entrar na sala da conexão
      newSocket.emit('joinConnection', { connectionId });

      // Escutar novas mensagens
      newSocket.on('newMessage', (message: WhatsAppMessage) => {
        console.log('📨 Nova mensagem recebida via Socket.IO:', message);
        setConversations(prev => {
          const existingConv = prev.find(conv => conv.chat_id === message.chat_id);
          if (existingConv) {
            // Atualizar conversa existente
            return prev.map(conv => 
              conv.chat_id === message.chat_id 
                ? {
                    ...conv,
                    messages: [message, ...conv.messages],
                    lastMessage: message,
                    lastMessageAt: message.timestamp,
                    unread: message.remetente === 'CLIENTE' && !message.lida 
                      ? conv.unread + 1 
                      : conv.unread,
                    status: message.status
                  }
                : conv
            );
          } else {
            // Criar nova conversa
            const phoneNumber = message.chat_id.split('@')[0];
            const newConversation: WhatsAppConversation = {
              id: message.chat_id,
              chat_id: message.chat_id,
              nome_cliente: `Cliente ${phoneNumber}`,
              numero_cliente: phoneNumber,
              lastMessage: message,
              lastMessageAt: message.timestamp,
              unread: message.remetente === 'CLIENTE' && !message.lida ? 1 : 0,
              status: message.status,
              messages: [message]
            };
            return [newConversation, ...prev];
          }
        });
      });

      // Escutar atualizações de conversa
      newSocket.on('conversation:updated', (data) => {
        console.log('🔄 Conversa atualizada:', data);
        setConversations(prev => 
          prev.map(conv => 
            conv.chat_id === data.conversationId 
              ? {
                  ...conv,
                  lastMessageAt: data.lastMessageAt,
                  lastMessage: {
                    ...conv.lastMessage!,
                    conteudo: data.preview,
                    timestamp: data.lastMessageAt
                  }
                }
              : conv
          )
        );
      });

      return () => {
        console.log('🔌 Desconectando Socket.IO');
        newSocket.disconnect();
      };
    }
  }, [connectionId]);

  // Carregar conversas do Supabase
  const loadConversationsInternal = useCallback(async () => {
    if (!connectionId) {
      console.log('⚠️ connectionId não fornecido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Carregando conversas para connectionId:', connectionId);
      
      const { data: messages, error: messagesError } = await supabase
        .from('whatsapp_mensagens')
        .select('*')
        .eq('connection_id', connectionId)
        .order('timestamp', { ascending: false });

      if (messagesError) {
        console.error('❌ Erro ao buscar mensagens:', messagesError);
        throw messagesError;
      }

      console.log('📨 Mensagens encontradas:', messages?.length || 0);

      // Agrupar mensagens por chat_id
      const conversationMap = new Map<string, WhatsAppConversation>();

      messages?.forEach((message: any) => {
        const chatId = message.chat_id;
        
        if (!conversationMap.has(chatId)) {
          const phoneNumber = chatId.split('@')[0];
          
          conversationMap.set(chatId, {
            id: chatId,
            chat_id: chatId,
            nome_cliente: `Cliente ${phoneNumber}`,
            numero_cliente: phoneNumber,
            lastMessage: null,
            lastMessageAt: new Date().toISOString(),
            unread: 0,
            status: 'AGUARDANDO',
            messages: []
          });
        }

        const conversation = conversationMap.get(chatId)!;
        conversation.messages.push(message);
        
        // Atualizar contadores
        if (message.remetente === 'CLIENTE' && !message.lida) {
          conversation.unread++;
        }
        
        // Atualizar última mensagem
        if (!conversation.lastMessage || new Date(message.timestamp) > new Date(conversation.lastMessageAt)) {
          conversation.lastMessage = message;
          conversation.lastMessageAt = message.timestamp;
          conversation.status = message.status;
        }
      });

      // Converter para array e ordenar
      const conversationsList = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

      console.log('💬 Conversas carregadas:', conversationsList.length);
      setConversations(conversationsList);
    } catch (err) {
      console.error('❌ Erro ao carregar conversas:', err);
      setError('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  // Marcar mensagens como lidas
  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      if (!connectionId) return;

      const { error } = await supabase
        .from('whatsapp_mensagens')
        .update({ lida: true })
        .eq('chat_id', conversationId)
        .eq('connection_id', connectionId)
        .eq('remetente', 'CLIENTE');

      if (error) {
        console.error('❌ Erro ao marcar como lida:', error);
        return;
      }

      // Atualizar estado local
      setConversations(prev => 
        prev.map(conv => 
          conv.chat_id === conversationId 
            ? { ...conv, unread: 0 }
            : conv
        )
      );

      console.log('✅ Mensagens marcadas como lidas para:', conversationId);
    } catch (err) {
      console.error('❌ Erro ao marcar como lida:', err);
    }
  }, [connectionId]);

  // Enviar mensagem
  const sendMessage = useCallback(async (content: string) => {
    try {
      if (!connectionId || !selectedConversation) {
        throw new Error('Connection ID ou conversa não selecionada');
      }

      const response = await fetch(`http://localhost:3000/api/baileys-simple/connections/${connectionId}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          type: 'text',
          chatId: selectedConversation
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      const result = await response.json();
      console.log('✅ Mensagem enviada:', result);

      return result;
    } catch (err) {
      console.error('❌ Erro ao enviar mensagem:', err);
      throw err;
    }
  }, [connectionId, selectedConversation]);

  // Funções adicionais necessárias
  const connectSocket = useCallback((ownerId: string) => {
    console.log('🔌 Conectando Socket.IO para ownerId:', ownerId);
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);
    setConnected(true);
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  }, [socket]);

  const loadConversationsWithOwner = useCallback(async (ownerId: string) => {
    if (!connectionId) return;
    await loadConversationsInternal();
  }, [connectionId, loadConversationsInternal]);

  const loadMessages = useCallback(async (chatId: string, ownerId: string) => {
    const conversation = conversations.find(conv => conv.chat_id === chatId);
    if (conversation) {
      setMessages(conversation.messages);
    }
  }, [conversations]);

  const joinConversation = useCallback((chatId: string) => {
    if (socket) {
      socket.emit('joinConversation', { chatId });
    }
  }, [socket]);

  const leaveConversation = useCallback((chatId: string) => {
    if (socket) {
      socket.emit('leaveConversation', { chatId });
    }
  }, [socket]);

  // Carregar conversas quando connectionId mudar
  useEffect(() => {
    if (connectionId) {
      loadConversationsInternal();
    }
  }, [connectionId, loadConversationsInternal]);

  // Marcar como lida quando conversa for selecionada
  useEffect(() => {
    if (selectedConversation) {
      markAsRead(selectedConversation);
    }
  }, [selectedConversation, markAsRead]);

  const value: WhatsAppConversationsContextType = {
    conversations,
    loading,
    error,
    selectedConversation,
    selectedMessages,
    setSelectedConversation,
    setActiveConversation,
    sendMessage,
    markAsRead,
    refreshConversations: loadConversationsInternal,
    messages,
    activeConversation,
    connected,
    connectSocket,
    disconnectSocket,
    loadConversations: loadConversationsWithOwner,
    loadMessages,
    joinConversation,
    leaveConversation
  };

  return (
    <WhatsAppConversationsContext.Provider value={value}>
      {children}
    </WhatsAppConversationsContext.Provider>
  );
}

export function useWhatsAppConversations() {
  const context = useContext(WhatsAppConversationsContext);
  if (context === undefined) {
    throw new Error('useWhatsAppConversations deve ser usado dentro de WhatsAppConversationsProvider');
  }
  return context;
}