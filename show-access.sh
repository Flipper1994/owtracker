#!/bin/bash
# Script zum Anzeigen der Zugangs-IPs

echo "==================================="
echo "OW Tracker Access Information"
echo "==================================="
echo ""

# Externe IP
echo "📡 Externe IP (für Zugriff von außerhalb):"
EXTERNAL_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "nicht verfügbar")
echo "   $EXTERNAL_IP"
echo ""

# Lokale IPs
echo "🏠 Lokale IPs (für Zugriff im Netzwerk):"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    echo "   $LOCAL_IP"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
    echo "   $LOCAL_IP"
else
    # Windows (Git Bash)
    LOCAL_IP=$(ipconfig | grep "IPv4" | grep -v "127.0.0.1" | head -1 | awk '{print $NF}')
    echo "   $LOCAL_IP"
fi
echo "   127.0.0.1 (localhost)"
echo ""

# Ports
echo "🔌 Ports:"
echo "   Frontend:  5173"
echo "   Backend:   8080"
echo "   Nginx:     80"
echo ""

# Access URLs
echo "🌐 Access URLs:"
echo "   Local (Vite Dev):     http://localhost:5173/owtracker"
echo "   Local (Nginx):        http://localhost/owtracker"
echo ""
if [ ! -z "$LOCAL_IP" ] && [ "$LOCAL_IP" != "127.0.0.1" ]; then
    echo "   Network (Vite Dev):   http://$LOCAL_IP:5173/owtracker"
    echo "   Network (Nginx):      http://$LOCAL_IP/owtracker"
    echo ""
fi
if [ ! -z "$EXTERNAL_IP" ] && [ "$EXTERNAL_IP" != "nicht verfügbar" ]; then
    echo "   External (Nginx):     http://$EXTERNAL_IP/owtracker"
    echo "   External (Direct):    http://$EXTERNAL_IP:5173/owtracker"
    echo ""
    echo "   ⚠️  Note: Port-Forwarding & Firewall müssen konfiguriert sein!"
    echo "   ℹ️  Siehe: EXTERNAL_ACCESS.md"
fi
echo ""

# Check ob Services laufen
echo "✅ Service Status:"
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   Frontend (5173):  ✓ Running"
else
    echo "   Frontend (5173):  ✗ Not running"
fi

if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   Backend (8080):   ✓ Running"
else
    echo "   Backend (8080):   ✗ Not running"
fi

if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   Nginx (80):       ✓ Running"
else
    echo "   Nginx (80):       ✗ Not running (optional)"
fi

echo ""
echo "==================================="
