# Changelog

## v2.1.0 - 2026-11-05

Best-in-class overhaul.

- **Installable as a real Claude Code plugin.** Added `.claude-plugin/plugin.json`, a root `.mcp.json` (loads the bundled MCP server via `${CLAUDE_PLUGIN_ROOT}`), and `.claude-plugin/marketplace.json`, so the repo installs with `/plugin marketplace add brittanyslay/competitive-intel` then `/plugin install competitive-intel`. The non-standard `claude` block in `package.json` was removed in favor of the real manifest.
- **Intake-first setup.** New `/intel-setup` command: ask four short questions, then research the answers and write `company_context.json` and `competitors.json` for the user. No copying example files, no hand-editing JSON. The skill and `/run-intel` fall back to this flow when config is missing instead of erroring.
- **Self-critiquing output.** New `qa-reviewer` agent checks the drafted brief and battlecards against a fixed bar (every claim sourced, nothing fabricated, uncertain claims flagged, specific battlecard counters, clean voice) and sends targeted fixes back to the writers for up to two tightening passes before anything is shown.
- **Draft and hold.** Interactive `/run-intel` now saves, self-critiques, shows the draft, and waits for a `send` confirmation. Scheduled runs use `/run-intel email` to send unattended after QA.
- **Vertical-agnostic agents.** The regulatory, community, and review agents now key off `company_context.json` (`regulatory_focus`, `community_sources`, `icp.buyer_personas`) instead of a hardcoded oilfield/contractor-safety vertical, so the same system works for any market. Example context updated to match.
- **Single source of truth.** `.claude/{agents,commands,skills}` are now symlinks to the root component dirs, so the two copies cannot drift.
- **Safer scheduling.** Cron scripts use a scoped tool allowlist instead of `--dangerously-skip-permissions`, with the old behavior documented as a fallback.
- Attribution headers added to every agent file.

## v1.0.2 - 2026-08-20

Pulled the README preview image for now while all the public repos' preview images get reconsidered together. The image file is still in the repo, just not linked from the README.


## v1.0.1 - 2026-08-20

Replaced the README preview image. It was a hand-illustrated mockup (a generic gradient top bar and squircle icon, using un-bracketed "Competitor A/B/C" names) that contradicted the repo's own anonymized-template convention shown right below it in the README. Swapped for a clean rendering of the exact example brief and battlecard content already in the README, using the same `[Competitor A]`/`[Competitor B]` bracketing the shipped config files use.

## v1.0.0 - 2026-08-19

Initial release: seven agents tracking competitors across LinkedIn, news, reviews, jobs, and regulatory signals, producing a weekly executive brief and per-competitor sales battlecards.
