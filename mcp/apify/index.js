#!/usr/bin/env node
// Author: Brittany Slay (https://brittanyslay.com) · Noncommercial use only (PolyForm NC 1.0.0) · Required Notice: Copyright Brittany Slay
/**
 * Competitive Intel MCP Server - Zero-API-Key Edition
 *
 * Tools:
 *   google_search  → DuckDuckGo HTML scraping     (free, no API key)
 *   crawl_website  → Native fetch + cheerio        (free, no API key)
 *   linkedin_posts → DDG search for LinkedIn URLs  (free, best-effort coverage)
 *   check_sitemap  → Native fetch + XML parsing    (unchanged, always free)
 *   send_email     → Gmail via nodemailer          (requires GMAIL_USER + GMAIL_APP_PASSWORD)
 *
 * Optional upgrade: set BRAVE_API_KEY env var for higher-quality search results
 * via the Brave Search API free tier (2,000 queries/month, free signup at brave.com/search/api).
 */

import { load as cheerioLoad } from "cheerio";
import nodemailer from "nodemailer";
import readline from "readline";

const rl = readline.createInterface({ input: process.stdin, terminal: false });

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

// ── Shared helpers ──────────────────────────────────────────────────────────

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function httpFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, ...opts.headers },
    signal: AbortSignal.timeout(opts.timeout ?? 15000),
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
  return res;
}

/** Strip HTML to readable plain text */
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<\/?(p|div|h[1-6]|li|tr|br|blockquote|article|section)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Small delay to be a polite scraper */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Tool implementations ────────────────────────────────────────────────────

/**
 * google_search
 * Primary: Brave Search API (if BRAVE_API_KEY is set - free tier, 2k/month)
 * Fallback: DuckDuckGo HTML scraping (no key needed)
 */
async function googleSearch({ query, num_results = 10, time_range = "any" }) {
  const braveKey = process.env.BRAVE_API_KEY;

  if (braveKey) {
    // ── Brave Search API path ─────────────────────────────────────────────
    const freshness = { day: "pd", week: "pw", month: "pm", year: "py", any: "" }[time_range] ?? "";
    const params = new URLSearchParams({ q: query, count: String(Math.min(num_results, 20)) });
    if (freshness) params.set("freshness", freshness);

    const res = await httpFetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: { "Accept": "application/json", "X-Subscription-Token": braveKey },
    });
    const data = await res.json();
    return (data.web?.results ?? []).slice(0, num_results).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description ?? "",
      date: r.page_age ?? null,
    }));
  }

  // ── DuckDuckGo HTML fallback ──────────────────────────────────────────────
  const dfMap = { day: "d", week: "w", month: "m", year: "y", any: "" };
  const df = dfMap[time_range] ?? "";

  const body = new URLSearchParams({ q: query, kl: "us-en" });
  if (df) body.set("df", df);

  await sleep(150); // polite pause
  const res = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "text/html,application/xhtml+xml",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`DuckDuckGo returned HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerioLoad(html);

  const results = [];
  $(".result").each((_, el) => {
    if (results.length >= num_results) return;
    const anchor = $(el).find("a.result__a").first();
    const snippet = $(el).find(".result__snippet").first().text().trim();
    const rawHref = anchor.attr("href") ?? "";

    // DDG wraps outbound URLs - extract the real URL from the uddg param
    let url = rawHref;
    try {
      const u = new URL(rawHref.startsWith("http") ? rawHref : `https://duckduckgo.com${rawHref}`);
      const uddg = u.searchParams.get("uddg");
      if (uddg) url = decodeURIComponent(uddg);
    } catch {}

    const title = anchor.text().trim();
    if (title && url.startsWith("http")) {
      results.push({ title, url, snippet, date: null });
    }
  });

  return results;
}

/**
 * crawl_website
 * Fetches pages with native fetch + cheerio HTML parsing.
 * Works well for static/SSR pages (blogs, press releases, news).
 * JS-heavy SPAs will return limited content - this is expected.
 */
async function crawlWebsite({ url, max_pages = 5, include_patterns = [], published_after }) {
  const cutoff = published_after ? new Date(published_after) : null;
  const baseDomain = (() => { try { return new URL(url).hostname; } catch { return null; } })();

  const visited = new Set();
  const queue = [url];
  const results = [];

  while (queue.length > 0 && results.length < max_pages) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    try {
      await sleep(200); // polite crawl pace
      const res = await httpFetch(current, { timeout: 12000 });
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("text/html")) continue;

      const html = await res.text();
      const $ = cheerioLoad(html);

      const title =
        $("title").text().trim() ||
        $("h1").first().text().trim() ||
        null;

      // Extract publish date from common meta tags
      const rawDate =
        $('meta[property="article:published_time"]').attr("content") ||
        $('meta[name="pubdate"]').attr("content") ||
        $('meta[name="date"]').attr("content") ||
        $("time[datetime]").first().attr("datetime") ||
        null;

      // Skip pages outside the date window
      if (cutoff && rawDate) {
        try { if (new Date(rawDate) < cutoff) continue; } catch {}
      }

      const text = htmlToText($.html()).slice(0, 8000); // cap at 8k chars

      results.push({ url: current, title, publishedAt: rawDate ?? null, text });

      // Enqueue same-domain links matching include_patterns
      if (results.length < max_pages) {
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href");
          if (!href) return;
          try {
            const abs = new URL(href, current);
            if (abs.hostname !== baseDomain) return;
            if (visited.has(abs.href) || queue.includes(abs.href)) return;
            if (include_patterns.length > 0 && !include_patterns.some((p) => abs.pathname.includes(p))) return;
            queue.push(abs.href);
          } catch {}
        });
      }
    } catch {
      // Failed page - skip silently, don't abort the whole crawl
    }
  }

  return results;
}

/**
 * linkedin_posts
 * Without a paid LinkedIn scraper, we use DuckDuckGo to surface
 * publicly indexed LinkedIn company posts and updates.
 *
 * Coverage: high-engagement posts that search engines index - typically
 * product launches, major announcements, and thought-leadership pieces.
 * Routine posts and low-engagement content will not appear.
 *
 * To get full LinkedIn coverage, set APIFY_TOKEN (harvestapi actor) or
 * use a LinkedIn API integration.
 */
async function linkedinPosts({ query, max_posts = 20 }) {
  // Try both the company name and the LinkedIn company page URL as search terms
  const isLinkedInUrl = query.includes("linkedin.com");
  const searchTerm = isLinkedInUrl
    ? query.replace(/https?:\/\/(www\.)?linkedin\.com\/company\//, "").replace(/\/$/, "")
    : query;

  const searches = [
    `"${searchTerm}" site:linkedin.com`,
    `"${searchTerm}" linkedin.com/company`,
  ];

  const seen = new Set();
  const posts = [];

  for (const q of searches) {
    if (posts.length >= max_posts) break;
    try {
      const results = await googleSearch({ query: q, num_results: max_posts, time_range: "month" });
      for (const r of results) {
        if (posts.length >= max_posts) break;
        if (!r.url.includes("linkedin.com")) continue;
        if (seen.has(r.url)) continue;
        seen.add(r.url);
        posts.push({
          text: r.snippet,
          date: r.date,
          likes: null,
          url: r.url,
          author: null,
          _coverage_note: "Sourced via search-engine index. Only posts indexed by search engines are returned - typically high-engagement announcements. For full post coverage, an Apify token (harvestapi/linkedin-company-posts actor) can be added.",
        });
      }
    } catch {
      // One search failing shouldn't abort
    }
  }

  return posts;
}

/**
 * check_sitemap - unchanged from v1, already 100% free (native fetch)
 */
async function checkSitemap({ domain, published_after, max_urls = 20 }) {
  const base = domain.startsWith("http") ? domain.replace(/\/$/, "") : `https://${domain}`;
  const cutoff = published_after ? new Date(published_after) : null;

  async function fetchXml(url) {
    const res = await fetch(url, {
      headers: { "User-Agent": "competitive-intel-bot/2.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.text();
  }

  function tags(xml, tag) {
    const out = [];
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
    let m;
    while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
    return out;
  }

  function parseEntries(xml) {
    const entries = [];
    for (const block of (xml.match(/<url[\s>][\s\S]*?<\/url>/gi) ?? [])) {
      const loc = tags(block, "loc")[0] ?? null;
      const lastmod = tags(block, "lastmod")[0] ?? null;
      if (loc) entries.push({ url: loc, lastmod: lastmod ?? null });
    }
    return entries;
  }

  const candidates = [
    `${base}/sitemap.xml`,
    `${base}/sitemap_index.xml`,
    `${base}/sitemap/sitemap.xml`,
  ];

  let all = [];
  for (const candidate of candidates) {
    try {
      const xml = await fetchXml(candidate);
      const subs = tags(xml, "loc").filter((u) => u.includes("sitemap") && u.endsWith(".xml"));
      if (subs.length > 0) {
        const settled = await Promise.allSettled(subs.slice(0, 5).map(fetchXml));
        for (const r of settled) {
          if (r.status === "fulfilled") all.push(...parseEntries(r.value));
        }
      } else {
        all.push(...parseEntries(xml));
      }
      if (all.length > 0) break;
    } catch { continue; }
  }

  if (all.length === 0) return { error: "No sitemap found", tried: candidates };

  const filtered = cutoff
    ? all.filter((e) => e.lastmod && new Date(e.lastmod) >= cutoff)
    : all;

  filtered.sort((a, b) => {
    if (!a.lastmod) return 1;
    if (!b.lastmod) return -1;
    return new Date(b.lastmod) - new Date(a.lastmod);
  });

  return filtered.slice(0, max_urls);
}

/**
 * send_email - unchanged from v1, uses Gmail + nodemailer
 */
async function sendEmail({ subject, body, to }) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass)
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set in environment.");

  function markdownToHtml(md) {
    const lines = md.split("\n");
    let html = "";
    let inUl = false;
    let inOl = false;

    const closeList = () => {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (inOl) { html += "</ol>"; inOl = false; }
    };

    const inline = (t) =>
      t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, '<code style="background:#f0f0f0;padding:2px 5px;border-radius:3px;font-size:12px">$1</code>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" style="color:#2563eb;text-decoration:none">$1</a>')
        .replace(/(^|[\s])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" style="color:#2563eb;text-decoration:none">$2</a>');

    for (const raw of lines) {
      const line = raw.trimEnd();
      if (/^# /.test(line)) {
        closeList();
        html += `<h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 4px 0;padding-bottom:12px;border-bottom:2px solid #2563eb">${inline(line.slice(2))}</h1>`;
      } else if (/^## /.test(line)) {
        closeList();
        html += `<h2 style="font-size:13px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.08em;margin:28px 0 10px 0">${inline(line.slice(3))}</h2>`;
      } else if (/^### /.test(line)) {
        closeList();
        html += `<h3 style="font-size:15px;font-weight:600;color:#111827;margin:18px 0 6px 0">${inline(line.slice(4))}</h3>`;
      } else if (/^---$/.test(line)) {
        closeList();
        html += `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">`;
      } else if (/^> /.test(line)) {
        closeList();
        html += `<blockquote style="margin:12px 0;padding:10px 16px;background:#eff6ff;border-left:4px solid #2563eb;border-radius:0 6px 6px 0;color:#374151;font-style:italic">${inline(line.slice(2))}</blockquote>`;
      } else if (/^- \[ \] /.test(line)) {
        if (!inUl) { html += `<ul style="list-style:none;padding:0;margin:8px 0">`; inUl = true; }
        html += `<li style="margin:6px 0;padding:6px 10px;background:#f9fafb;border-radius:5px">☐ ${inline(line.slice(6))}</li>`;
      } else if (/^- /.test(line)) {
        if (!inUl) { html += `<ul style="margin:8px 0 8px 20px;padding:0">`; inUl = true; }
        html += `<li style="margin:5px 0;color:#374151">${inline(line.slice(2))}</li>`;
      } else if (/^\d+\. /.test(line)) {
        if (!inOl) { html += `<ol style="margin:8px 0 8px 20px;padding:0">`; inOl = true; }
        html += `<li style="margin:5px 0;color:#374151">${inline(line.replace(/^\d+\. /, ""))}</li>`;
      } else if (line.trim() === "") {
        closeList();
      } else {
        closeList();
        html += `<p style="margin:8px 0;color:#374151;line-height:1.65">${inline(line)}</p>`;
      }
    }
    closeList();
    return html;
  }

  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const content = markdownToHtml(body);

  const styledHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:680px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <tr><td style="background:linear-gradient(135deg,#1e40af 0%,#2563eb 100%);padding:32px 36px">
          <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.1em">Weekly Report</p>
          <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:700;color:#ffffff;line-height:1.2">${subject}</h1>
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 12px">
              <span style="font-size:12px;color:rgba(255,255,255,0.9)">📅 ${date}</span>
            </td>
            <td width="8"></td>
            <td style="background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 12px">
              <span style="font-size:12px;color:rgba(255,255,255,0.9)">🔍 Competitive Intel</span>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:32px 36px">${content}</td></tr>
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 36px">
          <p style="margin:0;font-size:12px;color:#9ca3af">Sent automatically - Competitive Intel</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });
  await transporter.sendMail({
    from: `"Competitive Intel" <${gmailUser}>`,
    to: to ?? gmailUser,
    subject,
    html: styledHtml,
  });
  return { sent: true, to: to ?? gmailUser };
}

// ── MCP tool registry ───────────────────────────────────────────────────────

const TOOLS = {
  google_search: {
    description: "Search the web and return results with title, URL, and snippet. Uses DuckDuckGo (free) or Brave Search API if BRAVE_API_KEY is set.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "Search query string" },
        num_results: { type: "number", description: "Number of results to return (default 10)", default: 10 },
        time_range: { type: "string", enum: ["day", "week", "month", "year", "any"], description: "Restrict results to a time window", default: "any" },
      },
    },
  },
  crawl_website: {
    description: "Fetch and extract text content from a website URL. Works best on static/SSR pages (blogs, press releases). JS-heavy SPAs may return limited content.",
    inputSchema: {
      type: "object",
      required: ["url"],
      properties: {
        url: { type: "string", description: "Starting URL to fetch" },
        max_pages: { type: "number", description: "Maximum pages to crawl (default 5)", default: 5 },
        include_patterns: { type: "array", items: { type: "string" }, description: "URL path patterns to follow (e.g. ['/blog', '/news'])" },
        published_after: { type: "string", description: "ISO date - skip pages with detected publish date older than this" },
      },
    },
  },
  linkedin_posts: {
    description: "Find publicly indexed LinkedIn posts and updates for a company via web search. Best-effort coverage - captures high-engagement and indexed posts. Pass company name or LinkedIn URL.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "Company name or LinkedIn company page URL" },
        max_posts: { type: "number", description: "Maximum posts to retrieve (default 20)", default: 20 },
      },
    },
  },
  check_sitemap: {
    description: "Fetch a website's sitemap.xml and return URLs published or modified within a date window. Fast and free - no external service needed.",
    inputSchema: {
      type: "object",
      required: ["domain"],
      properties: {
        domain: { type: "string", description: "Root domain, e.g. 'competitor-a.com' or 'https://competitor-b.com'" },
        published_after: { type: "string", description: "ISO date - only return URLs with lastmod on or after this date" },
        max_urls: { type: "number", description: "Maximum URLs to return (default 20)", default: 20 },
      },
    },
  },
  send_email: {
    description: "Send the competitive brief or battlecard as a styled HTML email via Gmail. Reads GMAIL_USER and GMAIL_APP_PASSWORD from environment.",
    inputSchema: {
      type: "object",
      required: ["subject", "body"],
      properties: {
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Email body in Markdown - rendered to styled HTML" },
        to: { type: "string", description: "Recipient email. Defaults to GMAIL_USER if not specified." },
      },
    },
  },
};

async function callTool(name, args) {
  switch (name) {
    case "google_search":  return googleSearch(args);
    case "crawl_website":  return crawlWebsite(args);
    case "linkedin_posts": return linkedinPosts(args);
    case "check_sitemap":  return checkSitemap(args);
    case "send_email":     return sendEmail(args);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

// ── JSON-RPC stdio transport ────────────────────────────────────────────────

rl.on("line", async (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }

  const { id, method, params } = msg;
  if (id === undefined || id === null) return; // notification - no response

  try {
    if (method === "initialize") {
      send({
        jsonrpc: "2.0", id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "competitive-intel", version: "2.0.0" },
          capabilities: { tools: {} },
        },
      });
    } else if (method === "tools/list") {
      send({
        jsonrpc: "2.0", id,
        result: { tools: Object.entries(TOOLS).map(([name, def]) => ({ name, ...def })) },
      });
    } else if (method === "tools/call") {
      const { name, arguments: args } = params;
      const result = await callTool(name, args);
      send({
        jsonrpc: "2.0", id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
      });
    } else {
      send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (err) {
    send({ jsonrpc: "2.0", id, error: { code: -32603, message: String(err?.message ?? err).slice(0, 500) } });
  }
});
