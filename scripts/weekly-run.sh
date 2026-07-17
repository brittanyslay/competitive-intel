#!/bin/bash
# your company Competitive Intel — Weekly runner
# Runs every Monday at 9am via crontab
# Setup: edit PROJECT_DIR and CLAUDE_BIN below to match your machine paths

# Source zshrc to load env vars (cron doesn't load shell profile)
source ~/.zshrc 2>/dev/null || true

# ── CONFIGURE THESE ──────────────────────────────────────────────
PROJECT_DIR="/path/to/competitive-intel"
CLAUDE_BIN="$(which claude)"
# ─────────────────────────────────────────────────────────────────

LOG_FILE="$PROJECT_DIR/scripts/run.log"

# Rotate log — keep last 500 lines
if [ -f "$LOG_FILE" ]; then
  tail -500 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

echo "=== Intel run started: $(date) ===" >> "$LOG_FILE" 2>&1

cd "$PROJECT_DIR" && \
  "$CLAUDE_BIN" -p --dangerously-skip-permissions \
  "Run the full your company competitive intelligence pipeline: read competitors.json (your competitors), run the linkedin-researcher agent for each competitor (last 7 days, max 20 posts, use the linkedin URL from competitors.json as the query), run the news-scanner agent for each competitor (time_range: week, use check_sitemap then crawl_website on recent URLs), pass all results to brief-writer to produce a Markdown brief framed for your company, then send the brief via the send_email tool to ${GMAIL_USER}." \
  1>> "$LOG_FILE" 2>> "$LOG_FILE"

EXIT_CODE=$?
echo "=== Intel run finished: $(date) | exit code: $EXIT_CODE ===" >> "$LOG_FILE" 2>&1
