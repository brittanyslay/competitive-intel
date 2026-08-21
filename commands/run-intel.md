---
name: run-intel
description: Triggers the full competitive intelligence cycle - LinkedIn, news + community, reviews, hiring signals, regulatory radar, historical diff, executive brief, and per-competitor battlecards.
---

# Run-Intel - Full Competitive Intelligence Cycle

## Steps

### 1. Load configuration
Read both config files from the project root:
- `competitors.json` - your competitors with name, domain, linkedin URL, and notes
- `company_context.json` - your company's positioning, differentiators, win/loss themes, ICP

If either file is missing, stop and tell the user which file needs to be created.

### 2. Load previous brief (for diff)
Check `output/` for the most recent brief file (pattern: `brief-*.md`, sorted by filename descending).
- If found: read its full contents as `previous_brief`
- If not found: set `previous_brief = null` (first run - no diff section will be generated)

### 3. Confirm run parameters
Ask the user (or use defaults if running non-interactively):
- Time window: `7` / `30` / `90` days? (default: **7**)
- Focus: `all` / `product` / `AI` / `ESG` / `hiring` / `regulatory` / `community`? (default: **all**)
- Agents to run: `all` / custom subset? (default: **all**)
- Output format: `markdown` / `clipboard`? (default: **markdown**)

### 4. Run intelligence agents (sequentially, capture all outputs)

Run each agent below, passing `competitors` from `competitors.json` and `time_range` from step 3. If an agent fails, log the failure, set its output to `null`, and continue - do not abort the run.

**Agent execution order:**

1. **linkedin-researcher** - LinkedIn posts for each competitor
   ```json
   { "competitors": [...], "max_posts": 20, "date_range": "<window>" }
   ```

2. **news-scanner** - News, press, blog, and community (Reddit/forums) for each competitor
   ```json
   { "competitors": [...], "time_range": "<window>", "focus_areas": ["<focus>"] }
   ```

3. **review-monitor** - G2, Capterra, SoftwareAdvice reviews for each competitor
   ```json
   { "competitors": [...], "review_window_days": 90 }
   ```
   _(Always use 90-day window - reviews post less frequently than news)_

4. **hiring-tracker** - Job posting signals for each competitor
   ```json
   { "competitors": [...], "time_range": "<window>" }
   ```

5. **regulatory-radar** - OSHA, EPA, ESG, compliance developments
   ```json
   { "time_range": "<window>", "focus_areas": ["OSHA", "EPA", "ESG", "cybersecurity", "state regulations"] }
   ```

### 5. Synthesize with brief-writer
Pass the combined payload to **brief-writer**:
```json
{
  "period": "<human-readable date range, e.g. April 14-21 2026>",
  "linkedin_data": "<output from linkedin-researcher or null>",
  "news_data": "<output from news-scanner or null>",
  "review_data": "<output from review-monitor or null>",
  "hiring_data": "<output from hiring-tracker or null>",
  "regulatory_data": "<output from regulatory-radar or null>",
  "company_context": "<contents of company_context.json>",
  "previous_brief": "<previous brief text or null>"
}
```

### 6. Generate battlecards
Pass the brief output and supporting data to **battlecard-writer**:
```json
{
  "brief": "<full brief from brief-writer>",
  "review_data": "<output from review-monitor or null>",
  "hiring_data": "<output from hiring-tracker or null>",
  "company_context": "<contents of company_context.json>",
  "period": "<period string>"
}
```
The battlecard-writer will produce one battlecard per competitor.

### 7. Save all outputs
Compute the date range string `YYYY-MM-DD-to-YYYY-MM-DD` from today and the start of the window.

Save to `output/`:
- `output/brief-<date-range>.md` - the full executive brief
- `output/battlecard-competitor-a-<today-date>.md` - Competitor A battlecard
- `output/battlecard-competitor-b-<today-date>.md` - Competitor B battlecard

Create the `output/` directory if it doesn't exist.

### 8. Deliver outputs
Based on chosen output format:
- **markdown**: Print the full brief to the conversation, then print a summary of battlecard highlights
- **clipboard**: Run `pbcopy` (macOS) to copy the brief to clipboard, then confirm to the user

### 9. Email the brief and battlecards
Send via `send_email`:
- **Brief email:**
  - Subject: `[Your Company] Competitive Intel Brief - [date range]`
  - Body: full brief Markdown
  - Recipient: `GMAIL_USER`

- **Battlecard email** (send as second email):
  - Subject: `your company Sales Battlecards - [date]`
  - Body: both battlecards concatenated with a separator
  - Recipient: `GMAIL_USER`

### 10. Print completion summary
```
Intel cycle complete - [N] competitors · [N] agents run · [N] agent failures (if any) · brief + [N] battlecards saved · emailed to [GMAIL_USER] · [date]
```

---

## Requirements

- `competitors.json` must exist in the project root
- `company_context.json` must exist in the project root
- `GMAIL_USER` and `GMAIL_APP_PASSWORD` must be set in the environment (for email delivery)
- `BRAVE_API_KEY` is optional - improves search quality over DuckDuckGo (free tier at brave.com/search/api)

No Apify or SerpAPI token required - search and crawling use free alternatives by default.

---

## Running a partial cycle

You can run a subset of agents by specifying focus areas or agents:
- `/run-intel focus:product` - runs linkedin-researcher + news-scanner only (skips reviews, hiring, regulatory)
- `/run-intel focus:hiring` - runs hiring-tracker only
- `/run-intel focus:regulatory` - runs regulatory-radar only, no brief
- `/run-intel no-email` - runs everything but skips the email step
