import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface WhatsAppV2Session {
  id: string;
  owner_id: string;
  session_name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';
  connected_at?: string;
  disconnected_at?: string;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppV2Sessions(ownerId: string) {
  const [sessions, setSessions] = useState<WhatsAppV2Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  const loadSessions = useCallback(async () => {
    if (!ownerId) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data, error: sessionsError } = await supabase
        .from('whatsapp_sessions')
        .select(`
          id,
          owner_id,
          session_name,
          status,
          connected_at,
          disconnected_at,
          created_at,
          updated_at
        `)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (sessionsError) {
        throw new Error(`Erro ao buscar sessões: ${sessionsError.message}`);
      }

      setSessions(data || []);
    } catch (err) {
      console.error('Erro ao carregar sessões:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  const startSession = useCallback(async (sessionName: string) => {
    if (!ownerId) return;

    try {
      const response = await fetch('/api/whatsapp-v2/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'vb_dev_token_12345'}`
        },
        body: JSON.stringify({
          session_name: sessionName,
          owner_id: ownerId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao iniciar sessão');
      }

      const result = await response.json();
      console.log('Sessão iniciada:', result);
      
      // Recarregar sessões
      await loadSessions();
      
      return result;
    } catch (err) {
      console.error('Erro ao iniciar sessão:', err);
      throw err;
    }
  }, [ownerId, loadSessions]);

  const stopSession = useCallback(async (sessionName: string) => {
    try {
      const response = await fetch(`/api/whatsapp-v2/sessions/${sessionName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'vb_dev_token_12345'}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao parar sessão');
      }

      const result = await response.json();
      console.log('Sessão parada:', result);
      
      // Recarregar sessões
      await loadSessions();
      
      return result;
    } catch (err) {
      console.error('Erro ao parar sessão:', err);
      throw err;
    }
  }, [loadSessions]);

  const getSessionStatus = useCallback(async (sessionName: string) => {
    try {
      const response = await fetch(`/api/whatsapp-v2/sessions/${sessionName}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'vb_dev_token_12345'}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar status da sessão');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Erro ao buscar status da sessão:', err);
      throw err;
    }
  }, []);

  // Configurar realtime para sessões
  useEffect(() => {
    if (!ownerId) return;

    // Limpar subscription anterior
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    // Criar nova subscription
    const channel = supabase
      .channel('whatsapp-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_sessions',
          filter: `owner_id=eq.${ownerId}`
        },
        (payload) => {
          console.log('📱 Realtime sessão update:', payload);
          loadSessions(); // Recarregar sessões
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [ownerId, loadSessions]);

  // Carregar sessões inicialmente
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    loading,
    error,
    reload: loadSessions,
    startSession,
    stopSession,
    getSessionStatus
  };
}
