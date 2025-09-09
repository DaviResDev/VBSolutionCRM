import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

interface UseConversationsRealtimeProps {
  connectionId: string;
}

export function useConversationsRealtime({ connectionId }: UseConversationsRealtimeProps) {
  const queryClient = useQueryClient();
  const supabaseRef = useRef<any>(null);

  useEffect(() => {
    if (!connectionId) return;

    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    supabaseRef.current = supabase;

    // Inscrever em mudanças nas conversas desta conexão
    const channel = supabase
      .channel(`conversations:${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_atendimentos',
          filter: `connection_id=eq.${connectionId}`
        },
        (payload) => {
          console.log('📋 Realtime conversation update:', payload);
          
          // Invalidar a query de conversas para recarregar
          queryClient.invalidateQueries({
            queryKey: ["wa", "convs", connectionId]
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, queryClient]);

  return null;
}

