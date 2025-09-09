import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

export interface WhatsAppMessage {
  id: string;
  conteudo: string;
  tipo: 'TEXTO' | 'IMAGEM' | 'VIDEO' | 'AUDIO' | 'DESCONHECIDO';
  remetente: 'CLIENTE' | 'ATENDENTE' | 'DESCONHECID CLIENTE';
  timestamp: string;
  lida: boolean;
  media_url?: string;
  media_mime?: string;
}

export interface WhatsAppConversation {
  chat_id: string;
  owner_id: string;
  atendimento_id: string;
  numero_cliente: string;
  nome_cliente: string;
  status: string;
  data_inicio: string;
  ultima_mensagem: string;
  messages: WhatsAppMessage[];
  unread_count: number;
  last_message: {
    conteudo: string;
    tipo: string;
    remetente: string;
    timestamp: string;
    lida: boolean;
  } | null;
}

interface WhatsAppConversationsContextType {
  // Estado
  conversations: WhatsAppConversation[];
  activeConversation: WhatsAppConversation | null;
  messages: WhatsAppMessage[];
  loading: boolean;
  error: string | null;
  socket: Socket | null;
  connected: boolean;
  
  // Ações
  loadConversations: (userId: string) => Promise<void>;
  loadMessages: (chatId: string, userId: string) => Promise<void>;
  sendMessage: (chatId: string, conteudo: string, tipo?: string) => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
  setActiveConversation: (conversation: WhatsAppConversation | null) => void;
  joinConversation: (chatId: string) => void;
  leaveConversation: (chatId: string) => void;
  
  // Socket events
  connectSocket: (userId: string) => void;
  disconnectSocket: () => void;
}

const WhatsAppConversationsContext = createContext<WhatsAppConversationsContextType | undefined>(undefined);

interface WhatsAppConversationsProviderProps {
  children: ReactNode;
}

export const WhatsAppConversationsProvider: React.FC<WhatsAppConversationsProviderProps> = ({ children }) => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Conectar ao Socket.IO
  const connectSocket = (userId: string) => {
    if (socket) {
      socket.disconnect();
    }

    const newSocket = io('http://localhost:3002', {
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      console.log('🔌 Conectado ao WhatsApp Realtime');
      setConnected(true);
      
      // Entrar como usuário
      newSocket.emit('join', { userId });
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Desconectado do WhatsApp Realtime');
      setConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log('✅ Autenticado no sistema:', data);
    });

    newSocket.on('conversation_joined', (data) => {
      console.log('💬 Entrou na conversa:', data);
    });

    newSocket.on('new_message', (data) => {
      console.log('📨 Nova mensagem recebida:', data);
      
      if (data.success && data.data) {
        const newMessage = data.data;
        
        // Atualizar mensagens da conversa ativa
        if (activeConversation && newMessage.chat_id === activeConversation.chat_id) {
          setMessages(prev => [...prev, newMessage]);
        }
        
        // Atualizar lista de conversas
        setConversations(prev => 
          prev.map(conv => {
            if (conv.chat_id === newMessage.chat_id) {
              return {
                ...conv,
                last_message: {
                  conteudo: newMessage.conteudo,
                  tipo: newMessage.tipo,
                  remetente: newMessage.remetente,
                  timestamp: newMessage.timestamp,
                  lida: newMessage.lida
                },
                unread_count: newMessage.remetente === 'CLIENTE' && !newMessage.lida 
                  ? conv.unread_count + 1 
                  : conv.unread_count
              };
            }
            return conv;
          })
        );
      }
    });

    newSocket.on('conversation_updated', (data) => {
      console.log('🔄 Conversa atualizada:', data);
      
      setConversations(prev => 
        prev.map(conv => {
          if (conv.chat_id === data.chatId) {
            return {
              ...conv,
              last_message: data.lastMessage,
              unread_count: data.lastMessage.remetente === 'CLIENTE' && !data.lastMessage.lida 
                ? conv.unread_count + 1 
                : conv.unread_count
            };
          }
          return conv;
        })
      );
    });

    newSocket.on('messages_read', (data) => {
      console.log('✅ Mensagens marcadas como lidas:', data);
      
      if (activeConversation && data.chatId === activeConversation.chat_id) {
        setMessages(prev => 
          prev.map(msg => ({ ...msg, lida: true }))
        );
      }
    });

    newSocket.on('message_error', (data) => {
      console.error('❌ Erro na mensagem:', data);
      setError(data.error || 'Erro ao enviar mensagem');
    });

    newSocket.on('read_error', (data) => {
      console.error('❌ Erro ao marcar como lida:', data);
      setError(data.error || 'Erro ao marcar mensagens como lidas');
    });

    setSocket(newSocket);
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  };

  // Carregar conversas
  const loadConversations = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:3001/api/whatsapp/conversations?owner_id=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.data);
      } else {
        setError(data.error || 'Erro ao carregar conversas');
      }
    } catch (err) {
      setError('Erro ao carregar conversas');
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar mensagens de uma conversa
  const loadMessages = async (chatId: string, userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:3001/api/whatsapp/conversations/${chatId}/messages?owner_id=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.data);
      } else {
        setError(data.error || 'Erro ao carregar mensagens');
      }
    } catch (err) {
      setError('Erro ao carregar mensagens');
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setLoading(false);
    }
  };

  // Enviar mensagem
  const sendMessage = async (chatId: string, conteudo: string, tipo: string = 'TEXTO') => {
    if (!socket || !connected) {
      setError('Não conectado ao sistema de tempo real');
      return;
    }

    try {
      socket.emit('send_message', {
        chatId,
        userId: activeConversation?.owner_id,
        conteudo,
        tipo
      });
    } catch (err) {
      setError('Erro ao enviar mensagem');
      console.error('Erro ao enviar mensagem:', err);
    }
  };

  // Marcar mensagens como lidas
  const markAsRead = async (chatId: string) => {
    if (!socket || !connected) {
      return;
    }

    try {
      socket.emit('mark_as_read', {
        chatId,
        userId: activeConversation?.owner_id
      });
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  };

  // Entrar em uma conversa
  const joinConversation = (chatId: string) => {
    if (socket && connected) {
      socket.emit('join_conversation', { chatId, userId: activeConversation?.owner_id });
    }
  };

  // Sair de uma conversa
  const leaveConversation = (chatId: string) => {
    if (socket && connected) {
      socket.emit('leave_conversation', { chatId });
    }
  };

  // Limpar erro
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  const value: WhatsAppConversationsContextType = {
    conversations,
    activeConversation,
    messages,
    loading,
    error,
    socket,
    connected,
    loadConversations,
    loadMessages,
    sendMessage,
    markAsRead,
    setActiveConversation,
    joinConversation,
    leaveConversation,
    connectSocket,
    disconnectSocket
  };

  return (
    <WhatsAppConversationsContext.Provider value={value}>
      {children}
    </WhatsAppConversationsContext.Provider>
  );
};

export const useWhatsAppConversations = () => {
  const context = useContext(WhatsAppConversationsContext);
  if (context === undefined) {
    throw new Error('useWhatsAppConversations must be used within a WhatsAppConversationsProvider');
  }
  return context;
};
