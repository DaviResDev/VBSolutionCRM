import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import BaileysServerManager from '@/lib/baileys-server-manager';
// Removido imports complexos - usando sistema simples

// Progress tracking types
export type OnboardingPhase = 'creating' | 'auth' | 'syncing' | 'ready' | 'error';
export interface ProgressState { 
  percent: number; 
  phase: OnboardingPhase; 
  updatedAt: number; 
}

export interface Connection {
  id: string;
  name: string;
  type: 'whatsapp_baileys' | 'whatsapp_cloud' | 'webhook';
  status: 'connected' | 'active' | 'inactive' | 'disconnected';
  description?: string;
  url?: string;
  qrCode?: string;
  token?: string;
  accessToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  webhookUrl?: string;
  webhookToken?: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt?: string;
  whatsappInfo?: {
    name?: string;
    phone?: string;
    whatsappId?: string;
    jid?: string;
    profilePicture?: string;
    connectedAt?: string;
  };
}

interface ConnectionsContextType {
  connections: Connection[];
  activeConnection: Connection | null;
  loading: boolean;
  error: string | null;
  socket: Socket | null;
  
  // Modal states
  showDuplicateConnectionModal: boolean;
  duplicateConnectionData: any;
  closeDuplicateConnectionModal: () => void;
  
  // WhatsApp Duplicate Modal states
  showWhatsAppDuplicateModal: boolean;
  whatsAppDuplicateData: any;
  closeWhatsAppDuplicateModal: () => void;
  
  // Delete Connection Modal states
  showDeleteConnectionModal: boolean;
  deleteConnectionData: any;
  closeDeleteConnectionModal: () => void;
  openDeleteConnectionModal: (connection: Connection) => void;
  
  // Connection Details Modal states
  showConnectionDetailsModal: boolean;
  selectedConnectionForDetails: Connection | null;
  closeConnectionDetailsModal: () => void;
  openConnectionDetailsModal: (connection: Connection) => void;
  
  // Disconnect Modal states
  showDisconnectModal: boolean;
  disconnectMessage: string | null;
  closeDisconnectModal: () => void;
  openDisconnectModal: (message: string) => void;
  
  // Progress tracking
  progressById: Map<string, ProgressState>;
  setProgress: (id: string, next: Partial<ProgressState>) => void;
  waitUntilReady: (connectionId: string, options?: { timeoutMs?: number }) => Promise<boolean>;
  
  // Actions
  addConnection: (connection: Omit<Connection, 'id' | 'createdAt'>) => Promise<{ success: boolean; data?: Connection; error?: string }>;
  updateConnection: (id: string, updates: Partial<Connection>) => Promise<{ success: boolean; error?: string }>;
  deleteConnection: (id: string) => Promise<{ success: boolean; error?: string }>;
  setActiveConnection: (connection: Connection | null) => void;
  connectWhatsApp: (connectionId: string) => Promise<{ success: boolean; error?: string }>;
  disconnectWhatsApp: (connectionId: string) => Promise<{ success: boolean; error?: string }>;
  generateQRCode: (connectionId: string) => Promise<{ success: boolean; qrCode?: string; error?: string }>;
  testWebhook: (webhookUrl: string, webhookToken?: string) => Promise<{ success: boolean; data?: any; message?: string; error?: string }>;
  loadConnections: () => Promise<void>;
  updateConnectionStatus: (connectionId: string) => Promise<void>;
  removeDisconnectedConnection: (connectionId: string) => void;
  getConnectionDetails: (connectionId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  startQRCodeRenewal: (connectionId: string) => void;
  stopQRCodeRenewal: (connectionId: string) => void;
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

interface ConnectionsProviderProps {
  children: ReactNode;
}

export const ConnectionsProvider: React.FC<ConnectionsProviderProps> = ({ children }) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrRenewalIntervals, setQrRenewalIntervals] = useState<Map<string, NodeJS.Timeout>>(new Map());
  
  // Modal states
  const [showDuplicateConnectionModal, setShowDuplicateConnectionModal] = useState(false);
  const [duplicateConnectionData, setDuplicateConnectionData] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // WhatsApp Duplicate Modal states
  const [showWhatsAppDuplicateModal, setShowWhatsAppDuplicateModal] = useState(false);
  const [whatsAppDuplicateData, setWhatsAppDuplicateData] = useState<any>(null);
  
  // Delete Connection Modal states
  const [showDeleteConnectionModal, setShowDeleteConnectionModal] = useState(false);
  const [deleteConnectionData, setDeleteConnectionData] = useState<any>(null);
  
  // Connection Details Modal states
  const [showConnectionDetailsModal, setShowConnectionDetailsModal] = useState(false);
  const [selectedConnectionForDetails, setSelectedConnectionForDetails] = useState<Connection | null>(null);
  
  // Disconnect Modal states
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(null);
  
  // Progress tracking state
  const [progressById, setProgressById] = useState<Map<string, ProgressState>>(new Map());

  // Progress tracking functions
  const setProgress = (id: string, next: Partial<ProgressState>) => {
    setProgressById(prev => {
      const curr = prev.get(id) ?? { percent: 0, phase: 'creating', updatedAt: Date.now() };
      const merged = { ...curr, ...next, updatedAt: Date.now() };
      const m = new Map(prev); 
      m.set(id, merged); 
      return m;
    });
  };

  const waitUntilReady = async (connectionId: string, { timeoutMs = 60000 } = {}) => {
    const start = Date.now();
    setProgress(connectionId, { percent: 10, phase: 'creating' });

    const tick = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/baileys-simple/connections/${connectionId}`);
        const json = await res.json();

        console.log('Progress poll result:', json);

        // Heuristic mapping based on backend response
        if (json?.data?.stage === 'qr' || json?.data?.stage === 'connecting') {
          setProgress(connectionId, { phase: 'auth' });
        }
        if (json?.data?.isConnected && !json?.data?.synced) {
          setProgress(connectionId, { phase: 'syncing' });
        }
        if (json?.data?.isConnected && (json?.data?.synced ?? true)) {
          setProgress(connectionId, { percent: 100, phase: 'ready' });
          return true;
        }

        // Smooth ramp toward 80% while waiting
        const currentProgress = progressById.get(connectionId)?.percent ?? 15;
        const newPercent = Math.min(80, currentProgress + 5);
        setProgress(connectionId, { percent: newPercent });

        return false;
      } catch (error) {
        console.error('Progress poll error:', error);
        return false;
      }
    };

    while (Date.now() - start < timeoutMs) {
      const done = await tick();
      if (done) return true;
      await new Promise(r => setTimeout(r, 1200));
    }

    setProgress(connectionId, { phase: 'error' });
    return false;
  };

  // Initialize socket connection
  useEffect(() => {
    const s = io("http://localhost:3000", { transports: ["websocket"] });
    setSocket(s);
    
    // Listener para duplicata de número WhatsApp
    s.on('connectionDuplicate', (data) => {
      console.log('🔔 Evento de duplicata de WhatsApp recebido:', data);
      setWhatsAppDuplicateData(data);
      setShowWhatsAppDuplicateModal(true);
    });
    
    return () => s.close();
  }, []);

  // Carregar conexões iniciais
  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar conexões Baileys do backend
      const baileysResponse = await fetch('http://localhost:3000/api/baileys-simple/connections');
      let baileysConnections: Connection[] = [];
      
      if (baileysResponse.ok) {
        const baileysData = await baileysResponse.json();
        if (baileysData.success && baileysData.data) {
          baileysConnections = baileysData.data.map((conn: any) => ({
            id: conn.id,
            name: conn.name,
            type: 'whatsapp_baileys' as const,
            status: conn.isConnected ? 'connected' as const : 'disconnected' as const,
            description: `Conexão Baileys - ${conn.phoneNumber || 'Sem número'}`,
            phoneNumber: conn.phoneNumber,
            whatsappInfo: conn.whatsappInfo,
            createdAt: conn.createdAt || new Date().toISOString(),
            updatedAt: conn.updatedAt || new Date().toISOString()
          }));
        }
      }
      
      // Load connections from localStorage (fallback when backend is empty)
      const localConnections = JSON.parse(localStorage.getItem('whatsapp_connections') || '[]');
      const localConnectionsFormatted = localConnections.map((conn: any) => ({
        id: conn.id,
        name: conn.name,
        type: conn.type || 'whatsapp_baileys' as const,
        status: conn.status as 'connected' | 'disconnected' | 'connecting',
        description: conn.description || 'Conexão WhatsApp via Baileys',
        phoneNumber: conn.phoneNumber,
        whatsappInfo: conn.whatsappInfo,
        createdAt: conn.createdAt || conn.created_at,
        updatedAt: conn.updatedAt || conn.updated_at
      }));
      
      // Use backend connections if available, otherwise fallback to localStorage
      const allConnections = baileysConnections.length > 0 ? baileysConnections : localConnectionsFormatted;
      console.log('ConnectionsContext - All connections:', allConnections);
      setConnections(allConnections);
      
      // Definir a primeira conexão conectada como ativa, ou a primeira disponível
      const connectedConnection = allConnections.find(c => c.status === 'connected');
      console.log('ConnectionsContext - Connected connection found:', connectedConnection);
      if (connectedConnection) {
        setActiveConnection(connectedConnection);
        console.log('ConnectionsContext - Active connection set:', connectedConnection);
      } else if (allConnections.length > 0) {
        // Se não há conexão conectada, usar a primeira disponível
        const firstConnection = allConnections[0];
        setActiveConnection(firstConnection);
        console.log('ConnectionsContext - First connection set as active:', firstConnection);
      }
    } catch (err) {
      setError('Erro ao carregar conexões');
      console.error('Erro ao carregar conexões:', err);
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar o status de uma conexão específica
  const updateConnectionStatus = async (connectionId: string) => {
    try {
      const connection = connections.find(c => c.id === connectionId);
      if (!connection || connection.type !== 'whatsapp_baileys') {
        return;
      }

      const response = await fetch(`/api/baileys-simple/connections/${connectionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const newStatus = data.data.isConnected ? 'connected' as const : 'disconnected' as const;
          
          setConnections(prev => 
            prev.map(conn => 
              conn.id === connectionId 
                ? { 
                    ...conn, 
                    status: newStatus,
                    whatsappInfo: data.data.whatsappInfo || conn.whatsappInfo,
                    updatedAt: data.data.updatedAt || new Date().toISOString()
                  }
                : conn
            )
          );

          // Se a conexão foi estabelecida, definir como ativa se não houver nenhuma ativa
          if (newStatus === 'connected') {
            if (activeConnection?.id === connectionId) {
              // Atualizar a conexão ativa existente
              setActiveConnection(prev => prev ? { ...prev, status: newStatus } : null);
            } else if (!activeConnection) {
              // Se não há conexão ativa, definir esta como ativa
              const updatedConnection = connections.find(c => c.id === connectionId);
              if (updatedConnection) {
                setActiveConnection({ ...updatedConnection, status: newStatus });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar status da conexão:', error);
    }
  };

  const addConnection = async (connectionData: Omit<Connection, 'id' | 'createdAt'>) => {
    try {
      setLoading(true);
      setError(null);
      
      const newConnection: Connection = {
        id: Date.now().toString(),
        ...connectionData,
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

  const updateConnection = async (id: string, updates: Partial<Connection>) => {
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
      
      // Atualizar conexão ativa se necessário
      if (activeConnection?.id === id) {
        setActiveConnection(prev => prev ? { ...prev, ...updates } : null);
      }
      
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
      
      // Tentar chamar API do backend para deletar permanentemente
      try {
        const response = await fetch(`http://localhost:3000/api/baileys-simple/connections/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.success) {
            console.log('Conexão deletada do backend com sucesso');
          } else {
            console.warn('Backend retornou erro:', result.error);
          }
        } else {
          console.warn('Backend não disponível, deletando apenas localmente');
        }
      } catch (backendError) {
        console.warn('Backend não disponível, deletando apenas localmente:', backendError);
      }
      
      // Remover do estado local
      setConnections(prev => prev.filter(conn => conn.id !== id));
      
      // Remover conexão ativa se for a que está sendo deletada
      if (activeConnection?.id === id) {
        setActiveConnection(null);
      }
      
      // Remover do localStorage também
      const localConnections = JSON.parse(localStorage.getItem('whatsapp_connections') || '[]');
      console.log('Before delete from localStorage:', localConnections);
      const updatedLocalConnections = localConnections.filter((conn: any) => conn.id !== id);
      console.log('After delete from localStorage:', updatedLocalConnections);
      localStorage.setItem('whatsapp_connections', JSON.stringify(updatedLocalConnections));
      console.log('Updated localStorage with:', JSON.parse(localStorage.getItem('whatsapp_connections') || '[]'));
      
      return { success: true };
    } catch (err) {
      setError('Erro ao deletar conexão');
      console.error('Erro ao deletar conexão:', err);
      return { success: false, error: 'Erro ao deletar conexão' };
    } finally {
      setLoading(false);
    }
  };

  const connectWhatsApp = async (connectionId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const connection = connections.find(c => c.id === connectionId);
      if (!connection) {
        throw new Error('Conexão não encontrada');
      }

      if (connection.type === 'whatsapp_baileys') {
        // Para Baileys, criar conexão via API
        const response = await fetch('/api/baileys-simple/connections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            connectionId: connection.id,
            name: connection.name
          })
        });

        const result = await response.json();
        
        if (result.success) {
          setConnections(prev => 
            prev.map(conn => 
              conn.id === connectionId 
                ? { ...conn, status: 'connected' as const }
                : conn
            )
          );
          
          setActiveConnection({ ...connection, status: 'connected' });
          return { success: true };
        } else {
          // Se for erro de conexão duplicada, mostrar modal específico
          if (result.code === 'CONNECTION_ALREADY_EXISTS') {
            setDuplicateConnectionData(result.data);
            setShowDuplicateConnectionModal(true);
            return { 
              success: false, 
              error: result.error,
              code: result.code,
              data: result.data
            };
          }
          throw new Error(result.error || 'Erro ao conectar');
        }
      } else {
        // Para outros tipos, apenas atualizar status
        setConnections(prev => 
          prev.map(conn => 
            conn.id === connectionId 
              ? { ...conn, status: 'connected' as const }
              : conn
          )
        );
        
        setActiveConnection({ ...connection, status: 'connected' });
        return { success: true };
      }
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
      
      const connection = connections.find(c => c.id === connectionId);
      if (!connection) {
        throw new Error('Conexão não encontrada');
      }

      if (connection.type === 'whatsapp_baileys') {
        // Para Baileys, desconectar via API
        const response = await fetch(`/api/baileys-simple/connections/${connectionId}`, {
          method: 'DELETE'
        });

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Erro ao desconectar');
        }
      }
      
      // Parar renovação do QR Code
      stopQRCodeRenewal(connectionId);
      
      // Atualizar status local
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, status: 'disconnected' as const }
            : conn
        )
      );
      
      // Remover conexão ativa se for a que está sendo desconectada
      if (activeConnection?.id === connectionId) {
        setActiveConnection(null);
      }
      
      // Mostrar modal de desconexão
      openDisconnectModal(`Conexão "${connection.name}" foi desconectada com sucesso!`);
      
      return { success: true };
    } catch (err) {
      setError('Erro ao desconectar WhatsApp');
      console.error('Erro ao desconectar WhatsApp:', err);
      return { success: false, error: 'Erro ao desconectar WhatsApp' };
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (connectionId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const connection = connections.find(c => c.id === connectionId);
      if (!connection) {
        throw new Error('Conexão não encontrada');
      }

      if (connection.type === 'whatsapp_baileys') {
        // Verificar se o servidor Baileys está rodando
        const serverManager = BaileysServerManager.getInstance();
        const serverStatus = await serverManager.getServerStatus();
        
        if (!serverStatus.isRunning) {
          console.log('🚀 Servidor Baileys não está rodando, tentando iniciar...');
          const serverStarted = await serverManager.ensureServerRunning();
          
          if (!serverStarted) {
            throw new Error('Não foi possível iniciar o servidor Baileys. Verifique se o comando está sendo executado no terminal.');
          }
        }

        // Primeiro, tentar criar a conexão via API
        const createResponse = await fetch('/api/baileys-simple/connections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: connection.name,
            type: 'whatsapp_baileys'
          }),
        });

        if (!createResponse.ok) {
          throw new Error('Erro ao criar conexão');
        }

        const createData = await createResponse.json();
        
        // Se veio QR code direto, usar
        if (createData.qrCode) {
          setConnections(prev => 
            prev.map(conn => 
              conn.id === connectionId 
                ? { ...conn, qrCode: createData.qrCode }
                : conn
            )
          );
          
          // Iniciar renovação automática do QR Code
          startQRCodeRenewal(connectionId);
          
          return { success: true, qrCode: createData.qrCode };
        } else {
          // Se não veio QR code, aguardar e tentar obter
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const qrResponse = await fetch(`/api/baileys-simple/connections/${createData.connectionId}/qr`);
          
          if (!qrResponse.ok) {
            throw new Error('Erro ao obter QR code');
          }
          
          const qrData = await qrResponse.json();
          
          if (qrData.qrCode) {
            setConnections(prev => 
              prev.map(conn => 
                conn.id === connectionId 
                  ? { ...conn, qrCode: qrData.qrCode }
                  : conn
              )
            );
            
            // Iniciar renovação automática do QR Code
            startQRCodeRenewal(connectionId);
            
            return { success: true, qrCode: qrData.qrCode };
          } else {
            throw new Error('QR Code não foi gerado');
          }
        }
      } else {
        // Para outros tipos, gerar QR Code mock
        const mockQrCode = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
        
        setConnections(prev => 
          prev.map(conn => 
            conn.id === connectionId 
              ? { ...conn, qrCode: mockQrCode }
              : conn
          )
        );
        
        return { success: true, qrCode: mockQrCode };
      }
    } catch (err) {
      setError('Erro ao gerar QR Code');
      console.error('Erro ao gerar QR Code:', err);
      return { success: false, error: 'Erro ao gerar QR Code' };
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async (webhookUrl: string, webhookToken?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the first available connection ID or create a test one
      const connectionId = connections.length > 0 ? connections[0].id : 'test-connection';
      
      const response = await fetch(`/api/webhook/connections/${connectionId}/webhook/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl,
          webhookToken,
          testData: {
            message: 'Test webhook from VBSolutionCRM',
            timestamp: new Date().toISOString(),
            user: {
              id: 'test_user_123',
              name: 'Test User',
              email: 'test@example.com'
            },
            company: {
              id: 'test_company_456',
              name: 'Test Company'
            }
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return { 
          success: true, 
          data: result.data,
          message: 'Webhook testado com sucesso!'
        };
      } else {
        throw new Error(result.error || 'Erro ao testar webhook');
      }
    } catch (err) {
      setError('Erro ao testar webhook');
      console.error('Erro ao testar webhook:', err);
      return { success: false, error: 'Erro ao testar webhook' };
    } finally {
      setLoading(false);
    }
  };

  // Remove conexão desconectada da lista
  const removeDisconnectedConnection = (connectionId: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
    
    // Se a conexão ativa foi removida, limpar a conexão ativa
    if (activeConnection?.id === connectionId) {
      setActiveConnection(null);
    }
  };

  // Obter detalhes da conexão
  const getConnectionDetails = async (connectionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/baileys-simple/connections/${connectionId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao obter detalhes da conexão');
      }

      const result = await response.json();
      
      if (result.success) {
        return { 
          success: true, 
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erro ao obter detalhes da conexão');
      }
    } catch (err) {
      setError('Erro ao obter detalhes da conexão');
      console.error('Erro ao obter detalhes da conexão:', err);
      return { success: false, error: 'Erro ao obter detalhes da conexão' };
    } finally {
      setLoading(false);
    }
  };

  // Iniciar renovação automática do QR Code
  const startQRCodeRenewal = (connectionId: string) => {
    // Parar renovação existente se houver
    stopQRCodeRenewal(connectionId);
    
    const startTime = Date.now();
    const maxDuration = 90000; // 1m30s em millisegundos
    
    const interval = setInterval(async () => {
      try {
        // Verificar se passou do tempo limite
        if (Date.now() - startTime > maxDuration) {
          console.log(`⏰ Tempo limite de QR Code atingido para ${connectionId}`);
          stopQRCodeRenewal(connectionId);
          return;
        }
        
        const response = await fetch(`/api/baileys-simple/connections/${connectionId}/qr`);
        const result = await response.json();
        
        if (result.success && result.data.qrCode) {
          setConnections(prev => 
            prev.map(conn => 
              conn.id === connectionId 
                ? { ...conn, qrCode: result.data.qrCode }
                : conn
            )
          );
          console.log(`🔄 QR Code renovado para conexão ${connectionId}`);
        } else if (result.success && result.data.isConnected) {
          // Se conectado, parar renovação
          console.log(`✅ Conexão estabelecida para ${connectionId}, parando renovação de QR`);
          stopQRCodeRenewal(connectionId);
        }
      } catch (error) {
        console.error('Erro ao renovar QR Code:', error);
      }
    }, 15000); // Renovar a cada 15 segundos
    
    setQrRenewalIntervals(prev => new Map(prev.set(connectionId, interval)));
    console.log(`🔄 Iniciando renovação automática do QR Code para ${connectionId}`);
  };

  // Parar renovação do QR Code
  const stopQRCodeRenewal = (connectionId: string) => {
    const interval = qrRenewalIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      setQrRenewalIntervals(prev => {
        const newMap = new Map(prev);
        newMap.delete(connectionId);
        return newMap;
      });
      console.log(`⏹️ Parando renovação do QR Code para ${connectionId}`);
    }
  };

  // Limpar intervalos ao desmontar
  useEffect(() => {
    return () => {
      qrRenewalIntervals.forEach(interval => clearInterval(interval));
    };
  }, [qrRenewalIntervals]);

  // Funções para controlar o modal de conexão duplicada
  const closeDuplicateConnectionModal = () => {
    setShowDuplicateConnectionModal(false);
    setDuplicateConnectionData(null);
  };
  
  // Funções para controlar o modal de duplicata de WhatsApp
  const closeWhatsAppDuplicateModal = () => {
    setShowWhatsAppDuplicateModal(false);
    setWhatsAppDuplicateData(null);
  };
  
  // Funções para controlar o modal de exclusão de conexão
  const closeDeleteConnectionModal = () => {
    setShowDeleteConnectionModal(false);
    setDeleteConnectionData(null);
  };
  
  const openDeleteConnectionModal = (connection: Connection) => {
    setDeleteConnectionData(connection);
    setShowDeleteConnectionModal(true);
  };
  
  // Funções para controlar o modal de detalhes da conexão
  const closeConnectionDetailsModal = () => {
    setShowConnectionDetailsModal(false);
    setSelectedConnectionForDetails(null);
  };
  
  const openConnectionDetailsModal = (connection: Connection) => {
    setSelectedConnectionForDetails(connection);
    setShowConnectionDetailsModal(true);
  };
  
  // Função para controlar o modal de desconexão
  const closeDisconnectModal = () => {
    setShowDisconnectModal(false);
    setDisconnectMessage(null);
  };

  const openDisconnectModal = (message: string) => {
    setDisconnectMessage(message);
    setShowDisconnectModal(true);
  };

  const value: ConnectionsContextType = {
    connections,
    activeConnection,
    loading,
    error,
    socket,
    // Modal states
    showDuplicateConnectionModal,
    duplicateConnectionData,
    closeDuplicateConnectionModal,
    // WhatsApp Duplicate Modal states
    showWhatsAppDuplicateModal,
    whatsAppDuplicateData,
    closeWhatsAppDuplicateModal,
    // Delete Connection Modal states
    showDeleteConnectionModal,
    deleteConnectionData,
    closeDeleteConnectionModal,
    openDeleteConnectionModal,
    // Connection Details Modal states
    showConnectionDetailsModal,
    selectedConnectionForDetails,
    closeConnectionDetailsModal,
    openConnectionDetailsModal,
    // Disconnect Modal states
    showDisconnectModal,
    disconnectMessage,
    closeDisconnectModal,
    openDisconnectModal,
    // Progress tracking
    progressById,
    setProgress,
    waitUntilReady,
    // Actions
    addConnection,
    updateConnection,
    deleteConnection,
    setActiveConnection,
    connectWhatsApp,
    disconnectWhatsApp,
    generateQRCode,
    testWebhook,
    loadConnections,
    updateConnectionStatus,
    removeDisconnectedConnection,
    getConnectionDetails,
    startQRCodeRenewal,
    stopQRCodeRenewal
  };

  return (
    <ConnectionsContext.Provider value={value}>
      {children}
    </ConnectionsContext.Provider>
  );
};

export const useConnections = () => {
  const context = useContext(ConnectionsContext);
  if (context === undefined) {
    throw new Error('useConnections must be used within a ConnectionsProvider');
  }
  return context;
};
