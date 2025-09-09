import { useState, useEffect } from 'react';

export interface Connection {
  id: string;
  name: string;
  type: 'whatsapp_baileys' | 'whatsapp_cloud' | 'webhook';
  status: 'connected' | 'active' | 'inactive' | 'disconnected';
  url?: string;
  qrCode?: string;
  token?: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ConnectionFormData {
  name: string;
  type: 'whatsapp_baileys' | 'whatsapp_cloud' | 'webhook';
  url?: string;
  token?: string;
  phoneNumber?: string;
}

export const useConnections = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar conexões iniciais
  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simular carregamento de conexões do backend
      // Aqui você faria uma chamada para a API
      const mockConnections: Connection[] = [
        {
          id: '1',
          name: 'WhatsApp Baileys - Principal',
          type: 'whatsapp_baileys',
          status: 'connected',
          phoneNumber: '+5511999999999',
          createdAt: new Date().toISOString()
        },
        {
          id: '2', 
          name: 'Webhook - Automações',
          type: 'webhook',
          status: 'active',
          url: 'https://api.exemplo.com/webhook',
          createdAt: new Date().toISOString()
        },
        {
          id: '3',
          name: 'WhatsApp Cloud API - Marketing',
          type: 'whatsapp_cloud',
          status: 'inactive',
          token: 'token_exemplo',
          phoneNumber: '+5511888888888',
          createdAt: new Date().toISOString()
        }
      ];
      
      setConnections(mockConnections);
    } catch (err) {
      setError('Erro ao carregar conexões');
      console.error('Erro ao carregar conexões:', err);
    } finally {
      setLoading(false);
    }
  };

  const addConnection = async (connectionData: ConnectionFormData) => {
    try {
      setLoading(true);
      setError(null);
      
      const newConnection: Connection = {
        id: Date.now().toString(),
        ...connectionData,
        status: connectionData.type === 'webhook' ? 'active' : 'inactive',
        createdAt: new Date().toISOString()
      };
      
      // Aqui você faria uma chamada para a API para salvar
      setConnections(prev => [...prev, newConnection]);
      
      return { success: true, data: newConnection };
    } catch (err) {
      setError('Erro ao adicionar conexão');
      console.error('Erro ao adicionar conexão:', err);
      return { success: false, error: 'Erro ao adicionar conexão' };
    } finally {
      setLoading(false);
    }
  };

  const updateConnection = async (id: string, updates: Partial<ConnectionFormData>) => {
    try {
      setLoading(true);
      setError(null);
      
      // Aqui você faria uma chamada para a API para atualizar
      setConnections(prev => 
        prev.map(conn => 
          conn.id === id 
            ? { ...conn, ...updates, updatedAt: new Date().toISOString() }
            : conn
        )
      );
      
      return { success: true };
    } catch (err) {
      setError('Erro ao atualizar conexão');
      console.error('Erro ao atualizar conexão:', err);
      return { success: false, error: 'Erro ao atualizar conexão' };
    } finally {
      setLoading(false);
    }
  };

  const deleteConnection = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Aqui você faria uma chamada para a API para deletar
      setConnections(prev => prev.filter(conn => conn.id !== id));
      
      return { success: true };
    } catch (err) {
      setError('Erro ao deletar conexão');
      console.error('Erro ao deletar conexão:', err);
      return { success: false, error: 'Erro ao deletar conexão' };
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (connectionId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simular geração de QR Code
      // Aqui você faria uma chamada para a API para gerar o QR Code
      const qrCodeData = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
      
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, qrCode: qrCodeData }
            : conn
        )
      );
      
      return { success: true, qrCode: qrCodeData };
    } catch (err) {
      setError('Erro ao gerar QR Code');
      console.error('Erro ao gerar QR Code:', err);
      return { success: false, error: 'Erro ao gerar QR Code' };
    } finally {
      setLoading(false);
    }
  };

  const connectWhatsApp = async (connectionId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Aqui você faria uma chamada para a API para conectar o WhatsApp
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, status: 'connected' as const }
            : conn
        )
      );
      
      return { success: true };
    } catch (err) {
      setError('Erro ao conectar WhatsApp');
      console.error('Erro ao conectar WhatsApp:', err);
      return { success: false, error: 'Erro ao conectar WhatsApp' };
    } finally {
      setLoading(false);
    }
  };

  const disconnectWhatsApp = async (connectionId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Aqui você faria uma chamada para a API para desconectar o WhatsApp
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, status: 'disconnected' as const }
            : conn
        )
      );
      
      return { success: true };
    } catch (err) {
      setError('Erro ao desconectar WhatsApp');
      console.error('Erro ao desconectar WhatsApp:', err);
      return { success: false, error: 'Erro ao desconectar WhatsApp' };
    } finally {
      setLoading(false);
    }
  };

  return {
    connections,
    loading,
    error,
    addConnection,
    updateConnection,
    deleteConnection,
    generateQRCode,
    connectWhatsApp,
    disconnectWhatsApp,
    loadConnections
  };
};
