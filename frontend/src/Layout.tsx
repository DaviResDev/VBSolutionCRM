
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BitrixSidebar } from '@/components/BitrixSidebar';
import { BitrixTopbar } from '@/components/BitrixTopbar';
import { useSidebarPreferences } from '@/hooks/useSidebarPreferences';
import { useTheme } from '@/contexts/ThemeContext';
import ErrorBoundary from './ErrorBoundary';

const Layout = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const { sidebarMode } = useSidebarPreferences();
  const { systemBackground } = useTheme();

  // Para o novo layout, a sidebar não sobrepõe o conteúdo
  const getSidebarWidth = () => {
    return ''; // Não precisa de padding left pois a sidebar está ao lado
  };

  return (
    <ErrorBoundary>
      <div 
        className="min-h-screen w-full transition-colors duration-200"
        style={{ backgroundColor: systemBackground }}
      >
        <BitrixTopbar />
        
        <div className="flex pt-[46px]">
          <BitrixSidebar isExpanded={sidebarExpanded} setIsExpanded={setSidebarExpanded} />
          
          <main 
            className={`flex-1 transition-all duration-300 ease-out`}
            style={{ 
              backgroundColor: systemBackground,
              marginLeft: sidebarExpanded ? '240px' : '64px'
            }}
          >
            <div className="p-6">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Layout;
