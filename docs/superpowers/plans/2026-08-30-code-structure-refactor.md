# Code-Struktur-Refaktorierung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: This plan is executed inline in the
> same session that wrote it (superpowers:executing-plans style), not handed off to
> a fresh subagent — the author already holds the full verified source in context.
> No automated test suite exists; every "verify" step is a manual browser check
> against the Abschlussprüfung checklist at the end of this document.

**Goal:** Split the single 2339-line `index.html` (inline CSS + inline IIFE JS) into
`index.html` (markup only) + `css/style.css` + seven ES modules under `js/`, with
**zero** behavior change and **zero** localStorage compatibility breaks.

**Architecture:** Native ES modules (`<script type="module">`), no bundler, no
build step. Bottom-up dependency order: `storage.js` and `salary.js` are leaf
modules (no imports). `i18n.js` is a leaf module too (pure data + DOM text
patching, no imports from other app modules). `stats.js` imports only from
`i18n.js`. `achievements.js` imports from `i18n.js` and `stats.js`. `timer.js`
imports only from `storage.js`. `app.js` is the sole orchestrator: it owns all
DOM element caching, rendering, event wiring, and the boot sequence, importing
from all six other modules. No module imports from `app.js` — no cycles.

**Tech Stack:** Vanilla HTML/CSS/JS, native ES modules, no npm/build/framework.

**Spec:** User's German-language refactor brief (this conversation) — see
"Global Constraints" below for the non-negotiable requirements extracted from it.

## Global Constraints

- No React/Vue/Angular/Next.js/TypeScript/npm/Vite/Webpack/bundler/backend/DB/accounts.
- No new product features, no redesign, no visible behavior change of any kind.
- localStorage keys and JSON shapes must stay byte-for-byte compatible:
  `pst_settings`, `pst_sessions`, `pst_active`, `pst_activity`, `pst_lang`,
  `pst_achievements`, `pst_ach_category` (7 keys total — the last three weren't
  named in the brief but are equally real and must be preserved).
- No data migration beyond the one already present in the code (legacy flat
  `pst_achievements` shape → per-category shape), which must keep working exactly
  as it does today.
- Work happens on branch `refactor/code-structure`.
- Prefer moving code verbatim over rewriting; the only intentional *new* code is
  the `calculateEarnings(durationMs, hourlyRate)` helper the brief explicitly asks
  for (replacing a formula duplicated 3×) and the `computeNet(gross, settings)`
  signature fix (removes a hidden closure-over-module-state — same output, cleaner
  input).

## Full source inventory (already read in full, all 2339 lines)

- CSS: lines 11–751 of the current `index.html`, one `<style>` block, no JS coupling.
- JS: lines 1029–2335, one IIFE, ~90 functions across 8 concerns (storage,
  timer, salary/tax, formatting/i18n, achievements, CSV, share/clipboard, event
  wiring), all closing over a shared set of `var`s. No `window.*` pollution today.
- Every localStorage access already funnels through 3 tiny wrappers
  (`lsGet`/`lsSet`/`lsDel`) — good news, this makes centralizing storage low-risk.
- Two near-duplicate number parsers exist (`parseNum(el)` for form inputs,
  `parseCsvNumber(str)` for CSV cells). They differ in one edge case
  (`parseCsvNumber` can return `Infinity` for literal `"Infinity"` input,
  `parseNum` cannot). **Decision: do not merge them** — the spec's "no behavior
  change" rule outweighs the minor duplication. Documented here so it isn't
  "discovered" and fixed by accident later.
- `pad()` is used by timer formatting, CSV formatting, and backfill-form date
  defaults. Since two of those three call sites already need `i18n.js` for
  other reasons, `pad` moves there as a shared export rather than being
  duplicated three ways.

## Module interfaces (exact exports)

```js
// js/storage.js — the only module that touches localStorage directly
export function getSettings()          // -> object | null
export function saveSettings(settings) // -> void
export function getSessions()          // -> array
export function saveSessions(sessions) // -> void
export function getActive()            // -> {accumulatedMs, startTs, activity} | null
export function saveActive(active)     // -> void
export function clearActive()          // -> void
export function getActivity()          // -> 'poop'|'smoke'|'coffee'|null
export function saveActivity(key)      // -> void
export function getLang()              // -> 'de'|'en'|null   (raw stored value)
export function saveLang(lang)         // -> void
export function getRawAchievements()   // -> whatever shape is on disk (may be legacy)
export function saveAchievements(data) // -> void
export function getAchCategory()       // -> 'poop'|'smoke'|'coffee'|null
export function saveAchCategory(key)   // -> void

// js/salary.js — pure math, zero DOM, zero i18n, zero storage
export function computeRate(s)
export function computeTaxRates(s)
export function computeNet(gross, settings)     // was computeNet(gross), closed over `settings`
export function calculateEarnings(durationMs, hourlyRate)  // NEW, replaces 3 inline dupes
export const FUND_RATES

// js/i18n.js — everything that depends on current language/locale
export function t(key)
export function getLang()                // in-memory current lang, not storage.getLang()
export function setLang(l)                // sets in-memory lang + storage.saveLang(l); no rendering
export function buildFormatters()
export function applyBindings()           // steps 1–4 of the old applyLang(): documentElement.lang,
                                           // lang-switch aria-pressed, BINDINGS loop, picker aria-labels
export function fmtMoneyLive(v)
export function fmtMoney(v)
export function fmtElapsed(ms)
export function fmtDurationWords(ms)
export function fmtFunded(sec)
export function funFact(earned)
export function pad(n)

// js/stats.js — session aggregation + CSV, depends only on i18n.js
export function actKeyOf(x)                       // normalizes activity key, default 'poop'
export function sessionStats(sessions)
export function csvFromSessions(sessions)
export function parseCsv(text, fallbackRate)      // fallbackRate replaces the old `settings` closure read
export function sessionKey(ts, durationMs)

// js/achievements.js — depends on i18n.js + stats.js + storage.js
export const ACHIEVEMENTS
export function achVariant(a, cat)
export function migrateAchievements(raw)
export function checkAchievements(sessions)

// js/timer.js — depends only on storage.js
export function getActive()
export function elapsedMs()
export function startOrResume(activityKeyForNewSession)
export function pause()
export function end()                             // -> {durationMs, activity} ; clears active
```

## Task sequence

1. Create branch `refactor/code-structure`.
2. Extract CSS → `css/style.css`; add `<link rel="stylesheet">` in `<head>`;
   remove the inline `<style>` block from `<body>`. Verify visually (light + dark).
3. Create `js/storage.js`.
4. Create `js/salary.js`.
5. Create `js/i18n.js`.
6. Create `js/stats.js`.
7. Create `js/achievements.js`.
8. Create `js/timer.js`.
9. Create `js/app.js` (the remaining ~950 lines: DOM caching, all `render*`
   functions, all event wiring, hold-to-stop gesture, share/clipboard, backfill
   form, boot sequence) — imports from all six modules above. Update
   `index.html`'s closing script tag to `<script type="module" src="js/app.js">`.
   Delete the old inline `<script>` body.
10. Manual regression pass through every scenario in the Abschlussprüfung
    checklist below, including a compatibility check against pre-refactor
    localStorage data (seed the 7 keys with realistic values, reload, confirm
    everything still renders and behaves identically).
11. Commit. Write the summary (file structure, architecture changes, things
    deliberately left unchanged, risks, next steps).

## Abschlussprüfung (manual checklist, run after Task 9)

- Neuinstallation ohne Daten (private/incognito window, no localStorage)
- Bestehende gespeicherte Einstellungen (seed `pst_settings` pre-refactor shape)
- Start / Pause / Fortsetzen / Beenden einer Sitzung
- Reload während laufender Session (resume-after-reload)
- Session manuell nachtragen; Session löschen
- Achievements freischalten (all 11 defs, per category) + Toast-Anzeige
- Sprache wechseln (DE/EN) — every view, including summary while open
- Theme wechseln (OS light/dark)
- Netto-/Steuereinstellungen ändern (tax class, church tax, custom deduction label)
- Mobilgerät-Layout (narrow viewport)
- Teilen (Web Share API) + Clipboard-Fallback + the modal's own `execCommand('copy')` path
- CSV-Export und -Import (including dedup-on-import)
- Bestehende localStorage-Daten aus einer Vor-Refactor-Version bleiben nutzbar
