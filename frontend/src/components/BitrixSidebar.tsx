
import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft,
  Home, 
  Inbox, 
  MoreHorizontal, 
  Star, 
  Plus, 
  UserPlus, 
  HelpCircle,
  Search,
  Calendar,
  CheckSquare,
  Folder,
  Users,
  Settings,
  MessageCircle,
  BarChart3,
  Building2,
  Truck,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
  GitBranch,
  Phone,
  Mail,
  Archive,
  UserCheck,
  FolderOpen,
  Briefcase,
  DollarSign,
  PieChart,
  ClipboardList,
  Grid3X3,
  TrendingUp as TrendingUpIcon,
  Building,
  UserCheck as UserCheckIcon,
  X,
  Grid,
  Zap,
  Target,
  Lightbulb,
  Shield,
  Globe,
  Database,
  Cpu,
  Palette,
  Music,
  Video,
  Camera,
  Heart,
  Gift,
  Coffee,
  Car,
  Plane,
  Train,
  Bus,
  Bike,
  Walk,
  Run,
  Swim,
  Gamepad2,
  BookOpen,
  Newspaper,
  FileCode,
  Code,
  Terminal,
  Server,
  HardDrive,
  Wifi,
  Bluetooth,
  Radio,
  Tv,
  Monitor,
  Smartphone,
  Tablet,
  Watch,
  Headphones,
  Speaker,
  Microphone,
  Keyboard,
  Mouse,
  Printer,
  Scanner,
  Fax,
  Calculator,
  Clock,
  Timer,
  Stopwatch,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  CalendarX,
  CalendarPlus,
  CalendarMinus,
  CalendarClock,
  CalendarEvent,
  CalendarHeart,
  CalendarStar,
  CalendarUser,
  CalendarLock,
  CalendarUnlock,
  CalendarSearch,
  CalendarEdit,
  CalendarTrash,
  CalendarRepeat,
  CalendarRepeat1,
  CalendarRepeat2,
  CalendarRepeat3,
  CalendarRepeat4,
  CalendarRepeat5,
  CalendarRepeat6,
  CalendarRepeat7,
  CalendarRepeat8,
  CalendarRepeat9,
  CalendarRepeat10,
  CalendarRepeat11,
  CalendarRepeat12
} from 'lucide-react';

// Componente do ícone oficial do WhatsApp
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
  </svg>
);

// PÁGINAS REAIS DO SEU SISTEMA (baseado no App.tsx)
const systemPages = [
  { title: "Feed", icon: FileText, url: "/feed" },
  { title: "Chat", icon: MessageCircle, url: "/chat" },
  { title: "Colaborações", icon: UserPlus, url: "/collaborations" },
  { title: "Funcionários", icon: UserCheckIcon, url: "/employees" },
  { title: "Baixas", icon: TrendingDown, url: "/writeoffs" },
  { title: "Grupos de Trabalho", icon: GitBranch, url: "/work-groups" },
  { title: "Arquivos", icon: FolderOpen, url: "/files" },
  { title: "Relatórios", icon: BarChart3, url: "/reports" }
];

interface BitrixSidebarProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

export function BitrixSidebar({ isExpanded, setIsExpanded }: BitrixSidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const [showMore, setShowMore] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && currentPath === '/') return true;
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // Cores exatas do design da imagem
  const colors = {
    background: "#FFFFFF",
    textPrimary: "rgba(0, 0, 0, 0.8)", // Preto com 80% de nitidez
    textSecondary: "rgba(0, 0, 0, 0.8)", // Preto com 80% de nitidez
    iconInactive: "rgba(0, 0, 0, 0.8)", // Preto com 80% de nitidez
    itemActive: {
      background: "#F3F4F6",
      border: "#3B82F6",
      text: "rgba(0, 0, 0, 0.8)" // Preto com 80% de nitidez
    },
    hover: {
      background: "#F9FAFB"
    },
    border: "#E5E7EB",
    avatar: {
      background: "#3B82F6",
      text: "#FFFFFF"
    }
  };

  return (
    <div
      className={`fixed left-0 top-[46px] h-[calc(100vh-46px)] z-50 transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-[240px]' : 'w-[64px]'
      } bg-white border-r flex flex-col`}
      style={{ 
        borderColor: colors.border,
        boxShadow: '1px 0 4px rgba(0, 0, 0, 0.04)'
      }}
    >
      {/* Imagem do perfil */}
      <div className="p-4 flex-shrink-0">
        <div className="h-12 flex justify-center items-center overflow-hidden">
          <img 
            src="https://i.imgur.com/8oOVM7U.png" 
            alt="Logo do Sistema" 
            className="h-20 w-auto object-contain"
            style={{ maxWidth: '100%' }}
          />
        </div>
      </div>

      {/* Navegação Principal */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <div className="space-y-1">
          {/* Início */}
          <Link
            to="/"
            className={`flex items-center h-8 px-2 rounded-md transition-all duration-200 cursor-pointer group ${
              isActive('/') 
                ? 'bg-blue-200 shadow-sm ring-1 ring-blue-300' 
                : 'hover:bg-gray-50 hover:shadow-sm'
            }`}
            title={!isExpanded ? 'Início' : ''}
          >
            <Home className="h-4 w-4 flex-shrink-0" style={{ 
              color: isActive('/') ? '#1E3A8A' : colors.iconInactive,
              marginRight: isExpanded ? '10px' : '0'
            }} />
            {isExpanded && (
              <span 
                className="text-sm"
                style={{ 
                  color: isActive('/') ? '#1E3A8A' : colors.iconInactive
                }}
              >
                Início
              </span>
            )}
          </Link>

          {/* Atividades */}
          <Link
            to="/activities"
            className={`flex items-center h-8 px-2 rounded-md transition-all duration-200 cursor-pointer group ${
              isActive('/activities') 
                ? 'bg-blue-200 shadow-sm ring-1 ring-blue-300' 
                : 'hover:bg-gray-50 hover:shadow-sm'
            }`}
            title={!isExpanded ? 'Atividades' : ''}
          >
            <TrendingUpIcon className="h-4 w-4 flex-shrink-0" style={{ 
              color: isActive('/activities') ? '#1E3A8A' : colors.iconInactive,
              marginRight: isExpanded ? '10px' : '0'
            }} />
            {isExpanded && (
              <span 
                className="text-sm"
                style={{ 
                  color: isActive('/activities') ? '#1E3A8A' : colors.iconInactive
                }}
              >
                Atividades
              </span>
            )}
          </Link>

          {/* Calendário */}
          <Link
            to="/calendar"
            className={`flex items-center h-8 px-2 rounded-md transition-all duration-200 cursor-pointer group ${
              isActive('/calendar') 
                ? 'bg-blue-200 shadow-sm ring-1 ring-blue-300' 
                : 'hover:bg-gray-50 hover:shadow-sm'
            }`}
            title={!isExpanded ? 'Calendário' : ''}
          >
            <Calendar className="h-4 w-4 flex-shrink-0" style={{ 
              color: isActive('/calendar') ? '#1E3A8A' : colors.iconInactive,
              marginRight: isExpanded ? '10px' : '0'
            }} />
            {isExpanded && (
              <span 
                className="text-sm"
                style={{ 
                  color: isActive('/calendar') ? '#1E3A8A' : colors.iconInactive
                }}
              >
                Calendário
              </span>
            )}
          </Link>

          {/* Projetos */}
          <Link
            to="/projects"
            className={`flex items-center h-8 px-2 rounded-md transition-all duration-200 cursor-pointer group ${
              isActive('/projects') 
                ? 'bg-blue-200 shadow-sm ring-1 ring-blue-300' 
                : 'hover:bg-gray-50 hover:shadow-sm'
            }`}
            title={!isExpanded ? 'Projetos' : ''}
          >
            <Folder className="h-4 w-4 flex-shrink-0" style={{ 
              color: isActive('/projects') ? '#1E3A8A' : colors.iconInactive,
              marginRight: isExpanded ? '10px' : '0'
            }} />
            {isExpanded && (
              <span 
                className="text-sm"
                style={{ 
                  color: isActive('/projects') ? '#1E3A8A' : colors.iconInactive
                }}
              >
                Projetos
              </span>
            )}
          </Link>

          {/* Empresas */}
          <Link
            to="/companies"
            className={`flex items-center h-8 px-2 rounded-md transition-all duration-200 cursor-pointer group ${
              isActive('/companies') 
                ? 'bg-blue-200 shadow-sm ring-1 ring-blue-300' 
                : 'hover:bg-gray-50 hover:shadow-sm'
            }`}
            title={!isExpanded ? 'Empresas' : ''}
          >
            <Building className="h-4 w-4 flex-shrink-0" style={{ 
              color: isActive('/companies') ? '#1E3A8A' : colors.iconInactive,
              marginRight: isExpanded ? '10px' : '0'
            }} />
            {isExpanded && (
              <span 
                className="text-sm"
                style={{ 
                  color: isActive('/companies') ? '#1E3A8A' : colors.iconInactive
                }}
              >
                Empresas
              </span>
            )}
          </Link>

          {/* Inventário */}
          <Link
            to="/inventory"
            className={`flex items-center h-8 px-2 rounded-md transition-all duration-200 cursor-pointer group ${
              isActive('/inventory') 
                ? 'bg-blue-200 shadow-sm ring-1 ring-blue-300' 
                : 'hover:bg-gray-50 hover:shadow-sm'
            }`}
            title={!isExpanded ? 'Inventário' : ''}
          >
            <Archive className="h-4 w-4 flex-shrink-0" style={{ 
              color: isActive('/inventory') ? '#1E3A8A' : colors.iconInactive,
              marginRight: isExpanded ? '10px' : '0'
            }} />
            {isExpanded && (
              <span 
                className="text-sm"
                style={{ 
                  color: isActive('/inventory') ? '#1E3A8A' : colors.iconInactive
                }}
              >
                Inventário
              </span>
            )}
          </Link>

          {/* Leads e Vendas */}
          <Link
            to="/leads-sales"
            className={`flex items-center h-8 px-2 rounded-md transition-all duration-200 cursor-pointer group ${
              isActive('/leads-sales') 
                ? 'bg-blue-200 shadow-sm ring-1 ring-blue-300' 
                : 'hover:bg-gray-50 hover:shadow-sm'
            }`}
            title={!isExpanded ? 'Leads e Vendas' : ''}
          >
            <Target className="h-4 w-4 flex-shrink-0" style={{ 
              color: isActive('/leads-sales') ? '#1E3A8A' : colors.iconInactive,
              marginRight: isExpanded ? '10px' : '0'
            }} />
            {isExpanded && (
              <span 
                className="text-sm"
                style={{ 
                  color: isActive('/leads-sales') ? '#1E3A8A' : colors.iconInactive
                }}
              >
                Leads e Vendas
              </span>
            )}
          </Link>
        </div>

        {/* Seção "Mais" */}
        <div className="mt-4">
                      <button
              onClick={() => setShowMore(!showMore)}
              className="flex items-center h-8 px-2 rounded-md transition-all duration-200 cursor-pointer group w-full hover:bg-gray-50"
              style={{ color: colors.iconInactive }}
              title={!isExpanded ? 'Mais opções' : ''}
            >
              <MoreHorizontal className="h-4 w-4 flex-shrink-0" style={{ 
                color: showMore ? '#1E40AF' : colors.iconInactive,
                marginRight: isExpanded ? '10px' : '0'
              }} />
              {isExpanded && (
                <>
                  <span 
                    className="text-sm flex-1"
                    style={{ color: showMore ? '#1E40AF' : colors.iconInactive }}
                  >
                    Mais
                  </span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`} style={{ color: showMore ? '#1E40AF' : colors.iconInactive }} />
                </>
              )}
            </button>

                      {/* Itens expansíveis */}
            {showMore && isExpanded && (
              <div className="space-y-1 mt-2">
                {systemPages.map((item) => {
                  const Icon = item.icon;
                  const isActiveItem = isActive(item.url);
                  
                  return (
                    <Link
                      key={item.title}
                      to={item.url}
                      className={`flex items-center h-8 px-2 rounded-md transition-all duration-200 cursor-pointer group hover:bg-gray-50 hover:shadow-sm ${
                        isActiveItem ? 'bg-blue-200 shadow-sm ring-1 ring-blue-300' : ''
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" style={{ 
                        color: isActiveItem ? '#1E3A8A' : colors.iconInactive,
                        marginRight: '10px'
                      }} />
                      <span 
                        className="text-sm"
                        style={{ 
                          color: isActiveItem ? '#1E40AF' : colors.iconInactive
                        }}
                      >
                        {item.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
        </div>

        {/* Separador */}
        <div className="mt-6 mb-2">
          <div className="h-px" style={{ backgroundColor: colors.border }}></div>
        </div>
      </nav>

      {/* Seção Inferior - Botões Fixos */}
      <div className="mt-auto pt-6 pb-2 border-t flex-shrink-0" style={{ borderColor: colors.border }}>
        <div className="space-y-3 px-3">
          {/* WhatsApp */}
          <Link
            to="/whatsapp"
            className={`flex items-center h-8 px-2 rounded-md transition-all duration-200 cursor-pointer w-full hover:bg-gray-50 ${
              isActive('/whatsapp') ? 'bg-blue-200 shadow-sm ring-1 ring-blue-300' : ''
            }`}
            title={!isExpanded ? 'WhatsApp' : ''}
          >
            <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center" style={{ 
              marginRight: isExpanded ? '10px' : '0'
            }}>
              <WhatsAppIcon className="h-4 w-4" style={{ 
                color: isActive('/whatsapp') ? '#1E3A8A' : colors.iconInactive 
              }} />
            </div>
            {isExpanded && (
              <span 
                className="text-sm font-medium"
                style={{ 
                  color: isActive('/whatsapp') ? '#1E40AF' : colors.iconInactive 
                }}
              >
                WhatsApp
              </span>
            )}
          </Link>

          {/* Configurações */}
          <Link
            to="/settings"
            className={`flex items-center h-8 px-2 rounded-md transition-all duration-200 cursor-pointer w-full hover:bg-gray-50 ${
              isActive('/settings') ? 'bg-blue-200 shadow-sm ring-1 ring-blue-300' : ''
            }`}
            title={!isExpanded ? 'Configurações' : ''}
          >
            <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center" style={{ 
              marginRight: isExpanded ? '10px' : '0'
            }}>
              <Settings className="h-4 w-4" style={{ 
                color: isActive('/settings') ? '#1E3A8A' : colors.iconInactive 
              }} />
            </div>
            {isExpanded && (
              <span 
                className="text-sm font-medium"
                style={{ 
                  color: isActive('/settings') ? '#1E40AF' : colors.iconInactive 
                }}
              >
                Configurações
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Botão de Minimizar */}
      <div className="px-3 py-2 border-t flex-shrink-0" style={{ borderColor: colors.border }}>
        <button
          onClick={handleToggle}
          className="w-full flex items-center justify-center h-8 px-2 rounded-md transition-all duration-200 cursor-pointer hover:bg-gray-50"
          style={{ color: colors.iconInactive }}
          title={isExpanded ? 'Minimizar' : 'Maximizar'}
        >
          <ChevronLeft className="h-4 w-4" style={{ color: colors.iconInactive }} />
        </button>
      </div>
    </div>
  );
}

export default BitrixSidebar;
