# Setup & Customization Guide

A step-by-step walkthrough for pointing competitive-intel at your own market and putting it on autopilot. If you just want the fast version, see the Quick Start in [README.md](README.md).

---

## 1. Install

```bash
git clone <your-repo-url> && cd competitive-intel
cd mcp/apify && npm install && cd ../..
```

You need [Claude Code](https://claude.ai/code) and Node.js. That's it for required tooling.

---

## 2. Tell it who you are

Copy the example, then edit:

```bash
cp company_context.example.json company_context.json
```

`company_context.json` is injected into **every** agent run, so it is the single biggest lever on output quality. Fill in:

- `company` / `tagline` — who you are in one line
- `key_differentiators` — the real reasons you win (be specific; "great support" is noise)
- `known_weaknesses` — be honest; the battlecards need to know where you're soft
- `win_themes` / `loss_themes` — the patterns you actually see in deals
- `icp` — who you sell to

The more truthful this file is, the more useful the briefs are. Update it whenever your positioning, pricing, or ICP shifts.

---

## 3. Tell it who to watch

```bash
cp competitors.example.json competitors.json
```

Add up to a handful of competitors. For each, the `notes` field is free text — dump everything you already know (their positioning, recent moves, typical review complaints). Agents use it as starting context, so good notes mean a sharper first brief.

Both `company_context.json` and `competitors.json` are git-ignored, so your real strategy never lands in a public repo.

---

## 4. Wire up delivery

The only required credentials are for sending the email. Add to `~/.zshrc` (or `~/.bashrc`):

```bash
export GMAIL_USER="you@gmail.com"
export GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"   # an App Password, NOT your login password
# export BRAVE_API_KEY="..."                       # optional; better search than DuckDuckGo
```

- Generate a Gmail **App Password** at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (requires 2FA on the account).
- Reload: `source ~/.zshrc`.

Register the MCP server so Claude Code can send mail and search:

```bash
claude mcp add competitive-intel node "$(pwd)/mcp/apify/index.js" \
  -e GMAIL_USER=$GMAIL_USER \
  -e GMAIL_APP_PASSWORD=$GMAIL_APP_PASSWORD \
  -e BRAVE_API_KEY=$BRAVE_API_KEY
```

---

## 5. Run it

```bash
claude
> /run-intel
```

First run takes a few minutes — it fans out to all the agents, diffs against nothing (there's no prior brief yet), and writes to `output/`. Open the generated `brief-*.md` and the `battlecard-*.md` files.

Faster, scoped runs:

```
/run-intel focus:product      # LinkedIn + news only
/run-intel focus:hiring        # what they're building, from job posts
/run-intel focus:regulatory    # regulatory / industry signals
/run-intel no-email            # generate files, don't send
/daily-alert                   # quick breaking-news check
```

---

## 6. Put it on autopilot (optional)

Two shell scripts in `scripts/` are cron-ready. Edit the `PROJECT_DIR` and `CLAUDE_BIN` variables at the top of each, make them executable, then add to cron:

```bash
chmod +x scripts/weekly-run.sh scripts/daily-alert.sh

# weekly full brief, Mondays at 9am
(crontab -l 2>/dev/null; echo "0 9 * * 1 $(pwd)/scripts/weekly-run.sh") | crontab -
# daily breaking-news check, 8am
(crontab -l 2>/dev/null; echo "0 8 * * * $(pwd)/scripts/daily-alert.sh") | crontab -
```

Logs land in `scripts/run.log` and `scripts/daily-alert.log` (both git-ignored).

---

## 7. Tuning tips

- **Fewer, sharper competitors beats a long list.** Two or three you actually compete with produces better briefs than ten you sort of watch.
- **Keep `company_context.json` current.** A stale context file quietly degrades every brief.
- **Read the first few briefs critically** and tighten the `notes` and `win_themes` based on what came back thin or wrong. The system gets better as your inputs do.
- **Add an `APIFY_TOKEN`** to the MCP env only if you need full LinkedIn coverage; the free path covers high-signal announcements.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| No email arrives | Check `GMAIL_APP_PASSWORD` is an App Password, not your login; confirm 2FA is on |
| Empty LinkedIn results | Expected on the free path for low-engagement pages; add an Apify token for full coverage |
| `company_context.json not found` | You skipped step 2 — copy it from the example |
| A page returns little content | It's likely a JS-heavy SPA; the sitemap + search tools cover those instead |

---

Built by [Brittany Slay](https://brittanyslay.com).
