# Briefly

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

The **Case document copilot** on each firm case supports AI document retrieval, full file scanning, cross checked provider uploads, and one click draft workflows. See [DEMO.md](DEMO.md) for a complete live demonstration using the case based sample PDF and for the real Clio path.

The mock case snapshot and the previously synced Clio case are stored in Supabase. The application does not open a local database at runtime. Clio connection and sync are still available; new sync results are saved to the same Supabase store.

## Supabase storage

The app uses the private `app_private` Postgres schema through the Supabase session pooler. Case tables are not exposed through the Data API. Set the pooler host, user, password, and Supabase URL in Git-ignored `.env.local`. The firm case list opens directly; provider views still require a share link.

The firm case list and case details are cached as private JSON files in Git-ignored `.data/cache`. Cached pages open immediately on later visits and refresh from Supabase in the background. A Clio sync or settlement update invalidates the affected cache.

Run `npm run db:schema` to apply the private schema. `npm run db:migrate` is a one-time importer for the previous local mock case store, its document bytes, and the bundled demo fixture; the app itself no longer reads SQLite. The import has already been run for this project. If genuine protected medical records are used later, configure the Supabase BAA and HIPAA add-on before storing them remotely. For verified database TLS, provide `SUPABASE_DB_CA_FILE` from Supabase Database Settings.

## Submission notes (fill in before 4:00 PM)

- **Built with:** Next.js 16, TypeScript, Tailwind v4, SQLite, Claude API
- **Runs on:** localhost
- **Data outside Clio:** SQLite (digests, share configs, view receipts, last-visit)
- **AI models / cost per case:** Claude Opus 5.5 (`claude-opus-5-5`), one structured-output call per digest. Sapini: ~26k input + ~9k output tokens ≈ **$0.28 per digest**, ~1 min. Re-opening or re-syncing with no Clio changes costs **$0** (cached by content hash). Logged per run in `digests.json.meta`.
- **How it stays honest:** every AI sentence must cite Clio item IDs; uncited sentences are dropped. KPIs, tasks/overdue and providers are computed from Clio data in code, not by the model. Clio client is GET-only (`src/lib/clio.ts`).
- **Half-done / hardcoded:** The digest pipeline still uses Clio document names, while the document copilot reads actual PDF and image contents when scanned. Similar cases remain hidden until a real source is wired. `src/lib/mock` and the sample provider response are clearly labeled demo data. Contact and filing actions create drafts for review, not external submissions.
