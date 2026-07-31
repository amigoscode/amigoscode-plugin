#!/usr/bin/env bash
#
# One-line installer for the flows-diagram skill.
#
#   curl -fsSL https://raw.githubusercontent.com/amigoscode/skills/main/skills/flows-diagram/install.sh | bash
#
# Override the install location with FLOWS_DIAGRAM_SKILL_DIR.

set -euo pipefail

REPO_URL="https://github.com/amigoscode/skills.git"
DEST="${FLOWS_DIAGRAM_SKILL_DIR:-$HOME/.claude/skills/flows-diagram}"
WORKSPACE="${FLOWS_DIR:-$HOME/amigoscode-skills/flows}"

info() { printf '\033[1;35m==>\033[0m %s\n' "$1"; }
err()  { printf '\033[1;31mError:\033[0m %s\n' "$1" >&2; }

# Preflight: required tools
for cmd in node npm ffmpeg ffprobe; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    err "'$cmd' is required but not found. Install it and re-run."
    exit 1
  fi
done

# Chrome is rendered through puppeteer-core, so a real browser must exist
if [ -z "${CHROME_PATH:-}" ]; then
  found=""
  for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           "/Applications/Chromium.app/Contents/MacOS/Chromium" \
           "/usr/bin/google-chrome" "/usr/bin/google-chrome-stable" \
           "/usr/bin/chromium" "/usr/bin/chromium-browser" "/snap/bin/chromium"; do
    [ -x "$c" ] && { found="$c"; break; }
  done
  if [ -z "$found" ]; then
    err "Google Chrome not found. Install Chrome, or export CHROME_PATH=/path/to/chrome."
    exit 1
  fi
  info "Chrome: $found"
fi

# Node deps (puppeteer-core)
if [ -d "$DEST" ]; then
  info "Installing node dependencies"
  (cd "$DEST" && npm install --silent --no-audit --no-fund)
fi

# API key scaffold
if [ ! -f "$DEST/.env" ] && [ -f "$DEST/.env.example" ]; then
  cp "$DEST/.env.example" "$DEST/.env"
  info "Created .env from .env.example"
fi

# Workspace for authored diagrams. Prefer an existing legacy ~/flows project.
if [ -d "$HOME/flows" ] && [ -z "${FLOWS_DIR:-}" ]; then
  WORKSPACE="$HOME/flows"
  info "Using existing workspace at $WORKSPACE"
else
  mkdir -p "$WORKSPACE"
  info "Workspace: $WORKSPACE"
fi

echo
info "Skill ready at $DEST"
printf '\033[1;33mNext:\033[0m\n'
printf '   - Add your ElevenLabs key: export ELEVEN_LABS=...  (or edit %s/.env)\n' "$DEST"
printf '   - Diagrams are authored in: %s\n' "$WORKSPACE"
printf '   - Then ask Claude Code: "make a flows diagram for the outbox pattern"\n'
echo
