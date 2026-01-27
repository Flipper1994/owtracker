#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "================================"
echo "OW Tracker - V-Server Deployment"
echo "================================"
echo ""

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker ist nicht installiert. Bitte zuerst installieren."
  exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1; then
  echo "❌ docker-compose ist nicht installiert."
  echo "   Installiere es oder nutze 'docker compose' (Docker >= 20.10)."
  exit 1
fi

echo "📦 Erstelle Docker Network 'web' (falls nicht vorhanden)..."
docker network create web >/dev/null 2>&1 || true

echo "🐳 Starte OW Tracker Container..."
docker-compose -f "$ROOT_DIR/docker-compose.yml" up -d --build

echo ""
echo "✅ Deployment abgeschlossen!"
echo ""
echo "🌐 Zugriff (nach Nginx-Setup):"
echo "   http://<server-ip>/owtracker"
echo ""
echo "🔍 Status prüfen:"
echo "   docker-compose -f "$ROOT_DIR/docker-compose.yml" ps"
echo ""
echo "📋 Logs anzeigen:"
echo "   docker-compose -f "$ROOT_DIR/docker-compose.yml" logs -f owtracker"
echo ""