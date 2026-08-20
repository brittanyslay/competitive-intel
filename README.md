# competitive-intel

A [Claude Code](https://claude.ai/code) plugin that runs **autonomous competitive intelligence**. Point it at your competitors and it tracks them across LinkedIn, news, user reviews, job postings, and regulatory signals, then writes an executive brief and per-competitor sales battlecards, on a schedule, and emails them to you.

Five specialist agents each own one source. A brief-writer synthesizes everything into one brief with a week-over-week diff. A battlecard-writer turns it into something a sales rep can use in a live deal. It runs on free search by default, so there's no required API key beyond a Gmail App Password for delivery.

Built by [Brittany Slay](https://brittanyslay.com). MIT licensed.

> **Anonymized template.** The two config files ship as `*.example.json` describing a fictional company. Copy them, drop in your own details, and the whole system re-points at your market. Your real `company_context.json` and `competitors.json` are git-ignored so they never get committed.

---

## What it does

**Weekly (e.g. Monday 9am):**
1. Pulls each competitor's recent LinkedIn posts
2. Scans Google News, competitor sitemaps, and blog content
3. Monitors community forums and Reddit for unfiltered feedback
4. Checks G2, Capterra, and SoftwareAdvice for new user reviews
5. Tracks competitor job postings for leading product signals
6. Scans regulatory and industry developments relevant to your market
7. Diffs the findings against last week's brief to surface what changed
8. Writes a structured executive brief, framed from your company's angle
9. Generates one sales battlecard per competitor
10. Emails the brief and battlecards

**Daily (e.g. 8am):**
- A lightweight breaking-news check that only emails you when something significant happens (score ≥ 4/10)

---

## Architecture

```
agents/
  linkedin-researcher.md   # LinkedIn posts -> structured JSON
  news-scanner.md          # News + sitemap + community forums -> structured JSON
  review-monitor.md        # G2/Capterra/SoftwareAdvice -> review sentiment JSON
  hiring-tracker.md        # Job postings -> product investment signals JSON
  regulatory-radar.md      # Regulatory/industry signals -> structured JSON
  brief-writer.md          # All agents -> executive brief (with week-over-week diff)
  battlecard-writer.md     # Brief + reviews + hiring -> sales battlecards
commands/
  run-intel.md             # /run-intel — full weekly pipeline
  daily-alert.md           # /daily-alert — lightweight daily breaking-news check
skills/
  competitive-analysis.md  # Auto-activates on competitor questions
mcp/apify/
  index.js                 # MCP server — 5 tools (below)

company_context.example.json   # -> copy to company_context.json (your positioning)
competitors.example.json       # -> copy to competitors.json (who to track)
scripts/
  weekly-run.sh            # Cron: weekly — /run-intel
  daily-alert.sh           # Cron: daily — /daily-alert
output/                    # Generated briefs and battlecards (auto-created, git-ignored)
```

### Agents

| Agent | What it does | Output |
|---|---|---|
| `linkedin-researcher` | Reads competitor LinkedIn posts | Themes, product signals, tone, hiring posts |
| `news-scanner` | News, press, blog + Reddit/forums | Product launches, partnerships, community complaints |
| `review-monitor` | G2, Capterra, SoftwareAdvice | Sentiment trends, complaint themes, your openings |
| `hiring-tracker` | Job posting analysis | Leading product signals, tech stack, geographic expansion |
| `regulatory-radar` | Regulatory & industry signals | What's coming, competitor reactions, your openings |
| `brief-writer` | Synthesizes all agents | Executive brief with week-over-week diff |
| `battlecard-writer` | Brief + reviews + hiring | Per-competitor sales battlecards |

### MCP tools (`mcp/apify/index.js`)

| Tool | What it does |
|---|---|
| `linkedin_posts` | Fetches a company's LinkedIn posts (search-indexed by default) |
| `check_sitemap` | Fetches sitemap.xml and filters URLs by publish date — fast, no key |
| `crawl_website` | Full-page text extraction |
| `google_search` | Web search (DuckDuckGo by default; Brave/Apify optional) |
| `send_email` | Sends a styled HTML email via Gmail |

---

## Quick start

**Prerequisites:** [Claude Code](https://claude.ai/code), Node.js, and a Gmail account with an [App Password](https://myaccount.google.com/apppasswords). No other API keys required.

```bash
# 1. Clone
git clone <your-repo-url> && cd competitive-intel

# 2. Install the MCP server deps
cd mcp/apify && npm install && cd ../..

# 3. Create your config from the examples
cp company_context.example.json company_context.json
cp competitors.example.json competitors.json
#   ...then edit both with your real details.

# 4. Set delivery env vars (add to ~/.zshrc or ~/.bashrc)
export GMAIL_USER="you@gmail.com"
export GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
# export BRAVE_API_KEY="..."   # optional, improves search quality

# 5. Register the MCP server
claude mcp add competitive-intel node "$(pwd)/mcp/apify/index.js" \
  -e GMAIL_USER=$GMAIL_USER -e GMAIL_APP_PASSWORD=$GMAIL_APP_PASSWORD

# 6. Run it
claude
> /run-intel
```

See **[GUIDE.md](GUIDE.md)** for full setup, customization, and scheduling.

---

## Usage

```
/run-intel                    # Full cycle — all agents, brief, battlecards, email
/run-intel focus:product      # LinkedIn + news only — fast product check
/run-intel focus:hiring       # Hiring tracker only
/run-intel focus:regulatory   # Regulatory radar only
/run-intel no-email           # Run everything, skip email
/daily-alert                  # Manual breaking-news check
```

The `competitive-analysis` skill also activates automatically when you ask competitor questions in plain language, e.g. *"What is Competitor A doing in AI this quarter?"* or *"What are people saying about Competitor B in reviews?"*

---

## Configuration

| Variable | Required | Description |
|---|---|---|
| `GMAIL_USER` | Yes | Gmail address used to send the brief |
| `GMAIL_APP_PASSWORD` | Yes | Gmail App Password — [generate here](https://myaccount.google.com/apppasswords) |
| `BRAVE_API_KEY` | No | [Brave Search API](https://brave.com/search/api) key — free tier, improves search over DuckDuckGo |

**No paid scraping key required.** Search uses DuckDuckGo by default; crawling uses native HTTP fetch; LinkedIn coverage is best-effort via search-indexed posts. For fuller LinkedIn coverage, an Apify actor integration can be wired into the `linkedin-researcher` agent (not included in this version).

Two files drive all quality — keep them current:

- **`company_context.json`** — your positioning, differentiators, win/loss themes, ICP. Injected into every brief and battlecard.
- **`competitors.json`** — who to track, plus a free-text `notes` field per competitor that gives the agents starting context.

---

## What you get

Every run produces a dated executive brief and one sales battlecard per competitor. The brief reads like this:

```markdown
# Competitive Intelligence Brief — Week of [date]

## Executive Summary
- [Competitor A] shipped usage-based pricing; expect it in deals by Q3.
- [Competitor B] is hiring 4 enterprise AEs in the Northeast: they're moving upmarket.
- Review sentiment on [Competitor A] dipped on onboarding complaints; a wedge for us.

## Moves this week
**[Competitor A] — new pricing page**
Signal: LinkedIn post + pricing page diff. Implication: undercuts our Team tier.
Recommended action: add a per-seat comparison to the pricing objection battlecard.

## Opportunities & threats for us
- Gap we can exploit: [Competitor B] has no SOC 2 page. Lead with trust in that segment.
```

Battlecards are one page each: how they position, where we win, the traps, and the exact rebuttals a rep can use live.

## A note on ethics

This tool reads **publicly available** information: public posts, press, published reviews, public job listings. It does not scrape private data, bypass logins, or collect personal contact information. Keep it that way. See [PRIVACY.md](PRIVACY.md).

## Built with

- [Claude Code](https://claude.ai/code) — agents and orchestration
- [nodemailer](https://nodemailer.com) — email delivery
- Optional: [Apify](https://apify.com) and [Brave Search API](https://brave.com/search/api) for higher-fidelity sourcing

---

Built by [Brittany Slay](https://brittanyslay.com), a B2B marketing leader who builds AI-native tools. More free Claude skills at [brittanyslay.com/skills](https://brittanyslay.com/skills). Want competitive intel wired into how your team actually sells? [Get in touch](https://brittanyslay.com/#contact).
