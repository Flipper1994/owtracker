#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"

stop_pid() {
  local pid_file="$1"
  local service_name="$2"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      echo "   ✓ Stopping $service_name (PID: $pid)"
      kill "$pid" 2>/dev/null || true
      sleep 0.5
    fi
    rm -f "$pid_file"
  fi
}

echo "================================"
echo "OW Tracker - Stopping Services"
echo "================================"
echo ""

stop_pid "$PID_DIR/proxy.pid" "Proxy (80)"
stop_pid "$PID_DIR/frontend.pid" "Frontend (5173)"
stop_pid "$PID_DIR/backend.pid" "Backend (8080)"

echo ""
echo "✅ All services stopped!"
echo ""