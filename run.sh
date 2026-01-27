#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
PID_DIR="$ROOT_DIR/.pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

echo "================================"
echo "OW Tracker - Full Stack Startup"
echo "================================"
echo ""

echo "📦 Installing frontend dependencies..."
npm --prefix "$ROOT_DIR/app/frontend" install > /dev/null 2>&1

echo "📦 Installing backend dependencies..."
npm --prefix "$ROOT_DIR/app/backend" install > /dev/null 2>&1

echo "📦 Installing proxy dependencies..."
npm --prefix "$ROOT_DIR/app/proxy" install > /dev/null 2>&1

echo ""
echo "🚀 Starting services..."
echo ""

echo "   • Backend (8080)..."
npm --prefix "$ROOT_DIR/app/backend" start > "$LOG_DIR/backend.log" 2>&1 &
echo $! > "$PID_DIR/backend.pid"
sleep 1

echo "   • Frontend (5173)..."
npm --prefix "$ROOT_DIR/app/frontend" run dev > "$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$PID_DIR/frontend.pid"
sleep 2

echo "   • Reverse Proxy (80)..."
npm --prefix "$ROOT_DIR/app/proxy" start > "$LOG_DIR/proxy.log" 2>&1 &
echo $! > "$PID_DIR/proxy.pid"
sleep 1

echo ""
echo "✅ All services started!"
echo ""
echo "================================"
echo "📍 Access URLs:"
echo "================================"
echo ""
echo "   🌐 http://localhost/owtracker"
echo ""
echo "   (Without port - reverse proxy handles routing!)"
echo ""
echo "================================"
echo "📋 Service Status:"
echo "================================"
echo ""
echo "   Backend:     http://localhost:8080/api"
echo "   Frontend:    http://localhost:5173"
echo "   Proxy:       http://localhost/owtracker"
echo ""
echo "================================"
echo "📝 Logs Location: $LOG_DIR"
echo "================================"
echo ""
echo "   backend.log   - Node.js backend"
echo "   frontend.log  - Vite dev server"
echo "   proxy.log     - Reverse proxy"
echo ""
echo "   View live:    tail -f $LOG_DIR/backend.log"
echo ""
echo "================================"
echo "🛑 To Stop Services:"
echo "================================"
echo ""
echo "   ./stop.sh"
echo ""