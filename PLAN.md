# Case Digest: Hackathon Plan

Swans Applied AI Hackathon · Law-Di-Gras San Diego · **Oct 2, 2026** · Hard deadline **4:00 PM** (form in, all work committed)

## 1. The brief, compressed

Build a **visual dashboard** (not a chatbot) that digests one live Clio Manage case, **Sapini**, for two audiences:

1. **Firm staff:** get up to speed in 90 seconds, then dig into anything.
2. **Medical providers** treating on a lien: see case status, coverage and what the firm needs, without seeing the whole file.

Rules that decide the screening round (Top 7 is "won in the code"):

- Reads Sapini **live** from your own Clio account. **Read only**: no API call may write to Clio.
- Judges **read the repo**. Hardcoded features get spotted fast.
- Need writes (shares, last-visit, cached digests)? Use **your own DB**.

## 2. Product concept: one case, two panels, layered disclosure

```
                 ┌──────────── Who's checking in? ────────────┐
                 │  [ I work at the firm ]  [ I'm a provider ] │   ← character select (2 choices)
                 └──────────────┬──────────────────┬──────────┘
                                │                  │  share code / link required
                ┌───────────────▼───────┐   ┌──────▼──────────────────────┐
                │ FIRM PANEL            │   │ PROVIDER PANEL              │
                │ L0 HUD                │   │ status · alive? · coverage  │
                │ L1 Since last visit   │   │ what the firm needs from me │
                │    + 90-second brief  │   │ shared-only timeline        │
                │ L2 Timeline + quests  │   │ my bills/records · attendance│
                │ L3 Full case file     │   │ "notify me when it moves"   │
                │ L4 Source drawer      │   └─────────────────────────────┘
                └───────────────────────┘
```

**Disclosure ladder (firm panel).** Each layer answers more, costs more attention, and is one click from the last.

| Layer | What | Default | How to reach it |
|---|---|---|---|
| L0 HUD | Client photo, stage track, case value, coverage, specials, firm spend, last client contact, overdue count | Always visible | n/a |
| L1 Brief | "Since your last visit" + one-line headline + ≤5 bullets | Visible | n/a |
| L2 Timeline / Quest log | Interactive case journey; overdue / coming up / waiting-on-others | Visible, summarized ("Story" zoom, top 3 per group) | "Everything" zoom, "See all →" |
| L3 Full case file | Every event, task, provider, source, unfiltered | Collapsed bar, always on screen | HUD button, any "See all", the bar itself |
| L4 Source | The original note / email / document page | Hidden | Click any source chip, anywhere |

The rule that makes it trustworthy: **every AI sentence carries at least one source chip.** A fact with no source isn't rendered. This covers "If a date is on screen, I need to see where it came from" and "click on anything and open the note/document/email."

## 3. Game UX principles, mapped to features

Sources I researched: Celia Hodent's game UX framework (ex-Epic/Fortnite UX director, *The Gamer's Brain*), plus standard HUD-design practice.

| Principle | Where it shows up |
|---|---|
| **HUD information hierarchy** (primary always visible, secondary contextual, tertiary on demand) | L0 HUD = primary; brief/timeline = secondary; full case file = tertiary |
| **Progressive disclosure** | The L0→L4 ladder; timeline dot → hover peek → pinned detail → source drawer |
| **Character select / Hick's law** (fewer choices = faster decisions) | Landing page offers exactly two roles |
| **"Previously on…" returning-player recap** | "Since your last visit" banner, pulsing rings on new timeline dots, "Your last visit" marker on the track |
| **Quest log / objective tracker** | Overdue · Coming up · Waiting on others |
| **Level map / progress bar** | Stage track (Intake → … → Settlement), same component on both panels |
| **Map zoom (semantic zoom)** | Timeline "Story" (milestones + key events) vs "Everything" (wider track, all events) |
| **Inspect item / tooltip** | Hover or focus a dot to get a one-line peek card |
| **Signs & feedback** (Hodent) | Hover lift, pressed states, "Digested <date>", provider "opened by…" receipts |
| **Clarity + consistency** (Hodent) | One color per category everywhere, always paired with a text label (not color alone) |
| **Minimum workload / chunking** (Hodent; working memory holds about 4–7 items) | ≤5 brief bullets, top 3 per quest group, 6 HUD tiles |
| **Error prevention** (Hodent) | Share preview shows *exactly* what the provider gets; strategy never shareable; coverage defaults to yes/no, not dollars |
| **Flexibility / accessibility** (Hodent) | ←/→ keys step through the timeline, Esc closes things, focus-visible rings, reduced-motion respected |
| **Fog of war** | Provider sees only the revealed (shared) slice; the attorney picks what to reveal |

Tone: **subtle HUD**, as you chose. Game patterns, professional skin, no points or badges.

## 4. Feature checklist against the quotes (slide 9)

Build top to bottom, then stop when time runs out. ✅ = in the wireframe already (on mock data).

**Must-have (core demo)**
- ✅ Up to speed without asking anyone → 90-second brief
- ✅ What changed since I last opened this matter → since-last-visit (needs per-user `last_viewed_at` in DB)
- ✅ 10 that matter out of 300 → Story zoom + brief
- ✅ Two minutes vs dig into everything → disclosure ladder
- ✅ Date on screen → see where it came from / click to open the source → source chips + drawer
- ✅ Overdue / coming / waiting on others → quest log
- ✅ Case value + coverage KPIs; firm spend → HUD
- ✅ Last time anyone talked to the client → HUD tile
- ✅ Providers: is there coverage, is the case alive, what do you need from me → provider panel
- ✅ Let me adjust what the provider sees before sending → share builder with live preview + per-update checkboxes + a locked "Never shared" list
- ✅ Suggest next moves, not just a digest → "Suggested next moves" card (Now / Soon / Later, each cited)
- ✅ When new info comes in, what does it mean? → `impact` line on new events (recap banner + pinned timeline card)
- ⬜ Don't re-digest the whole case every open → **incremental digest cache** (key engineering point for judges)

**Should-have**
- ✅ Client picture on open (UI slot ready; find where Sapini's photo lives)
- ✅ Primary injuries buried in a 200-page scan → injuries card with page-cited chips (needs PDF pipeline)
- ✅ What did we share, and has their office opened it → view receipts (needs DB)
- ✅ Is my patient still showing up → attendance tile
- ⬜ Tell me when the case moves → stage-change detection on re-digest, plus an email preview/log
- ⬜ Similar cases / precedent → card is built; fill it **only from real, linkable sources** (Claude web search with citations, trusted domains). AI-invented case law is the best-known way lawyers get burned by AI. With attorney judges, one fake case sinks the demo. If there's no time, cut it rather than fake it.
- Provider sharing defaults: share **as much as is safe** (all provider-relevant sections on, incl. other treating providers); case value, strategy and settlement positions are never shareable

**Nice-to-have:** search inside the full case file, PDF viewer jumped to the cited page, share-link expiry/revoke.

## 5. Stack

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js 16 (App Router) + TypeScript** | One codebase for UI + server routes; the Clio secret and AI key stay server-side |
| UI | **Tailwind v4** + lucide icons (add shadcn/ui if you want ready-made dialogs and tabs) | Fast, readable wireframe-to-product |
| Your DB | **SQLite** (`better-sqlite3`, or the built-in `node:sqlite` if native builds give you trouble on Windows) | Zero-ops locally; holds tokens, items, digests, shares, views |
| AI | **Claude API** via `@anthropic-ai/sdk`: model `claude-opus-5-5` | Native PDF input (scans included), page-level citations, structured JSON outputs |
| Input | **Clio Manage API v4** (OAuth 2.0 auth-code flow, GET only) | The required source |
| Run | `localhost:3000` | "Localhost can win here" |

## 6. Architecture

```
Clio Manage (read only)
   │  GET matters, notes, communications, tasks, calendar_entries, activities, documents(+download), contacts
   ▼
[1] Ingest  (lib/clio.ts → SQLite `items`)
     one row per note/email/task/doc: id, kind, date, title, body, clio_url, content_hash
   ▼
[2] Extract (Claude, per item or per batch)   ← only items whose content_hash changed
     notes/emails: structured output → facts[] each with source item ids
     PDFs: document block + citations → facts with page numbers
     → SQLite `facts`
   ▼
[3] Synthesize (Claude, once per change)
     facts → CaseDigest JSON (types in src/lib/types.ts), structured output
     validate: every source id exists, otherwise drop the sentence
     → SQLite `digests` (matter_id, version, json, created_at)
   ▼
[4] Serve  (lib/data.ts → pages)   page loads never call Claude
     firm panel ← full digest
     provider panel ← buildSharePacket(digest, shareConfig)   (server-side whitelist)
```

Why this wins the code-screening round: no hardcoding (everything flows from Clio), incremental digestion (the content hash means a re-open costs $0), traceable facts (source ids validated), and a provably read-only Clio client.

**AI notes**
- Citations (PDF page numbers) and structured outputs can't be combined in one call. So run extraction with citations on, then do synthesis with structured output over the extracted facts.
- PDF limits: 32 MB per request, 600 pages. Split very large scans.
- Keep the system prompt and JSON schema byte-stable so prompt caching kicks in.
- Log `response.usage` for every call so your README has a real cost per case.

**Rough cost per case on Opus 5.5** ($4 / $20 per M input/output tokens). Assumes about 300 notes/emails plus about 600 scanned pages:
- First full digest ≈ 1.3M input + ~100k output (incl. thinking) ≈ **$6–9**
- Each update after that (a few new items + re-synthesis) ≈ **$0.20–0.50**
- Re-opening the case: **$0** (cached)
- If you want it cheaper, moving only the bulk PDF extraction to Haiku 4.5 ($1 / $5) brings the first digest to roughly **$2–4**. That's your call; Opus everywhere is simpler.

## 7. Schedule (from ~10:00 AM)

| Time | Goal | Done when |
|---|---|---|
| now → 10:15 | Accounts + setup (section 8) | Sapini visible in Clio; `npm run dev` shows the wireframe |
| 10:15 → 11:15 | OAuth + ingest to SQLite | `items` table filled from Sapini; you've looked at the real fields |
| 11:15 → 12:00 | Extraction pass | `facts` rows with source ids / page numbers |
| 12:00 → 12:30 | Lunch (let a full extraction run) | n/a |
| 12:30 → 1:30 | Synthesis → `digests`; flip `DATA_SOURCE=clio` | Dashboard renders real Sapini |
| 1:30 → 2:30 | Real source drawer excerpts, per-user last visit, incremental re-digest | Re-open = no AI call |
| 2:30 → 3:15 | Shares in DB: token, sections, view receipts; stage-change notice | Provider link works on real data |
| 3:15 → 3:40 | Record the 90-second clip; README (stack, models, cost, what's unfinished) | n/a |
| 3:40 → 3:50 | **Submit.** Submission order = presentation order | Form in, all committed |

Cut order if you run late: notifications → attendance → full-file search → PDF viewer. Never cut: real Clio data, source chips, the share preview.

## 8. What you need to do on your end

1. **Clio trial**: create a free Clio Manage trial (one per team) and invite teammates.
2. **Swans setup app** (QR on slide 14): connect your account and load the Sapini matter. Takes 10–15 min, so **start it first**.
3. **Clio developer app**: register an app in Clio (look for *Developer Applications* in Clio settings / developer portal). Set the redirect URI to `http://127.0.0.1:3000/auth/clio/callback` (done: app id 42431) and pick **read-only** permissions. Copy the client ID and secret.
4. **Anthropic API key** from console.anthropic.com (or hackathon credits if offered).
5. `cp .env.example .env.local` and fill it in. Leave `DATA_SOURCE=mock` until the pipeline works.
6. `npm install` then `npm run dev` → open **http://127.0.0.1:3000** (must match the Clio redirect host)
7. **Explore Sapini in Clio before mapping.** Where do case value, policy limits and medical specials live (custom fields?) Is there a client photo? Which contacts are providers? Note the field names in this file.
8. **OneDrive caution**: this repo is inside OneDrive, and syncing `node_modules`/`.next` can slow things down or lock files. Pause sync for the day, or move the repo out.
9. **GitHub**: create the repo and push early (the repo *is* the submission). Commit often; "all committed work" is the cutoff.
10. **Before submitting**: run on `DATA_SOURCE=clio`, keep the mock fixture clearly labeled as dev-only, and list anything half-done in the form.

## 9. Open design decisions

- **Case value**: show only the attorney-entered value with AI-listed *drivers* (injury severity, specials, liability). An AI-*invented* dollar figure is a trust risk with attorney judges.
- **Provider access**: for the demo, an unguessable link token with expiry. A later step would be token + emailed one-time code.
- **"Last visit" identity**: use the Clio user from OAuth (`users/who_am_i`), stored with `last_viewed_at` per matter.
- **What's shareable**: the AI tags each event `shareableWithProviders`. Attorneys override in the share builder. Strategy and settlement positions are always off.

## 10. Wireframe map: where to code

| Path | Role |
|---|---|
| `src/lib/types.ts` | **The contract.** `CaseDigest`, `SharePacket`. The pipeline must output these |
| `src/lib/data.ts` | **The seam.** Swap mock → SQLite here; pages never change |
| `src/lib/clio.ts` | Read-only Clio client (GET + pagination) + ingest TODO list |
| `src/lib/share.ts` | Privacy whitelist: digest + config → provider packet |
| `src/lib/mock/*` | Dev fixtures only, so the UI renders before Clio is connected |
| `src/app/page.tsx` | Role select |
| `src/app/firm/matter/[id]/page.tsx` | Firm dashboard (layer order is the page order) |
| `src/app/firm/matter/[id]/share/page.tsx` | Share builder + live provider preview |
| `src/app/share/[token]/page.tsx` | Provider panel (server-filtered) |
| `src/app/auth/clio/*` | OAuth login + callback (token storage TODO) |
| `src/components/timeline/CaseTimeline.tsx` | Zoomable, hover-peek, click-pin timeline |
| `src/components/hud/*` | HUD, stage track, KPI tiles |
| `src/components/briefing/*` | Since-last-visit, brief, quest log, injuries, providers |
| `src/components/casefile/FullCaseFile.tsx` | Layer 3: everything, unfiltered |
| `src/components/source/*` | Source chips + drawer (layer 4) |

Search the code for `TODO` to find every spot where real data plugs in.
