#!/usr/bin/env bash
set -euo pipefail

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  OW Tracker - Setup${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# -------------------------------------------
# 1. Node.js prüfen / PATH fixen (Windows)
# -------------------------------------------
echo -e "${YELLOW}[1/4] Checking Node.js...${NC}"

if ! command -v node >/dev/null 2>&1; then
  # Windows: Node.js ist installiert aber nicht im Git Bash PATH
  NODE_WIN_PATH="/c/Program Files/nodejs"
  if [[ -f "$NODE_WIN_PATH/node.exe" ]]; then
    echo -e "   ${YELLOW}Node.js found but not in PATH. Fixing...${NC}"
    export PATH="$PATH:$NODE_WIN_PATH"

    # Permanent in ~/.bashrc eintragen
    BASHRC="$HOME/.bashrc"
    if ! grep -q "Program Files/nodejs" "$BASHRC" 2>/dev/null; then
      echo "" >> "$BASHRC"
      echo '# Node.js PATH (added by OW Tracker setup)' >> "$BASHRC"
      echo 'export PATH="$PATH:/c/Program Files/nodejs"' >> "$BASHRC"
      echo -e "   ${GREEN}Added Node.js to PATH permanently (~/.bashrc)${NC}"
    fi
  else
    echo -e "   ${RED}Node.js is not installed!${NC}"
    echo ""
    echo "   Please install Node.js first:"
    echo "   https://nodejs.org/ (LTS version recommended)"
    echo ""
    echo "   After installing, close and reopen Git Bash, then run this script again."
    exit 1
  fi
fi

NODE_VERSION=$(node -v)
echo -e "   ${GREEN}Node.js $NODE_VERSION${NC}"

# -------------------------------------------
# 2. npm prüfen
# -------------------------------------------
echo -e "${YELLOW}[2/4] Checking npm...${NC}"

if ! command -v npm >/dev/null 2>&1; then
  echo -e "   ${RED}npm not found! It should come with Node.js.${NC}"
  echo "   Try reinstalling Node.js from https://nodejs.org/"
  exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "   ${GREEN}npm $NPM_VERSION${NC}"

# -------------------------------------------
# 3. Git prüfen
# -------------------------------------------
echo -e "${YELLOW}[3/4] Checking Git...${NC}"

if ! command -v git >/dev/null 2>&1; then
  echo -e "   ${RED}Git not found!${NC}"
  echo "   Install Git from https://git-scm.com/"
  exit 1
fi

GIT_VERSION=$(git --version)
echo -e "   ${GREEN}$GIT_VERSION${NC}"

# -------------------------------------------
# 4. Dependencies installieren
# -------------------------------------------
echo -e "${YELLOW}[4/4] Installing dependencies...${NC}"

echo "   Installing frontend..."
npm --prefix "$ROOT_DIR/app/frontend" install 2>&1 | tail -1

echo "   Installing backend..."
npm --prefix "$ROOT_DIR/app/backend" install 2>&1 | tail -1

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "  Start the app with:"
echo -e "  ${BLUE}./run.sh${NC}"
echo ""
echo -e "  Then open:"
echo -e "  ${BLUE}http://localhost:12321/owtracker${NC}"
echo ""
