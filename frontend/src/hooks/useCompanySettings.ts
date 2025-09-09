import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmailService } from './useEmailService';

export interface CompanySettings {
  id?: string;
  company_id?: string;
  company_name: string;
  default_language: string;
  default_timezone: string;
  default_currency: string;
  datetime_format: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  enable_2fa: boolean;
  password_policy: {
    min_length: number;
    require_numbers: boolean;
    require_uppercase: boolean;
    require_special: boolean;
  };
}

export interface CompanyArea {
  id: string;
  name: string;
  description?: string;
  status: string;
  company_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyRole {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, boolean>;
  status: string;
  company_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyUser {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  birth_date?: string;
  phone?: string;
  role_id?: string;
  area_id?: string;
  status: string;
  last_login?: string;
  last_login_ip?: string;
  invite_token?: string;
  invite_expires_at?: string;
  company_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserData {
  full_name: string;
  email: string;
  password: string;
  birth_date?: string;
  phone?: string;
  role_id?: string;
  area_id?: string;
}

export function useCompanySettings(userId?: string) {
  const emailService = useEmailService();
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: '',
    default_language: 'pt-BR',
    default_timezone: 'America/Sao_Paulo',
    default_currency: 'BRL',
    datetime_format: 'DD/MM/YYYY HH:mm',
    primary_color: '#021529',
    secondary_color: '#ffffff',
    accent_color: '#3b82f6',
    enable_2fa: false,
    password_policy: {
      min_length: 8,
      require_numbers: true,
      require_uppercase: true,
      require_special: true,
    },
  });

  const [areas, setAreas] = useState<CompanyArea[]>([]);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para hash de senha (simples - em produção usar bcrypt)
  const hashPassword = (password: string): string => {
    return btoa(password); // Base64 encoding (simples para demo)
  };

  // Função para verificar senha
  const verifyPassword = (password: string, hash: string): boolean => {
    return hashPassword(password) === hash;
  };

  // Salvar configurações da empresa
  const saveCompanySettings = useCallback(async (newSettings: Partial<CompanySettings>) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Salvando configurações:', newSettings);

      // Se não tiver configurações existentes, criar novas
      if (!settings.id || settings.id.startsWith('mock')) {
        // Buscar empresa do usuário logado
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', userId)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Erro ao buscar perfil do usuário:', profileError);
        }

        let companyId = userProfile?.company_id;

        // Se não tiver company_id no perfil, tentar buscar na tabela company_users
        if (!companyId) {
          const { data: companyUser, error: companyUserError } = await supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', userId)
            .single();

          if (!companyUserError && companyUser?.company_id) {
            companyId = companyUser.company_id;
          }
        }

        // Se ainda não tiver company_id, criar uma nova empresa
        if (!companyId) {
          console.log('Criando nova empresa para o usuário');
          const { data: newCompany, error: createCompanyError } = await supabase
            .from('companies')
            .insert([{
              fantasy_name: newSettings.company_name || 'Minha Empresa',
              company_name: newSettings.company_name || 'Minha Empresa',
              logo_url: newSettings.logo_url,
              status: 'active'
            }])
            .select()
            .single();

          if (createCompanyError) {
            throw createCompanyError;
          }

          companyId = newCompany.id;

          // Atualizar o perfil do usuário com o company_id
          await supabase
            .from('user_profiles')
            .upsert([{
              id: userId,
              company_id: companyId,
              name: 'Usuário',
              email: 'usuario@empresa.com'
            }]);
        }

        // Criar configurações da empresa com estrutura correta
        const { data: companySettingsData, error: createSettingsError } = await supabase
          .from('company_settings')
          .insert([{
            company_id: companyId,
            company_name: newSettings.company_name || 'Minha Empresa',
            logo_url: newSettings.logo_url,
            default_language: newSettings.default_language || 'pt-BR',
            default_timezone: newSettings.default_timezone || 'America/Sao_Paulo',
            default_currency: newSettings.default_currency || 'BRL',
            datetime_format: newSettings.datetime_format || 'DD/MM/YYYY HH:mm',
            primary_color: newSettings.primary_color || '#021529',
            secondary_color: newSettings.secondary_color || '#ffffff',
            accent_color: newSettings.accent_color || '#3b82f6',
            enable_2fa: newSettings.enable_2fa || false,
            password_policy: newSettings.password_policy || {
              min_length: 8,
              require_numbers: true,
              require_uppercase: true,
              require_special: true,
            }
          }])
          .select()
          .single();

        if (createSettingsError) {
          throw createSettingsError;
        }

        console.log('Configurações da empresa criadas com sucesso:', companySettingsData);
        setSettings(companySettingsData);
        return { success: true, data: companySettingsData };
      } else {
        // Atualizar configurações existentes
        const { data: updatedSettingsData, error: updateError } = await supabase
          .from('company_settings')
          .update({
            company_name: newSettings.company_name,
            logo_url: newSettings.logo_url,
            default_language: newSettings.default_language,
            default_timezone: newSettings.default_timezone,
            default_currency: newSettings.default_currency,
            datetime_format: newSettings.datetime_format,
            primary_color: newSettings.primary_color,
            secondary_color: newSettings.secondary_color,
            accent_color: newSettings.accent_color,
            enable_2fa: newSettings.enable_2fa,
            password_policy: newSettings.password_policy,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        console.log('Configurações da empresa atualizadas com sucesso:', updatedSettingsData);
        setSettings(updatedSettingsData);
        return { success: true, data: updatedSettingsData };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao salvar configurações';
      console.error('Erro ao salvar configurações:', err);
      setError(errorMessage);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, [settings, userId]);

  // Adicionar área
  const addArea = useCallback(async (name: string, description?: string) => {
    try {
      console.log('Adicionando área (mock):', { name, description });
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const newArea: CompanyArea = {
        id: `area-${Date.now()}`,
        name,
        description,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Atualizar estado local
      setAreas(prev => [...prev, newArea]);
      return { success: true, data: newArea };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar área');
      return { success: false, error: err };
    }
  }, []);

  // Editar área
  const editArea = useCallback(async (id: string, updates: Partial<CompanyArea>) => {
    try {
      console.log('Editando área (mock):', { id, updates });
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Atualizar estado local
      setAreas(prev => prev.map(area => 
        area.id === id 
          ? { ...area, ...updates, updated_at: new Date().toISOString() }
          : area
      ));
      
      const updatedArea = areas.find(area => area.id === id);
      return { success: true, data: updatedArea };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao editar área');
      return { success: false, error: err };
    }
  }, [areas]);

  // Excluir área
  const deleteArea = useCallback(async (id: string) => {
    try {
      console.log('Excluindo área (mock):', id);
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Atualizar estado local
      setAreas(prev => prev.filter(area => area.id !== id));
      return { success: true };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir área');
      return { success: false, error: err };
    }
  }, []);

  // Adicionar cargo
  const addRole = useCallback(async (name: string, description?: string) => {
    try {
      console.log('Adicionando cargo (mock):', { name, description });
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const newRole: CompanyRole = {
        id: `role-${Date.now()}`,
        name,
        description,
        status: 'active',
        permissions: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Atualizar estado local
      setRoles(prev => [...prev, newRole]);
      return { success: true, data: newRole };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar cargo');
      return { success: false, error: err };
    }
  }, []);

  // Editar cargo
  const editRole = useCallback(async (id: string, updates: Partial<CompanyRole>) => {
    try {
      console.log('Editando cargo (mock):', { id, updates });
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const updatedRole = {
        ...roles.find(role => role.id === id)!,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      // Atualizar estado local
      setRoles(prev => prev.map(role => role.id === id ? updatedRole : role));
      return { success: true, data: updatedRole };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao editar cargo');
      return { success: false, error: err };
    }
  }, [roles]);

  // Excluir cargo
  const deleteRole = useCallback(async (id: string) => {
    try {
      console.log('Excluindo cargo (mock):', id);
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Atualizar estado local
      setRoles(prev => prev.filter(role => role.id !== id));
      return { success: true };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir cargo');
      return { success: false, error: err };
    }
  }, []);

  // Salvar permissões do cargo
  const saveRolePermissions = useCallback(async (roleId: string, permissions: Record<string, boolean>) => {
    try {
      console.log('Salvando permissões do cargo (mock):', { roleId, permissions });
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Atualizar estado local
      setRoles(prev => prev.map(role => 
        role.id === roleId ? { ...role, permissions } : role
      ));

      return { success: true };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar permissões');
      return { success: false, error: err };
    }
  }, []);

  // Adicionar usuário
  const addUser = useCallback(async (userData: CreateUserData) => {
    try {
      console.log('Adicionando usuário (mock):', userData);
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newUser: CompanyUser = {
        id: `user-${Date.now()}`,
        ...userData,
        password_hash: 'mock-hash',
        status: 'pending',
        invite_token: 'mock-token',
        invite_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Atualizar estado local
      setUsers(prev => [...prev, newUser]);
      return { success: true, data: newUser };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar usuário');
      return { success: false, error: err };
    }
  }, []);

  // Editar usuário
  const editUser = useCallback(async (id: string, updates: Partial<CompanyUser>) => {
    try {
      console.log('Editando usuário (mock):', { id, updates });
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Atualizar estado local
      setUsers(prev => prev.map(user => 
        user.id === id 
          ? { ...user, ...updates, updated_at: new Date().toISOString() }
          : user
      ));
      
      const updatedUser = users.find(user => user.id === id);
      return { success: true, data: updatedUser };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao editar usuário');
      return { success: false, error: err };
    }
  }, [users]);

  // Excluir usuário
  const deleteUser = useCallback(async (id: string) => {
    try {
      console.log('Excluindo usuário (mock):', id);
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Atualizar estado local
      setUsers(prev => prev.filter(user => user.id !== id));
      return { success: true };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir usuário');
      return { success: false, error: err };
    }
  }, []);

  // Alterar status do usuário
  const updateUserStatus = useCallback(async (id: string, status: string) => {
    try {
      console.log('Alterando status do usuário (mock):', { id, status });
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Atualizar estado local
      setUsers(prev => prev.map(user => 
        user.id === id 
          ? { ...user, status, updated_at: new Date().toISOString() }
          : user
      ));
      
      const updatedUser = users.find(user => user.id === id);
      return { success: true, data: updatedUser };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar status do usuário');
      return { success: false, error: err };
    }
  }, [users]);

  // Redefinir senha do usuário
  const resetUserPassword = useCallback(async (id: string, newPassword: string) => {
    try {
      console.log('Redefinindo senha do usuário (mock):', { id, newPassword: '***' });
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Atualizar estado local
      setUsers(prev => prev.map(user => 
        user.id === id 
          ? { ...user, password_hash: 'new-mock-hash', updated_at: new Date().toISOString() }
          : user
      ));
      
      const updatedUser = users.find(user => user.id === id);
      return { success: true, data: updatedUser };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha');
      return { success: false, error: err };
    }
  }, [users]);

  // Atualizar logo da empresa
  const updateLogo = useCallback(async (logoUrl: string) => {
    try {
      console.log('Atualizando logo (mock):', logoUrl);
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const result = await saveCompanySettings({ logo_url: logoUrl });
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar logo');
      return { success: false, error: err };
    }
  }, [saveCompanySettings]);

  // Remover logo da empresa
  const removeLogo = useCallback(async () => {
    try {
      console.log('Removendo logo (mock)');
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const result = await saveCompanySettings({ logo_url: null });
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover logo');
      return { success: false, error: err };
    }
  }, [saveCompanySettings]);

  // Função para buscar configurações da empresa do usuário logado
  const fetchCompanySettings = useCallback(async (userIdParam?: string) => {
      try {
        setLoading(true);
        setError(null);
        
      // Usar o userId passado como parâmetro ou o do hook
      const targetUserId = userIdParam || userId;
      
      // Se não tiver userId, não pode buscar configurações
      if (!targetUserId) {
        console.log('Usuário não fornecido, usando dados mock');
        const mockSettings: CompanySettings = {
          id: 'mock-no-user',
          company_name: 'CRM Sistema',
          default_language: 'pt-BR',
          default_timezone: 'America/Sao_Paulo',
          default_currency: 'BRL',
          datetime_format: 'DD/MM/YYYY HH:mm',
          primary_color: '#021529',
          secondary_color: '#ffffff',
          accent_color: '#3b82f6',
          enable_2fa: false,
          password_policy: {
            min_length: 8,
            require_numbers: true,
            require_uppercase: true,
            require_special: true,
          },
        };
        setSettings(mockSettings);
        return;
      }
      
      // Primeiro, buscar o perfil do usuário para obter o company_id
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', targetUserId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Erro ao buscar perfil do usuário:', profileError);
      }

      let companyId = userProfile?.company_id;

      // Se não tiver company_id no perfil, tentar buscar na tabela company_users
      if (!companyId) {
        const { data: companyUser, error: companyUserError } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', targetUserId)
          .single();

        if (!companyUserError && companyUser?.company_id) {
          companyId = companyUser.company_id;
        }
      }

      // Se ainda não tiver company_id, usar o primeiro registro disponível
      if (!companyId) {
        console.log('Usuário não tem empresa associada, buscando primeira empresa disponível');
        const { data: firstCompany, error: firstCompanyError } = await supabase
          .from('companies')
          .select('id')
          .limit(1)
          .single();

        if (!firstCompanyError && firstCompany?.id) {
          companyId = firstCompany.id;
        }
      }

      // Buscar configurações da empresa específica
      if (companyId) {
        const { data: companySettingsData, error: companySettingsError } = await supabase
          .from('company_settings')
          .select('*')
          .eq('company_id', companyId)
          .single();

        if (companySettingsError && companySettingsError.code !== 'PGRST116') {
          console.error('Erro ao buscar configurações da empresa:', companySettingsError);
        }

        if (companySettingsData) {
          setSettings(companySettingsData);
          console.log('Configurações da empresa carregadas:', companySettingsData);
        } else {
          // Se não encontrar configurações específicas, buscar dados da empresa
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single();

          if (!companyError && companyData) {
            // Criar configurações baseadas nos dados da empresa
            const companySettings: CompanySettings = {
              id: `company-${companyId}`,
              company_name: companyData.fantasy_name || companyData.company_name || 'Minha Empresa',
              logo_url: companyData.logo_url,
              default_language: 'pt-BR',
              default_timezone: 'America/Sao_Paulo',
              default_currency: 'BRL',
              datetime_format: 'DD/MM/YYYY HH:mm',
              primary_color: '#021529',
              secondary_color: '#ffffff',
              accent_color: '#3b82f6',
              enable_2fa: false,
              password_policy: {
                min_length: 8,
                require_numbers: true,
                require_uppercase: true,
                require_special: true,
              },
            };
            setSettings(companySettings);
            console.log('Configurações criadas a partir dos dados da empresa:', companySettings);
          } else {
        console.log('Usando dados mock para configurações');
            // Configurações mock
            const mockSettings: CompanySettings = {
              id: 'mock-1',
              company_name: 'Minha Empresa',
              default_language: 'pt-BR',
              default_timezone: 'America/Sao_Paulo',
              default_currency: 'BRL',
              datetime_format: 'DD/MM/YYYY HH:mm',
              primary_color: '#021529',
              secondary_color: '#ffffff',
              accent_color: '#3b82f6',
              enable_2fa: false,
              password_policy: {
                min_length: 8,
                require_numbers: true,
                require_uppercase: true,
                require_special: true,
              },
            };
            setSettings(mockSettings);
          }
        }
      } else {
        console.log('Usando dados mock para configurações (sem empresa)');
        // Configurações mock
        const mockSettings: CompanySettings = {
          id: 'mock-1',
          company_name: 'Minha Empresa',
          default_language: 'pt-BR',
          default_timezone: 'America/Sao_Paulo',
          default_currency: 'BRL',
          datetime_format: 'DD/MM/YYYY HH:mm',
          primary_color: '#021529',
          secondary_color: '#ffffff',
          accent_color: '#3b82f6',
          enable_2fa: false,
          password_policy: {
            min_length: 8,
            require_numbers: true,
            require_uppercase: true,
            require_special: true,
          },
        };
        setSettings(mockSettings);
      }

      // Buscar áreas da empresa
      const { data: areasData, error: areasError } = await supabase
        .from('company_areas')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (areasError && areasError.code !== 'PGRST116') {
        throw areasError;
      }

      if (areasData && areasData.length > 0) {
        setAreas(areasData);
        console.log('Áreas da empresa carregadas:', areasData);
      } else {
        console.log('Usando dados mock para áreas');
        // Áreas mock
        const mockAreas: CompanyArea[] = [
          {
            id: 'area-1',
            name: 'Administração',
            description: 'Setor administrativo da empresa',
            status: 'active',
            company_id: companyId,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 'area-2',
            name: 'Vendas',
            description: 'Setor de vendas e comercial',
            status: 'active',
            company_id: companyId,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 'area-3',
            name: 'TI',
            description: 'Tecnologia da Informação',
            status: 'active',
            company_id: companyId,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ];
        setAreas(mockAreas);
      }

      // Buscar cargos da empresa
      const { data: rolesData, error: rolesError } = await supabase
        .from('company_roles')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (rolesError && rolesError.code !== 'PGRST116') {
        throw rolesError;
      }

      if (rolesData && rolesData.length > 0) {
        setRoles(rolesData);
        console.log('Cargos da empresa carregados:', rolesData);
      } else {
        console.log('Usando dados mock para cargos');
        // Cargos mock
        const mockRoles: CompanyRole[] = [
          {
            id: 'role-1',
            name: 'Administrador',
            description: 'Administrador do sistema',
            status: 'active',
            company_id: companyId,
            permissions: {},
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 'role-2',
            name: 'Gerente',
            description: 'Gerente de equipe',
            status: 'active',
            company_id: companyId,
            permissions: {},
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 'role-3',
            name: 'Usuário',
            description: 'Usuário padrão',
            status: 'active',
            company_id: companyId,
            permissions: {},
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ];
        setRoles(mockRoles);
      }

      // Buscar usuários da empresa
      const { data: usersData, error: usersError } = await supabase
        .from('company_users')
        .select('*')
        .eq('company_id', companyId)
        .order('full_name');

      if (usersError && usersError.code !== 'PGRST116') {
        throw usersError;
      }

      if (usersData && usersData.length > 0) {
        setUsers(usersData);
        console.log('Usuários da empresa carregados:', usersData);
      } else {
        console.log('Usando dados mock para usuários');
        // Usuários mock
        const mockUsers: CompanyUser[] = [
          {
            id: 'user-1',
            full_name: 'Usuário Administrador',
            email: 'admin@empresa.com',
            password_hash: 'mock-hash',
            status: 'active',
            company_id: companyId,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ];
        setUsers(mockUsers);
      }
        
      } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar configurações';
      console.error('Erro ao carregar configurações da empresa:', err);
        setError(errorMessage);
      
      // Em caso de erro, usar configurações mock
      const mockSettings: CompanySettings = {
        id: 'mock-error',
        company_name: 'CRM Sistema',
        default_language: 'pt-BR',
        default_timezone: 'America/Sao_Paulo',
        default_currency: 'BRL',
        datetime_format: 'DD/MM/YYYY HH:mm',
        primary_color: '#021529',
        secondary_color: '#ffffff',
        accent_color: '#3b82f6',
        enable_2fa: false,
        password_policy: {
          min_length: 8,
          require_numbers: true,
          require_uppercase: true,
          require_special: true,
        },
      };
      setSettings(mockSettings);
      } finally {
        setLoading(false);
      }
  }, [userId]);

  // Carregar dados iniciais
  useEffect(() => {
    fetchCompanySettings();
  }, [fetchCompanySettings]);

  return {
    settings,
    areas,
    roles,
    users,
    loading,
    error,
    saveCompanySettings,
    addArea,
    editArea,
    deleteArea,
    addRole,
    editRole,
    deleteRole,
    saveRolePermissions,
    addUser,
    editUser,
    deleteUser,
    updateUserStatus,
    resetUserPassword,
    updateLogo,
    removeLogo,
    verifyPassword,
    fetchCompanySettings, // Exportar a função para uso externo
  };
}
