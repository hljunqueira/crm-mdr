# Configurações
$SSH_USER = "root"
$SSH_HOST = "mdrinformaticaecelulares.com.br"
$SSH_KEY = "~/.ssh/vps_supabase"
$REMOTE_PATH = "/root/crm-mdr"
$ARCHIVE_NAME = "project.tar.gz"

# 1. Criar arquivo comprimido excluindo o que não é necessário
Write-Host "--- Compactando arquivos (ignorando node_modules e .git) ---" -ForegroundColor Cyan
tar --exclude='node_modules' --exclude='.git' --exclude='dist' -czf $ARCHIVE_NAME .

# 2. Enviar para a VPS
Write-Host "--- Enviando para a VPS via SCP ---" -ForegroundColor Cyan
scp -i $SSH_KEY $ARCHIVE_NAME "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}"

# 3. Executar comandos remotos
Write-Host "--- Executando Deploy na VPS ---" -ForegroundColor Cyan
$REMOTE_COMMANDS = @"
cd $REMOTE_PATH
tar -xzf $ARCHIVE_NAME
rm $ARCHIVE_NAME

# Limpeza de containers antigos com prefixo 'infra-' (se existirem)
echo "Limpando containers órfãos..."
docker ps -a --filter "name=infra-" -q | xargs -r docker rm -f

# Garantir que redes externas existam
docker network create supabase_default 2>/dev/null || true
docker network create infra_crm-network 2>/dev/null || true

# Deploy com Docker
echo "Reconstruindo container 'app'..."
# Tenta usar docker compose (moderno) ou docker-compose (legado)
if docker compose version >/dev/null 2>&1; then
    docker compose -f docker-compose.infra.yml up -d --build app
else
    docker-compose -f docker-compose.infra.yml up -d --build app
fi

# Limpeza de imagens antigas
docker image prune -f

echo "Status do container 'app':"
docker ps | grep app

echo "Deploy finalizado com sucesso!"
"@

ssh -i $SSH_KEY "${SSH_USER}@${SSH_HOST}" $REMOTE_COMMANDS

# 4. Limpeza local
Remove-Item $ARCHIVE_NAME
Write-Host "--- Concluído! ---" -ForegroundColor Green
