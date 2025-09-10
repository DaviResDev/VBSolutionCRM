
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Building2, 
  Users, 
  Shield, 
  Settings as SettingsIcon,
  Save,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Palette,
  Upload,
  Trash2 as TrashIcon,
  CheckCircle,
  AlertCircle,
  Clock,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  User,
  Briefcase,
  MapPin,
  Lock,
  Key,
  AlertTriangle,
  Link,
  QrCode,
  MessageSquare,
  Webhook,
  Cloud
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

// Environment fallbacks
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Connection state type
type ConnState = 'idle' | 'qr' | 'connected' | 'error';

import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { useConnections } from '@/contexts/ConnectionsContext';
import ConnectionDetailsModal from '@/components/ConnectionDetailsModal';
import { AddItemModal } from '@/components/AddItemModal';
import { AddUserModal } from '@/components/AddUserModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { EditItemModal } from '@/components/EditItemModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { ColorPicker } from '@/components/ColorPicker';
import { LogoUpload } from '@/components/LogoUpload';
import { ToastContainer } from '@/components/ui/toast';
import BeautifulQRModal from '@/components/BeautifulQRModal';
import SimpleQRModal from '@/components/SimpleQRModal';
import BaileysQRModal from '@/components/BaileysQRModal';

export default function Settings() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { success, error: showError, toasts, removeToast } = useToast();
  const {
    settings,
    areas,
    roles,
    users,
    loading,
    error,
    saveCompanySettings,
    fetchAreas,
    fetchRoles,
    addArea,
    editArea,
    deleteArea,
    addRole,
    editRole,
    deleteRole,
    saveRolePermissions,
    fetchRolePermissions,
    addUser,
    editUser,
    deleteUser,
    updateUserStatus,
    resetUserPassword,
    updateLogo,
    removeLogo,
  } = useCompanySettings(user?.id);

  const {
    connections,
    addConnection,
    updateConnection,
    deleteConnection,
    generateQRCode,
    connectWhatsApp,
    disconnectWhatsApp,
    loadConnections,
    updateConnectionStatus
  } = useConnections();

  const [activeTab, setActiveTab] = useState('company');
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    default_language: 'pt-BR',
    default_timezone: 'America/Sao_Paulo',
    default_currency: 'BRL',
    datetime_format: 'DD/MM/YYYY HH:mm',
  });

  const [themeColors, setThemeColors] = useState({
    primary_color: '#021529',
    secondary_color: '#ffffff',
    accent_color: '#3b82f6',
  });

  const [securitySettings, setSecuritySettings] = useState({
    enable_2fa: false,
    password_policy: {
      min_length: 8,
      require_numbers: true,
      require_uppercase: true,
      require_special: true,
    },
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Estados para permissões
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

  // Estados para modais de conexões
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showConnectionDetailsModal, setShowConnectionDetailsModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [editingConnection, setEditingConnection] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    connecting: true,
    lastError: null,
    sessionName: null
  });
  const [connectionForm, setConnectionForm] = useState({
    name: '',
    type: 'whatsapp_baileys',
    description: '',
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    webhookUrl: '',
    webhookToken: ''
  });

  // QR Connection states
  const [showNewQRModal, setShowNewQRModal] = useState(false);
  const [showBaileysQRModal, setShowBaileysQRModal] = useState(false);
  const [connState, setConnState] = useState<ConnState>('idle');
  const [connError, setConnError] = useState<string | null>(null);
  const [pendingInstanceId, setPendingInstanceId] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(90);
  const [baileysConnectionId, setBaileysConnectionId] = useState<string | null>(null);

  // Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Refs for timers and socket
  const lastCreatedNameRef = useRef<string>('');
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // const socketRef = useRef<Socket | null>(null);

  // Helper function to clear timers
  function clearTimers() {
    if (refreshTimerRef.current) { 
      clearInterval(refreshTimerRef.current); 
      refreshTimerRef.current = null; 
    }
    if (expiryTimerRef.current) { 
      clearInterval(expiryTimerRef.current); 
      expiryTimerRef.current = null; 
    }
  }

  // Connect to Baileys backend and get real QR code
  async function connectToBaileys(instanceId: string) {
    try {
      console.log('Connecting to Baileys backend for:', instanceId);
      
      // Create connection in Baileys backend
      const response = await fetch('http://localhost:3000/api/baileys-simple/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId: instanceId,
          name: lastCreatedNameRef.current || 'WhatsApp Web',
          phoneNumber: null
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const connectionId = data.data.id;
        console.log('Baileys connection created:', connectionId);
        return connectionId;
      } else {
        // Verificar se é erro de conexão duplicada
        if (data.code === 'CONNECTION_ALREADY_EXISTS') {
          throw new Error('Já existe uma conexão WhatsApp ativa. Desconecte a conexão atual antes de criar uma nova.');
        }
        throw new Error(data.error || 'Erro ao criar conexão Baileys');
      }
    } catch (error) {
      console.error('Error creating Baileys connection:', error);
      throw error;
    }
  }


  // Socket attachment function with real Baileys QR
  function attachSocket(instanceId: string) {
    try {
      console.log('AttachSocket called for:', instanceId);
      
      // Connect to Baileys backend
      connectToBaileys(instanceId).then(connectionId => {
        console.log('Baileys connection established:', connectionId);
        
        // Set up Socket.IO connection
        const socket: Socket = io('http://localhost:3000', {
          transports: ['websocket'],
          autoConnect: true
        });
        
        socket.on('connect', () => {
          console.log('Socket.IO connected');
        });
        
        // Listen for QR code from Baileys
        socket.on('qrCode', (data: { connectionId: string, qrCode: string }) => {
          console.log('QR Code received from Baileys:', data.qrCode);
          console.log('QR Code length:', data.qrCode?.length);
          console.log('QR Code type:', typeof data.qrCode);
          console.log('QR Code first 10 chars:', data.qrCode?.substring(0, 10));
          console.log('QR Code last 10 chars:', data.qrCode?.substring(data.qrCode.length - 10));
          
          // Set the raw QR string from Baileys (exactly as received)
          setQrValue(data.qrCode);
        });
        
        // Listen for connection updates
        socket.on('connectionUpdate', (data: { connectionId: string, update: any }) => {
          console.log('Connection update received:', data.update);
          
          if (data.update.connection === 'open') {
            console.log('WhatsApp connected successfully');
            setConnState('connected');
            // finalizeConnection() será chamado automaticamente pelo modal após 6 segundos
          }
        });
        
        // Listen for connection removal
        socket.on('connectionRemoved', (data: { connectionId: string }) => {
          console.log('Connection removed:', data.connectionId);
          // Atualizar a lista de conexões removendo a conexão desconectada
          setConnections(prev => prev.filter(conn => conn.id !== data.connectionId));
        });
        
        socket.on('disconnect', () => {
          console.log('Socket.IO disconnected');
        });
        
        socket.on('connect_error', (error) => {
          console.error('Socket.IO connection error:', error);
          setConnError('Erro de conexão com o servidor');
          setConnState('error');
        });
        
      }).catch(error => {
        console.error('Error connecting to Baileys:', error);
        setConnError('Erro ao conectar com Baileys');
        setConnState('error');
      });
      
    } catch (error) {
      console.error('Error in attachSocket:', error);
      setConnError('Erro ao gerar QR code');
      setConnState('error');
    }
  }

  // Start pairing function with QR refresh
  function startPairing(instanceId: string) {
    try {
      console.log('StartPairing called for:', instanceId);
      attachSocket(instanceId);

      // Clear any existing timers
      clearTimers();
      
      // QR refresh timer (every 20 seconds) - request new QR from Baileys
      refreshTimerRef.current = setInterval(() => {
        try {
          if (connState === 'qr') {
            console.log('Refreshing WhatsApp QR code...');
            // Request new QR from Baileys backend
            fetch(`http://localhost:3000/api/baileys-simple/connections/${instanceId}/refresh-qr`, {
              method: 'POST'
            }).catch(error => {
              console.error('Error refreshing QR code:', error);
            });
          }
        } catch (error) {
          console.error('Error refreshing QR code:', error);
        }
      }, 20000);
      
      // 90s expiry timer
      setExpiresIn(90);
      expiryTimerRef.current = setInterval(() => {
        setExpiresIn((sec) => {
          if (sec <= 1) {
            clearTimers();
            setConnState('error');
            setConnError('Tempo expirado. Clique em "Nova Conexão" para tentar novamente.');
            // Abort connection on server
            fetch(`http://localhost:3000/api/baileys-simple/connections/${instanceId}/abort`, {
              method: 'POST'
            }).catch(error => {
              console.error('Error aborting connection:', error);
            });
            return 0;
          }
          return sec - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error in startPairing:', error);
      setConnError('Erro ao iniciar pareamento');
      setConnState('error');
    }
  }

  // Handle form submission for both Enter key and button click
  async function handleFormSubmit() {
    try {
      if (editingConnection) {
        await updateConnection(editingConnection.id, connectionForm);
        setShowConnectionModal(false);
        setEditingConnection(null);
        success('Conexão atualizada com sucesso!');
      } else {
        // Use new handleSaveCreate function for Baileys connections
        if (connectionForm.type === 'whatsapp_baileys') {
          console.log('Calling handleSaveCreate for Baileys connection');
          await handleSaveCreate({
            name: connectionForm.name,
            notes: connectionForm.description
          });
          console.log('handleSaveCreate completed, should have opened QR modal');
        } else {
          // For other types, use the old method
          const result = await addConnection({
            ...connectionForm,
            status: 'disconnected'
          });
          
          if (result.success) {
            setShowConnectionModal(false);
            setConnectionForm({
              name: '',
              type: 'whatsapp_baileys',
              description: '',
              accessToken: '',
              phoneNumberId: '',
              businessAccountId: '',
              webhookUrl: '',
              webhookToken: ''
            });
            success('Conexão criada com sucesso!');
          } else {
            error(result.error || 'Erro ao criar conexão');
          }
        }
      }
    } catch (err) {
      console.error('Erro ao salvar conexão:', err);
      error('Erro ao salvar conexão');
    }
  }

  // Finalize connection function - add to Supabase and refresh list
  async function finalizeConnection() {
    console.log('finalizeConnection called with pendingInstanceId:', pendingInstanceId);
    if (!pendingInstanceId) {
      console.log('No pendingInstanceId, returning early');
      return;
    }
    try {
      console.log('Finalizing connection for:', pendingInstanceId, lastCreatedNameRef.current);
      
      const connectionName = lastCreatedNameRef.current || 'WhatsApp Web';
      
      // Check if connection already exists
      const existingConnections = JSON.parse(localStorage.getItem('whatsapp_connections') || '[]');
      const duplicateConnection = existingConnections.find((conn: any) => 
        conn.name === connectionName && conn.type === 'whatsapp_baileys'
      );
      
      if (duplicateConnection) {
        console.log('Duplicate connection found:', duplicateConnection);
        setConnState('duplicate');
        return; // Don't close modal, let it show duplicate message and auto-close
      }
      
      // For now, we'll store the connection in localStorage and update the connections context
      // In a real implementation, you would create a whatsapp_connections table in Supabase
      const connectionData = {
        id: pendingInstanceId,
        instance_id: pendingInstanceId,
        name: connectionName,
        status: 'connected',
        type: 'whatsapp_baileys',
        description: 'Conexão WhatsApp via Baileys',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Store in localStorage for persistence
      existingConnections.push(connectionData);
      localStorage.setItem('whatsapp_connections', JSON.stringify(existingConnections));
      
      console.log('Connection stored in localStorage:', connectionData);
      
      // Show success message first
      success('✅ WhatsApp conectado com sucesso!');
      
      // Close QR modal and reset immediately
      setShowNewQRModal(false);
      setQrValue(null);
      setConnState('idle');
      setPendingInstanceId(null);
      clearTimers();
      
      // Refresh connections list immediately
      console.log('About to call loadConnections');
      await loadConnections();
      console.log('loadConnections completed');
      
    } catch (e: any) {
      console.error('Error finalizing connection:', e);
      setConnError(e?.message ?? 'Falha ao salvar conexão');
      setConnState('error');
      setPendingInstanceId(null);
      clearTimers();
    }
    console.log('finalizeConnection completed');
  }

  // Create Baileys connection and get QR code
  async function createBaileysConnection(name: string) {
    try {
      console.log('Creating Baileys connection for:', name);
      
      // Create connection in Baileys backend
      const response = await fetch('http://localhost:3000/api/baileys-simple/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          type: 'whatsapp_baileys'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const connectionId = data.data.connectionId;
        setBaileysConnectionId(connectionId);
        lastCreatedNameRef.current = name;
        
        console.log('Baileys connection created:', connectionId);
        
        // Close create modal and open Baileys QR modal
        setShowConnectionModal(false);
        setShowBaileysQRModal(true);
        
        return connectionId;
      } else {
        // Se for erro de conexão duplicada, mostrar modal de duplicata
        if (data.code === 'CONNECTION_ALREADY_EXISTS') {
          // Fechar modal de criação e mostrar modal de QR com erro
          setShowConnectionModal(false);
          setBaileysConnectionId(null);
          setShowBaileysQRModal(true);
          throw new Error('CONNECTION_EXISTS');
        }
        // Para outros erros, mostrar modal de QR com erro
        setShowConnectionModal(false);
        setBaileysConnectionId(null);
        setShowBaileysQRModal(true);
        throw new Error(data.error || 'Erro ao criar conexão Baileys');
      }
    } catch (error) {
      console.error('Error creating Baileys connection:', error);
      // Não mostrar toast para conexão duplicada, deixar o modal de duplicata ser mostrado
      if ((error as Error).message !== 'CONNECTION_EXISTS') {
        showError('Erro ao criar conexão WhatsApp: ' + (error as Error).message);
      }
      throw error;
    }
  }

  // Handle save create function
  async function handleSaveCreate(values: { name: string; notes?: string }) {
    try {
      console.log('handleSaveCreate called with:', values);
      const name = values?.name?.trim();
      if (!name) {
        showError('Nome da conexão é obrigatório');
        return;
      }
      setConnError(null);

      // Generate a unique instance id for this pairing
      const instanceId = crypto.randomUUID();
      setPendingInstanceId(instanceId);
      lastCreatedNameRef.current = name;

      console.log('About to open QR modal, current state:', { showNewQRModal, connState, qrValue });

      // Close create modal and open QR immediately
      setShowConnectionModal(false);
      setShowNewQRModal(true);
      setConnState('qr');
      setQrValue(null);

      console.log('QR modal should be open now');

      // Start the pairing flow (background) - this will generate QR immediately
      startPairing(instanceId);
      
      console.log('handleSaveCreate completed successfully');
    } catch (error) {
      console.error('Error in handleSaveCreate:', error);
      showError('Erro ao criar conexão: ' + (error as Error).message);
    }
  }


  // Debug QR modal state changes
  useEffect(() => {
    console.log('QR Modal state changed:', { showNewQRModal, connState, qrValue, pendingInstanceId });
  }, [showNewQRModal, connState, qrValue, pendingInstanceId]);

  // Atualizar formulários quando settings mudar
  useEffect(() => {
    if (settings) {
      setCompanyForm({
        company_name: settings.company_name || '',
        default_language: settings.default_language || 'pt-BR',
        default_timezone: settings.default_timezone || 'America/Sao_Paulo',
        default_currency: settings.default_currency || 'BRL',
        datetime_format: settings.datetime_format || 'DD/MM/YYYY HH:mm',
      });
      setThemeColors({
        primary_color: settings.primary_color || '#021529',
        secondary_color: settings.secondary_color || '#ffffff',
        accent_color: settings.accent_color || '#3b82f6',
      });
      setSecuritySettings({
        enable_2fa: settings.enable_2fa || false,
        password_policy: settings.password_policy || {
          min_length: 8,
          require_numbers: true,
          require_uppercase: true,
          require_special: true,
        },
      });
    }
  }, [settings]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  // Gerar QR Code automaticamente quando o modal for aberto
  useEffect(() => {
    if (showQRModal && selectedConnection && !selectedConnection.qrCode) {
      generateQRCode(selectedConnection.id).then(result => {
        if (result.success && result.qrCode) {
          setSelectedConnection(prev => prev ? { ...prev, qrCode: result.qrCode } : null);
        }
      });
    }
  }, [showQRModal, selectedConnection, generateQRCode]);

  // Verificar status da conexão periodicamente quando o modal estiver aberto
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (showQRModal && selectedConnection) {
      const checkConnectionStatus = async () => {
        try {
          const response = await fetch(`/api/baileys-simple/connections/${selectedConnection.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              const isConnected = data.data.isConnected;
              const connectionState = data.data.connectionState;
              
              setConnectionStatus(prev => {
                const newStatus = {
                  ...prev,
                  connected: isConnected,
                  connecting: connectionState === 'connecting',
                  lastError: isConnected ? null : prev.lastError,
                  sessionName: data.data.name
                };

                // Se conectou com sucesso, fechar o modal após 3 segundos
                if (isConnected && !prev.connected) {
                  // Atualizar o status da conexão no contexto
                  if (selectedConnection) {
                    updateConnectionStatus(selectedConnection.id);
                  }
                  
                  setTimeout(() => {
                    setShowQRModal(false);
                    success('✅ WhatsApp conectado com sucesso!');
                    // Atualizar a lista de conexões
                    loadConnections();
                  }, 3000);
                }

                return newStatus;
              });
            }
          }
        } catch (error) {
          console.error('Erro ao verificar status da conexão:', error);
        }
      };

      // Verificar imediatamente
      checkConnectionStatus();
      
      // Verificar a cada 1.5 segundos para resposta mais rápida
      intervalId = setInterval(checkConnectionStatus, 1500);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [showQRModal, selectedConnection]);

  // Validar formulário da empresa
  const validateCompanyForm = () => {
    const errors: Record<string, string> = {};
    
    if (!companyForm.company_name.trim()) {
      errors.company_name = 'Nome da empresa é obrigatório';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers para formulários
  const handleCompanyFormChange = (field: string, value: string) => {
    setCompanyForm(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando usuário digita
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleThemeColorChange = (field: string, value: string) => {
    setThemeColors(prev => ({ ...prev, [field]: value }));
  };

  const handleSecurityChange = (field: string, value: any) => {
    if (field === 'password_policy') {
      setSecuritySettings(prev => ({ 
        ...prev, 
        password_policy: { ...prev.password_policy, ...value } 
      }));
    } else {
      setSecuritySettings(prev => ({ ...prev, [field]: value }));
    }
  };

  // Salvar configurações da empresa
  const handleSaveCompanySettings = async () => {
    if (!validateCompanyForm()) {
      showError('Erro de validação', 'Por favor, corrija os campos obrigatórios');
      return;
    }

    try {
      const result = await saveCompanySettings({
        ...companyForm,
        ...themeColors,
        ...securitySettings,
      });

      if (result.success) {
        // Aplicar tema globalmente
        document.documentElement.style.setProperty('--primary-color', themeColors.primary_color);
        document.documentElement.style.setProperty('--secondary-color', themeColors.secondary_color);
        document.documentElement.style.setProperty('--accent-color', themeColors.accent_color);
        
        success('Sucesso!', 'Configurações salvas com sucesso');
      } else {
        showError('Erro', 'Falha ao salvar configurações');
      }
    } catch (error) {
      showError('Erro', 'Erro inesperado ao salvar configurações');
      console.error('Erro ao salvar configurações:', error);
    }
  };

  // Salvar tema
  const handleSaveTheme = async () => {
    try {
      const result = await saveCompanySettings(themeColors);
      if (result.success) {
        // Aplicar tema globalmente
        document.documentElement.style.setProperty('--primary-color', themeColors.primary_color);
        document.documentElement.style.setProperty('--secondary-color', themeColors.secondary_color);
        document.documentElement.style.setProperty('--accent-color', themeColors.accent_color);
        success('Tema aplicado', 'Tema aplicado com sucesso!');
      } else {
        showError('Erro', 'Falha ao aplicar tema');
      }
    } catch (error) {
      showError('Erro', 'Erro inesperado ao aplicar tema');
      console.error('Erro ao aplicar tema:', error);
    }
  };

  // Funções para gerenciar conexões
  const handleViewConnectionDetails = async (connection: any) => {
    setSelectedConnection(connection);
    setShowConnectionDetailsModal(true);
  };

  const handleDisconnectConnection = async (connectionId: string) => {
    try {
      const result = await disconnectWhatsApp(connectionId);
      if (result.success) {
        success('Conexão Desconectada', 'A conexão foi desconectada com sucesso');
        // Remove a conexão da lista após desconectar
        removeDisconnectedConnection(connectionId);
        setShowConnectionDetailsModal(false);
        setSelectedConnection(null);
      } else {
        showError('Erro', result.error || 'Falha ao desconectar');
      }
    } catch (error) {
      showError('Erro', 'Erro inesperado ao desconectar');
    }
  };

  // Delete confirmation handlers
  const handleDeleteClick = (connection: any) => {
    setConnectionToDelete(connection);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!connectionToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteConnection(connectionToDelete.id);
      if (result.success) {
        success('Conexão Excluída', 'A conexão foi excluída permanentemente');
        setShowDeleteModal(false);
        setConnectionToDelete(null);
      } else {
        showError('Erro', result.error || 'Falha ao excluir conexão');
      }
    } catch (error) {
      showError('Erro', 'Erro inesperado ao excluir conexão');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setConnectionToDelete(null);
  };

  // Handlers para CRUD com toasts
  const handleDeleteArea = async (id: string) => {
    try {
      const result = await deleteArea(id);
      if (result.success) {
        success('Área excluída', 'Área excluída com sucesso');
      } else {
        showError('Erro', 'Falha ao excluir área');
      }
      return result;
    } catch (error) {
      showError('Erro', 'Erro inesperado ao excluir área');
      return { success: false, error };
    }
  };

  const handleAddArea = async (name: string, description?: string) => {
    try {
      const result = await addArea(name, description);
      if (result.success) {
        success('Área criada', 'Área criada com sucesso');
      } else {
        showError('Erro', 'Falha ao criar área');
      }
      return result;
    } catch (error) {
      showError('Erro', 'Erro inesperado ao criar área');
      return { success: false, error };
    }
  };

  const handleEditArea = async (id: string, updates: Partial<CompanyArea>) => {
    try {
      const result = await editArea(id, updates);
      if (result.success) {
        success('Área atualizada', 'Área atualizada com sucesso');
      } else {
        showError('Erro', 'Falha ao atualizar área');
      }
      return result;
    } catch (error) {
      showError('Erro', 'Erro inesperado ao atualizar área');
      return { success: false, error };
    }
  };

  const handleAddRole = async (name: string, description?: string) => {
    try {
      const result = await addRole(name, description);
      if (result.success) {
        success('Cargo criado', 'Cargo criado com sucesso');
      } else {
        showError('Erro', 'Falha ao criar cargo');
      }
      return result;
    } catch (error) {
      showError('Erro', 'Erro inesperado ao criar cargo');
      return { success: false, error };
    }
  };

  const handleEditRole = async (id: string, updates: Partial<CompanyRole>) => {
    try {
      const result = await editRole(id, updates);
      if (result.success) {
        success('Cargo atualizado', 'Cargo atualizado com sucesso');
      } else {
        showError('Erro', 'Falha ao atualizar cargo');
      }
      return result;
    } catch (error) {
      showError('Erro', 'Erro inesperado ao atualizar cargo');
      return { success: false, error };
    }
  };

  const handleDeleteRole = async (id: string) => {
    try {
      const result = await deleteRole(id);
      if (result.success) {
        success('Cargo excluído', 'Cargo excluído com sucesso');
      } else {
        showError('Erro', 'Falha ao excluir cargo');
      }
      return result;
    } catch (error) {
      showError('Erro', 'Erro inesperado ao excluir cargo');
      return { success: false, error };
    }
  };

  const handleSavePermissions = async (roleId: string, permissions: Record<string, boolean>) => {
    try {
      console.log('Chamando saveRolePermissions:', { roleId, permissions });
      const result = await saveRolePermissions(roleId, permissions);
      console.log('Resultado saveRolePermissions:', result);
      
      if (result.success) {
        success('Permissões salvas', 'Permissões do cargo atualizadas com sucesso');
      } else {
        showError('Erro', 'Falha ao salvar permissões');
      }
      return result;
    } catch (error) {
      console.error('Erro em handleSavePermissions:', error);
      showError('Erro', 'Erro inesperado ao salvar permissões');
      return { success: false, error };
    }
  };

  // Função para carregar permissões de um cargo
  const handleLoadPermissions = async (roleId: string) => {
    if (!roleId) return;
    
    try {
      setIsLoadingPermissions(true);
      const result = await fetchRolePermissions(roleId);
      if (result.success) {
        setPermissions(result.data || {});
      } else {
        showError('Erro', 'Falha ao carregar permissões');
      }
    } catch (error) {
      showError('Erro', 'Erro inesperado ao carregar permissões');
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  // Função para atualizar uma permissão específica
  const handlePermissionChange = (permissionKey: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [permissionKey]: checked
    }));
  };

  // Função para salvar todas as permissões
  const handleSaveAllPermissions = async () => {
    if (!selectedRoleId) {
      showError('Erro', 'Selecione um cargo primeiro');
      return;
    }

    console.log('Salvando permissões:', { selectedRoleId, permissions });
    setIsLoadingPermissions(true);
    
    try {
      await handleSavePermissions(selectedRoleId, permissions);
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  // Efeito para carregar permissões quando o cargo selecionado mudar
  useEffect(() => {
    if (selectedRoleId) {
      handleLoadPermissions(selectedRoleId);
    } else {
      setPermissions({});
    }
  }, [selectedRoleId]);

  // Carregar áreas e cargos quando o componente for montado
  useEffect(() => {
    if (user?.id) {
      fetchAreas();
      fetchRoles();
    }
  }, [user?.id, fetchAreas, fetchRoles]);

  const handleDeleteUser = async (id: string) => {
    try {
      const result = await deleteUser(id);
      if (result.success) {
        success('Usuário excluído', 'Usuário excluído com sucesso');
      } else {
        showError('Erro', 'Falha ao excluir usuário');
      }
      return result;
    } catch (error) {
      showError('Erro', 'Erro inesperado ao excluir usuário');
      return { success: false, error };
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const result = await updateUserStatus(userId, newStatus);
      if (result.success) {
        const statusText = newStatus === 'active' ? 'ativado' : newStatus === 'inactive' ? 'desativado' : 'aprovado';
        success('Status alterado', `Usuário ${statusText} com sucesso`);
      } else {
        showError('Erro', 'Falha ao alterar status do usuário');
      }
      return result;
    } catch (error) {
      showError('Erro', 'Erro inesperado ao alterar status');
      return { success: false, error };
    }
  };

  // Toggle de usuário expandido
  const toggleUserExpanded = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  // Badges de status
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode; text: string }> = {
      active: {
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: <UserCheck className="h-3 w-3" />,
        text: 'Ativo'
      },
      pending: {
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Clock className="h-3 w-3" />,
        text: 'Pendente'
      },
      inactive: {
        className: 'bg-red-100 text-red-800 border-red-200',
        icon: <UserX className="h-3 w-3" />,
        text: 'Inativo'
      },
      suspended: {
        className: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: <AlertTriangle className="h-3 w-3" />,
        text: 'Suspenso'
      },
    };

    const variant = variants[status] || variants.inactive;
    return (
      <Badge className={`${variant.className} flex items-center gap-1 border`}>
        {variant.icon}
        {variant.text}
      </Badge>
    );
  };

  // Ações de status
  const getStatusActions = (user: any) => {
    const currentStatus = user.status;
    
    if (currentStatus === 'active') {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleStatusChange(user.id, 'inactive')}
          className="text-orange-600 border-orange-200 hover:bg-orange-50"
        >
          Desativar
        </Button>
      );
    } else if (currentStatus === 'inactive') {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleStatusChange(user.id, 'active')}
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          Ativar
        </Button>
      );
    } else if (currentStatus === 'pending') {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleStatusChange(user.id, 'active')}
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          Aprovar
        </Button>
      );
    } else {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleStatusChange(user.id, 'active')}
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          Reativar
        </Button>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FA]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#333]">Configurações</h1>
          <p className="text-gray-600 mt-2">Gerencie as configurações do sistema e da empresa</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-5'} w-full bg-white shadow-sm border border-gray-200`}>
            <TabsTrigger value="company" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Building2 className="h-4 w-4" />
              {!isMobile && 'Empresa'}
            </TabsTrigger>
            <TabsTrigger value="structure" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <SettingsIcon className="h-4 w-4" />
              {!isMobile && 'Estrutura'}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users className="h-4 w-4" />
              {!isMobile && 'Usuários'}
            </TabsTrigger>
            <TabsTrigger value="connections" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Link className="h-4 w-4" />
              {!isMobile && 'Conexões'}
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Shield className="h-4 w-4" />
              {!isMobile && 'Segurança'}
            </TabsTrigger>
          </TabsList>

          {/* Tela 1 - Empresa */}
          <TabsContent value="company" className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#333] mb-6 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Informações da Empresa
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="text-sm font-medium text-gray-700">
                    Nome da empresa *
                  </Label>
                  <Input
                    id="company_name"
                    value={companyForm.company_name}
                    onChange={(e) => handleCompanyFormChange('company_name', e.target.value)}
                    placeholder="Digite o nome da empresa"
                    className={`h-10 rounded-md border-gray-300 focus:border-primary focus:ring-primary ${
                      formErrors.company_name ? 'border-red-500' : ''
                    }`}
                    required
                  />
                  {formErrors.company_name && (
                    <p className="text-sm text-red-600">{formErrors.company_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_language" className="text-sm font-medium text-gray-700">
                    Idioma padrão
                  </Label>
                  <Select value={companyForm.default_language} onValueChange={(value) => handleCompanyFormChange('default_language', value)}>
                    <SelectTrigger className="h-10 rounded-md border-gray-300 focus:border-primary focus:ring-primary">
                      <SelectValue placeholder="Selecione o idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">Inglês (EUA)</SelectItem>
                      <SelectItem value="es">Espanhol</SelectItem>
                      <SelectItem value="fr">Francês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_timezone" className="text-sm font-medium text-gray-700">
                    Fuso horário padrão
                  </Label>
                  <Select value={companyForm.default_timezone} onValueChange={(value) => handleCompanyFormChange('default_timezone', value)}>
                    <SelectTrigger className="h-10 rounded-md border-gray-300 focus:border-primary focus:ring-primary">
                      <SelectValue placeholder="Selecione o fuso horário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">São Paulo (UTC-3)</SelectItem>
                      <SelectItem value="America/Manaus">Manaus (UTC-4)</SelectItem>
                      <SelectItem value="America/Belem">Belém (UTC-3)</SelectItem>
                      <SelectItem value="America/New_York">Nova York (UTC-5)</SelectItem>
                      <SelectItem value="Europe/London">Londres (UTC+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_currency" className="text-sm font-medium text-gray-700">
                    Moeda padrão
                  </Label>
                  <Select value={companyForm.default_currency} onValueChange={(value) => handleCompanyFormChange('default_currency', value)}>
                    <SelectTrigger className="h-10 rounded-md border-gray-300 focus:border-primary focus:ring-primary">
                      <SelectValue placeholder="Selecione a moeda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">BRL (Real Brasileiro)</SelectItem>
                      <SelectItem value="USD">USD (Dólar Americano)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      <SelectItem value="GBP">GBP (Libra Esterlina)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="datetime_format" className="text-sm font-medium text-gray-700">
                    Formato de data e hora
                  </Label>
                  <Select value={companyForm.datetime_format} onValueChange={(value) => handleCompanyFormChange('datetime_format', value)}>
                    <SelectTrigger className="h-10 rounded-md border-gray-300 focus:border-primary focus:ring-primary">
                      <SelectValue placeholder="Selecione o formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY HH:mm">DD/MM/YYYY HH:mm</SelectItem>
                      <SelectItem value="MM/DD/YYYY HH:mm">MM/DD/YYYY HH:mm</SelectItem>
                      <SelectItem value="YYYY-MM-DD HH:mm">YYYY-MM-DD HH:mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Button 
                  onClick={handleSaveCompanySettings}
                  className="bg-primary text-white rounded-md px-6 py-2 hover:bg-primary/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Tela 2 - Estrutura da Empresa */}
          <TabsContent value="structure" className="space-y-6">
            {/* Seção: Áreas */}
            <Collapsible className="bg-white rounded-lg shadow-sm border border-gray-200">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900">Áreas da Empresa</h3>
                </div>
                <ChevronDown className="h-5 w-5 text-gray-500 transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-6 pb-6">
                <div className="flex justify-end mb-4">
                  <AddItemModal
                    title="Adicionar Área"
                    itemType="area"
                    onAdd={handleAddArea}
                  />
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">Nome da Área</TableHead>
                      <TableHead className="font-semibold text-gray-700">Descrição</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {areas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                          Nenhuma área cadastrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      areas.map((area) => (
                        <TableRow key={area.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{area.name}</TableCell>
                          <TableCell className="text-gray-600">{area.description || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <EditItemModal
                                item={area}
                                itemType="area"
                                onEdit={handleEditArea}
                              />
                              <DeleteConfirmModal
                                itemName={area.name}
                                itemType="area"
                                onDelete={() => handleDeleteArea(area.id)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CollapsibleContent>
            </Collapsible>

            {/* Seção: Cargos */}
            <Collapsible className="bg-white rounded-lg shadow-sm border border-gray-200">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900">Cargos</h3>
                </div>
                <ChevronDown className="h-5 w-5 text-gray-500 transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-6 pb-6">
                <div className="flex justify-end mb-4">
                  <AddItemModal
                    title="Adicionar Cargo"
                    itemType="role"
                    onAdd={handleAddRole}
                  />
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">Nome do Cargo</TableHead>
                      <TableHead className="font-semibold text-gray-700">Descrição</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                          Nenhum cargo cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      roles.map((role) => (
                        <TableRow key={role.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell className="text-gray-600">{role.description || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <EditItemModal
                                item={role}
                                itemType="role"
                                onEdit={handleEditRole}
                              />
                              <DeleteConfirmModal
                                itemName={role.name}
                                itemType="role"
                                onDelete={() => handleDeleteRole(role.id)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CollapsibleContent>
            </Collapsible>

            {/* Seção: Permissões por Cargo */}
            <Collapsible className="bg-white rounded-lg shadow-sm border border-gray-200">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900">Permissões por Cargo (RBAC)</h3>
                </div>
                <ChevronDown className="h-5 w-5 text-gray-500 transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-6 pb-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Selecionar Cargo</Label>
                    <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                      <SelectTrigger className="w-64 h-10 rounded-md border-gray-300 focus:border-primary focus:ring-primary">
                        <SelectValue placeholder="Selecione um cargo para configurar permissões" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Atividades */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h5 className="font-medium text-gray-900">Atividades</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="atividades_criar_atividades" 
                            checked={permissions['atividades_criar_atividades'] || false}
                            onCheckedChange={(checked) => handlePermissionChange('atividades_criar_atividades', checked as boolean)}
                          />
                          <Label htmlFor="atividades_criar_atividades" className="text-sm font-normal">
                            Criar Atividades?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="atividades_visualizar_todas_atividades" 
                            checked={permissions['atividades_visualizar_todas_atividades'] || false}
                            onCheckedChange={(checked) => handlePermissionChange('atividades_visualizar_todas_atividades', checked as boolean)}
                          />
                          <Label htmlFor="atividades_visualizar_todas_atividades" className="text-sm font-normal">
                            Visualizar Todas as Atividades?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="atividades_visualizar_somente_responsavel" 
                            checked={permissions['atividades_visualizar_somente_responsavel'] || false}
                            onCheckedChange={(checked) => handlePermissionChange('atividades_visualizar_somente_responsavel', checked as boolean)}
                          />
                          <Label htmlFor="atividades_visualizar_somente_responsavel" className="text-sm font-normal">
                            Visualizar somente as que está como responsável?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="atividades_finalizar_sprint" 
                            checked={permissions['atividades_finalizar_sprint'] || false}
                            onCheckedChange={(checked) => handlePermissionChange('atividades_finalizar_sprint', checked as boolean)}
                          />
                          <Label htmlFor="atividades_finalizar_sprint" className="text-sm font-normal">
                            Finalizar Sprint?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="atividades_iniciar_sprint" 
                            checked={permissions['atividades_iniciar_sprint'] || false}
                            onCheckedChange={(checked) => handlePermissionChange('atividades_iniciar_sprint', checked as boolean)}
                          />
                          <Label htmlFor="atividades_iniciar_sprint" className="text-sm font-normal">
                            Iniciar sprint?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="atividades_visualizar_dashboard" 
                            checked={permissions['atividades_visualizar_dashboard'] || false}
                            onCheckedChange={(checked) => handlePermissionChange('atividades_visualizar_dashboard', checked as boolean)}
                          />
                          <Label htmlFor="atividades_visualizar_dashboard" className="text-sm font-normal">
                            Visualizar dashboard?
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Projetos */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h5 className="font-medium text-gray-900">Projetos</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="projetos_criar_projetos" 
                            checked={permissions['projetos_criar_projetos'] || false}
                            onCheckedChange={checked => handlePermissionChange('projetos_criar_projetos', checked as boolean)}
                          />
                          <Label htmlFor="projetos_criar_projetos" className="text-sm font-normal">
                            Criar Projetos?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="projetos_excluir_projetos" 
                            checked={permissions['projetos_excluir_projetos'] || false}
                            onCheckedChange={checked => handlePermissionChange('projetos_excluir_projetos', checked as boolean)}
                          />
                          <Label htmlFor="projetos_excluir_projetos" className="text-sm font-normal">
                            Excluir Projetos?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="projetos_arquivar_projetos" 
                            checked={permissions['projetos_arquivar_projetos'] || false}
                            onCheckedChange={checked => handlePermissionChange('projetos_arquivar_projetos', checked as boolean)}
                          />
                          <Label htmlFor="projetos_arquivar_projetos" className="text-sm font-normal">
                            Arquivar Projetos?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="projetos_visualizar_todos" 
                            checked={permissions['projetos_visualizar_todos'] || false}
                            onCheckedChange={checked => handlePermissionChange('projetos_visualizar_todos', checked as boolean)}
                          />
                          <Label htmlFor="projetos_visualizar_todos" className="text-sm font-normal">
                            Visualizar todos?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="projetos_visualizar_somente_responsavel" 
                            checked={permissions['projetos_visualizar_somente_responsavel'] || false}
                            onCheckedChange={checked => handlePermissionChange('projetos_visualizar_somente_responsavel', checked as boolean)}
                          />
                          <Label htmlFor="projetos_visualizar_somente_responsavel" className="text-sm font-normal">
                            Visualizar somente as que é responsável?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="projetos_visualizar_dashboard" 
                            checked={permissions['projetos_visualizar_dashboard'] || false}
                            onCheckedChange={checked => handlePermissionChange('projetos_visualizar_dashboard', checked as boolean)}
                          />
                          <Label htmlFor="projetos_visualizar_dashboard" className="text-sm font-normal">
                            Visualizar Dashboard?
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Empresas */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h5 className="font-medium text-gray-900">Empresas</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="empresas_visualizar_todas" 
                            checked={permissions['empresas_visualizar_todas'] || false}
                            onCheckedChange={checked => handlePermissionChange('empresas_visualizar_todas', checked as boolean)}
                          />
                          <Label htmlFor="empresas_visualizar_todas" className="text-sm font-normal">
                            Visualizar todas?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="empresas_criar_tarefas" 
                            checked={permissions['empresas_criar_tarefas'] || false}
                            onCheckedChange={checked => handlePermissionChange('empresas_criar_tarefas', checked as boolean)}
                          />
                          <Label htmlFor="empresas_criar_tarefas" className="text-sm font-normal">
                            Criar tarefas?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="empresas_excluir_empresas" 
                            checked={permissions['empresas_excluir_empresas'] || false}
                            onCheckedChange={checked => handlePermissionChange('empresas_excluir_empresas', checked as boolean)}
                          />
                          <Label htmlFor="empresas_excluir_empresas" className="text-sm font-normal">
                            Excluir empresas?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="empresas_arquivar_empresas" 
                            checked={permissions['empresas_arquivar_empresas'] || false}
                            onCheckedChange={checked => handlePermissionChange('empresas_arquivar_empresas', checked as boolean)}
                          />
                          <Label htmlFor="empresas_arquivar_empresas" className="text-sm font-normal">
                            Arquivar empresas?
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Inventário */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h5 className="font-medium text-gray-900">Inventário</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="inventario_arquivar_produto" 
                            checked={permissions['inventario_arquivar_produto'] || false}
                            onCheckedChange={checked => handlePermissionChange('inventario_arquivar_produto', checked as boolean)}
                          />
                          <Label htmlFor="inventario_arquivar_produto" className="text-sm font-normal">
                            Arquivar Produto?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="inventario_criar_produto" 
                            checked={permissions['inventario_criar_produto'] || false}
                            onCheckedChange={checked => handlePermissionChange('inventario_criar_produto', checked as boolean)}
                          />
                          <Label htmlFor="inventario_criar_produto" className="text-sm font-normal">
                            Criar Produto?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="inventario_excluir_produto" 
                            checked={permissions['inventario_excluir_produto'] || false}
                            onCheckedChange={checked => handlePermissionChange('inventario_excluir_produto', checked as boolean)}
                          />
                          <Label htmlFor="inventario_excluir_produto" className="text-sm font-normal">
                            Excluir Produto?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="inventario_visualizar_produto" 
                            checked={permissions['inventario_visualizar_produto'] || false}
                            onCheckedChange={checked => handlePermissionChange('inventario_visualizar_produto', checked as boolean)}
                          />
                          <Label htmlFor="inventario_visualizar_produto" className="text-sm font-normal">
                            Visualizar produto?
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Leads e Vendas */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h5 className="font-medium text-gray-900">Leads e Vendas</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="leads_vendas_visualizar_pagina" 
                            checked={permissions['leads_vendas_visualizar_pagina'] || false}
                            onCheckedChange={checked => handlePermissionChange('leads_vendas_visualizar_pagina', checked as boolean)}
                          />
                          <Label htmlFor="leads_vendas_visualizar_pagina" className="text-sm font-normal">
                            Visualizar Página?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="leads_vendas_criar_card" 
                            checked={permissions['leads_vendas_criar_card'] || false}
                            onCheckedChange={checked => handlePermissionChange('leads_vendas_criar_card', checked as boolean)}
                          />
                          <Label htmlFor="leads_vendas_criar_card" className="text-sm font-normal">
                            Criar card?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="leads_vendas_excluir_card" 
                            checked={permissions['leads_vendas_excluir_card'] || false}
                            onCheckedChange={checked => handlePermissionChange('leads_vendas_excluir_card', checked as boolean)}
                          />
                          <Label htmlFor="leads_vendas_excluir_card" className="text-sm font-normal">
                            Excluir card?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="leads_vendas_mover_card_etapa" 
                            checked={permissions['leads_vendas_mover_card_etapa'] || false}
                            onCheckedChange={checked => handlePermissionChange('leads_vendas_mover_card_etapa', checked as boolean)}
                          />
                          <Label htmlFor="leads_vendas_mover_card_etapa" className="text-sm font-normal">
                            Mover card de etapa?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="leads_vendas_visualizar_todas" 
                            checked={permissions['leads_vendas_visualizar_todas'] || false}
                            onCheckedChange={checked => handlePermissionChange('leads_vendas_visualizar_todas', checked as boolean)}
                          />
                          <Label htmlFor="leads_vendas_visualizar_todas" className="text-sm font-normal">
                            Visualizar todas?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="leads_vendas_visualizar_somente_responsavel" 
                            checked={permissions['leads_vendas_visualizar_somente_responsavel'] || false}
                            onCheckedChange={checked => handlePermissionChange('leads_vendas_visualizar_somente_responsavel', checked as boolean)}
                          />
                          <Label htmlFor="leads_vendas_visualizar_somente_responsavel" className="text-sm font-normal">
                            Visualizar somente as que é responsável?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="leads_vendas_visualizar_dashboard" 
                            checked={permissions['leads_vendas_visualizar_dashboard'] || false}
                            onCheckedChange={checked => handlePermissionChange('leads_vendas_visualizar_dashboard', checked as boolean)}
                          />
                          <Label htmlFor="leads_vendas_visualizar_dashboard" className="text-sm font-normal">
                            Visualizar dashboard?
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Calendário */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h5 className="font-medium text-gray-900">Calendário</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="calendario_atividades_proprias" 
                            checked={permissions['calendario_atividades_proprias'] || false}
                            onCheckedChange={checked => handlePermissionChange('calendario_atividades_proprias', checked as boolean)}
                          />
                          <Label htmlFor="calendario_atividades_proprias" className="text-sm font-normal">
                            Atividades Próprias?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="calendario_todas_atividades" 
                            checked={permissions['calendario_todas_atividades'] || false}
                            onCheckedChange={checked => handlePermissionChange('calendario_todas_atividades', checked as boolean)}
                          />
                          <Label htmlFor="calendario_todas_atividades" className="text-sm font-normal">
                            Todas as Atividades?
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Colaboração */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h5 className="font-medium text-gray-900">Colaboração</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="colaboracao_visualizar_pagina" 
                            checked={permissions['colaboracao_visualizar_pagina'] || false}
                            onCheckedChange={checked => handlePermissionChange('colaboracao_visualizar_pagina', checked as boolean)}
                          />
                          <Label htmlFor="colaboracao_visualizar_pagina" className="text-sm font-normal">
                            Visualizar página?
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Funcionários */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h5 className="font-medium text-gray-900">Funcionários</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="funcionarios_visualizar_pagina" 
                            checked={permissions['funcionarios_visualizar_pagina'] || false}
                            onCheckedChange={checked => handlePermissionChange('funcionarios_visualizar_pagina', checked as boolean)}
                          />
                          <Label htmlFor="funcionarios_visualizar_pagina" className="text-sm font-normal">
                            Visualizar página?
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Grupos de Trabalho */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h5 className="font-medium text-gray-900">Grupos de Trabalho</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="grupos_trabalho_visualizar_pagina" 
                            checked={permissions['grupos_trabalho_visualizar_pagina'] || false}
                            onCheckedChange={checked => handlePermissionChange('grupos_trabalho_visualizar_pagina', checked as boolean)}
                          />
                          <Label htmlFor="grupos_trabalho_visualizar_pagina" className="text-sm font-normal">
                            Visualizar página?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="grupos_trabalho_criar_grupo" 
                            checked={permissions['grupos_trabalho_criar_grupo'] || false}
                            onCheckedChange={checked => handlePermissionChange('grupos_trabalho_criar_grupo', checked as boolean)}
                          />
                          <Label htmlFor="grupos_trabalho_criar_grupo" className="text-sm font-normal">
                            Criar grupo?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="grupos_trabalho_excluir_grupo" 
                            checked={permissions['grupos_trabalho_excluir_grupo'] || false}
                            onCheckedChange={checked => handlePermissionChange('grupos_trabalho_excluir_grupo', checked as boolean)}
                          />
                          <Label htmlFor="grupos_trabalho_excluir_grupo" className="text-sm font-normal">
                            Excluir grupo?
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Arquivos */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h5 className="font-medium text-gray-900">Arquivos</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="arquivos_visualizar_pagina" 
                            checked={permissions['arquivos_visualizar_pagina'] || false}
                            onCheckedChange={checked => handlePermissionChange('arquivos_visualizar_pagina', checked as boolean)}
                          />
                          <Label htmlFor="arquivos_visualizar_pagina" className="text-sm font-normal">
                            Visualizar página?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="arquivos_visualizar_arquivos" 
                            checked={permissions['arquivos_visualizar_arquivos'] || false}
                            onCheckedChange={checked => handlePermissionChange('arquivos_visualizar_arquivos', checked as boolean)}
                          />
                          <Label htmlFor="arquivos_visualizar_arquivos" className="text-sm font-normal">
                            Visualizar arquivos?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="arquivos_adicionar_arquivos" 
                            checked={permissions['arquivos_adicionar_arquivos'] || false}
                            onCheckedChange={checked => handlePermissionChange('arquivos_adicionar_arquivos', checked as boolean)}
                          />
                          <Label htmlFor="arquivos_adicionar_arquivos" className="text-sm font-normal">
                            Adicionar arquivos?
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Relatórios */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h5 className="font-medium text-gray-900">Relatórios</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="relatorios_visualizar_pagina" 
                            checked={permissions['relatorios_visualizar_pagina'] || false}
                            onCheckedChange={checked => handlePermissionChange('relatorios_visualizar_pagina', checked as boolean)}
                          />
                          <Label htmlFor="relatorios_visualizar_pagina" className="text-sm font-normal">
                            Visualizar página?
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="relatorios_baixar_arquivos" 
                            checked={permissions['relatorios_baixar_arquivos'] || false}
                            onCheckedChange={checked => handlePermissionChange('relatorios_baixar_arquivos', checked as boolean)}
                          />
                          <Label htmlFor="relatorios_baixar_arquivos" className="text-sm font-normal">
                            Baixar arquivos?
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      className="bg-primary text-white rounded-md px-6 py-2 hover:bg-primary/90"
                      onClick={handleSaveAllPermissions}
                      disabled={!selectedRoleId || isLoadingPermissions}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isLoadingPermissions ? 'Carregando...' : 'Salvar Permissões'}
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Seção: Identidade Visual */}
            <Collapsible className="bg-white rounded-lg shadow-sm border border-gray-200">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Palette className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900">Identidade Visual</h3>
                </div>
                <ChevronDown className="h-5 w-5 text-gray-500 transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-6 pb-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Logo da empresa</Label>
                    <LogoUpload
                      currentLogoUrl={settings.logo_url}
                      onLogoChange={updateLogo}
                      onLogoRemove={removeLogo}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ColorPicker
                      label="Cor Primária"
                      value={themeColors.primary_color}
                      onChange={(value) => handleThemeColorChange('primary_color', value)}
                    />
                    <ColorPicker
                      label="Cor Secundária"
                      value={themeColors.secondary_color}
                      onChange={(value) => handleThemeColorChange('secondary_color', value)}
                    />
                    <ColorPicker
                      label="Cor de Destaque"
                      value={themeColors.accent_color}
                      onChange={(value) => handleThemeColorChange('accent_color', value)}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveTheme} className="bg-primary text-white rounded-md px-6 py-2 hover:bg-primary/90">
                      <Palette className="h-4 w-4 mr-2" />
                      Aplicar Tema
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          {/* Tela 3 - Usuários e Permissões */}
          <TabsContent value="users" className="space-y-6">
            {/* Cadastro de Usuário */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#333] flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Cadastro de Usuário
                </h2>
                <AddUserModal
                  areas={areas}
                  roles={roles}
                  onAdd={addUser}
                />
              </div>
            </div>

            {/* Lista de Usuários */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#333] mb-6 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Lista de Usuários
              </h2>
              
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700">Nome</TableHead>
                    <TableHead className="font-semibold text-gray-700">E-mail</TableHead>
                    <TableHead className="font-semibold text-gray-700">Cargo</TableHead>
                    <TableHead className="font-semibold text-gray-700">Área</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        Nenhum usuário cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <>
                        <TableRow key={user.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell className="text-gray-600">{user.email}</TableCell>
                          <TableCell className="text-gray-600">
                            {roles.find(r => r.id === user.role_id)?.name || '-'}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {areas.find(a => a.id === user.area_id)?.name || '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {getStatusActions(user)}
                              <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <DeleteConfirmModal
                                itemName={user.full_name}
                                itemType="user"
                                onDelete={() => handleDeleteUser(user.id)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {/* Linha expandível */}
                        {expandedUsers.has(user.id) && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-gray-50 p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium">Último login:</span>
                                    <span className="text-gray-600">
                                      {user.last_login ? new Date(user.last_login).toLocaleString('pt-BR') : 'Nunca'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium">IP:</span>
                                    <span className="text-gray-600">{user.last_login_ip || '-'}</span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium">Data de nascimento:</span>
                                    <span className="text-gray-600">
                                      {user.birth_date ? new Date(user.birth_date).toLocaleDateString('pt-BR') : '-'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium">Telefone:</span>
                                    <span className="text-gray-600">{user.phone || '-'}</span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Tela 4 - Conexões */}
          <TabsContent value="connections" className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#333] flex items-center gap-2">
                  <Link className="h-5 w-5 text-primary" />
                  Gerenciar Conexões
                </h2>
                <Button 
                  onClick={() => setShowConnectionModal(true)}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Conexão
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connections.map((connection) => (
                  <div key={connection.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {connection.type === 'whatsapp_baileys' && <MessageSquare className="h-5 w-5 text-green-600" />}
                        {connection.type === 'whatsapp_cloud' && <Cloud className="h-5 w-5 text-blue-600" />}
                        {connection.type === 'webhook' && <Webhook className="h-5 w-5 text-purple-600" />}
                        <h3 className="font-semibold text-gray-900">{connection.name}</h3>
                      </div>
                      <Badge 
                        variant={connection.status === 'connected' ? 'default' : 'secondary'}
                        className={connection.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {connection.type === 'whatsapp_baileys' && 'Baileys'} 
                        {connection.type === 'whatsapp_cloud' && 'Cloud API'} 
                        {connection.type === 'webhook' && 'Webhook'} 
                        {' • '}
                        {connection.status === 'connected' ? 'Conectado' : 
                         connection.status === 'active' ? 'Ativo' : 'Desconectado'}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      <p><strong>Tipo:</strong> {
                        connection.type === 'whatsapp_baileys' ? 'WhatsApp Baileys' :
                        connection.type === 'whatsapp_cloud' ? 'WhatsApp Cloud API' :
                        'Webhook'
                      }</p>
                      {connection.url && <p><strong>URL:</strong> {connection.url}</p>}
                    </div>

                    <div className="flex gap-2">
                      {connection.status === 'connected' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewConnectionDetails(connection)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalhes
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (connection.status === 'connected') {
                            // Desconectar
                            await handleDisconnectConnection(connection.id);
                          } else {
                            // Conectar - para Baileys mostra QR Code, para outros conecta diretamente
                            if (connection.type === 'whatsapp_baileys') {
                              setSelectedConnection(connection);
                              setShowQRModal(true);
                            } else {
                              await connectWhatsApp(connection.id);
                            }
                          }
                        }}
                        className="flex-1"
                      >
                        {connection.status === 'connected' ? 'Desconectar' : 'Conectar'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingConnection(connection);
                          setConnectionForm({
                            name: connection.name,
                            type: connection.type,
                            description: connection.description || '',
                            accessToken: connection.accessToken || '',
                            phoneNumberId: connection.phoneNumberId || '',
                            businessAccountId: connection.businessAccountId || '',
                            webhookUrl: connection.webhookUrl || '',
                            webhookToken: connection.webhookToken || ''
                          });
                          setShowConnectionModal(true);
                        }}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(connection)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {connections.length === 0 && (
                <div className="text-center py-12">
                  <Link className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conexão configurada</h3>
                  <p className="text-gray-600 mb-4">Comece criando sua primeira conexão para integrar com WhatsApp ou outros serviços.</p>
                  <Button 
                    onClick={() => setShowConnectionModal(true)}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Conexão
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tela 5 - Segurança */}
          <TabsContent value="security" className="space-y-6">
            {/* 2FA */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#333] mb-6 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Autenticação de Dois Fatores (2FA)
              </h2>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">Ativar 2FA</Label>
                  <p className="text-sm text-gray-600">Requer autenticação adicional para login</p>
                </div>
                <Switch
                  checked={securitySettings.enable_2fa}
                  onCheckedChange={(checked) => handleSecurityChange('enable_2fa', checked)}
                />
              </div>
            </div>

            {/* Política de Senha */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#333] mb-6 flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Política de Senha
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="min_length" className="text-sm font-medium text-gray-700">
                    Mínimo de caracteres
                  </Label>
                  <Input
                    id="min_length"
                    type="number"
                    value={securitySettings.password_policy.min_length}
                    onChange={(e) => handleSecurityChange('password_policy', {
                      min_length: parseInt(e.target.value)
                    })}
                    className="w-32 h-10 rounded-md border-gray-300 focus:border-primary focus:ring-primary"
                    min="6"
                    max="20"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">Requisitos da senha</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={securitySettings.password_policy.require_numbers}
                        onCheckedChange={(checked) => handleSecurityChange('password_policy', {
                          require_numbers: checked
                        })}
                      />
                      <Label className="text-sm text-gray-700">Exigir números</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={securitySettings.password_policy.require_uppercase}
                        onCheckedChange={(checked) => handleSecurityChange('password_policy', {
                          require_uppercase: checked
                        })}
                      />
                      <Label className="text-sm text-gray-700">Exigir letras maiúsculas</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={securitySettings.password_policy.require_special}
                        onCheckedChange={(checked) => handleSecurityChange('password_policy', {
                          require_special: checked
                        })}
                      />
                      <Label className="text-sm text-gray-700">Exigir caracteres especiais</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tentativas de Login Falhas */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#333] mb-6 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Tentativas de Login Falhas
              </h2>
              
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700">Data/Hora</TableHead>
                    <TableHead className="font-semibold text-gray-700">IP</TableHead>
                    <TableHead className="font-semibold text-gray-700">Usuário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                      Nenhuma tentativa de login falha registrada
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Alterar Senha */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#333] mb-6 flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Alterar Senha
              </h2>
              
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="current_password" className="text-sm font-medium text-gray-700">
                    Senha atual
                  </Label>
                  <Input
                    id="current_password"
                    type="password"
                    className="h-10 rounded-md border-gray-300 focus:border-primary focus:ring-primary"
                    placeholder="Digite sua senha atual"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password" className="text-sm font-medium text-gray-700">
                    Nova senha
                  </Label>
                  <Input
                    id="new_password"
                    type="password"
                    className="h-10 rounded-md border-gray-300 focus:border-primary focus:ring-primary"
                    placeholder="Digite a nova senha"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-sm font-medium text-gray-700">
                    Confirmar nova senha
                  </Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    className="h-10 rounded-md border-gray-300 focus:border-primary focus:ring-primary"
                    placeholder="Confirme a nova senha"
                  />
                </div>
                <Button className="w-full bg-primary text-white rounded-md hover:bg-primary/90">
                  Alterar Senha
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Botão FAB para mobile */}
        {isMobile && activeTab === 'company' && (
          <div className="fixed bottom-6 right-6">
            <Button
              onClick={handleSaveCompanySettings}
              className="rounded-full w-14 h-14 shadow-lg bg-primary text-white hover:bg-primary/90"
            >
              <Save className="h-6 w-6" />
            </Button>
          </div>
        )}

        {/* Modal para criar/editar conexão */}
        {showConnectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                  {editingConnection ? 'Editar Conexão' : 'Nova Conexão'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowConnectionModal(false);
                    setEditingConnection(null);
                    setConnectionForm({
                      name: '',
                      type: 'whatsapp_baileys',
                      description: '',
                      accessToken: '',
                      phoneNumberId: '',
                      businessAccountId: '',
                      webhookUrl: '',
                      webhookToken: ''
                    });
                  }}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
              
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  await handleFormSubmit();
                }}
                onKeyDown={(e) => {
                  // Intercepta Enter em qualquer campo (exceto textarea)
                  if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                    e.preventDefault();
                    handleFormSubmit();
                  }
                }}
              >
              <div className="space-y-6">
                {/* Informações Básicas */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Informações Básicas</h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="connection-name" className="text-sm font-medium text-gray-700">
                        Nome da Conexão *
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="connection-name"
                          value={connectionForm.name}
                          onChange={(e) => setConnectionForm({...connectionForm, name: e.target.value})}
                          placeholder="Ex: WhatsApp Principal"
                          className="pr-10"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <Lock className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="connection-type" className="text-sm font-medium text-gray-700">
                        Tipo de Conexão *
                      </Label>
                      <Select 
                        value={connectionForm.type} 
                        onValueChange={(value) => setConnectionForm({...connectionForm, type: value})}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp_baileys">
                            Baileys (WhatsApp Web)
                          </SelectItem>
                          <SelectItem value="whatsapp_cloud">
                            WhatsApp Cloud API
                          </SelectItem>
                          <SelectItem value="webhook">
                            Conexão de Webhook
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="connection-description" className="text-sm font-medium text-gray-700">
                        Descrição
                      </Label>
                      <textarea
                        id="connection-description"
                        value={connectionForm.description}
                        onChange={(e) => setConnectionForm({...connectionForm, description: e.target.value})}
                        placeholder="Descrição da conexão"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Configurações específicas baseadas no tipo */}
                {connectionForm.type === 'whatsapp_baileys' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Conexão Baileys</p>
                        <p>O nome da sessão será gerado automaticamente. Apenas preencha as informações básicas acima.</p>
                      </div>
                    </div>
                  </div>
                )}

                {connectionForm.type === 'whatsapp_cloud' && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">Configurações Cloud API</h4>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="access-token" className="text-sm font-medium text-gray-700">
                          Access Token *
                        </Label>
                        <Input
                          id="access-token"
                          value={connectionForm.accessToken}
                          onChange={(e) => setConnectionForm({...connectionForm, accessToken: e.target.value})}
                          placeholder="Seu access token do WhatsApp Business API"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone-number-id" className="text-sm font-medium text-gray-700">
                          Phone Number ID *
                        </Label>
                        <div className="relative mt-1">
                          <Input
                            id="phone-number-id"
                            value={connectionForm.phoneNumberId}
                            onChange={(e) => setConnectionForm({...connectionForm, phoneNumberId: e.target.value})}
                            placeholder="ID do número de telefone"
                            className="pr-10"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <Lock className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="business-account-id" className="text-sm font-medium text-gray-700">
                          Business Account ID *
                        </Label>
                        <Input
                          id="business-account-id"
                          value={connectionForm.businessAccountId}
                          onChange={(e) => setConnectionForm({...connectionForm, businessAccountId: e.target.value})}
                          placeholder="ID da conta comercial"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="webhook-url" className="text-sm font-medium text-gray-700">
                          Webhook URL
                        </Label>
                        <Input
                          id="webhook-url"
                          value={connectionForm.webhookUrl}
                          onChange={(e) => setConnectionForm({...connectionForm, webhookUrl: e.target.value})}
                          placeholder="https://seu-dominio.com/webhook"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="webhook-token" className="text-sm font-medium text-gray-700">
                          Webhook Token
                        </Label>
                        <Input
                          id="webhook-token"
                          value={connectionForm.webhookToken}
                          onChange={(e) => setConnectionForm({...connectionForm, webhookToken: e.target.value})}
                          placeholder="Token de verificação do webhook"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {connectionForm.type === 'webhook' && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">Configurações Webhook</h4>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="webhook-url" className="text-sm font-medium text-gray-700">
                          URL do Webhook *
                        </Label>
                        <Input
                          id="webhook-url"
                          value={connectionForm.webhookUrl}
                          onChange={(e) => setConnectionForm({...connectionForm, webhookUrl: e.target.value})}
                          placeholder="https://seu-dominio.com/webhook"
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          URL do webhook para integração com plataformas de automação
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="webhook-token" className="text-sm font-medium text-gray-700">
                          Token de Verificação
                        </Label>
                        <Input
                          id="webhook-token"
                          value={connectionForm.webhookToken}
                          onChange={(e) => setConnectionForm({...connectionForm, webhookToken: e.target.value})}
                          placeholder="Token opcional para verificação"
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Token opcional para autenticação do webhook
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConnectionModal(false);
                    setEditingConnection(null);
                    setConnectionForm({
                      name: '',
                      type: 'whatsapp_baileys',
                      description: '',
                      accessToken: '',
                      phoneNumberId: '',
                      businessAccountId: '',
                      webhookUrl: '',
                      webhookToken: ''
                    });
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                {connectionForm.type === 'webhook' && (
                  <Button
                    onClick={async () => {
                      try {
                        const result = await testWebhook(
                          connectionForm.webhookUrl || '',
                          connectionForm.webhookToken
                        );
                        
                        if (result.success) {
                          success('✅ Webhook testado com sucesso! Resposta recebida.');
                        } else {
                          error(result.error || 'Erro ao testar webhook');
                        }
                      } catch (err) {
                        error('Erro ao testar webhook');
                      }
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white border-green-600"
                    disabled={!connectionForm.webhookUrl}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Testar Webhook
                  </Button>
                )}
                <Button
                  onClick={handleFormSubmit}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                >
                  {editingConnection ? 'Salvar Alterações' : 'Salvar'}
                </Button>
              </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal para QR Code */}
        {showQRModal && selectedConnection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                  Conectar WhatsApp
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQRModal(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  {connectionStatus.connected ? (
                    <>
                      <div className="rounded-full h-5 w-5 bg-green-500 flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm text-green-600 font-medium">Conectado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      <span className="text-sm text-gray-600">Aguardando conexão...</span>
                    </>
                  )}
                </div>
                
                {!connectionStatus.connected && (
                  <>
                    <div className="bg-purple-600 rounded-lg p-8 mb-4 mx-auto w-64 h-64 flex items-center justify-center">
                      {selectedConnection.qrCode ? (
                        <img 
                          src={selectedConnection.qrCode} 
                          alt="QR Code" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <QrCode className="h-32 w-32 text-white" />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      Escaneie o QR Code com seu WhatsApp
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                      Abra o WhatsApp {'>>'} Configurações {'>>'} WhatsApp Web
                    </p>
                    
                    <div className="text-left mb-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Como conectar:</h4>
                      <ol className="text-sm text-gray-600 space-y-2">
                        <li>1. Abra o WhatsApp no seu celular</li>
                        <li>2. Toque em Configurações (⚙️)</li>
                        <li>3. Toque em WhatsApp Web</li>
                        <li>4. Aponte a câmera para o QR Code</li>
                        <li>5. Aguarde a confirmação</li>
                      </ol>
                    </div>
                  </>
                )}
                
                {connectionStatus.connected && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-center mb-4">
                      <div className="rounded-full h-12 w-12 bg-green-500 flex items-center justify-center">
                        <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <h4 className="text-lg font-medium text-green-900 text-center mb-2">
                      WhatsApp Conectado!
                    </h4>
                    <p className="text-sm text-green-700 text-center">
                      Sua conexão foi estabelecida com sucesso. O modal será fechado automaticamente.
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3">
                  {connectionStatus.connected ? (
                    <Button
                      onClick={() => {
                        setShowQRModal(false);
                        setConnectionStatus({
                          connected: false,
                          connecting: true,
                          lastError: null,
                          sessionName: null
                        });
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Concluído
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowQRModal(false);
                          setConnectionStatus({
                            connected: false,
                            connecting: true,
                            lastError: null,
                            sessionName: null
                          });
                        }}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            if (selectedConnection) {
                              // Verificar se a conexão está conectada antes de concluir
                              const response = await fetch(`/api/baileys-simple/connections/${selectedConnection.id}`);
                              if (response.ok) {
                                const data = await response.json();
                                if (data.success && data.data.isConnected) {
                                  // Atualizar o status da conexão no contexto
                                  updateConnectionStatus(selectedConnection.id);
                                  
                                  setShowQRModal(false);
                                  success('✅ WhatsApp conectado com sucesso!');
                                  loadConnections();
                                } else {
                                  error('A conexão ainda não foi estabelecida. Aguarde a confirmação do WhatsApp.');
                                }
                              } else {
                                error('Erro ao verificar status da conexão');
                              }
                            }
                          } catch (err) {
                            error('Erro ao verificar conexão');
                          }
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        Concluir
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalhes da Conexão */}
        <ConnectionDetailsModal
          isOpen={showConnectionDetailsModal}
          onClose={() => {
            setShowConnectionDetailsModal(false);
            setSelectedConnection(null);
          }}
          connection={selectedConnection}
          onDisconnect={() => {
            if (selectedConnection) {
              handleDisconnectConnection(selectedConnection.id);
            }
          }}
        />

        {/* QR Connect Modal */}
        <SimpleQRModal
          open={showNewQRModal}
          onClose={() => {
            setShowNewQRModal(false);
            setConnState('idle');
            clearTimers();
            setPendingInstanceId(null);
          }}
          qrValue={qrValue}
          state={connState}
          error={connError}
          expiresIn={expiresIn}
          connectionName={lastCreatedNameRef.current || 'WhatsApp'}
          connectionId={pendingInstanceId || undefined}
          onRetry={() => {
            if (!pendingInstanceId) return;
            setConnError(null);
            setConnState('qr');
            setQrValue(null);
            setExpiresIn(90);
            startPairing(pendingInstanceId);
          }}
          onSuccess={finalizeConnection}
        />

        {/* Baileys QR Modal */}
        <BaileysQRModal
          open={showBaileysQRModal}
          onClose={() => {
            setShowBaileysQRModal(false);
            setBaileysConnectionId(null);
          }}
          connectionId={baileysConnectionId || ''}
          connectionName={lastCreatedNameRef.current}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          open={showDeleteModal}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title="Excluir Conexão"
          description="Tem certeza que deseja excluir esta conexão?"
          itemName={connectionToDelete?.name || ''}
          loading={isDeleting}
        />

        {/* Container de Toasts */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  );
}
