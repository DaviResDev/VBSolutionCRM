import React, { useState, useEffect } from 'react';
import { useWhatsAppConversations } from '@/contexts/WhatsAppConversationsContext';
import WhatsAppConversationsList from '@/components/WhatsAppConversationsList';
import WhatsAppMessageList from '@/components/WhatsAppMessageList';
import WhatsAppMessageInput from '@/components/WhatsAppMessageInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Phone, 
  Settings, 
  Wifi, 
  WifiOff,
  AlertCircle,
  Loader2
} from 'lucide-react';

const OWNER_ID = '95d595b4-3fad-4025-b76e-a54b69c84d2b'; // ID do usuário atual

const WhatsAppPageRealtime: React.FC = () => {
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    loading,
    error,
    connected,
    connectSocket,
    disconnectSocket
  } = useWhatsAppConversations();

  const [selectedConversation, setSelectedConversation] = useState<any>(null);

  useEffect(() => {
    // Conectar ao sistema de tempo real
    connectSocket(OWNER_ID);

    return () => {
      disconnectSocket();
    };
  }, [connectSocket, disconnectSocket]);

  const handleSelectConversation = (conversation: any) => {
    setSelectedConversation(conversation);
    setActiveConversation(conversation);
  };

  const getTotalUnreadCount = () => {
    return conversations.reduce((total, conv) => total + conv.unread_count, 0);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
              <p className="text-sm text-gray-500">Conversas em tempo real</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Status de conexão */}
            <div className="flex items-center gap-2">
              {connected ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <WifiOff className="w-3 h-3" />
                  Desconectado
                </Badge>
              )}
            </div>

            {/* Contador de mensagens não lidas */}
            {getTotalUnreadCount() > 0 && (
              <Badge variant="destructive" className="px-2 py-1">
                {getTotalUnreadCount()} não lidas
              </Badge>
            )}

            {/* Botão de configurações */}
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Lista de Conversas */}
        <div className="w-1/3 border-r border-gray-200 bg-white">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Conversas ({conversations.length})
              </h2>
              {error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-hidden">
              <WhatsAppConversationsList
                userId={OWNER_ID}
                onSelectConversation={handleSelectConversation}
              />
            </div>
          </div>
        </div>

        {/* Main Area - Conversa Ativa */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header da Conversa */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedConversation.nome_cliente}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedConversation.numero_cliente}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={selectedConversation.status === 'AGUARDANDO' ? 'destructive' : 'default'}
                    >
                      {selectedConversation.status}
                    </Badge>
                    {selectedConversation.unread_count > 0 && (
                      <Badge variant="destructive">
                        {selectedConversation.unread_count} não lidas
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de Mensagens */}
              <div className="flex-1 overflow-hidden">
                <WhatsAppMessageList
                  chatId={selectedConversation.chat_id}
                  userId={OWNER_ID}
                />
              </div>

              {/* Input de Mensagem */}
              <WhatsAppMessageInput
                chatId={selectedConversation.chat_id}
                disabled={!connected}
              />
            </>
          ) : (
            /* Estado Vazio */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Selecione uma conversa
                </h3>
                <p className="text-gray-500">
                  Escolha uma conversa da lista para começar a conversar
                </p>
                {!connected && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <WifiOff className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700">
                        Conectando ao sistema de tempo real...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-700">Carregando...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppPageRealtime;
