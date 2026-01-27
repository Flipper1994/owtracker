# Externe Erreichbarkeit - IP/owtracker Setup

Damit Geräte außerhalb des Netzwerks dein Projekt unter `<externe-ip>/owtracker` erreichen können, brauchst du:

## 1. Externe IP finden

### Windows/Mac/Linux vom Server:

```bash
# Schnelle Methode
curl -s https://api.ipify.org
# oder
curl -s https://icanhazip.com
```

**Deine externe IP:** z.B. `203.0.113.42` (BEISPIEL - deine echte IP ist anders!)

### Oder manuell:
- Google: "meine IP" oder "what is my ip"
- Router Admin Interface prüfen

---

## 2. Port-Forwarding konfigurieren

Das ist der **wichtigste Schritt**!

### Im Router:

1. Admin Interface öffnen: `http://192.168.1.1` oder `http://192.168.0.1`
2. Login (Standard: admin/admin oder router-Modell prüfen)
3. Menü: **Port Forwarding** / **Portfreigabe** / **Virtual Server**
4. Neue Regel hinzufügen:

```
Externer Port:     80
Interner Port:     5173 (oder 8080, siehe unten)
Interner Host:     <deine-lokale-ip> (z.B. 192.168.1.50)
Protokoll:         TCP
Aktiviert:         Ja
```

### Local IP finden (Windows):
```cmd
ipconfig
```
Suche nach "IPv4-Adresse: 192.168.x.x"

### Local IP finden (Mac/Linux):
```bash
ifconfig
```

---

## 3. Firewall konfigurieren

### Windows Firewall:

```bash
# PowerShell als Admin
New-NetFirewallRule -DisplayName "OWTracker Port 5173" `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173
```

### Linux (UFW):
```bash
sudo ufw allow 80/tcp
sudo ufw allow 5173/tcp
sudo ufw allow 8080/tcp
```

### macOS:
System Preferences → Security & Privacy → Firewall Options → Port 5173/80 erlauben

---

## 4. Webserver-Konfiguration

### Option A: Frontend nur (Vite Dev)

**Externe URLs nach ./run.sh:**
```
http://203.0.113.42/owtracker    ❌ Funktioniert NICHT
http://203.0.113.42:5173/owtracker    ✅ Funktioniert
```

**Problem:** Port 5173 muss mitangegeben werden!

**Lösung:** Nginx/Apache Reverse Proxy (siehe Option B)

---

### Option B: Nginx Reverse Proxy (EMPFOHLEN)

Installation:

**Windows:** [nginx.org](https://nginx.org/en/download.html)
**Mac:** `brew install nginx`
**Linux:** `sudo apt install nginx`

#### nginx.conf Beispiel:

```nginx
server {
    listen 80;
    server_name _;  # Alle IPs akzeptieren

    client_max_body_size 1M;

    # Frontend unter /owtracker
    location /owtracker {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # Backend API unter /owtracker/api
    location /owtracker/api {
        proxy_pass http://localhost:8080/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Nginx starten:**
```bash
nginx          # Windows/Mac
sudo systemctl start nginx    # Linux
```

**Nach Konfigurationsänderung reload:**
```bash
nginx -s reload
sudo systemctl reload nginx
```

---

## 5. Testen

### Lokal:
```bash
curl http://localhost/owtracker
curl http://192.168.1.50/owtracker  # Lokale IP
```

### Extern (nach Port-Forwarding):
```bash
curl http://203.0.113.42/owtracker  # Externe IP
```

### Im Browser:
```
http://203.0.113.42/owtracker
```

---

## 6. HTTPS (Sicherheit) - EMPFOHLEN

### Mit Let's Encrypt (kostenlos):

**Installation (Certbot):**
```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx

# Dann:
sudo certbot --nginx -d deine-domain.com
```

**nginx.conf mit HTTPS:**
```nginx
server {
    listen 80;
    server_name deine-domain.com;
    return 301 https://$server_name$request_uri;  # Redirect zu HTTPS
}

server {
    listen 443 ssl http2;
    server_name deine-domain.com;

    ssl_certificate /etc/letsencrypt/live/deine-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/deine-domain.com/privkey.pem;

    location /owtracker {
        proxy_pass http://localhost:5173;
        # ... rest wie oben
    }
}
```

---

## Kompletter Setup-Ablauf

```bash
# 1. Server-IP ermitteln
curl -s https://api.ipify.org

# 2. Projekt starten
./run.sh

# 3. Nginx installieren & starten
# (je nach OS)

# 4. nginx.conf mit obiger Config ersetzen

# 5. Firewall-Ports öffnen
# (siehe oben für dein OS)

# 6. Router Port-Forwarding einrichten
# (siehe Admin Interface)

# 7. Testen
curl http://203.0.113.42/owtracker
```

---

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| "Connection refused" | Port-Forwarding nicht aktiv? Router prüfen |
| "Connection timeout" | Externe IP falsch? `curl https://api.ipify.org` prüfen |
| Nginx zeigt 502 Bad Gateway | Backend läuft nicht? `./run.sh` ausführen |
| Zu langsam | ISP begrenzt Traffic? Oder Backend überlastet |
| CORS-Fehler | Prüfe vite.config.ts proxy-Einstellungen |

---

## Sicherheit - Wichtig!

⚠️ **Öffentliches Internet ist nicht sicher!**

- 🔒 Immer HTTPS verwenden (Let's Encrypt kostenlos)
- 🛡️ Firewall konfigurieren (nur nötige Ports)
- 🔑 Starke Passwörter für Admin-Panel
- 📊 Logs monitoren: `tail -f .logs/backend.log`
- 🔄 Regelmäßig Backups machen
- 🚫 DDoS-Schutz erwägen (Cloudflare, AWS Shield)

---

## Domain statt IP (Optional)

Falls du eine Domain hast (z.B. example.com):

1. DNS A-Record auf deine externe IP setzen
2. Dann erreichbar unter: `https://example.com/owtracker`

```bash
# DNS Check
nslookup example.com
# Sollte deine externe IP zeigen
```

---

## Vollständiges Beispiel

**Annahmen:**
- Externe IP: 203.0.113.42
- Lokale IP: 192.168.1.50
- Router IP: 192.168.1.1

**Router Port-Forwarding:**
- Extern 80 → Intern 192.168.1.50:80

**nginx.conf auf Server (192.168.1.50):**
```nginx
server {
    listen 80;
    server_name _;

    location /owtracker {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /owtracker/api {
        proxy_pass http://localhost:8080/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Dann erreichbar unter:**
```
http://203.0.113.42/owtracker ✅
```

Von überall auf der Welt! 🌍
