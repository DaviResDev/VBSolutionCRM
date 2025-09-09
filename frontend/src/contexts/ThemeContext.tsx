import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  topBarColor: string;
  sidebarColor: string;
  setTopBarColor: (color: string) => void;
  setSidebarColor: (color: string) => void;
  systemBackground: string;
  textColor: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('isDarkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [topBarColor, setTopBarColor] = useState(() => {
    const saved = localStorage.getItem('topBarColor');
    return saved || '#021529';
  });

  const [sidebarColor, setSidebarColor] = useState(() => {
    const saved = localStorage.getItem('sidebarColor');
    return saved || '#dee2e3';
  });

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const systemBackground = isDarkMode ? '#121212' : '#f8fafc';
  const textColor = isDarkMode ? '#ffffff' : '#1f2937';

  useEffect(() => {
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('topBarColor', topBarColor);
  }, [topBarColor]);

  useEffect(() => {
    localStorage.setItem('sidebarColor', sidebarColor);
  }, [sidebarColor]);

  const value: ThemeContextType = {
    isDarkMode,
    toggleDarkMode,
    topBarColor,
    sidebarColor,
    setTopBarColor,
    setSidebarColor,
    systemBackground,
    textColor,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 