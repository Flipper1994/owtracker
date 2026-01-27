# OW Tracker - Deployment Guide

## Überblick

Diese Anleitung beschreibt, wie du OW Tracker auf einen produktiven Server deployest, sodass die App unter `http://your-domain.com/owtracker` erreichbar ist, **ohne Portangabe**.

## Voraussetzungen

- Docker und Docker Compose auf dem Server installiert
- Nginx als Reverse Proxy (oder ähnlicher Reverse Proxy)
- Bereits andere Services laufen auf dem Server (Port 80/443)

## Architektur

```
Client (Browser) 
    ↓
Nginx (Port 80/443) - Reverse Proxy
    ↓
OW Tracker Container (Port 8080 intern)
    ├── Frontend (React + Vite, unter /owtracker serviert)
    └── Backend (Node.js Express API unter /owtracker/api)
```

Die App ist **völlig isoliert** und beeinträchtigt andere Services nicht.

## Setup auf dem Server

### 1. Repository auf Server klonen

```bash
cd /opt/apps
git clone <your-repo> owtracker
cd owtracker
```

### 2. Docker Network erstellen (einmalig)

```bash
docker network create web
```

Dieses Netzwerk wird für alle deine Services genutzt. Falls bereits vorhanden, ignorieren.

### 3. Docker Compose starten

```bash
docker-compose up -d
```

Der Container startet automatisch und serviert die App auf `localhost:8080`.

### 4. Nginx Konfiguration anpassen

Falls du noch kein Nginx hast:

```bash
docker run -d --name nginx \
  -p 80:80 -p 443:443 \
  -v /opt/nginx.conf:/etc/nginx/nginx.conf:ro \
  --network web \
  nginx:latest
```

**Oder** in deine existierende Nginx-Config folgende Zeile hinzufügen:

```nginx
include /opt/apps/owtracker/nginx.conf;
```

Dann Nginx neu laden:

```bash
docker exec nginx nginx -s reload
```

### 5. Firewall Rules (falls nötig)

Stelle sicher, dass:
- Port 80 und 443 offen sind für Traffic
- Port 8080 ist NICHT offen (nur für Nginx sichtbar im Docker Network)

## Verwendung nach Deployment

### App aufrufen
```
http://your-domain.com/owtracker
```

Keine Portangabe nötig! ✓

### Container verwalten

```bash
# Status prüfen
docker-compose ps

# Logs anschauen
docker-compose logs -f owtracker

# Container neu starten
docker-compose restart owtracker

# Container stoppen
docker-compose down
```

### Datenbank

Die SQLite-Datenbank wird in `app/backend/matches.sqlite` gespeichert und ist persistent im Container.

Backup erstellen:
```bash
docker cp owtracker:/app/backend/matches.sqlite ./matches.sqlite.backup
```

### Updates

Nach Git Pull:

```bash
docker-compose down
docker-compose up -d --build
```

## Mehrere Apps auf einem Server

Beispiel für komplette Nginx-Config mit mehreren Services:

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Zertifikat (optional, z.B. mit Let's Encrypt)
    # ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # OW Tracker
    location /owtracker {
        proxy_pass http://owtracker:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Andere Apps
    location /app2 {
        proxy_pass http://app2-service:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        # Hauptwebseite oder weitere Services
        proxy_pass http://main-service:5000;
        proxy_set_header Host $host;
    }
}
```

## Troubleshooting

### App lädt nicht unter /owtracker

1. Container läuft?
   ```bash
   docker-compose ps
   ```

2. Frontend build existiert?
   ```bash
   docker exec owtracker ls -la /app/frontend/dist/
   ```

3. Nginx logs prüfen:
   ```bash
   docker logs nginx
   ```

### API-Calls funktionieren nicht

- Stelle sicher, dass der Container auf Port 8080 läuft
- Prüfe Nginx logs: `docker logs nginx`
- Verifiziere, dass `/owtracker/api` korrekt proxied wird

### Container crasht beim Start

```bash
docker-compose logs owtracker
```

Häufige Gründe:
- Abhängigkeiten nicht installiert → `npm ci` im Dockerfile
- Port bereits in Verwendung → anderen Service ändern
- Fehlerhafte Umgebungsvariablen → `.env` prüfen

## Best Practices

1. ✅ **Isolierte Container**: Jeder Service in eigenem Container
2. ✅ **Shared Network**: Docker Network `web` für Service-Kommunikation
3. ✅ **Reverse Proxy**: Nginx auf Port 80/443, Services auf intern nicht-öffentliche Ports
4. ✅ **Persistent Data**: Volumes für Datenbanken
5. ✅ **Restart Policy**: `unless-stopped` für Ausfallsicherheit
6. ✅ **Logs**: Immer verfügbar via `docker-compose logs`

## Sicherheit

- `/owtracker/api` ist NUR über die Frontend-App erreichbar (CORS konfiguriert)
- Direkter Zugriff auf Port 8080 nicht möglich (nur intern im Docker Network)
- SQLite-Datenbank ist intern, nicht öffentlich zugänglich
- HTTPS sollte auf Nginx-Ebene konfiguriert werden (z.B. mit Let's Encrypt)

## Nächste Schritte

1. [ ] Repository auf Server klonen
2. [ ] Docker Network `web` erstellen
3. [ ] `docker-compose up -d` ausführen
4. [ ] Nginx-Config aktualisieren
5. [ ] `http://your-domain.com/owtracker` testen
6. [ ] Logs überprüfen bei Problemen
