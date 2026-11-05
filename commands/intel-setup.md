---
name: intel-setup
description: One-step intake. Ask a few questions, then research the answers and write company_context.json and competitors.json for the user. No hand-editing JSON, no copying example files. Run this once before the first /run-intel.
---

# Intel Setup - Intake and Auto-Configuration

Your job is to stand up a working configuration from the smallest possible amount of user input. The user is the manager here. They name their company and their competitors; you do the research and write both config files. Never ask the user to edit JSON by hand or to assemble inputs you can gather yourself.

## Step 1 - Minimal intake

Ask only these, in one message, and accept short answers:

1. **Your company:** name and website domain. (Required.)
2. **Your competitors:** 2 to 5 names, with a domain each if they know it. (Required. Remind them that two or three real rivals beat a long watch list.)
3. **Anything we should know?** One or two lines on how they win or where they are soft, optional. If they skip it, you will infer it from their site.
4. **Delivery:** the email address that should receive briefs. (Optional now; can be set later.)

If `company_context.json` or `competitors.json` already exists, say so and ask whether to update it or start fresh before overwriting anything.

## Step 2 - Research the user's own company

Using the MCP tools, draft `company_context.json` from public information so the user does not have to write it:

- `crawl_website` on the company domain: homepage, `/product`, `/pricing`, `/about`, `/customers`. Pull the tagline, what they do, differentiators, proof points, and any scale numbers (customers, employees, funding) that are actually stated.
- `google_search` for `"[company]" product OR pricing OR differentiator` and `"[company]" review OR alternative` to catch how the market frames them.
- Infer `core_industries`, `icp`, and `regulatory_focus` from what you find. For `regulatory_focus`, identify the regulation, compliance, or standards that drive demand in this category (data privacy, SEC, OSHA, HIPAA, and so on, whatever fits), not a fixed industry.
- Infer `community_sources`: the subreddits, forums, and communities where this market's buyers actually talk.

Fill every field you can support from evidence. For anything you cannot verify, put a short value in `[brackets]` so the user sees exactly what to confirm. Never invent metrics, customers, or claims.

## Step 3 - Research each competitor

For each competitor, draft a `competitors.json` entry:

- Resolve the domain if the user did not give one (`google_search` for the name).
- Find the LinkedIn company URL.
- `crawl_website` on their homepage and a quick `google_search` for recent positioning and common review complaints.
- Write a 2 to 4 sentence `notes` field: how they position, recent moves, and the complaints that tend to show up. These notes are starting context for the research agents, so make them concrete.

## Step 4 - Write both files

Write `company_context.json` and `competitors.json` to the project root, matching the shape of `company_context.example.json` and `competitors.example.json`. These files are git-ignored, so the user's real strategy never lands in the repo.

Set `last_updated` to today.

## Step 5 - Confirm, do not interrogate

Show the user a short summary of what you wrote: the company one-liner, the differentiators you inferred, the competitor list with one line each, and any `[bracketed]` fields that need their confirmation. Ask one question: "Anything to correct before the first run?" Apply any corrections directly to the files. Do not make them edit JSON.

## Step 6 - Hand off

Once confirmed, tell them they are ready and what to run:

```
/run-intel            # full brief + battlecards, drafted and held for your review
/run-intel email      # same, and send once it passes QA
/daily-alert          # quick breaking-news check
```

If they gave a delivery email, remind them to set `GMAIL_USER` and `GMAIL_APP_PASSWORD` (see GUIDE.md) before the first emailed run. Search and crawling work with no key; email needs those two.

## Rules

- Minimize questions. Four at most, answered in one message.
- Do the research yourself. Never hand the user a blank template.
- Never fabricate. Bracket what you cannot verify.
- Confirm before overwriting an existing config.

---
Author: Brittany Slay (https://brittanyslay.com). Licensed for noncommercial use only; see LICENSE.
Required Notice: Copyright Brittany Slay (https://brittanyslay.com)
