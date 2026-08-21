#!/bin/bash
# Author: Brittany Slay (https://brittanyslay.com) · Noncommercial use only (PolyForm NC 1.0.0) · Required Notice: Copyright Brittany Slay
# Competitive Intel - Weekly runner
# Runs every Monday at 9am via crontab
# Setup: edit PROJECT_DIR and CLAUDE_BIN below to match your machine paths

# Source zshrc to load env vars (cron doesn't load shell profile)
source ~/.zshrc 2>/dev/null || true

# ── CONFIGURE THESE ──────────────────────────────────────────────
PROJECT_DIR="/path/to/competitive-intel"
CLAUDE_BIN="$(which claude)"
# ─────────────────────────────────────────────────────────────────

LOG_FILE="$PROJECT_DIR/scripts/run.log"

# Rotate log - keep last 500 lines
if [ -f "$LOG_FILE" ]; then
  tail -500 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

echo "=== Intel run started: $(date) ===" >> "$LOG_FILE" 2>&1

cd "$PROJECT_DIR" && \
  "$CLAUDE_BIN" -p --dangerously-skip-permissions \
  "/run-intel" \
  1>> "$LOG_FILE" 2>> "$LOG_FILE"

EXIT_CODE=$?
echo "=== Intel run finished: $(date) | exit code: $EXIT_CODE ===" >> "$LOG_FILE" 2>&1
