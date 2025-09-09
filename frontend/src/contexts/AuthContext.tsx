import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  console.log('🔐 AuthProvider rendering...');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Mudado para true inicialmente
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Obter sessão inicial
    const getInitialSession = async () => {
      try {
        console.log('🔍 AuthContext: Iniciando verificação de sessão...');
        setLoading(true);
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ AuthContext: Erro ao obter sessão:', sessionError);
          setError(sessionError.message);
        } else {
          console.log('✅ AuthContext: Sessão obtida com sucesso:', session ? 'Ativa' : 'Inativa');
          if (session) {
            console.log('👤 AuthContext: Usuário da sessão:', session.user.email);
          }
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error('❌ AuthContext: Erro inesperado:', err);
        setError('Erro inesperado ao conectar com o banco');
      } finally {
        setLoading(false);
        console.log('✅ AuthContext: Estado inicial definido, loading = false');
      }
    };

    getInitialSession();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AuthContext: Mudança de estado:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN') {
          console.log('✅ AuthContext: Usuário fez login');
          setSession(session);
          setUser(session?.user ?? null);
          setError(null);
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 AuthContext: Usuário fez logout');
          setSession(null);
          setUser(null);
          setError(null);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 AuthContext: Token atualizado');
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setError(null);
    } catch (err) {
      console.error('❌ Erro ao fazer logout:', err);
      setError('Erro ao fazer logout');
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        setError(error.message);
      } else {
        setUser(user);
        setError(null);
      }
    } catch (err) {
      console.error('❌ Erro ao atualizar usuário:', err);
      setError('Erro ao atualizar usuário');
    }
  };

  const value = {
    user,
    session,
    loading,
    error,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 