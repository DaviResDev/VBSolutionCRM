-- =====================================================
-- CORREÇÃO DAS POLÍTICAS RLS PARA TABELA ACTIVITIES
-- =====================================================
-- Execute este script no SQL Editor do Supabase para corrigir:
-- 1. Políticas RLS da tabela activities
-- 2. Permissões de acesso
-- 3. Isolamento de usuários
-- =====================================================

-- 1. VERIFICAR ESTRUTURA DA TABELA ACTIVITIES
-- =====================================================
-- Verificar se a tabela activities existe e tem a estrutura correta
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'activities'
ORDER BY ordinal_position;

-- 2. VERIFICAR POLÍTICAS RLS EXISTENTES
-- =====================================================
-- Verificar se há políticas RLS na tabela activities
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'activities'
ORDER BY policyname;

-- 3. REMOVER POLÍTICAS RLS ANTIGAS (SE EXISTIREM)
-- =====================================================
-- Remover todas as políticas existentes para recriar corretamente
DROP POLICY IF EXISTS "Usuários podem ver e editar apenas suas próprias atividades" ON public.activities;
DROP POLICY IF EXISTS "Política de acesso às atividades" ON public.activities;
DROP POLICY IF EXISTS "RLS para activities" ON public.activities;

-- 4. HABILITAR ROW LEVEL SECURITY
-- =====================================================
-- Garantir que RLS está ativo na tabela activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 5. CRIAR POLÍTICAS RLS CORRETAS
-- =====================================================
-- Política para SELECT (leitura)
CREATE POLICY "Usuários podem ver apenas suas próprias atividades" ON public.activities
  FOR SELECT USING (auth.uid() = owner_id);

-- Política para INSERT (criação)
CREATE POLICY "Usuários podem criar suas próprias atividades" ON public.activities
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Política para UPDATE (edição)
CREATE POLICY "Usuários podem editar apenas suas próprias atividades" ON public.activities
  FOR UPDATE USING (auth.uid() = owner_id);

-- Política para DELETE (exclusão)
CREATE POLICY "Usuários podem excluir apenas suas próprias atividades" ON public.activities
  FOR DELETE USING (auth.uid() = owner_id);

-- 6. VERIFICAR PERMISSÕES DA TABELA
-- =====================================================
-- Garantir que usuários autenticados têm acesso à tabela
GRANT ALL ON public.activities TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 7. VERIFICAR SE A FUNÇÃO update_updated_at_column EXISTE
-- =====================================================
-- Verificar se a função para atualizar updated_at existe
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'update_updated_at_column';

-- 8. CRIAR FUNÇÃO update_updated_at_column SE NÃO EXISTIR
-- =====================================================
-- Criar função para atualizar automaticamente o campo updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. VERIFICAR E CRIAR TRIGGER PARA updated_at
-- =====================================================
-- Verificar se o trigger existe
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
  AND trigger_name = 'update_activities_updated_at';

-- Criar trigger se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_activities_updated_at') THEN
        CREATE TRIGGER update_activities_updated_at
            BEFORE UPDATE ON public.activities
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- 10. VERIFICAR SE A EXTENSÃO uuid-ossp ESTÁ DISPONÍVEL
-- =====================================================
-- Criar extensão para geração de UUIDs se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 11. TESTAR ACESSO À TABELA ACTIVITIES
-- =====================================================
-- Verificar se a tabela está acessível
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as com_owner_id,
    COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as sem_owner_id
FROM public.activities;

-- 12. VERIFICAR POLÍTICAS RLS CRIADAS
-- =====================================================
-- Confirmar que as políticas foram criadas corretamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ RLS Ativo'
        ELSE '⚠️ RLS Configurado'
    END as status_rls
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'activities'
ORDER BY policyname;

-- 13. VERIFICAR PERMISSÕES FINAIS
-- =====================================================
-- Verificar permissões da tabela activities
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'activities'
ORDER BY grantee, privilege_type;

-- =====================================================
-- COMENTÁRIOS IMPORTANTES
-- =====================================================
-- Este script:
-- 1. ✅ Verifica a estrutura da tabela activities
-- 2. ✅ Remove políticas RLS antigas
-- 3. ✅ Habilita RLS na tabela
-- 4. ✅ Cria políticas corretas para SELECT, INSERT, UPDATE, DELETE
-- 5. ✅ Concede permissões adequadas
-- 6. ✅ Cria função e trigger para updated_at
-- 7. ✅ Verifica se tudo está funcionando
-- =====================================================
-- Após executar este script:
-- - Tabela activities com RLS ativo
-- - Usuários só veem suas próprias atividades
-- - Sistema isolado por usuário
-- - Página Activities funcionando perfeitamente
-- =====================================================
