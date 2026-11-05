#!/bin/bash
# Author: Brittany Slay (https://brittanyslay.com) · Noncommercial use only (PolyForm NC 1.0.0) · Required Notice: Copyright Brittany Slay
# Competitive Intel - Daily breaking-news alert
# Runs every day at 8am via crontab (before the Monday weekly run).
# Only sends an email when significant competitor activity is detected.
#
# Setup: edit PROJECT_DIR and CLAUDE_BIN below to match your machine paths.
# Crontab: 0 8 * * * /absolute/path/to/competitive-intel/scripts/daily-alert.sh

# Source zshrc to load env vars (cron does not load the shell profile)
source ~/.zshrc 2>/dev/null || true

# ── CONFIGURE THESE ──────────────────────────────────────────────
PROJECT_DIR="/path/to/competitive-intel"
CLAUDE_BIN="$(which claude)"
# ─────────────────────────────────────────────────────────────────

LOG_FILE="$PROJECT_DIR/scripts/daily-alert.log"

# Scoped tool allowlist for headless runs (see weekly-run.sh for the rationale).
ALLOWED_TOOLS="Task Read Write Edit Glob mcp__competitive-intel"

# Rotate log - keep last 200 lines
if [ -f "$LOG_FILE" ]; then
  tail -200 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

echo "=== Daily alert started: $(date) ===" >> "$LOG_FILE" 2>&1

cd "$PROJECT_DIR" && \
  "$CLAUDE_BIN" -p \
  --allowedTools $ALLOWED_TOOLS \
  "/daily-alert" \
  1>> "$LOG_FILE" 2>> "$LOG_FILE"

# Fallback for sandboxes where the allowlist is not honored in headless mode:
# replace the block above with
#   "$CLAUDE_BIN" -p --dangerously-skip-permissions "/daily-alert" ...
# Only do this on a machine you control and trust.

EXIT_CODE=$?
echo "=== Daily alert finished: $(date) | exit code: $EXIT_CODE ===" >> "$LOG_FILE" 2>&1
