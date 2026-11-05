# Setup & Customization Guide

A step-by-step walkthrough for pointing competitive-intel at your own market and putting it on autopilot. If you just want the fast version, see the Install section in [README.md](README.md).

> **Noncommercial use only (PolyForm Noncommercial 1.0.0).** This plugin is the work of Brittany Slay. You are free to use, adapt, and share it for noncommercial purposes with attribution intact. Commercial use (reselling, white-labeling, or productizing it) requires a license from Brittany Slay ([get in touch](https://brittanyslay.com/#contact)).

---

## 1. Install

You need [Claude Code](https://claude.ai/code) and Node.js. That is it for required tooling.

**As a plugin (recommended):**

```
/plugin marketplace add brittanyslay/competitive-intel
/plugin install competitive-intel
```

The plugin ships its MCP server with it. Set the delivery env vars in step 3 so it can send mail and search.

**Or clone and run:**

```bash
git clone https://github.com/brittanyslay/competitive-intel && cd competitive-intel
cd mcp/apify && npm install && cd ../..
```

---

## 2. Configure in one step

```
claude
> /intel-setup
```

`/intel-setup` is intake-first. It asks you four short questions:

1. Your company name and website.
2. Two to five competitors (with domains if you know them).
3. Optionally, one line on how you win or where you are soft.
4. Optionally, the email address that should receive briefs.

Then it does the work you would otherwise do by hand: it crawls your own site, researches each competitor, and writes `company_context.json` and `competitors.json` for you. It shows you a summary and asks for any corrections. Anything it could not verify is left in `[brackets]` for you to confirm, never invented.

Both files are git-ignored, so your real strategy never lands in a public repo. You can rerun `/intel-setup` any time your positioning or competitor set changes, or edit the files directly if you prefer.

**What goes in `company_context.json`:** it is injected into every agent run, so it is the single biggest lever on output quality.

- `company` / `tagline` - who you are in one line
- `key_differentiators` - the real reasons you win (be specific; "great support" is noise)
- `known_weaknesses` - be honest; the battlecards need to know where you are soft
- `win_themes` / `loss_themes` - the patterns you actually see in deals
- `icp` and `icp.buyer_personas` - who you sell to, and the distinct personas (reviews get split by these)
- `regulatory_focus` - the regulation, compliance, or standards that move demand in your category. This is what makes the regulatory agent work for your market instead of a hardcoded one.
- `community_sources` - the subreddits, forums, and communities where your buyers actually talk

The more truthful this file is, the more useful the briefs are.

---

## 3. Wire up delivery

The only required credentials are for sending email. Search and crawling need nothing. Add to `~/.zshrc` (or `~/.bashrc`):

```bash
export GMAIL_USER="you@gmail.com"
export GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"   # an App Password, NOT your login password
# export BRAVE_API_KEY="..."                       # optional; better search than DuckDuckGo
```

- Generate a Gmail **App Password** at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (requires 2FA on the account).
- Reload: `source ~/.zshrc`.

If you installed by cloning instead of as a plugin, register the MCP server so Claude Code can send mail and search:

```bash
claude mcp add competitive-intel node "$(pwd)/mcp/apify/index.js" \
  -e GMAIL_USER=$GMAIL_USER \
  -e GMAIL_APP_PASSWORD=$GMAIL_APP_PASSWORD \
  -e BRAVE_API_KEY=$BRAVE_API_KEY
```

---

## 4. Run it

```
claude
> /run-intel
```

The first run takes a few minutes. It fans out to all the agents, diffs against nothing (there is no prior brief yet), critiques its own draft, and writes to `output/`. Then it **holds**: it shows you the brief and battlecards and waits. Reply `send` to email them, or tell it what to change.

Faster, scoped runs:

```
/run-intel email               # run everything and send once it passes QA
/run-intel focus:product       # LinkedIn + news only
/run-intel focus:hiring        # what they are building, from job posts
/run-intel focus:regulatory    # regulatory / industry signals
/run-intel no-email            # generate files, never send
/daily-alert                   # quick breaking-news check
```

### How it vets itself

After drafting, the `qa-reviewer` agent checks the brief and battlecards against a fixed bar: every claim has a source, nothing is fabricated, uncertain claims are flagged, battlecard counters are specific, and the voice is clean. If it finds problems, the writers get one tightening pass before anything reaches you. Thin-data gaps that no revision can fix are flagged honestly in the output rather than smoothed over.

---

## 5. Put it on autopilot (optional)

Two shell scripts in `scripts/` are cron-ready. The weekly runner uses `/run-intel email`, so unattended runs still go through the QA pass and then send. Edit the `PROJECT_DIR` and `CLAUDE_BIN` variables at the top of each, make them executable, then add to cron:

```bash
chmod +x scripts/weekly-run.sh scripts/daily-alert.sh

# weekly full brief, Mondays at 9am
(crontab -l 2>/dev/null; echo "0 9 * * 1 $(pwd)/scripts/weekly-run.sh") | crontab -
# daily breaking-news check, 8am
(crontab -l 2>/dev/null; echo "0 8 * * * $(pwd)/scripts/daily-alert.sh") | crontab -
```

The scripts grant a scoped tool allowlist for headless runs rather than skipping permissions wholesale. If your environment does not honor the allowlist in headless mode, each script documents the fallback. Logs land in `scripts/run.log` and `scripts/daily-alert.log` (both git-ignored).

---

## 6. Tuning tips

- **Fewer, sharper competitors beats a long list.** Two or three you actually compete with produces better briefs than ten you sort of watch.
- **Keep `company_context.json` current.** A stale context file quietly degrades every brief. Rerun `/intel-setup` when things shift.
- **Read the first few briefs critically** and tighten the `notes`, `win_themes`, `regulatory_focus`, and `community_sources` based on what came back thin or wrong. The system gets better as your inputs do.
- **Add an `APIFY_TOKEN`** to the MCP env only if you need full LinkedIn coverage; the free path covers high-signal announcements.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| No email arrives | Check `GMAIL_APP_PASSWORD` is an App Password, not your login; confirm 2FA is on |
| Empty LinkedIn results | Expected on the free path for low-engagement pages; add an Apify token for full coverage |
| `company_context.json not found` | Run `/intel-setup` and it writes the file for you |
| Regulatory results feel off-topic | Tighten `regulatory_focus.domains` in `company_context.json` to the regulation that actually moves your category |
| Community pass finds nothing | Fill in `community_sources` with the subreddits and forums your buyers actually use |
| A page returns little content | It is likely a JS-heavy SPA; the sitemap + search tools cover those instead |

---

Built by [Brittany Slay](https://brittanyslay.com). More free Claude skills at [brittanyslay.com/skills](https://brittanyslay.com/skills).
