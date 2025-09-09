import React, { useState, useEffect } from 'react';
import { useWhatsAppConversations } from '@/contexts/WhatsAppConversationsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Phone, 
  Clock, 
  Check, 
  CheckCheck,
  Image,
  Video,
  Mic,
  FileText,
  AlertCircle
} from 'lucide-react';

interface WhatsAppConversationsListProps {
  userId: string;
  onSelectConversation: (conversation: any) => void;
}

const WhatsAppConversationsList: React.FC<WhatsAppConversationsListProps> = ({
  userId,
  onSelectConversation
}) => {
  const {
    conversations,
    loading,
    error,
    loadConversations,
    connectSocket,
    connected
  } = useWhatsAppConversations();

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (userId) {
      loadConversations(userId);
      connectSocket(userId);
    }
  }, [userId, loadConversations, connectSocket]);

  const getMessageIcon = (tipo: string) => {
    switch (tipo) {
      case 'IMAGEM':
        return <Image className="w-4 h-4" />;
      case 'VIDEO':
        return <Video className="w-4 h-4" />;
      case 'AUDIO':
        return <Mic className="w-4 h-4" />;
      case 'TEXTO':
        return <FileText className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getReadStatus = (message: any) => {
    if (message.remetente === 'ATENDENTE') {
      return message.lida ? (
        <CheckCheck className="w-4 h-4 text-blue-500" />
      ) : (
        <Check className="w-4 h-4 text-gray-400" />
      );
    }
    return null;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // Menos de 1 minuto
      return 'Agora';
    } else if (diff < 3600000) { // Menos de 1 hora
      return `${Math.floor(diff / 60000)}m`;
    } else if (diff < 86400000) { // Menos de 1 dia
      return `${Math.floor(diff / 3600000)}h`;
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.numero_cliente.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando conversas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Conversas WhatsApp</h2>
          <Badge variant={connected ? "default" : "destructive"}>
            {connected ? 'Conectado' : 'Desconectado'}
          </Badge>
        </div>
        <Badge variant="outline">
          {conversations.length} conversas
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar conversas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Conversations List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <Card
              key={conversation.chat_id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                conversation.unread_count > 0 ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => onSelectConversation(conversation)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {conversation.nome_cliente}
                      </h3>
                      {conversation.unread_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 truncate mb-1">
                      {conversation.numero_cliente}
                    </p>
                    
                    {conversation.last_message && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {getMessageIcon(conversation.last_message.tipo)}
                        <span className="truncate flex-1">
                          {conversation.last_message.conteudo || 'Mídia'}
                        </span>
                        {getReadStatus(conversation.last_message)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-1 ml-2">
                    <span className="text-xs text-gray-400">
                      {conversation.last_message && formatTime(conversation.last_message.timestamp)}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <Badge 
                        variant={conversation.status === 'AGUARDANDO' ? 'destructive' : 'default'}
                        className="text-xs"
                      >
                        {conversation.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default WhatsAppConversationsList;
