---
name: run-intel
description: Runs the full competitive intelligence cycle - LinkedIn, news and community, reviews, hiring, regulatory, historical diff - then drafts an executive brief and per-competitor battlecards, critiques and tightens them against a quality bar, and holds them for your review. Emails only when you say so (or when run with the email flag on a schedule).
---

# Run-Intel - Full Competitive Intelligence Cycle

The default behavior is draft-and-hold: this command does the research, writes the brief and battlecards, runs its own QA pass, saves everything, and shows it to you for a quick review. It does not email anything unless you ask. That keeps a human in the loop before anything is published.

## Flags

- `/run-intel` - full cycle, draft and hold for review (default)
- `/run-intel email` - full cycle, and send the email once the draft passes QA (use this on a schedule)
- `/run-intel no-email` - explicitly skip email even after review
- `/run-intel focus:product` - linkedin-researcher + news-scanner only
- `/run-intel focus:hiring` - hiring-tracker only
- `/run-intel focus:regulatory` - regulatory-radar only, no brief

## Steps

### 1. Load configuration
Read both config files from the project root:
- `competitors.json` - your competitors with name, domain, linkedin URL, and notes
- `company_context.json` - your company's positioning, differentiators, win/loss themes, ICP, regulatory_focus, community_sources

If either file is missing, do not error out. Run the `/intel-setup` intake flow first to create it, then continue. The user should never be told to go copy an example file by hand.

### 2. Load previous brief (for diff)
Check `output/` for the most recent brief file (pattern: `brief-*.md`, sorted by filename descending).
- If found: read its full contents as `previous_brief`
- If not found: set `previous_brief = null` (first run, no diff section)

### 3. Set run parameters
Use these defaults unless the user specified otherwise or a focus flag narrows them:
- Time window: 7 days
- Focus: all
- Agents: all

### 4. Run intelligence agents (capture all outputs)

Run each agent below, passing `competitors` and `company_context` from the config files and `time_range` from step 3. If an agent fails, log the failure, set its output to `null`, and continue. Do not abort the run.

1. **linkedin-researcher** - `{ "competitors": [...], "max_posts": 20, "date_range": "<window>" }`
2. **news-scanner** - `{ "competitors": [...], "company_context": {...}, "time_range": "<window>", "focus_areas": ["<focus>"] }`
3. **review-monitor** - `{ "competitors": [...], "company_context": {...}, "review_window_days": 90 }` _(reviews post less often than news, so always use a 90-day window)_
4. **hiring-tracker** - `{ "competitors": [...], "time_range": "<window>" }`
5. **regulatory-radar** - `{ "competitors": [...], "company_context": {...}, "time_range": "<window>" }` _(keys off regulatory_focus, not a fixed industry)_

### 5. Draft the brief with brief-writer
Pass the combined payload to **brief-writer**:
```json
{
  "period": "<human-readable date range>",
  "competitors": "<from competitors.json>",
  "linkedin_data": "<output or null>",
  "news_data": "<output or null>",
  "review_data": "<output or null>",
  "hiring_data": "<output or null>",
  "regulatory_data": "<output or null>",
  "company_context": "<contents of company_context.json>",
  "previous_brief": "<previous brief text or null>",
  "qa_feedback": null
}
```

### 6. Draft battlecards with battlecard-writer
Pass the brief and supporting data to **battlecard-writer** (one card per competitor):
```json
{
  "brief": "<full brief>",
  "competitors": "<from competitors.json>",
  "review_data": "<output or null>",
  "hiring_data": "<output or null>",
  "company_context": "<contents of company_context.json>",
  "period": "<period string>",
  "qa_feedback": null
}
```

### 7. Self-critique and tighten (QA loop)
Pass the drafted brief and battlecards to **qa-reviewer** along with the raw `agent_data` and `company_context`.
- If the verdict is `revise`, send the `must_fix` list back to brief-writer and battlecard-writer as `qa_feedback` and regenerate the affected pieces.
- Re-run qa-reviewer on the revised draft. Do at most two revision passes total, then stop even if minor items remain.
- Carry any `unfixable_gaps` into the final output so the brief is honest about thin data rather than papering over it.

Do not skip this step. The plugin vets its own work; the user should not have to catch sourcing or voice problems by hand.

### 8. Save all outputs
Compute the date range string `YYYY-MM-DD-to-YYYY-MM-DD`. Create `output/` if needed. Save:
- `output/brief-<date-range>.md`
- `output/battlecard-<competitor-slug>-<today>.md` for each competitor (slug = name lowercased, spaces to hyphens)

### 9. Present for review (default path)
Print to the conversation:
- The QA verdict and score, and any `unfixable_gaps`
- The full brief
- A short highlights summary per battlecard

Then hold. Ask: "Send this to [recipient]? Reply `send` to email it, or tell me what to change." Do not email on the default path until the user confirms.

### 10. Email (only when requested)
Email when the user replies `send`, or immediately after QA passes if the command was invoked as `/run-intel email`. Send via `send_email`:
- **Brief email** - Subject: `[Company name from company_context] Competitive Intel Brief - [date range]`, body: full brief Markdown, recipient: `GMAIL_USER` (or the configured delivery address)
- **Battlecard email** (second message) - Subject: `[Company name] Sales Battlecards - [date]`, body: all battlecards concatenated with a separator, recipient: same

Never email on the default interactive path without a `send` confirmation.

### 11. Completion summary
```
Intel cycle complete - [N] competitors · [N] agents run · [N] failures · QA score [N]/100 after [N] revision pass(es) · brief + [N] battlecards saved · [held for review | emailed to <recipient>] · [date]
```

## Requirements

- `competitors.json` and `company_context.json` in the project root (or run `/intel-setup` to create them)
- `GMAIL_USER` and `GMAIL_APP_PASSWORD` set in the environment, only for emailed runs
- `BRAVE_API_KEY` optional, improves search quality over DuckDuckGo (free tier at brave.com/search/api)

No Apify or SerpAPI token required. Search and crawling use free alternatives by default.

---
Author: Brittany Slay (https://brittanyslay.com). Licensed for noncommercial use only; see LICENSE.
Required Notice: Copyright Brittany Slay (https://brittanyslay.com)
