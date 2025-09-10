-- Correção final das tabelas company_areas e company_roles
-- Data: 2025-01-15

-- Garantir que a tabela company_areas existe com a estrutura correta
CREATE TABLE IF NOT EXISTS public.company_areas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir que a tabela company_roles existe com a estrutura correta
CREATE TABLE IF NOT EXISTS public.company_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas que podem estar faltando
ALTER TABLE public.company_areas 
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.company_roles 
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_company_areas_company_id ON public.company_areas(company_id);
CREATE INDEX IF NOT EXISTS idx_company_areas_status ON public.company_areas(status);
CREATE INDEX IF NOT EXISTS idx_company_roles_company_id ON public.company_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_company_roles_status ON public.company_roles(status);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_company_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_company_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
DROP TRIGGER IF EXISTS trigger_update_company_areas_updated_at ON public.company_areas;
CREATE TRIGGER trigger_update_company_areas_updated_at
    BEFORE UPDATE ON public.company_areas
    FOR EACH ROW
    EXECUTE FUNCTION update_company_areas_updated_at();

DROP TRIGGER IF EXISTS trigger_update_company_roles_updated_at ON public.company_roles;
CREATE TRIGGER trigger_update_company_roles_updated_at
    BEFORE UPDATE ON public.company_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_company_roles_updated_at();

-- Habilitar RLS
ALTER TABLE public.company_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_roles ENABLE ROW LEVEL SECURITY;

-- Políticas básicas para RLS (permitir todas as operações para usuários autenticados)
DROP POLICY IF EXISTS "Allow all operations for authenticated users on company_areas" ON public.company_areas;
CREATE POLICY "Allow all operations for authenticated users on company_areas" 
    ON public.company_areas
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow all operations for authenticated users on company_roles" ON public.company_roles;
CREATE POLICY "Allow all operations for authenticated users on company_roles" 
    ON public.company_roles
    FOR ALL USING (auth.role() = 'authenticated');
