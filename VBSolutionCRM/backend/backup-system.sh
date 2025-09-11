#!/bin/bash

# 🛡️ SCRIPT DE BACKUP AUTOMÁTICO - Sistema de Proteção
# Este script cria backups automáticos dos arquivos críticos

set -e

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}$1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Diretório de backup
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

log "🛡️ Criando backup do sistema de proteção..."

# Arquivos críticos para backup
CRITICAL_FILES=(
    "backend/message-normalizer.js"
    "backend/simple-baileys-server.js"
    "frontend/src/contexts/ConnectionsContext.tsx"
    "frontend/src/components/ConnectionsModalProvider.tsx"
    "frontend/src/hooks/useWhatsAppConversations.ts"
    "frontend/src/pages/WhatsAppConversations.tsx"
    "frontend/src/pages/WhatsAppPage.tsx"
    "backend/PROTECTION_SYSTEM.md"
    "backend/verify-system.js"
)

# Criar backup dos arquivos críticos
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        # Criar diretório de destino
        mkdir -p "$BACKUP_DIR/$(dirname "$file")"
        # Copiar arquivo
        cp "$file" "$BACKUP_DIR/$file"
        success "Backup criado: $file"
    else
        warning "Arquivo não encontrado: $file"
    fi
done

# Criar backup do banco de dados (estrutura)
log "📊 Criando backup da estrutura do banco..."

cat > "$BACKUP_DIR/database_structure.sql" << 'EOF'
-- Backup da estrutura crítica do banco de dados
-- Execute este script para restaurar a estrutura correta

-- 1. Garantir que whatsapp_atendimentos não existe
DROP TABLE IF EXISTS whatsapp_atendimentos CASCADE;

-- 2. Remover foreign key constraint
DO $$ 
BEGIN
    ALTER TABLE whatsapp_mensagens DROP CONSTRAINT IF EXISTS whatsapp_mensagens_atendimento_id_fkey;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 3. Tornar atendimento_id nullable
ALTER TABLE whatsapp_mensagens 
ALTER COLUMN atendimento_id DROP NOT NULL;

-- 4. Garantir que message_type existe (não tipo)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'whatsapp_mensagens' AND column_name = 'tipo') THEN
        ALTER TABLE whatsapp_mensagens RENAME COLUMN tipo TO message_type;
    END IF;
END $$;

-- 5. Garantir que media_type existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'whatsapp_mensagens' AND column_name = 'media_type') THEN
        ALTER TABLE whatsapp_mensagens ADD COLUMN media_type TEXT;
    END IF;
END $$;
EOF

success "Backup da estrutura do banco criado"

# Criar arquivo de informações do backup
cat > "$BACKUP_DIR/backup_info.txt" << EOF
Backup criado em: $(date)
Sistema: WhatsApp Baileys Integration
Versão: 1.0
Status: Proteção Ativa

Arquivos incluídos:
$(printf '%s\n' "${CRITICAL_FILES[@]}")

Para restaurar:
1. Copie os arquivos de volta para suas posições originais
2. Execute o script database_structure.sql no Supabase
3. Execute: node verify-system.js

Para verificar o sistema:
node verify-system.js
EOF

success "Informações do backup criadas"

# Criar link simbólico para o backup mais recente
rm -f "backups/latest"
ln -s "$(basename "$BACKUP_DIR")" "backups/latest"

success "Backup completo criado em: $BACKUP_DIR"
log "📁 Para restaurar: cp -r $BACKUP_DIR/* ."
log "🔍 Para verificar: node verify-system.js"
