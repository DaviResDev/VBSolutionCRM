import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Activity {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  due_date: string | null;
  start_date: string | null;
  end_date: string | null;
  responsible_id: string | null;
  company_id: string | null;
  project_id: string | null;
  work_group: string | null;
  department: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  tags: string[];
  attachments: any | null;
  comments: any | null;
  progress: number;
  is_urgent: boolean;
  is_public: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  archived?: boolean; // Campo opcional para compatibilidade
}

export interface CreateActivityData {
  title: string;
  description?: string;
  type?: string;
  priority?: string;
  status?: string;
  due_date?: string;
  start_date?: string;
  end_date?: string;
  responsible_id?: string;
  company_id?: string;
  project_id?: string;
  work_group?: string;
  department?: string;
  estimated_hours?: number;
  actual_hours?: number;
  tags?: string[];
  attachments?: any;
  comments?: any;
  progress?: number;
  is_urgent?: boolean;
  is_public?: boolean;
  notes?: string;
}

export interface UpdateActivityData extends Partial<CreateActivityData> {}

export interface ActivityFilters {
  status?: string;
  priority?: string;
  type?: string;
  responsible_id?: string;
  company_id?: string;
  project_id?: string;
  work_group?: string;
  department?: string;
  is_urgent?: boolean;
  search?: string;
  start_date?: string;
  end_date?: string;
}

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getProfile } = useAuth();

  // Função para obter o owner_id do usuário logado
  const getOwnerId = useCallback(async () => {
    try {
      const { profile } = await getProfile();
      if (!profile) {
        throw new Error('Usuário não autenticado');
      }
      return profile.id;
    } catch (error) {
      console.error('Erro ao obter owner_id:', error);
      throw error;
    }
  }, [getProfile]);

  // Buscar todas as atividades do usuário
  const fetchActivities = useCallback(async (filters?: ActivityFilters) => {
    try {
      setLoading(true);
      setError(null);

      const ownerId = await getOwnerId();

      let query = supabase
        .from('activities')
        .select('*')
        .eq('owner_id', ownerId);

      // Aplicar filtros
      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.priority) {
          query = query.eq('priority', filters.priority);
        }
        if (filters.type) {
          query = query.eq('type', filters.type);
        }
        if (filters.responsible_id) {
          query = query.eq('responsible_id', filters.responsible_id);
        }
        if (filters.company_id) {
          query = query.eq('company_id', filters.company_id);
        }
        if (filters.project_id) {
          query = query.eq('project_id', filters.project_id);
        }
        if (filters.work_group) {
          query = query.eq('work_group', filters.work_group);
        }
        if (filters.department) {
          query = query.eq('department', filters.department);
        }
        if (filters.is_urgent !== undefined) {
          query = query.eq('is_urgent', filters.is_urgent);
        }
        if (filters.search && filters.search.trim()) {
          const searchTerm = filters.search.trim();
          query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
        if (filters.start_date) {
          query = query.gte('due_date', filters.start_date);
        }
        if (filters.end_date) {
          query = query.lte('due_date', filters.end_date);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setActivities(data || []);
      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar atividades';
      setError(errorMessage);
      console.error('Erro ao buscar atividades:', err);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [getOwnerId]);

  // Criar nova atividade
  const createActivity = useCallback(async (activityData: CreateActivityData) => {
    try {
      setLoading(true);
      setError(null);

      const ownerId = await getOwnerId();

      const { data, error } = await supabase
        .from('activities')
        .insert([
          {
            ...activityData,
            owner_id: ownerId,
            status: activityData.status || 'pending',
            priority: activityData.priority || 'medium',
            type: activityData.type || 'task',
            progress: activityData.progress || 0,
            is_urgent: activityData.is_urgent || false,
            is_public: activityData.is_public || false,
            tags: activityData.tags || [],
            attachments: activityData.attachments || null,
            comments: activityData.comments || null
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setActivities(prev => [data, ...prev]);
      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar atividade';
      setError(errorMessage);
      console.error('Erro ao criar atividade:', err);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [getOwnerId]);

  // Atualizar atividade existente
  const updateActivity = useCallback(async (id: string, updates: UpdateActivityData) => {
    try {
      setLoading(true);
      setError(null);

      const ownerId = await getOwnerId();

      const { data, error } = await supabase
        .from('activities')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('owner_id', ownerId) // Garantir que só atualiza atividades próprias
        .select()
        .single();

      if (error) {
        throw error;
      }

      setActivities(prev => prev.map(activity => 
        activity.id === id ? data : activity
      ));

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar atividade';
      setError(errorMessage);
      console.error('Erro ao atualizar atividade:', err);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [getOwnerId]);

  // Excluir atividade
  const deleteActivity = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const ownerId = await getOwnerId();

      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id)
        .eq('owner_id', ownerId); // Garantir que só exclui atividades próprias

      if (error) {
        throw error;
      }

      setActivities(prev => prev.filter(activity => activity.id !== id));
      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir atividade';
      setError(errorMessage);
      console.error('Erro ao excluir atividade:', err);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [getOwnerId]);

  // Buscar atividade por ID
  const getActivityById = useCallback(async (id: string) => {
    try {
      setError(null);

      const ownerId = await getOwnerId();

      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', id)
        .eq('owner_id', ownerId) // Garantir que só busca atividades próprias
        .single();

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar atividade';
      setError(errorMessage);
      console.error('Erro ao buscar atividade:', err);
      return { data: null, error: errorMessage };
    }
  }, [getOwnerId]);

  // Atualizar progresso de uma atividade
  const updateActivityProgress = useCallback(async (id: string, progress: number) => {
    try {
      setError(null);

      const ownerId = await getOwnerId();

      const { data, error } = await supabase
        .from('activities')
        .update({
          progress,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('owner_id', ownerId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setActivities(prev => prev.map(activity => 
        activity.id === id ? data : activity
      ));

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar progresso';
      setError(errorMessage);
      console.error('Erro ao atualizar progresso:', err);
      return { data: null, error: errorMessage };
    }
  }, [getOwnerId]);

  // Marcar atividade como urgente/não urgente
  const toggleUrgent = useCallback(async (id: string, isUrgent: boolean) => {
    try {
      setError(null);

      const ownerId = await getOwnerId();

      const { data, error } = await supabase
        .from('activities')
        .update({
          is_urgent: isUrgent,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('owner_id', ownerId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setActivities(prev => prev.map(activity => 
        activity.id === id ? data : activity
      ));

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao alterar urgência';
      setError(errorMessage);
      console.error('Erro ao alterar urgência:', err);
      return { data: null, error: errorMessage };
    }
  }, [getOwnerId]);

  // Carregar atividades ao inicializar - CORRIGIDO: sem dependências para evitar loop infinito
  useEffect(() => {
    fetchActivities();
  }, []); // Array vazio para executar apenas uma vez

  return {
    activities,
    loading,
    error,
    fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    getActivityById,
    updateActivityProgress,
    toggleUrgent,
  };
}
