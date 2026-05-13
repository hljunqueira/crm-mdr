cd /root/crm-mdr
git pull origin main || (git checkout main && git pull origin main)
cd /root/infra
docker-compose -f docker-compose.infra.yml up -d --build app
docker logs --tail 20 app
