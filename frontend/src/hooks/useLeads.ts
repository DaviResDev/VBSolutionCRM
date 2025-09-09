import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source: 'website' | 'referral' | 'social_media' | 'cold_call' | 'event' | 'other';
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'converted' | 'lost';
  value?: number;
  currency?: string;
  assigned_to?: string;
  responsible_id?: string;
  company_id?: string;
  notes?: string;
  tags?: string[];
  last_contact_date?: string;
  next_follow_up?: string;
  created_at: string;
  updated_at: string;
}

export const useLeads = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('responsible_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setLeads(data || []);
    } catch (err) {
      console.error('Erro ao buscar leads:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar leads');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const createLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('Usuário não autenticado');
    
    try {
      const leadWithUser = {
        ...leadData,
        responsible_id: user.id,
        currency: leadData.currency || 'BRL',
        status: leadData.status || 'new'
      };

      const { data, error } = await supabase
        .from('leads')
        .insert([leadWithUser])
        .select()
        .single();

      if (error) throw error;
      
      await fetchLeads(); // Recarregar dados
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar lead');
      throw err;
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      await fetchLeads(); // Recarregar dados
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar lead');
      throw err;
    }
  };

  const deleteLead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchLeads(); // Recarregar dados
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir lead');
      throw err;
    }
  };

  const deleteMultipleLeads = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', ids);

      if (error) throw error;
      
      await fetchLeads(); // Recarregar dados
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir leads');
      throw err;
    }
  };

  const getLeadsByStatus = (status: Lead['status']) => {
    return leads.filter(lead => lead.status === status);
  };

  const getLeadsBySource = (source: Lead['source']) => {
    return leads.filter(lead => lead.source === source);
  };

  const getLeadsByCompany = (companyId: string) => {
    return leads.filter(lead => lead.company_id === companyId);
  };

  const getLeadsByValue = (minValue: number, maxValue?: number) => {
    if (maxValue) {
      return leads.filter(lead => lead.value && lead.value >= minValue && lead.value <= maxValue);
    }
    return leads.filter(lead => lead.value && lead.value >= minValue);
  };

  const getLeadsNeedingFollowUp = () => {
    const now = new Date();
    return leads.filter(lead => 
      lead.next_follow_up && 
      new Date(lead.next_follow_up) <= now &&
      lead.status !== 'converted' && 
      lead.status !== 'lost'
    );
  };

  const updateLeadStatus = async (id: string, status: Lead['status']) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      await fetchLeads(); // Recarregar dados
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status do lead');
      throw err;
    }
  };

  const assignLead = async (id: string, assignedTo: string) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update({ assigned_to: assignedTo })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      await fetchLeads(); // Recarregar dados
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atribuir lead');
      throw err;
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user]);

  return {
    leads,
    loading,
    error,
    createLead,
    updateLead,
    deleteLead,
    deleteMultipleLeads,
    getLeadsByStatus,
    getLeadsBySource,
    getLeadsByCompany,
    getLeadsByValue,
    getLeadsNeedingFollowUp,
    updateLeadStatus,
    assignLead,
    refetch: fetchLeads
  };
};
