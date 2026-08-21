---
name: daily-alert
description: Lightweight daily check for breaking competitor news about your competitors. Runs in under 2 minutes - news search only, no LinkedIn scrape. Sends an email alert only when significant activity is detected. Use this between weekly /run-intel cycles.
---

# Daily Alert - Competitive Intel

Run a fast breaking-news check for your competitors. This is intentionally lightweight - it skips LinkedIn scraping and deep crawls to stay fast. It fires an email only when something actually worth knowing happened.

## Steps

1. Read `competitors.json` and `company_context.json` from the project root.

2. For each competitor, run these `google_search` queries with `time_range: day`:
   - `"[competitor name]" announcement OR launch OR release OR update`
   - `"[competitor name]" acquisition OR partnership OR funding OR merger`
   - `"[competitor name]" pricing OR layoffs OR outage OR breach`

3. Score the results. Compute an **alert score** (0-10) for each competitor:
   - +4 if any result indicates: acquisition, merger, funding round, or major partnership
   - +3 if any result indicates: product launch, new feature, major pricing change
   - +2 if any result indicates: executive departure/hire, regulatory action against the company
   - +2 if any result indicates: security breach, outage, or public incident
   - +1 for each additional corroborating source on any of the above
   - +0 for routine blog posts, thought leadership, event announcements

4. **Decision gate:**
   - If **any competitor scores ≥ 4**: proceed to email
   - If **all competitors score < 4**: print `No breaking news detected for [date] - no alert sent.` and stop

5. If proceeding to email:
   - For each competitor with score ≥ 4, call `crawl_website` on the top 1-2 most relevant URLs from step 2 to get full content
   - Produce a brief alert summary (not a full brief - just the key news, why it matters for your company, and what to watch)

6. Send the alert via `send_email`:
   - Subject: `🚨 [Your Company] Intel Alert - [Competitor Name] - [date]`
   - Body: short alert formatted in Markdown
   - Recipient: `GMAIL_USER`

## Alert Email Format

```markdown
# ⚡ Competitive Alert - [date]

**Triggered by:** [Competitor name(s)] - Score: [N]/10

---

## What Happened
[2-3 sentences on the specific event. Be concrete - name the feature, the company, the dollar amount, or the exact announcement.]

**Source:** [URL]

---

## Why It Matters for your company
[2-3 sentences on the competitive implication. What does this mean for your company's pipeline, positioning, or product?]

---

## Suggested Response
- [ ] [One immediate action - e.g. "Alert sales team," "Brief CSM team on counter-narrative," "Check if our roadmap addresses this"]

---
_your company daily competitive alert · Run /run-intel for the full weekly brief_
```

## Requirements

- `GMAIL_USER` and `GMAIL_APP_PASSWORD` must be set (for `send_email`)
- `BRAVE_API_KEY` is optional - improves search quality (free tier at brave.com/search/api)
- No Apify token required - search uses DuckDuckGo by default
- This command is designed to run daily - keep it fast. Do not run LinkedIn scraping or sitemap checks here.
