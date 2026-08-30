# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Poop Salary Timer — a static web app that measures what a bathroom/smoke/coffee break "earns" based on the user's salary. German-first UI (with EN translation), tongue-in-cheek tone.

## Commands

There is no build, lint, or test tooling. Development is: edit files, then open `index.html` directly in a browser (or serve the directory with any static file server, e.g. `python3 -m http.server`). There is no npm/package.json.

Sanity-check JS module syntax after edits:
```
for f in js/*.js; do node --check "$f"; done
```

## Non-negotiable constraints

- **No build step, no framework, no npm/bundler.** Vanilla HTML/CSS/JS with native ES modules (`<script type="module">`) only. Do not introduce React/Vue/TypeScript/Vite/Webpack/etc.
- **No backend.** All persistence is `localStorage`. No server, no accounts, no network calls except the Google Fonts stylesheet in `index.html`'s `<head>`.
- **localStorage keys and shapes are a compatibility contract.** Existing users' data must keep working across changes. The keys, all accessed exclusively through `js/storage.js`:
  - `pst_settings` — `{mode, monthly?, hoursPerWeek?, hourly?, rate, taxClass, church, churchRate, dedLabel}`
  - `pst_sessions` — array of `{id, ts, durationMs, earned, rate, activity, net?, ded?, manual?}`
  - `pst_active` — `{accumulatedMs, startTs, activity}` (present only while a session is running/paused)
  - `pst_activity` — last-selected idle activity (`'poop'|'smoke'|'coffee'`)
  - `pst_lang` — `'de'|'en'`
  - `pst_achievements` — `{poop:{[achId]:unlockedAtMs}, smoke:{...}, coffee:{...}}` (legacy flat shape auto-migrates on read, see `achievements.js`'s `migrateAchievements`)
  - `pst_ach_category` — last-viewed achievement category tab
  - `pst_whatsnew_seen` — id (number) of the last "What's New" entry the user has seen
  - `pst_last_export` — timestamp (ms) of the last time the user actually opened the CSV export
  - `pst_export_reminder_dismissed` — timestamp (ms) of the last time the export reminder banner was dismissed
  - Never rename/restructure these without an explicit, deliberate migration.
- **Every user-facing feature ships with a `whatsnew.js` entry.** When adding a new feature (not a bugfix or internal refactor), add a new entry to `ENTRIES` in `js/whatsnew.js` in the same change — plain-language, DE/EN, tongue-in-cheek tone matching the existing entries — so returning users see it in the 📣 modal.

## Architecture

`index.html` holds only markup, one `<link>` to `css/style.css`, and one `<script type="module" src="js/app.js">`. Seven ES modules under `js/`, in dependency order (no cycles):

- **`storage.js`** — the only module that touches `localStorage`. Everything else reads/writes through its typed getters/setters (`getSettings`/`saveSettings`, `getSessions`/`saveSessions`, etc.).
- **`salary.js`** — pure math only, zero DOM/i18n/storage: `computeRate`, `computeTaxRates` (simplified German income-tax approximation), `computeNet(gross, settings)`, `calculateEarnings(durationMs, hourlyRate)`, `FUND_RATES`.
- **`i18n.js`** — everything locale-dependent: the `STR` translation dictionary, `t()`, `Intl` formatters, and all `fmt*`/`funFact`/`pad` helpers (money/duration formatting is bundled here because it's locale-sensitive, not because it's DOM work). Also owns the `BINDINGS` table + `applyBindings()`, which patches static translated text into the DOM by CSS selector.
- **`stats.js`** — `actKeyOf` (normalizes an activity string to `poop`/`smoke`/`coffee`), `sessionStats` (aggregation for achievements/history), CSV export/import (`csvFromSessions`, `parseCsv`, `sessionKey`). Depends only on `i18n.js`.
- **`achievements.js`** — the `ACHIEVEMENTS` definitions (11 total; each has per-activity-category `variants` with translated name/desc/badge, a `test(stats)` predicate, and a `progress(stats)` formatter), plus `checkAchievements` and `migrateAchievements`. Depends on `i18n.js` and `stats.js`.
- **`whatsnew.js`** — curated, user-facing changelog entries (`ENTRIES`, newest first) shown in the header's 📣 modal, plus `hasUnseen(lastSeenId)`. Not derived from git history — hand-written in plain language for end users.
- **`timer.js`** — the in-memory active-session state machine (`getActive`, `elapsedMs`, `startOrResume`, `pause`, `end`). Depends only on `storage.js`. No DOM.
- **`app.js`** — the sole orchestrator: caches every DOM element, owns all `render*` functions and event wiring, and runs the boot sequence. Imports from all six modules above via namespace imports (`import * as X from './x.js'`). Nothing imports from `app.js`.

Key behaviors worth knowing before touching the timer or boot sequence:
- A running session survives page reload: `timer.js` loads `pst_active` at module-init time, and `app.js`'s boot sequence restarts the 60ms render tick if a session was mid-run.
- Stop button is dual-purpose: a short press pauses, holding it ~900ms (`HOLD_MS` in `app.js`) ends the session. This gesture logic lives in `app.js`, not `timer.js`.
- Achievements are evaluated (and toasts queued) on every history render — not only right after saving a session — because `renderHistory()` is called from many places (save, delete, backfill, CSV import, language switch).
- `parseNum` (DOM input parsing, in `app.js`) and `parseCsvNumber` (CSV cell parsing, in `stats.js`) are intentionally *not* merged despite being nearly identical — they diverge on one edge case (literal `"Infinity"` input), so keeping them separate avoids a subtle behavior change.

See `docs/superpowers/plans/2026-08-30-code-structure-refactor.md` for the full rationale behind this module split and the manual QA checklist to run after structural changes (there is no automated test suite).
