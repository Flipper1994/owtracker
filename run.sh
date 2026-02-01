#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
PID_DIR="$ROOT_DIR/.pids"
PORT=12321

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
  echo ""
  echo -e "${BLUE}================================${NC}"
  echo -e "${BLUE}  OW Tracker${NC}"
  echo -e "${BLUE}================================${NC}"
  echo ""
}

print_usage() {
  echo "Usage: ./run.sh [COMMAND]"
  echo ""
  echo "Commands:"
  echo "  local      Start in local development mode (default)"
  echo "  server     Start with Docker for production"
  echo "  refresh    Git pull, restart containers"
  echo "  stop       Stop all services"
  echo "  logs       Show logs"
  echo ""
}

# Stoppt alle lokalen Services
stop_local() {
  echo -e "${YELLOW}Stopping local services...${NC}"

  for service in frontend backend; do
    local pid_file="$PID_DIR/$service.pid"
    if [[ -f "$pid_file" ]]; then
      local pid
      pid=$(cat "$pid_file")
      if kill -0 "$pid" 2>/dev/null; then
        echo "   Stopping $service (PID: $pid)"
        kill "$pid" 2>/dev/null || true
        sleep 0.5
      fi
      rm -f "$pid_file"
    fi
  done

  echo -e "${GREEN}Local services stopped.${NC}"
}

# Stoppt Docker Container
stop_docker() {
  echo -e "${YELLOW}Stopping Docker containers...${NC}"
  docker compose -f "$ROOT_DIR/docker-compose.yml" down 2>/dev/null || true
  echo -e "${GREEN}Docker containers stopped.${NC}"
}

# Startet lokale Entwicklungsumgebung
start_local() {
  print_header
  echo -e "${BLUE}Mode: Local Development${NC}"
  echo ""

  mkdir -p "$LOG_DIR" "$PID_DIR"

  # Erst stoppen falls noch was läuft
  stop_local 2>/dev/null || true

  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm --prefix "$ROOT_DIR/app/frontend" install > /dev/null 2>&1
  npm --prefix "$ROOT_DIR/app/backend" install > /dev/null 2>&1

  echo ""
  echo -e "${YELLOW}Starting services...${NC}"
  echo ""

  # Backend auf Port 8080
  echo "   Backend (8080)..."
  npm --prefix "$ROOT_DIR/app/backend" start > "$LOG_DIR/backend.log" 2>&1 &
  echo $! > "$PID_DIR/backend.pid"
  sleep 1

  # Frontend auf Port 12321 (Vite dev server mit eingebautem API-Proxy)
  echo "   Frontend ($PORT)..."
  VITE_PORT=$PORT npm --prefix "$ROOT_DIR/app/frontend" run dev > "$LOG_DIR/frontend.log" 2>&1 &
  echo $! > "$PID_DIR/frontend.pid"
  sleep 2

  echo ""
  echo -e "${GREEN}All services started!${NC}"
  echo ""
  echo -e "${BLUE}================================${NC}"
  echo -e "${BLUE}Access URL:${NC}"
  echo -e "${BLUE}================================${NC}"
  echo ""
  echo -e "   ${GREEN}http://localhost:$PORT/owtracker${NC}"
  echo ""
  echo -e "${BLUE}================================${NC}"
  echo -e "${BLUE}Logs: $LOG_DIR${NC}"
  echo -e "${BLUE}Stop: ./run.sh stop${NC}"
  echo -e "${BLUE}================================${NC}"
  echo ""
}

# Startet Docker für Produktion
start_docker() {
  print_header
  echo -e "${BLUE}Mode: Docker Production${NC}"
  echo ""

  if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}Docker ist nicht installiert.${NC}"
    exit 1
  fi

  # Network erstellen falls nicht vorhanden
  docker network create web >/dev/null 2>&1 || true

  echo -e "${YELLOW}Building and starting containers...${NC}"
  docker compose -f "$ROOT_DIR/docker-compose.yml" up -d --build

  echo ""
  echo -e "${GREEN}Deployment complete!${NC}"
  echo ""
  echo -e "${BLUE}================================${NC}"
  echo -e "${BLUE}Access URL:${NC}"
  echo -e "${BLUE}================================${NC}"
  echo ""
  echo -e "   ${GREEN}http://localhost:$PORT/owtracker${NC}"
  echo -e "   ${GREEN}http://<server-ip>:$PORT/owtracker${NC}"
  echo ""
  echo -e "${BLUE}================================${NC}"
  echo -e "${BLUE}Logs: docker compose logs -f owtracker${NC}"
  echo -e "${BLUE}Stop: ./run.sh stop${NC}"
  echo -e "${BLUE}================================${NC}"
  echo ""
}

# Git Refresh & Redeploy
git_refresh() {
  print_header
  echo -e "${BLUE}Git Refresh & Deploy${NC}"
  echo ""

  # 1. Lokale Änderungen stashen
  echo -e "${YELLOW}Stashing local changes...${NC}"
  git stash push -m "wip-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || echo "   (nothing to stash)"

  # 2. Neueste Version ziehen
  echo ""
  echo -e "${YELLOW}Pulling latest changes...${NC}"
  git pull

  # 3. Stash wieder anwenden
  echo ""
  echo -e "${YELLOW}Restoring local files...${NC}"
  git stash pop 2>/dev/null || echo "   (no stashed changes)"

  # 4. Berechtigungen setzen (nur auf Linux)
  if [[ "$(uname)" != "MINGW"* ]] && [[ "$(uname)" != "MSYS"* ]]; then
    echo ""
    echo -e "${YELLOW}Setting permissions...${NC}"
    chmod +x run.sh 2>/dev/null || true
  fi

  # 5. Container stoppen und neu starten
  echo ""
  stop_docker 2>/dev/null || true

  echo ""
  start_docker
}

# Logs anzeigen
show_logs() {
  if [[ -d "$LOG_DIR" ]]; then
    echo -e "${BLUE}Local logs:${NC}"
    tail -f "$LOG_DIR"/*.log 2>/dev/null || echo "No local logs found"
  fi

  if command -v docker >/dev/null 2>&1; then
    echo -e "${BLUE}Docker logs:${NC}"
    docker compose -f "$ROOT_DIR/docker-compose.yml" logs -f 2>/dev/null || echo "No Docker logs"
  fi
}

# Hauptlogik
CMD="${1:-}"

case "$CMD" in
  ""|"local"|"dev")
    start_local
    ;;
  "server"|"docker"|"prod")
    start_docker
    ;;
  "refresh"|"update")
    git_refresh
    ;;
  "stop")
    stop_local 2>/dev/null || true
    stop_docker 2>/dev/null || true
    echo -e "${GREEN}All services stopped.${NC}"
    ;;
  "logs")
    show_logs
    ;;
  "help"|"-h"|"--help")
    print_header
    print_usage
    ;;
  *)
    echo -e "${RED}Unknown command: $CMD${NC}"
    echo ""
    print_usage
    exit 1
    ;;
esac
