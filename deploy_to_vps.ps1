# Configurações
$SSH_USER = "root"
$SSH_HOST = "mdrinformaticaecelulares.com.br"
$SSH_KEY = "~/.ssh/vps_supabase"
$REMOTE_PATH = "/root/crm-mdr"
$ARCHIVE_NAME = "deploy_package.tar.gz"

# 1. Criar arquivo comprimido excluindo o que não é necessário
# Forçando a inclusão do .env explicitamente
Write-Host "--- Compactando arquivos (incluindo .env) ---" -ForegroundColor Cyan
tar --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude=$ARCHIVE_NAME -czf $ARCHIVE_NAME . .env

# 2. Enviar para a VPS
Write-Host "--- Enviando para a VPS via SCP ---" -ForegroundColor Cyan
scp -i $SSH_KEY $ARCHIVE_NAME "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}"

# 3. Executar comandos remotos
Write-Host "--- Executando Deploy na VPS ---" -ForegroundColor Cyan
$REMOTE_COMMANDS = @"
cd $REMOTE_PATH
# Limpa src e dist antigos para garantir que o código novo seja soberano
rm -rf src dist
tar -xzf $ARCHIVE_NAME
rm $ARCHIVE_NAME

echo "Reconstruindo containers..."
# Para e remove qualquer container travado antes de subir novamente
docker compose -f docker-compose.infra.yml down --remove-orphans 2>/dev/null || true
docker compose down --remove-orphans 2>/dev/null || true

# Força remoção de containers com nome conflitante
for c in crm-mdr-app-1 crm-mdr-caddy-1 crm-mdr-db-1 crm-mdr-redis-1 crm-mdr-n8n-1 crm-mdr-evolution-1 crm-mdr-chatwoot-web-1 crm-mdr-chatwoot-worker-1; do
  docker rm -f "$c" 2>/dev/null || true
done

# Sobe os containers com build
if docker compose version >/dev/null 2>&1; then
    docker compose -f docker-compose.infra.yml up -d --build
else
    docker-compose -f docker-compose.infra.yml up -d --build
fi

docker image prune -f
echo "Status dos containers:"
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep crm-mdr

echo "Deploy finalizado com sucesso!"
"@

$REMOTE_COMMANDS | ssh -i $SSH_KEY "${SSH_USER}@${SSH_HOST}" "bash"

# 4. Limpeza local
if (Test-Path $ARCHIVE_NAME) { Remove-Item $ARCHIVE_NAME }
Write-Host "--- Concluído! ---" -ForegroundColor Green
