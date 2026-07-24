param(
  [Parameter(Position=0)]
  [string]$Target = "",
  [switch]$Backend,
  [switch]$Frontend,
  [switch]$All
)

# Determinar o modo de deploy
$Mode = "backend" # padrão

if ($Frontend -or $Target -eq "frontend") {
  $Mode = "frontend"
} elseif ($All -or $Target -eq "all" -or $Target -eq "full") {
  $Mode = "all"
} elseif ($Backend -or $Target -eq "backend") {
  $Mode = "backend"
}

# Configurações de Conexão VPS
$SSH_USER = "root"
$SSH_HOST = "mdrinformaticaecelulares.com.br"
$SSH_KEY = "~/.ssh/vps_supabase"
$REMOTE_PATH = "/root/crm-mdr"
$ARCHIVE_NAME = "deploy_package.tar.gz"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "         DEPLOY MDR - MODO: $Mode          " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# ---------------------------------------------------------
# MODO 1: DEPLOY APENAS FRONTEND (Ultrarrápido - ~3 segundos)
# ---------------------------------------------------------
if ($Mode -eq "frontend") {
  Write-Host "--- 1. Compilando o Frontend localmente (npm run build) ---" -ForegroundColor Yellow
  npm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro na compilação do Frontend. Abortando deploy." -ForegroundColor Red
    exit 1
  }

  $FRONTEND_ARCHIVE = "frontend_dist.tar.gz"
  Write-Host "--- 2. Compactando pasta dist ---" -ForegroundColor Yellow
  tar -czf $FRONTEND_ARCHIVE -C dist .

  Write-Host "--- 3. Enviando arquivos compilados do Frontend para a VPS ---" -ForegroundColor Yellow
  scp -i $SSH_KEY $FRONTEND_ARCHIVE "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}"

  Write-Host "--- 4. Atualizando arquivos estáticos no Servidor ---" -ForegroundColor Yellow
  $REMOTE_FRONTEND_CMD = @"
cd $REMOTE_PATH
mkdir -p dist
tar -xzf $FRONTEND_ARCHIVE -C dist/
rm $FRONTEND_ARCHIVE

CONTAINER_ID=`$(docker ps -q -f name=crm-mdr-app-1)
if [ -n "`$CONTAINER_ID" ]; then
  docker cp dist/. `$CONTAINER_ID:/app/dist/
  echo "Frontend atualizado no container instantaneamente!"
else
  echo "Container crm-mdr-app-1 não encontrado. Reconstruindo app..."
  docker compose -f docker-compose.infra.yml up -d --build app
fi
echo "Deploy do Frontend concluído com sucesso!"
"@

  $REMOTE_FRONTEND_CMD | ssh -i $SSH_KEY "${SSH_USER}@${SSH_HOST}" "bash"

  if (Test-Path $FRONTEND_ARCHIVE) { Remove-Item $FRONTEND_ARCHIVE }
  Write-Host "--- DEPLOY FRONTEND FINALIZADO! ---" -ForegroundColor Green
  exit 0
}

# ---------------------------------------------------------
# MODO 2: DEPLOY SOMENTE BACKEND / APP (~10 segundos)
# ---------------------------------------------------------
if ($Mode -eq "backend") {
  Write-Host "--- 1. Compilando dist localmente para evitar uso de CPU na VPS ---" -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro na compilação local. Abortando deploy." -ForegroundColor Red
    exit 1
  }

  Write-Host "--- 2. Compactando arquivos do projeto (incluindo dist e .env) ---" -ForegroundColor Cyan
  tar --exclude='node_modules' --exclude='.git' --exclude='dist-electron' --exclude='dist-server' --exclude='scratch' --exclude='*.db' --exclude='*.sqlite*' --exclude='*.log' --exclude='*.xls' --exclude='*.xlsx' --exclude=$ARCHIVE_NAME -czf $ARCHIVE_NAME . .env

  Write-Host "--- 3. Enviando código para a VPS via SCP ---" -ForegroundColor Cyan
  scp -i $SSH_KEY $ARCHIVE_NAME "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}"

  Write-Host "--- 4. Reconstruindo e reiniciando apenas o container do App ---" -ForegroundColor Cyan
  $REMOTE_BACKEND_CMD = @"
cd $REMOTE_PATH
rm -rf src server dist
tar -xzf $ARCHIVE_NAME
rm $ARCHIVE_NAME

echo "Atualizando e reconstruindo apenas o container do App..."
if docker compose version >/dev/null 2>&1; then
    docker compose -f docker-compose.infra.yml up -d --build app
else
    docker-compose -f docker-compose.infra.yml up -d --build app
fi

docker image prune -f
echo "Status do container App:"
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep crm-mdr
echo "Deploy do Backend/App finalizado com sucesso!"
"@

  $REMOTE_BACKEND_CMD | ssh -i $SSH_KEY "${SSH_USER}@${SSH_HOST}" "bash"

  if (Test-Path $ARCHIVE_NAME) { Remove-Item $ARCHIVE_NAME }
  Write-Host "--- DEPLOY BACKEND FINALIZADO! ---" -ForegroundColor Green
  exit 0
}

# ---------------------------------------------------------
# MODO 3: DEPLOY ALL GERAL (Infraestrutura Completa Docker)
# ---------------------------------------------------------
if ($Mode -eq "all") {
  Write-Host "--- 1. Compilando dist localmente ---" -ForegroundColor Yellow
  npm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro na compilação local. Abortando deploy." -ForegroundColor Red
    exit 1
  }

  Write-Host "--- 2. Compactando todos os arquivos da aplicação ---" -ForegroundColor Yellow
  tar --exclude='node_modules' --exclude='.git' --exclude='dist-electron' --exclude='dist-server' --exclude='scratch' --exclude='*.db' --exclude='*.sqlite*' --exclude='*.log' --exclude='*.xls' --exclude='*.xlsx' --exclude=$ARCHIVE_NAME -czf $ARCHIVE_NAME . .env

  Write-Host "--- 3. Enviando pacote completo para a VPS ---" -ForegroundColor Yellow
  scp -i $SSH_KEY $ARCHIVE_NAME "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}"

  Write-Host "--- 4. Reiniciando Toda a Infraestrutura Docker na VPS ---" -ForegroundColor Yellow
  $REMOTE_ALL_CMD = @"
cd $REMOTE_PATH
rm -rf src dist server
tar -xzf $ARCHIVE_NAME
rm $ARCHIVE_NAME

echo "Reconstruindo toda a infraestrutura..."
docker compose -f docker-compose.infra.yml down --remove-orphans 2>/dev/null || true
docker compose down --remove-orphans 2>/dev/null || true

for c in crm-mdr-app-1 crm-mdr-caddy-1 crm-mdr-db-1 crm-mdr-redis-1 crm-mdr-n8n-1 crm-mdr-evolution-1 crm-mdr-chatwoot-web-1 crm-mdr-chatwoot-worker-1; do
  docker rm -f "`$c" 2>/dev/null || true
done

if docker compose version >/dev/null 2>&1; then
    docker compose -f docker-compose.infra.yml up -d --build
else
    docker-compose -f docker-compose.infra.yml up -d --build
fi

echo "Aguardando banco de dados estabilizar..."
sleep 5

docker image prune -f
echo "Status dos containers:"
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep crm-mdr
echo "Deploy completo finalizado com sucesso!"
"@

  $REMOTE_ALL_CMD | ssh -i $SSH_KEY "${SSH_USER}@${SSH_HOST}" "bash"

  if (Test-Path $ARCHIVE_NAME) { Remove-Item $ARCHIVE_NAME }
  Write-Host "--- DEPLOY GERAL (ALL) FINALIZADO! ---" -ForegroundColor Green
  exit 0
}
