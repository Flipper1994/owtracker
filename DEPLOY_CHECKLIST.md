# Build und Deployment Checkliste

## Lokal testen (vor Server-Deployment)

```bash
# Frontend bauen
cd app/frontend
npm ci
npm run build
cd ../..

# Backend testen
cd app/backend
npm ci
PORT=8080 node server.js
cd ../..

# Im Browser testen:
# http://localhost:8080/owtracker
```

## Mit Docker lokal testen

```bash
# Docker Network erstellen
docker network create web

# Bauen und starten
docker-compose up -d

# Testen
curl http://localhost:8080/owtracker

# Logs prüfen
docker-compose logs -f

# Cleanupdocker-compose down
```

## Server-Deployment

```bash
# 1. Auf Server verbinden
ssh user@server

# 2. Projekt klonen
cd /opt/apps
git clone <repo> owtracker
cd owtracker

# 3. Docker Network (nur einmalig, wenn nicht vorhanden)
docker network create web 2>/dev/null || true

# 4. Starten
docker-compose up -d

# 5. Status prüfen
docker-compose ps

# 6. Logs ansehen
docker-compose logs owtracker

# 7. Nginx updaten (siehe DEPLOYMENT.md)
```

## Environment-Variablen (optional)

Falls du Environment-Variablen brauchst, update in `docker-compose.yml`:

```yaml
environment:
  - PORT=8080
  - NODE_ENV=production
  - DB_PATH=/app/backend/matches.sqlite
```

## Automatische Updates (Cron-Job)

```bash
# Deploy Script erstellen: /opt/apps/owtracker/deploy.sh
#!/bin/bash
cd /opt/apps/owtracker
git pull
docker-compose up -d --build
```

```bash
# Cron hinzufügen (täglich um 2 Uhr updaten)
0 2 * * * /opt/apps/owtracker/deploy.sh >> /var/log/owtracker-deploy.log 2>&1
```

## Monitoring

```bash
# Container-Ressourcen überwachen
docker stats owtracker

# Datenbank-Größe prüfen
docker exec owtracker du -sh /app/backend/matches.sqlite

# Regelmäßig Backups machen
docker cp owtracker:/app/backend/matches.sqlite ./backups/matches-$(date +%Y%m%d).sqlite
```
