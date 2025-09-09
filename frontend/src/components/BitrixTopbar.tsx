
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, MessageCircle, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface BitrixTopbarProps {
  sidebarExpanded?: boolean;
}

interface Notification {
  id: string;
  type: 'activity' | 'project' | 'lead' | 'message';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  url?: string;
}

// Dados vazios - serão carregados do Supabase quando implementado
const mockNotifications: Notification[] = [];
const mockMessages: Notification[] = [];

export function BitrixTopbar({
  sidebarExpanded = false
}: BitrixTopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { topBarColor, isDarkMode, toggleDarkMode } = useTheme();
  const { user, signOut } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [userLogo, setUserLogo] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [messages, setMessages] = useState<Notification[]>(mockMessages);
  
  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Load user logo from localStorage and listen for changes
  useEffect(() => {
    const savedLogo = localStorage.getItem('userLogo');
    if (savedLogo) {
      setUserLogo(savedLogo);
    }

    // Listen for changes in localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userLogo') {
        if (e.newValue) {
          setUserLogo(e.newValue);
        } else {
          setUserLogo(null);
        }
      }
    };

    // Listen for custom events (for same-tab updates)
    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail.key === 'userLogo') {
        if (e.detail.value) {
          setUserLogo(e.detail.value);
        } else {
          setUserLogo(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('customStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customStorageChange', handleCustomStorageChange as EventListener);
    };
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    console.log('Searching for:', term, 'on page:', location.pathname);
  };

  const getSearchPlaceholder = () => {
    const path = location.pathname;
    if (path === '/') return 'Buscar no sistema...';
    if (path === '/chat') return 'Buscar conversas...';
    if (path === '/feed') return 'Buscar publicações...';
    if (path === '/projects') return 'Buscar projetos...';
    if (path === '/activities') return 'Buscar atividades...';
    if (path === '/leads-sales') return 'Buscar leads e vendas...';
    if (path === '/companies') return 'Buscar empresas...';
    if (path === '/calendar') return 'Buscar eventos...';
    if (path === '/files') return 'Buscar documentos...';
    if (path === '/work-groups') return 'Buscar grupos...';
    if (path === '/inventory') return 'Buscar itens...';
    if (path === '/employees') return 'Buscar funcionários...';
    if (path === '/products') return 'Buscar produtos...';
    if (path === '/whatsapp') return 'Buscar conversas...';
    if (path === '/email') return 'Buscar e-mails...';
    return 'Buscar...';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;
  const unreadMessages = messages.filter(m => !m.read).length;

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markMessageAsRead = (id: string) => {
    setMessages(prev => 
      prev.map(m => m.id === id ? { ...m, read: true } : m)
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.url) {
      window.location.href = notification.url;
    }
    markNotificationAsRead(notification.id);
  };

  const handleMessageClick = (message: Notification) => {
    if (message.url) {
      window.location.href = message.url;
    }
    markMessageAsRead(message.id);
  };

  const handleProfileClick = () => {
    navigate('/settings');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  // Utility function to trigger custom storage event
  const triggerStorageChange = (key: string, value: string | null) => {
    const event = new CustomEvent('customStorageChange', {
      detail: { key, value }
    });
    window.dispatchEvent(event);
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 h-[46px] border-b shadow-lg z-30 transition-colors duration-200"
      style={{ 
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="flex items-center px-4 h-full">
        {/* Left side - Empty for clean look */}
        <div className="flex-1"></div>

        {/* Center - Search Bar */}
        <div className="flex items-center justify-center flex-1">
          <div className="relative w-80">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-12 pr-4 py-2 w-full bg-white border-0 rounded-lg text-sm transition-all duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              placeholder={getSearchPlaceholder()}
            />
          </div>
        </div>

        {/* Right Section - Time, Date, Icons and Profile */}
        <div className="flex items-center gap-4 justify-end flex-1">
          {/* Current Time and Date */}
          <div className="flex flex-col items-end text-white">
            <div className="text-sm font-medium">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs text-gray-300">
              {formatDate(currentTime)}
            </div>
          </div>

          {/* Notifications Icon */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors relative text-white">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs bg-red-500 text-white">
                    {unreadNotifications}
                  </Badge>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 topbar-dropdown">
              <div className="flex items-center justify-between p-3 border-b border-gray-100">
                <h3 className="font-semibold text-sm text-gray-900">Notificações</h3>
                <span className="text-xs text-gray-500">{unreadNotifications} não lidas</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Nenhuma notificação
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`p-3 cursor-pointer border-b border-gray-50 last:border-b-0 topbar-dropdown-item ${
                        !notification.read ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {notification.timestamp}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Messages Icon */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors relative text-white">
                <MessageCircle className="h-5 w-5" />
                {unreadMessages > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs bg-blue-500 text-white">
                    {unreadMessages}
                  </Badge>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 topbar-dropdown">
              <div className="flex items-center justify-between p-3 border-b border-gray-100">
                <h3 className="font-semibold text-sm text-gray-900">Mensagens</h3>
                <span className="text-xs text-gray-500">{unreadMessages} não lidas</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Nenhuma mensagem
                  </div>
                ) : (
                  messages.map((message) => (
                    <DropdownMenuItem
                      key={message.id}
                      className={`p-3 cursor-pointer border-b border-gray-50 last:border-b-0 topbar-dropdown-item ${
                        !message.read ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleMessageClick(message)}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {message.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {message.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {message.timestamp}
                          </p>
                        </div>
                        {!message.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-700/50 transition-colors">
                <Avatar className="h-8 w-8 border-2 border-white/20">
                  <AvatarImage src={user?.user_metadata?.avatar_url} alt="User" />
                  <AvatarFallback className="bg-gray-600 text-white text-sm font-medium">
                    {user?.user_metadata?.name ? user.user_metadata.name.substring(0, 1).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 topbar-dropdown">
              <div className="p-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} alt="User" />
                    <AvatarFallback className="bg-gray-600 text-white text-sm font-medium">
                      {user?.user_metadata?.name ? user.user_metadata.name.substring(0, 1).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {user?.user_metadata?.name || 'Usuário'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.email || 'usuario@email.com'}
                    </p>
                  </div>
                </div>
              </div>
              
              <DropdownMenuItem 
                className="flex items-center gap-2 p-3 cursor-pointer topbar-dropdown-item"
                onClick={handleProfileClick}
              >
                <span className="text-sm">Perfil</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                className="flex items-center gap-2 p-3 cursor-pointer topbar-dropdown-item"
                onClick={toggleDarkMode}
              >
                <span className="text-sm">
                  {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
                </span>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                className="flex items-center gap-2 p-3 cursor-pointer topbar-dropdown-item"
                onClick={handleSettingsClick}
              >
                <span className="text-sm">Configurações</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-gray-200 mt-5" />
              
              <DropdownMenuItem 
                className="flex items-center gap-2 p-3 cursor-pointer topbar-dropdown-item hover:bg-red-50 text-red-600"
                onClick={signOut}
              >
                <span className="text-sm">Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
