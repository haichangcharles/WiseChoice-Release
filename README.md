<div align="center">

<a id="readme-top"></a>

# WiseChoice

**Decide faster while you shop.** A Chrome extension plus a private, local AI service that turns scattered product tabs into one clear, confident choice—TL;DR verdict, decision framework, and trade-offs—without sending your browsing data to a third-party dashboard. **Amazon is the default integration**, but the stack is **site-agnostic**: retarget other storefronts with an AI coding agent—see **[AI-native: extend beyond Amazon](#ai-native-multistore)**.

<p>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white" alt="Chrome Manifest V3" />
  <img src="https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white" alt="Python 3.11+" />
</p>

**Other languages:** [简体中文](README.zh-CN.md)

</div>

---

## Watch the demos

**PDFs** open reliably in the browser on GitHub. **Videos** are easiest for visitors to **watch in-page** if you embed them using one of the two methods below—repo-relative `<video>` paths are often blocked or inconsistent on README pages, which is a GitHub platform limitation.

### Embed MP4 on GitHub (recommended before going public)

1. **Raw URL (after the repo is public)** — In each `<source src="…">`, use  
   `https://raw.githubusercontent.com/<OWNER>/<REPO>/<BRANCH>/asset/WiseChoice%20showcase.mp4` and the same pattern for `WiseChoice.mp4` (replace `OWNER`, `REPO`, `BRANCH`, e.g. `main`).
2. **Issue attachment URL** — Create an Issue (e.g. titled “README media”), **attach each `.mp4` in a comment**, publish the comment, copy each `https://user-images.githubusercontent.com/…mp4` link into your README `<video><source src="…">`. That CDN URL is what GitHub uses for reliable in-page playback.

If the player below is blank, use **[showcase (file view)](asset/WiseChoice%20showcase.mp4)** or **[full walkthrough (file view)](asset/WiseChoice.mp4)**—GitHub’s file page usually offers an in-browser player without asking people to “download to watch.”

**Showcase (short)**

<p align="center">
  <video width="100%" style="max-width:720px" controls preload="metadata" playsinline muted>
    <source src="asset/WiseChoice%20showcase.mp4" type="video/mp4" />
  </video>
</p>

**Full walkthrough**

<p align="center">
  <video width="100%" style="max-width:720px" controls preload="metadata" playsinline muted>
    <source src="asset/WiseChoice.mp4" type="video/mp4" />
  </video>
</p>

**Documents (PDF)**

| | |
| --- | --- |
| [WiseChoice Document.pdf](asset/WiseChoice%20Document.pdf) | Written report: problem, design, technical narrative. |
| [WiseChoice Slide deck (PDF)](asset/WiseChoice_%20Slide.pdf) | Slide-style deck for talks and demos. |

---

## Screenshots

**Hero page** — product positioning and primary story.

<p align="center">
  <img src="asset/heropage.png" alt="WiseChoice hero page" width="100%" style="max-width:920px" />
</p>

**System design** — extension, local service, and model flow.

<p align="center">
  <img src="asset/systemdesign.png" alt="WiseChoice system design" width="100%" style="max-width:920px" />
</p>

**Side panel UI** — **List mode** (candidate shortlist) and **Report mode** (structured AI comparison output).

<p align="center">
  <img src="asset/dualmode.png" alt="WiseChoice list mode and report mode" width="100%" style="max-width:920px" />
</p>

---

<a id="ai-native-multistore"></a>

## AI-native: extend beyond Amazon

This project started life tuned for **Amazon product pages**, but WiseChoice is **not inherently Amazon-only**: the extension collects a structured candidate, and the **local FastAPI + LLM stack** compares whatever payload you send. To support **other domains or storefronts**, open this repo in your **AI coding agent** (Cursor, GitHub Copilot, Claude Code, Windsurf, etc.), then **paste the fenced block below into the chat as your message** (a normal **user** prompt to the agent). WiseChoice does not run that text; **you** are instructing the coding agent what to change. **You must comply with each site’s Terms of Service, applicable law, and any API or automation policies**—this README does not encourage circumventing them.

**User prompt (what you send to the AI):**

> The next block is **your** message to the coding agent—not part of WiseChoice’s runtime.

```text
You are helping extend the WiseChoice Chrome extension (this repository). It is currently scoped for Amazon product detail pages; I want to add or switch to other target storefronts. Respect each target site’s Terms of Service and applicable law; do not implement bulk scraping or evasion patterns unless the user explicitly has the right to do so.

Follow this workflow in order. Do not skip steps 1–3. If anything is unclear, ask me (the human) before guessing.

1) Interview me first (proactive questions)
   - Ask which exact target site(s) I want: **domains**, **URL patterns** (e.g. only product detail URLs), and whether I also need listing/search pages.
   - Ask for **1–3 real example product URLs** on the target site to use as ground truth.
   - Summarize what you understood and **wait for my explicit confirmation** (“yes, proceed”) before you write extraction code or edit files.

2) Audit the existing Amazon pipeline (read-only, then summarize)
   - Read manifest.json, content.js, background.js, and any helpers tied to capture.
   - Build a **field map**: each value WiseChoice collects today (title, price raw/amount, bullets, specs/tech map, stable product id such as ASIN or URL fingerprint, primary image URL, source URL, etc.).
   - For each field, state **where** it comes from on Amazon: **CSS selectors**, **DOM structure**, **JSON-LD / microdata / Open Graph meta in the document**, regex heuristics, etc. Clarify: we care about **data embedded in the HTML page and DOM** (what a content script can read). Do not confuse this with optional HTTP **response headers** unless the product data truly lives there (rare for retail pages).

3) Plan the target site (after I confirm in step 1)
   - For each row in the field map, propose **where** the equivalent data lives on my target site (candidate selectors, JSON-LD blocks, meta tags, fallbacks).
   - If you cannot see the live DOM, ask me to paste **DevTools Elements** snippets or “View Page Source” fragments for the title, price, bullets, and main image regions—or to validate selectors you hypothesize.

4) Implement only after steps 1–3 are done
   - Update manifest.json: host_permissions and content_scripts "matches" for my confirmed domains. Keep http://localhost:8765/* for the local AI service.
   - Update content.js (and CSS if needed) so the extracted object matches the **same shape** already sent to background.js today.
   - Preserve the message flow to background.js and the POST /api/compare contract (api_server.py / agent.py). Only change the API if unavoidable; document migrations.

5) Deliverables
   - List every file changed and why.
   - Show the **before (Amazon) vs after (target)** field map.
   - Manual test steps on a real product page I can follow.
   - Note layout variants (e.g. regional subdomains, A/B tests) and what is out of scope for v1.

If my answers are incomplete, ask follow-up questions until you can implement safely.
```

---

## Why WiseChoice

| For shoppers | For builders |
| --- | --- |
| Collect candidates while you browse—no copy-paste spreadsheets. | **Local-first AI:** your OpenAI key, your machine, default `http://localhost:8765`. |
| Compare two or three picks in one side panel. | Structured outputs: **title**, **TL;DR**, **strategy**, **analysis**, **reasons**. |
| Get a verdict-oriented report, not another generic bullet list. | Graceful **offline-style fallback** if the AI service is not running. |

## Capabilities

- **One-click capture** on Amazon product pages: title, price, bullets, specs, ASIN, image, and more.
- **Smart candidate list** with persistent storage and de-duplication by product `id` (ASIN-first, else URL fingerprint).
- **Side-by-side comparison** in the Chrome side panel—select two or more items and generate a report.
- **AI decision engine** (FastAPI + OpenAI) producing a structured, decision-forward narrative.
- **Resilient UX:** if the local service is down, you still get a basic comparison (price range, brands, shared bullets) plus guidance to start the service.

## How it works

1. **Browse** — On a supported Amazon domain, use the floating action to add the current product to your shortlist.
2. **Shortlist** — Open the extension side panel to manage, dedupe, and select candidates.
3. **Compare** — With the local AI service running, generate a full report; otherwise use the built-in fallback comparison.

## Getting started

### 1. Load the Chrome extension

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. **Load unpacked** → select this repository folder

### 2. Run the local AI service

Python **3.11** or **3.12** recommended.

```bash
cd /path/to/WiseChoice-Release
python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

export OPENAI_API_KEY="your-api-key"   # or use a local .env (see .env.example)

python api_server.py
# or: bash start_ai_service.sh
```

- Service: `http://localhost:8765`
- Interactive API docs: `http://localhost:8765/docs`

### 3. Use it

Open any supported Amazon product detail page, capture products, open the side panel, select **at least two** items, and click **Compare**.

## Architecture (overview)

| Layer | Role |
| --- | --- |
| **Extension (MV3)** | `content.js` extracts product data; `background.js` stores candidates; `sidebar.*` is the comparison UI; `manifest.json` wires permissions and the side panel. |
| **Local service** | `api_server.py` exposes `POST /api/compare`; `agent.py` calls the model with a strict JSON schema for `title` / `tldr` / `strategy` / `analysis` / `reasons`. |

The extension calls `http://localhost:8765` directly. CORS is relaxed for local development—run the service only on trusted machines.

## Local API reference

| Endpoint | Purpose |
| --- | --- |
| `GET /` | Service status and version |
| `GET /api/health` | `{ "status": "healthy" }` |
| `POST /api/compare` | Body: `{ "products": [ ... ] }` — see OpenAPI at `/docs` for the full schema |

```json
{
  "title": "...",
  "tldr": "...",
  "strategy": "...",
  "analysis": "...",
  "reasons": "...",
  "success": true
}
```

## Data, privacy, and security

- **Storage:** `chrome.storage.local` under `wisechoice:candidates`.
- **Extension permissions:** `storage`, `activeTab`, `scripting`, `sidePanel`; host access to configured Amazon domains and `http://localhost:8765/*`.
- **Secrets:** use `OPENAI_API_KEY` in the environment; never commit keys. Copy `.env.example` to `.env` if you use a local env file and keep it out of version control.
- **Network:** The bundled server may listen on `0.0.0.0`; restrict to `127.0.0.1` in `api_server.py` if you want localhost-only access.

## Repository layout

```
WiseChoice-Release/
├── asset/                 # PDFs (Document, Slide), videos, screenshots (heropage, systemdesign, dualmode)
├── manifest.json
├── content.js / content.css
├── background.js
├── sidebar.html / sidebar.js / sidebar.css
├── api_server.py
├── agent.py
├── requirements.txt
├── start_ai_service.sh
├── README.md
├── README.zh-CN.md
└── …
```

## Disclaimer

WiseChoice is an **independent project** and is **not affiliated with, endorsed by, or sponsored by** Amazon, OpenAI, Google, or any marketplace. Trademarks belong to their owners. **Amazon** is used only to describe where the default integration runs. You are responsible for your use of third-party sites and APIs, including compliance with their terms and with local law.

## License

Released under the **MIT License**. See [`LICENSE`](./LICENSE) for details.
