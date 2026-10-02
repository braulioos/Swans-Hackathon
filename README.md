# Case Digest

Get up to speed on a personal-injury case in 90 seconds, then dig into anything. Share the right slice with treating providers.

Built for the Swans Applied AI Hackathon (Oct 2, 2026). The plan, stack, UX principles and schedule are in [PLAN.md](PLAN.md).

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 and pick a role:

- **I work at the firm** → `/firm` → Sapini dashboard → **Share with provider**
- **I'm a medical provider** → enter code `demo` (mock share)

`DATA_SOURCE=mock` renders a clearly labeled dev fixture (`src/lib/mock`). Real data flows from Clio through `src/lib/data.ts` once the digest pipeline is built.

## Submission notes (fill in before 4:00 PM)

- **Built with:** Next.js 16, TypeScript, Tailwind v4, SQLite, Claude API
- **Runs on:** localhost
- **Data outside Clio:** SQLite (digests, share configs, view receipts, last-visit)
- **AI models / cost per case:** Claude Opus 5.5 (`claude-opus-5-5`), one structured-output call per digest. Sapini: ~26k input + ~9k output tokens ≈ **$0.28 per digest**, ~1 min. Re-opening or re-syncing with no Clio changes costs **$0** (cached by content hash). Logged per run in `digests.json.meta`.
- **How it stays honest:** every AI sentence must cite Clio item IDs; uncited sentences are dropped. KPIs, tasks/overdue and providers are computed from Clio data in code, not by the model. Clio client is GET-only (`src/lib/clio.ts`).
- **Half-done / hardcoded:** TODO (PDF contents not yet read by the digest, only document names; similar-cases card hidden until a real source is wired; `src/lib/mock` is a dev fixture used only when `DATA_SOURCE=mock`)
