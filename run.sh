#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
PID_DIR="$ROOT_DIR/.pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

echo "Installing frontend dependencies..."
npm --prefix "$ROOT_DIR/app/frontend" install

echo "Installing backend dependencies..."
npm --prefix "$ROOT_DIR/app/backend" install

echo "Starting backend on http://localhost:8080 ..."
npm --prefix "$ROOT_DIR/app/backend" start > "$LOG_DIR/backend.log" 2>&1 &
echo $! > "$PID_DIR/backend.pid"

echo "Starting frontend on http://localhost:5173 ..."
npm --prefix "$ROOT_DIR/app/frontend" run dev > "$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$PID_DIR/frontend.pid"

echo "Done. Logs: $LOG_DIR (backend.log, frontend.log)"
echo "Stop with: ./stop.sh"