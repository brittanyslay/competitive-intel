# Privacy & Data

**competitive-intel**
Last updated: 2026

---

## Overview

competitive-intel is a self-hosted Claude Code plugin. It runs on your own machine, under your own accounts. There is no vendor behind it, no central server, and no analytics. This document explains what it reads, where that goes, and what it deliberately does not do.

---

## What it reads

**Data you provide (stays local):**
- Competitor names, domains, and LinkedIn URLs in `competitors.json`
- Your positioning in `company_context.json`
- Credentials (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, optional `BRAVE_API_KEY`) in your local shell environment

**Data fetched during a run (all public):**
- Publicly indexed LinkedIn posts, found via web search
- Publicly accessible pages on competitor domains, via HTTP fetch
- Public search results (DuckDuckGo by default, or Brave Search if configured)
- Public `sitemap.xml` entries on competitor domains

Everything fetched is **publicly available**. The plugin does not log in as anyone, does not access authenticated or private content, and does not collect personal contact information.

---

## Where data goes

| Data | Destination |
|---|---|
| Search / crawl requests | The search or scraping provider you configured (DuckDuckGo, or optionally Brave / Apify) |
| Generated briefs & battlecards | Saved locally in `output/` on your machine |
| Email | Sent via Gmail SMTP using your own account |

No data is sent anywhere else. There is no telemetry.

---

## Third-party services

Each has its own privacy policy:

- **Gmail / Google** — [policies.google.com/privacy](https://policies.google.com/privacy) — delivers the email
- **Brave Search API** (optional) — [brave.com/search/api](https://brave.com/search/api)
- **Apify** (optional) — [apify.com/privacy-policy](https://apify.com/privacy-policy)

---

## Retention & deletion

Briefs live in `output/` until you delete them. Nothing is retained centrally. To remove everything: delete `output/`, revoke your Gmail App Password, remove any optional API keys from those providers, and uninstall the plugin (`claude plugin remove competitive-intel`).

---

## Use it responsibly

Track public signals to sharpen your own strategy. Do not use it to scrape private data, bypass access controls, harvest individuals' personal contact information, or harass anyone. The point is understanding your market, not surveilling people.
