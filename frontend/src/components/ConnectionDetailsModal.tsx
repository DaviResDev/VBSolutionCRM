import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConnections } from '@/contexts/ConnectionsContext';
import { 
  MessageSquare, 
  Cloud, 
  Phone, 
  User, 
  Hash, 
  Calendar,
  Wifi,
  WifiOff,
  X,
  AlertTriangle,
  Trash2,
  Copy,
  Check,
  Smartphone,
  Globe,
  Shield,
  Clock
} from 'lucide-react';

interface ConnectionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: any;
}

const ConnectionDetailsModal: React.FC<ConnectionDetailsModalProps> = ({
  isOpen,
  onClose,
  connection
}) => {
  const { openDeleteConnectionModal } = useConnections();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!connection) return null;

  const handleDelete = () => {
    openDeleteConnectionModal(connection);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'disconnected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-4 h-4" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  // Deriva o WhatsApp ID a partir das possíveis fontes disponíveis
  const whatsappIdRaw = connection.whatsappId 
    || connection.whatsappInfo?.whatsappId 
    || connection.whatsappInfo?.jid 
    || null;
  const whatsappIdNumbersOnly = whatsappIdRaw ? whatsappIdRaw.replace('@s.whatsapp.net', '') : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Detalhes da Conexão
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Informações completas da conexão WhatsApp
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Global */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Cloud className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Status da API</p>
                <p className="text-sm text-gray-600">Cloud API • Conectado</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <Wifi className="w-3 h-3 mr-1" />
              Online
            </Badge>
          </div>

          {/* Informações Básicas */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-blue-600" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Nome da Conexão</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">{connection.name}</p>
              </div>

              {/* WhatsApp ID - Apenas números (se disponível) */}
              {whatsappIdNumbersOnly && (
                <div>
                  <label className="text-sm font-medium text-gray-500">WhatsApp ID</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-mono text-green-800">
                      {whatsappIdNumbersOnly}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(whatsappIdNumbersOnly, 'whatsappId')}
                      className="p-2"
                    >
                      {copiedField === 'whatsappId' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Número do WhatsApp (apenas dígitos)
                  </p>
                </div>
              )}

              {/* Status removido (já exibido no topo) */}


            </CardContent>
          </Card>

          {/* Informações de Conexão */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Hash className="w-5 h-5 text-blue-600" />
                Informações de Conexão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Criado em</p>
                    <p className="text-sm text-gray-900">{formatDate(connection.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Hash className="w-5 h-5 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">ID da Conexão</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-gray-700 truncate">
                        {connection.id}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(connection.id, 'connectionId')}
                        className="p-1 h-6 w-6"
                      >
                        {copiedField === 'connectionId' ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações Técnicas */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  Informações Técnicas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">Dispositivo: Mobile</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                    <Globe className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">Protocolo: WhatsApp Web</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-gray-700">Criptografia: End-to-End</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-gray-700">Tipo: Baileys API</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6"
            >
              Fechar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="px-6"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Conexão
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionDetailsModal;