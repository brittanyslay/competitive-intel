#!/bin/bash
# Author: Brittany Slay (https://brittanyslay.com) · Noncommercial use only (PolyForm NC 1.0.0) · Required Notice: Copyright Brittany Slay
# Competitive Intel - Weekly runner
# Runs every Monday at 9am via crontab.
# Setup: edit PROJECT_DIR and CLAUDE_BIN below to match your machine paths.
#
# This runs unattended, so it uses `/run-intel email`: the plugin drafts the brief,
# critiques and tightens its own output (the QA loop), and sends only after it passes.
# Interactive `/run-intel` instead drafts and holds for your review.

# Source zshrc to load env vars (cron does not load the shell profile)
source ~/.zshrc 2>/dev/null || true

# ── CONFIGURE THESE ──────────────────────────────────────────────
PROJECT_DIR="/path/to/competitive-intel"
CLAUDE_BIN="$(which claude)"
# ─────────────────────────────────────────────────────────────────

LOG_FILE="$PROJECT_DIR/scripts/run.log"

# Scoped tool allowlist for headless runs. This grants only the tools the
# pipeline needs, instead of skipping permissions entirely. If a future change
# needs more, add it here rather than reaching for --dangerously-skip-permissions.
ALLOWED_TOOLS="Task Read Write Edit Glob mcp__competitive-intel"

# Rotate log - keep last 500 lines
if [ -f "$LOG_FILE" ]; then
  tail -500 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

echo "=== Intel run started: $(date) ===" >> "$LOG_FILE" 2>&1

cd "$PROJECT_DIR" && \
  "$CLAUDE_BIN" -p \
  --allowedTools $ALLOWED_TOOLS \
  "/run-intel email" \
  1>> "$LOG_FILE" 2>> "$LOG_FILE"

# Fallback for sandboxes where the allowlist is not honored in headless mode:
# replace the block above with
#   "$CLAUDE_BIN" -p --dangerously-skip-permissions "/run-intel email" ...
# Only do this on a machine you control and trust.

EXIT_CODE=$?
echo "=== Intel run finished: $(date) | exit code: $EXIT_CODE ===" >> "$LOG_FILE" 2>&1
