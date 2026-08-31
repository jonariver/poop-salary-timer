# Swiss Region Support (Federal Tax + Social Security) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fully-tested, pure-function backend for Swiss (CHF/federal tax/AHV-IV-EO/ALV/BVG) net-estimate support, region-aware currency formatting, and a currency-agnostic content sweep — without yet exposing a region toggle in the UI.

**Architecture:** A new `region` concept (`'DE'|'CH'`, default `'DE'`) drives a dispatcher in `salary.js` (`computeTaxRates` picks the DE or CH branch) and region-aware currency/locale formatting in `i18n.js`. The Swiss federal tax uses a verified 2026 bracket table computed via cumulative-bracket summation (not the German quadratic-zone formula — structurally different tariff shape). Cantonal/communal tax has its data table intentionally empty (`CH_CANTON_TAX = {}`) pending a follow-up research pass — the mechanism is fully wired so adding a canton later is a pure-data change, no code change.

**Deliberate scope boundary:** This plan does **not** add a region toggle to the setup form. Exposing "Schweiz" as a selectable option before any canton exists would let a user see a net estimate missing its (usually largest) cantonal/communal tax component — silently wrong, not just incomplete. The UI toggle + canton dropdown ship together with the first canton(s), as the first task of the next plan.

**Tech Stack:** Vanilla ES modules, no build step, no framework (see `CLAUDE.md`). Tests use Node's built-in test runner (`node --test`), following the precedent set by `tests/share.test.mjs` — the first tests in this repo, since it has no npm/package.json and no other test infrastructure.

**Spec:** `docs/superpowers/specs/2026-08-31-swiss-region-support-design.md`

## Global Constraints

- No build step, no framework, no npm/bundler — plain ES modules only (`CLAUDE.md`).
- No backend, no network calls — all computation is local/pure.
- `localStorage` keys are a compatibility contract — new keys only, never rename/restructure existing ones (`CLAUDE.md`). This plan adds one new key: `pst_region`.
- German (`region==='DE'` or missing `region`) computation must remain byte-identical to current behavior — this is a pure addition, not a migration.
- `storage.js` is the only module that touches `localStorage` directly (`CLAUDE.md`).
- Sanity-check after every edit: `node --check js/<file>.js`.
- Every user-facing feature ships with a `js/whatsnew.js` entry (`CLAUDE.md`) — **not applicable to this plan**, since nothing user-facing ships yet (no UI exposure per the scope boundary above); the entry belongs to the follow-up plan that adds the toggle.

---

## Task 1: Shared bracket-tax helper + Swiss federal tax

**Files:**
- Modify: `js/salary.js` (add near the existing `TAX_PARAMS` block, before `computeTaxRates`)
- Test: `tests/salary.test.mjs` (new file)

**Interfaces:**
- Produces: `computeChFederalTax(zvE)` — internal to `salary.js`, **exported** for direct verification against official data. Takes a non-negative number (taxable income in CHF), returns the annual federal tax in CHF (number).
- Produces: `computeBracketTax(zvE, brackets)` — private helper (not exported), used by Task 1 internally and reused by Task 3 for cantonal tax once canton data exists.

- [ ] **Step 1: Write the failing test**

Create `tests/salary.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { computeChFederalTax } from '../js/salary.js';

test('computeChFederalTax matches the official 2026 Grundtarif (Basel-Landschaft PDF) within rounding tolerance', () => {
  // [zvE, official tax] pairs, verified against the official cantonal
  // publication of the federal DBG tariff, "Tarif für Alleinstehende
  // (Grundtarif)", gültig ab 2026.
  var cases = [
    [0, 0],
    [15200, 0],
    [15300, 0.77],
    [33200, 138.60],
    [43500, 229.20],
    [58000, 612.00],
    [100000, 2684.35],
    [200000, 12903.35],
    [793900, 91298.15],
    [1000000, 115000.00]
  ];
  cases.forEach(function (c) {
    var zvE = c[0], expected = c[1];
    var actual = computeChFederalTax(zvE);
    assert.ok(
      Math.abs(actual - expected) < 1,
      'zvE=' + zvE + ': expected ~' + expected + ', got ' + actual
    );
  });
});

test('computeChFederalTax is zero at and below the Grundfreibetrag', () => {
  assert.equal(computeChFederalTax(0), 0);
  assert.equal(computeChFederalTax(15200), 0);
});

test('computeChFederalTax applies the flat 11.5% top rate above CHF 793900', () => {
  var zvE = 2000000;
  assert.equal(computeChFederalTax(zvE), zvE * 0.115);
});

test('computeChFederalTax is monotonically non-decreasing across the full range', () => {
  var prev = 0;
  for (var zvE = 0; zvE <= 1000000; zvE += 10000) {
    var tax = computeChFederalTax(zvE);
    assert.ok(tax >= prev - 0.001, 'tax decreased at zvE=' + zvE + ' (' + tax + ' < ' + prev + ')');
    prev = tax;
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/salary.test.mjs`
Expected: FAIL — `computeChFederalTax` is not exported from `js/salary.js` (import error).

- [ ] **Step 3: Implement**

In `js/salary.js`, add this block after the existing `TAX_PARAMS` declaration (after line 29, before `export function computeTaxRates(s) {`):

```js
// ---------- Schweiz: Bundessteuer (vereinfachte Näherung) ----------
// Stufentarif "Tarif für Alleinstehende (Grundtarif)", gültig ab 2026, verifiziert gegen
// die offizielle Tariftabelle des Kantons Basel-Landschaft (reproduziert den Bundestarif
// nach Bundesgesetz über die direkte Bundessteuer, DBG). Bei Wechsel auf ein neues
// Steuerjahr: CH_TAX_MODEL_YEAR und CH_FEDERAL_BRACKETS gemeinsam ersetzen.
export var CH_TAX_MODEL_YEAR = 2026;
var CH_FEDERAL_BRACKETS = [
  { upTo: 15200, rate: 0 },
  { upTo: 33200, rate: 0.0077 },
  { upTo: 43500, rate: 0.0088 },
  { upTo: 58000, rate: 0.0264 },
  { upTo: 76200, rate: 0.0297 },
  { upTo: 82100, rate: 0.0594 },
  { upTo: 108900, rate: 0.0660 },
  { upTo: 141500, rate: 0.0880 },
  { upTo: 185100, rate: 0.1100 },
  { upTo: 793900, rate: 0.1320 }
];
var CH_FEDERAL_TOP_RATE = 0.115; // ab CHF 793'900: pauschal 11,5 % vom gesamten zvE (vereinfacht,
                                  // ignoriert die ~200-CHF-Übergangszone der offiziellen Tabelle)

// Stufenweise (bracket) Steuerberechnung: Basis für Bundes- UND (sobald befüllt) Kantonssteuer.
function computeBracketTax(zvE, brackets) {
  var tax = 0, lower = 0;
  for (var i = 0; i < brackets.length; i++) {
    var b = brackets[i];
    if (zvE <= b.upTo) { tax += (zvE - lower) * b.rate; return tax; }
    tax += (b.upTo - lower) * b.rate;
    lower = b.upTo;
  }
  return tax;
}

export function computeChFederalTax(zvE) {
  if (zvE >= 793900) return zvE * CH_FEDERAL_TOP_RATE;
  return computeBracketTax(zvE, CH_FEDERAL_BRACKETS);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/salary.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: Sanity-check and commit**

```bash
node --check js/salary.js
git add js/salary.js tests/salary.test.mjs
git commit -m "Add verified Swiss federal tax bracket calculation"
```

---

## Task 2: Swiss social security (AHV/IV/EO, ALV, BVG approximation)

**Files:**
- Modify: `js/salary.js`
- Test: `tests/salary.test.mjs`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `computeChSocialSecurity(annualGross)` — private (not exported from the module's public API, but exported for this task's direct test since the rates/thresholds are independently verifiable facts worth pinning down precisely). Takes annual gross salary in CHF, returns `{ ahvIvEo, alv, bvg, total }` (all numbers, annual CHF amounts).

- [ ] **Step 1: Write the failing test**

Append to `tests/salary.test.mjs`:

```js
import { computeChSocialSecurity } from '../js/salary.js';

test('computeChSocialSecurity: AHV/IV/EO has no ceiling', () => {
  var s = computeChSocialSecurity(500000);
  assert.ok(Math.abs(s.ahvIvEo - 500000 * 0.053) < 0.01);
});

test('computeChSocialSecurity: ALV is capped at the CHF 148200 ceiling', () => {
  var below = computeChSocialSecurity(100000);
  assert.ok(Math.abs(below.alv - 100000 * 0.011) < 0.01);
  var above = computeChSocialSecurity(200000);
  assert.ok(Math.abs(above.alv - 148200 * 0.011) < 0.01, 'ALV must not exceed the ceiling-based amount');
});

test('computeChSocialSecurity: BVG is zero below the entry threshold', () => {
  var s = computeChSocialSecurity(20000); // below CHF 22680
  assert.equal(s.bvg, 0);
});

test('computeChSocialSecurity: BVG applies the coordination deduction', () => {
  var s = computeChSocialSecurity(80000);
  var expectedCoordinated = 80000 - 26460; // below the max insured salary, no cap needed
  assert.ok(Math.abs(s.bvg - expectedCoordinated * 0.0625) < 0.01);
});

test('computeChSocialSecurity: BVG coordinated salary is capped at the max insured salary', () => {
  var s = computeChSocialSecurity(200000);
  var expectedCoordinated = 90720 - 26460; // capped at bvgMaxInsuredSalary before the deduction
  assert.ok(Math.abs(s.bvg - expectedCoordinated * 0.0625) < 0.01);
});

test('computeChSocialSecurity: total is the sum of all three parts', () => {
  var s = computeChSocialSecurity(80000);
  assert.ok(Math.abs(s.total - (s.ahvIvEo + s.alv + s.bvg)) < 0.001);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/salary.test.mjs`
Expected: FAIL — `computeChSocialSecurity` is not exported.

- [ ] **Step 3: Implement**

In `js/salary.js`, add after the `computeChFederalTax` function from Task 1:

```js
// ---------- Schweiz: Sozialabgaben (vereinfachte Näherung) ----------
// AHV/IV/EO und ALV: Arbeitnehmeranteile, öffentlich bekannte, stabile Sätze.
// BVG: die gesetzlichen Mindest-Altersgutschriften sind altersgestaffelt (7/10/15/18 %
// Gesamtsatz je Altersgruppe, hälftig Arbeitnehmer/Arbeitgeber). Da die App kein Alter
// erfasst, wird der ungewichtete Mittelwert der vier Arbeitnehmeranteile verwendet:
// (3.5+5.0+7.5+9.0)/4 = 6.25 % — eine bewusste, im Disclaimer offengelegte Näherung.
// Explizit NICHT enthalten: Krankenversicherung (in der Schweiz keine Lohnabzugsposition).
export var CH_SOCIAL_SECURITY_PARAMS = {
  ahvIvEoRate: 0.053,
  alvRate: 0.011,
  alvCeiling: 148200,
  bvgRate: 0.0625,
  bvgEntryThreshold: 22680,
  bvgCoordinationDeduction: 26460,
  bvgMaxInsuredSalary: 90720
};

export function computeChSocialSecurity(annualGross) {
  var p = CH_SOCIAL_SECURITY_PARAMS;
  var ahvIvEo = annualGross * p.ahvIvEoRate;
  var alv = Math.min(annualGross, p.alvCeiling) * p.alvRate;
  var bvg = 0;
  if (annualGross >= p.bvgEntryThreshold) {
    var insuredSalary = Math.min(annualGross, p.bvgMaxInsuredSalary);
    var coordinatedSalary = Math.max(0, insuredSalary - p.bvgCoordinationDeduction);
    bvg = coordinatedSalary * p.bvgRate;
  }
  return { ahvIvEo: ahvIvEo, alv: alv, bvg: bvg, total: ahvIvEo + alv + bvg };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/salary.test.mjs`
Expected: PASS (10 tests total)

- [ ] **Step 5: Sanity-check and commit**

```bash
node --check js/salary.js
git add js/salary.js tests/salary.test.mjs
git commit -m "Add Swiss social security (AHV/IV/EO, ALV, BVG approximation)"
```

---

## Task 3: `computeTaxRates` region dispatcher (DE unchanged, CH wired)

**Files:**
- Modify: `js/salary.js` (restructure `computeTaxRates` into a dispatcher)
- Test: `tests/salary.test.mjs`

**Interfaces:**
- Consumes: `computeChFederalTax(zvE)` (Task 1), `computeChSocialSecurity(annualGross)` (Task 2).
- Produces: `computeTaxRates(s)` — **same public signature and return shape as before** (`{ sv, lst, soli, church, total }` or `null`). Now also accepts `s.region === 'CH'` and `s.canton` (canton lookup returns `0` cantonal tax for any canton until Task 5 of the *next* plan populates `CH_CANTON_TAX`).
- Produces: `CH_CANTON_TAX` — exported empty object, the exact slot the next plan's canton data fills in.

- [ ] **Step 1: Write the failing test**

Append to `tests/salary.test.mjs`:

```js
import { computeTaxRates } from '../js/salary.js';

test('computeTaxRates: existing DE behavior is unchanged (regression, taxClass 1)', () => {
  var r = computeTaxRates({ mode: 'monthly', monthly: 3200, taxClass: '1', church: false });
  // Golden value captured from this exact settings shape before this plan's changes.
  assert.ok(Math.abs(r.lst - 0.12313815633528646) < 0.0000001);
  assert.equal(r.soli, 0);
  assert.equal(r.church, 0);
  assert.equal(r.sv, 0.205);
});

test('computeTaxRates: missing region defaults to DE behavior', () => {
  var withRegion = computeTaxRates({ mode: 'monthly', monthly: 3200, taxClass: '1', region: 'DE' });
  var withoutRegion = computeTaxRates({ mode: 'monthly', monthly: 3200, taxClass: '1' });
  assert.deepEqual(withRegion, withoutRegion);
});

test('computeTaxRates: DE without taxClass still returns null', () => {
  assert.equal(computeTaxRates({ mode: 'monthly', monthly: 3200 }), null);
});

test('computeTaxRates: CH branch returns a rate object without needing taxClass', () => {
  var r = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 6000 });
  assert.ok(r !== null);
  assert.ok(r.lst > 0);
  assert.ok(r.sv > 0);
  assert.equal(r.soli, 0);
  assert.equal(r.church, 0);
});

test('computeTaxRates: CH branch with zero/missing gross returns null', () => {
  assert.equal(computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 0 }), null);
});

test('computeTaxRates: CH branch works with no canton selected (cantonal tax contributes 0)', () => {
  var r = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 6000 });
  var rWithUnknownCanton = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 6000, canton: 'ZH' });
  // ZH isn't in CH_CANTON_TAX yet (next plan adds it) — both must be identical for now.
  assert.deepEqual(r, rWithUnknownCanton);
});

test('computeTaxRates: total never exceeds the 0.9 safety cap for either region', () => {
  var de = computeTaxRates({ mode: 'monthly', monthly: 3200, taxClass: '1', church: true, churchRate: 9 });
  var ch = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 3200 });
  assert.ok(de.total <= 0.9);
  assert.ok(ch.total <= 0.9);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/salary.test.mjs`
Expected: FAIL — the golden-value regression test should currently PASS already (no code change yet), but the CH-branch tests FAIL because `computeTaxRates` doesn't understand `region` yet (it will fall into the existing `if (!s.taxClass) return null;` gate and return `null` for all CH cases).

- [ ] **Step 3: Implement**

In `js/salary.js`, replace the existing `export function computeTaxRates(s) { ... }` (the whole function, from `export function computeTaxRates(s) {` through its closing `}`) with:

```js
export var CH_CANTON_TAX = {}; // wird in einem Folge-Schritt mit Kantonsdaten befüllt (siehe Spec Abschnitt 5)

export function computeTaxRates(s) {
  if (!s) return null;
  if (s.region === 'CH') return computeChTaxRates(s);
  return computeDeTaxRates(s);
}

function computeDeTaxRates(s) {
  if (!s.taxClass) return null;
  var annualGross = s.mode === 'hourly'
    ? (s.hourly || 0) * ((s.hoursPerWeek || 40) * 52)
    : (s.monthly || 0) * 12;
  if (!(annualGross > 0)) return null;
  var p = TAX_PARAMS;
  function T(z) { // Einkommensteuer-Tarif (Näherung), § 32a EStG, Steuerjahr TAX_MODEL_YEAR
    if (z <= p.grundfreibetrag) return 0;
    if (z <= p.zone2End) { var y = (z - p.grundfreibetrag) / 10000; return (p.zone2.a * y + p.zone2.b) * y; }
    if (z <= p.zone3End) { var q = (z - p.zone2End) / 10000; return (p.zone3.a * q + p.zone3.b) * q + p.zone3.c; }
    if (z <= p.zone4End) return p.zone4Rate * z - p.zone4Sub;
    return p.zone5Rate * z - p.zone5Sub;
  }
  var zvE = Math.max(0, annualGross * 0.86 - 1230); // grob: Vorsorge + Werbungskosten
  var cls = String(s.taxClass);
  var lstAnnual;
  if (cls === '3') lstAnnual = 2 * T(zvE / 2);
  else if (cls === '2') lstAnnual = T(Math.max(0, zvE - p.entlastungAlleinerziehende));
  else if (cls === '5' || cls === '6') lstAnnual = T(zvE + p.grundfreibetrag);
  else lstAnnual = T(zvE);
  var lstRate = Math.max(0, Math.min(0.45, lstAnnual / annualGross));
  var soliRate = lstAnnual > p.soliThreshold ? lstRate * 0.055 : 0;
  var churchRate = s.church ? lstRate * ((Number(s.churchRate) === 8 ? 8 : 9) / 100) : 0;
  var svRate = 0.205;
  var total = Math.min(0.9, svRate + lstRate + soliRate + churchRate);
  return { sv: svRate, lst: lstRate, soli: soliRate, church: churchRate, total: total };
}

function computeChTaxRates(s) {
  var annualGross = s.mode === 'hourly'
    ? (s.hourly || 0) * ((s.hoursPerWeek || 40) * 52)
    : (s.monthly || 0) * 12;
  if (!(annualGross > 0)) return null;

  var social = computeChSocialSecurity(annualGross);
  var svRate = social.total / annualGross;

  // zvE_CH: Sozialabgaben sind in der Schweiz vor der Einkommenssteuer abzugsfähig — anders
  // als die deutsche Näherung (0.86-Faktor), die hier NICHT wiederverwendet werden darf.
  var zvE = Math.max(0, annualGross - social.total);
  var federalTax = computeChFederalTax(zvE);
  var canton = CH_CANTON_TAX[s.canton];
  var cantonalTax = canton ? computeBracketTax(zvE, canton.brackets) * canton.gemeindeMultiplier : 0;
  var lstAnnual = federalTax + cantonalTax;
  var lstRate = Math.max(0, Math.min(0.45, lstAnnual / annualGross));

  var total = Math.min(0.9, svRate + lstRate);
  return { sv: svRate, lst: lstRate, soli: 0, church: 0, total: total };
}
```

Note: this is a structural move, not a rewrite — the body of `computeDeTaxRates` is character-for-character the old `computeTaxRates` body (same variable names, same formula), just renamed and called from the new dispatcher. This is what makes the regression test in Step 1 meaningful.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/salary.test.mjs`
Expected: PASS (17 tests total)

- [ ] **Step 5: Sanity-check and commit**

```bash
node --check js/salary.js
git add js/salary.js tests/salary.test.mjs
git commit -m "Split computeTaxRates into a DE/CH region dispatcher"
```

---

## Task 4: `computeNet` regression coverage

**Files:**
- Modify: `tests/salary.test.mjs`

**Interfaces:**
- Consumes: `computeNet(gross, settings)` (already exported, unchanged in this task — this task only adds test coverage confirming Task 3's refactor didn't break it, since `computeNet` calls `computeTaxRates` internally).

- [ ] **Step 1: Write the test**

Append to `tests/salary.test.mjs`:

```js
import { computeNet } from '../js/salary.js';

test('computeNet: DE net+ded reconstructs gross exactly (regression)', () => {
  var settings = { mode: 'monthly', monthly: 3200, taxClass: '1', church: false };
  var r = computeNet(3200, settings);
  assert.ok(Math.abs(r.net + r.ded - 3200) < 0.001);
});

test('computeNet: CH net+ded reconstructs gross exactly', () => {
  var settings = { region: 'CH', mode: 'monthly', monthly: 6000 };
  var r = computeNet(6000, settings);
  assert.ok(Math.abs(r.net + r.ded - 6000) < 0.001);
  assert.equal(r.soli, 0);
  assert.equal(r.church, 0);
});

test('computeNet: no taxClass and DE region returns null (unchanged behavior)', () => {
  assert.equal(computeNet(3200, { mode: 'monthly', monthly: 3200 }), null);
});
```

- [ ] **Step 2: Run and verify it passes immediately**

Run: `node --test tests/salary.test.mjs`
Expected: PASS (20 tests total) — no implementation change needed in this task; it exists purely to lock in that `computeNet` correctly delegates through the new dispatcher.

- [ ] **Step 3: Commit**

```bash
git add tests/salary.test.mjs
git commit -m "Add computeNet regression coverage for the region dispatcher"
```

---

## Task 5: Region-aware currency/locale formatting

**Files:**
- Modify: `js/storage.js` (new `pst_region` key, mirrors the existing `pst_lang` pattern exactly)
- Modify: `js/i18n.js` (`region` state + `buildFormatters()`/`fmtMoneyLive()`)
- Modify: `CLAUDE.md` (document the new storage key)
- Test: `tests/i18n.test.mjs` (new file)

**Interfaces:**
- Produces (`storage.js`): `getRegion()` returns `'DE'|'CH'|null`, `saveRegion(region)`.
- Produces (`i18n.js`): `getRegion()` returns the in-memory region (`'DE'` or `'CH'`, never null), `setRegion(r)` sets and persists it, `buildFormatters()` (already exported, same signature — now also reads the region state).

- [ ] **Step 1: Write the failing test**

Create `tests/i18n.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import * as i18n from '../js/i18n.js';

test('default region is DE', () => {
  assert.equal(i18n.getRegion(), 'DE');
});

test('fmtMoney uses EUR formatting by default', () => {
  i18n.setRegion('DE');
  i18n.setLang('de');
  i18n.buildFormatters();
  var s = i18n.fmtMoney(10);
  assert.ok(s.indexOf('€') >= 0, 'expected € in "' + s + '"');
});

test('fmtMoney switches to CHF formatting when region is CH', () => {
  i18n.setRegion('CH');
  i18n.buildFormatters();
  var s = i18n.fmtMoney(10);
  assert.ok(s.indexOf('CHF') >= 0, 'expected CHF in "' + s + '"');
  i18n.setRegion('DE'); // reset for subsequent tests in this file
  i18n.buildFormatters();
});

test('fmtMoneyLive appends the correct currency for each region', () => {
  i18n.setRegion('DE');
  i18n.buildFormatters();
  assert.ok(i18n.fmtMoneyLive(1.5).indexOf('€') >= 0);
  i18n.setRegion('CH');
  i18n.buildFormatters();
  assert.ok(i18n.fmtMoneyLive(1.5).indexOf('CHF') >= 0);
  i18n.setRegion('DE');
  i18n.buildFormatters();
});

test('setRegion rejects unknown values by falling back to DE', () => {
  i18n.setRegion('XX');
  assert.equal(i18n.getRegion(), 'DE');
});

test('lang and region are independent (Swiss region, English language)', () => {
  i18n.setRegion('CH');
  i18n.setLang('en');
  i18n.buildFormatters();
  assert.equal(i18n.getRegion(), 'CH');
  assert.equal(i18n.getLang(), 'en');
  var s = i18n.fmtMoney(10);
  assert.ok(s.indexOf('CHF') >= 0);
  i18n.setRegion('DE');
  i18n.setLang('de');
  i18n.buildFormatters();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/i18n.test.mjs`
Expected: FAIL — `getRegion`/`setRegion` are not exported from `js/i18n.js`.

- [ ] **Step 3: Implement — `js/storage.js`**

Add the new key near the existing `LS_LANG` declaration:

```js
var LS_REGION = 'pst_region';
```

Add the getter/setter near the existing `getLang`/`saveLang` pair:

```js
export function getRegion() { return lsGet(LS_REGION); }
export function saveRegion(region) { lsSet(LS_REGION, region); }
```

- [ ] **Step 4: Implement — `js/i18n.js`**

Find the existing import line:

```js
import { getLang as storedLang, saveLang } from './storage.js';
```

Replace it with:

```js
import { getLang as storedLang, saveLang, getRegion as storedRegion, saveRegion } from './storage.js';
```

Find the existing `var lang = storedLang() === 'en' ? 'en' : 'de';` line and add directly after it:

```js
var region = storedRegion() === 'CH' ? 'CH' : 'DE';
```

Find `export function getLang() { return lang; }` and add after it:

```js
export function getRegion() { return region; }
export function setRegion(r) {
  region = r === 'CH' ? 'CH' : 'DE';
  saveRegion(region);
}
```

Find the `buildFormatters()` function and replace its first three lines (the `var loc = ...` and `fmt2 = ...` lines) — from:

```js
  var loc = lang === 'en' ? 'en-GB' : 'de-DE';
  fmt2 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR' });
```

to:

```js
  var loc = region === 'CH'
    ? (lang === 'en' ? 'en-CH' : 'de-CH')
    : (lang === 'en' ? 'en-GB' : 'de-DE');
  var currency = region === 'CH' ? 'CHF' : 'EUR';
  fmt2 = new Intl.NumberFormat(loc, { style: 'currency', currency: currency });
```

(Every other line inside `buildFormatters()` — `fmt4`, `dateFmt`, `timeFmt`, etc. — stays exactly as-is; they already read `loc`, which is now region-aware too, so Swiss date/number formatting benefits automatically.)

Find `export function fmtMoneyLive(v) { return fmt4.format(v) + ' €'; }` and replace it with:

```js
export function fmtMoneyLive(v) { return fmt4.format(v) + (region === 'CH' ? ' CHF' : ' €'); }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/i18n.test.mjs`
Expected: PASS (6 tests)

- [ ] **Step 6: Document the new storage key in `CLAUDE.md`**

Find the `pst_lang` line in the `pst_*` key list and add a new line directly after it:

```markdown
  - `pst_region` — `'DE'|'CH'`, drives currency + tax model in `salary.js`/`i18n.js` (default `'DE'` if absent)
```

- [ ] **Step 7: Sanity-check and commit**

```bash
node --check js/storage.js js/i18n.js
node --test tests/i18n.test.mjs tests/salary.test.mjs tests/share.test.mjs
git add js/storage.js js/i18n.js CLAUDE.md tests/i18n.test.mjs
git commit -m "Add region-aware currency/locale formatting (CHF support)"
```

---

## Task 6: Currency-agnostic CSV export header

**Files:**
- Modify: `js/i18n.js` (`csvHeader` DE/EN, `importHint` DE/EN)
- Modify: `js/stats.js` (`csvFromSessions`)
- Test: `tests/stats-csv.test.mjs` (new file)

**Interfaces:**
- Consumes: `getRegion()` from `js/i18n.js` (Task 5).
- Produces: `csvFromSessions(sessions)` — same exported signature as before, header text now reflects the active region's currency.

- [ ] **Step 1: Write the failing test**

Create `tests/stats-csv.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import * as i18n from '../js/i18n.js';
import { csvFromSessions } from '../js/stats.js';

var sampleSessions = [
  { ts: new Date(2026, 0, 1, 10, 0, 0).getTime(), durationMs: 300000, earned: 3.5, rate: 18.46, manual: false, activity: 'poop' }
];

test('csvFromSessions header says EUR when region is DE', () => {
  i18n.setRegion('DE');
  i18n.setLang('de');
  i18n.buildFormatters();
  var csv = csvFromSessions(sampleSessions);
  var header = csv.split('\n')[0];
  assert.ok(header.indexOf('(EUR)') >= 0, header);
  assert.ok(header.indexOf('(CHF)') === -1, header);
});

test('csvFromSessions header says CHF when region is CH', () => {
  i18n.setRegion('CH');
  i18n.buildFormatters();
  var csv = csvFromSessions(sampleSessions);
  var header = csv.split('\n')[0];
  assert.ok(header.indexOf('(CHF)') >= 0, header);
  assert.ok(header.indexOf('(EUR)') === -1, header);
  i18n.setRegion('DE');
  i18n.buildFormatters();
});

test('csvFromSessions data rows are unaffected by region (positional format unchanged)', () => {
  i18n.setRegion('DE');
  i18n.buildFormatters();
  var deCsv = csvFromSessions(sampleSessions);
  i18n.setRegion('CH');
  i18n.buildFormatters();
  var chCsv = csvFromSessions(sampleSessions);
  i18n.setRegion('DE');
  i18n.buildFormatters();
  var deRow = deCsv.split('\n')[1];
  var chRow = chCsv.split('\n')[1];
  assert.equal(deRow, chRow, 'data rows must be identical — only the header label changes');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/stats-csv.test.mjs`
Expected: FAIL — `csvHeader` is currently a plain string always containing "(EUR)", so the CH-region test fails.

- [ ] **Step 3: Implement — `js/i18n.js`**

Find the DE `csvHeader` line:

```js
    csvHeader: 'Datum;Uhrzeit;Dauer (Sekunden);Verdient (EUR);Stundenlohn (EUR);Nachgetragen;Netto (EUR);Abzug (EUR);Aktivität',
```

Replace with:

```js
    csvHeader: function (cur) { return 'Datum;Uhrzeit;Dauer (Sekunden);Verdient (' + cur + ');Stundenlohn (' + cur + ');Nachgetragen;Netto (' + cur + ');Abzug (' + cur + ');Aktivität'; },
```

Find the EN `csvHeader` line:

```js
    csvHeader: 'Date;Time;Duration (seconds);Earned (EUR);Hourly wage (EUR);Backfilled;Net (EUR);Deduction (EUR);Activity',
```

Replace with:

```js
    csvHeader: function (cur) { return 'Date;Time;Duration (seconds);Earned (' + cur + ');Hourly wage (' + cur + ');Backfilled;Net (' + cur + ');Deduction (' + cur + ');Activity'; },
```

Find the DE `importHint` line and remove its two `(EUR)` occurrences:

```js
    importHint: 'Datei auswählen oder CSV-Inhalt unten einfügen. Erwartetes Format wie beim Export: Datum;Uhrzeit;Dauer (Sekunden);Verdient;Stundenlohn;Nachgetragen',
```

Find the EN `importHint` line and do the same:

```js
    importHint: 'Pick a file or paste CSV content below. Expected format matches the export: Date;Time;Duration (seconds);Earned;Hourly wage;Backfilled',
```

(`importHint` stays a plain string — it's rendered through the generic `applyBindings()` mechanism via the `['#import-hint', 'importHint']` entry in `BINDINGS`, which expects a string, not a function. Only `csvHeader` — which has no `BINDINGS` entry and is only ever called directly from `stats.js` — becomes a function.)

- [ ] **Step 4: Implement — `js/stats.js`**

Find the import line at the top of the file:

```js
import { t, getLang, pad } from './i18n.js';
```

Replace with:

```js
import { t, getLang, getRegion, pad } from './i18n.js';
```

Find `export function csvFromSessions(sessions) {` and its first line `var lines = [t('csvHeader')];`. Replace with:

```js
export function csvFromSessions(sessions) {
  var currencyLabel = getRegion() === 'CH' ? 'CHF' : 'EUR';
  var lines = [t('csvHeader')(currencyLabel)];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/stats-csv.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 6: Sanity-check, full regression, and commit**

```bash
node --check js/i18n.js js/stats.js
node --test tests/stats-csv.test.mjs tests/i18n.test.mjs tests/salary.test.mjs tests/share.test.mjs
git add js/i18n.js js/stats.js tests/stats-csv.test.mjs
git commit -m "Make CSV export header currency-aware (EUR/CHF)"
```

---

## Task 7: Currency-agnostic achievement descriptions

**Files:**
- Modify: `js/achievements.js` (4 of 16 achievements: `gold`, `kroesus`, `earned100`, `tax` — the only ones with a literal €-amount in their description)
- Modify: `js/app.js` (one render call site)
- Test: `tests/achievements.test.mjs` (new file)

**Interfaces:**
- Consumes: `fmtMoney` — already imported into `achievements.js` (`import { t, fmtMoney, fmtElapsed } from './i18n.js';`), now also region-aware after Task 5.
- Produces: no change to `ACHIEVEMENTS`'s exported shape or `achVariant()` — only the *type* of `variants[cat].desc.de`/`.en` changes for 4 entries, from `string` to `function(): string`. `js/app.js`'s achievement-rendering call site now needs to handle both.

- [ ] **Step 1: Write the failing test**

Create `tests/achievements.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import * as i18n from '../js/i18n.js';
import { ACHIEVEMENTS, achVariant } from '../js/achievements.js';

function descText(achievementId, cat, lang) {
  var a = ACHIEVEMENTS.find(function (x) { return x.id === achievementId; });
  var v = achVariant(a, cat);
  var raw = v.desc[lang] || v.desc.de;
  return typeof raw === 'function' ? raw() : raw;
}

test('gold/kroesus/earned100/tax descriptions reflect CHF when region is CH', () => {
  i18n.setRegion('CH');
  i18n.buildFormatters();
  ['gold', 'kroesus', 'earned100', 'tax'].forEach(function (id) {
    var text = descText(id, 'poop', 'de');
    assert.ok(text.indexOf('CHF') >= 0, id + ': expected CHF in "' + text + '"');
    assert.ok(text.indexOf('€') === -1, id + ': must not still contain € in "' + text + '"');
  });
  i18n.setRegion('DE');
  i18n.buildFormatters();
});

test('gold/kroesus/earned100/tax descriptions reflect EUR when region is DE', () => {
  ['gold', 'kroesus', 'earned100', 'tax'].forEach(function (id) {
    var text = descText(id, 'poop', 'de');
    assert.ok(text.indexOf('€') >= 0, id + ': expected € in "' + text + '"');
  });
});

test('non-monetary achievement descriptions are still plain strings', () => {
  var a = ACHIEVEMENTS.find(function (x) { return x.id === 'first'; });
  var v = achVariant(a, 'poop');
  assert.equal(typeof v.desc.de, 'string');
});

test('all 16 achievements still have exactly poop/smoke/coffee variants with badge+name+desc', () => {
  assert.equal(ACHIEVEMENTS.length, 16);
  ACHIEVEMENTS.forEach(function (a) {
    ['poop', 'smoke', 'coffee'].forEach(function (cat) {
      var v = achVariant(a, cat);
      assert.ok(v.badge, a.id + '/' + cat + ' missing badge');
      assert.ok(v.name.de && v.name.en, a.id + '/' + cat + ' missing name');
      assert.ok(v.desc.de && v.desc.en, a.id + '/' + cat + ' missing desc');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/achievements.test.mjs`
Expected: FAIL — the CH-region test fails because the 4 achievements' desc strings still hardcode "€".

- [ ] **Step 3: Implement — `js/achievements.js`**

Find the `gold` achievement's `variants` block:

```js
    variants: {
      poop: { badge: '💰', name: { de: 'Goldene Schüssel', en: 'Golden Bowl' }, desc: { de: 'Insgesamt 10 € auf dem Thron verdient.', en: 'Earned €10 in total on the throne.' } },
      smoke: { badge: '💸', name: { de: 'Goldener Aschenbecher', en: 'Golden Ashtray' }, desc: { de: 'Insgesamt 10 € beim Rauchen verdient.', en: 'Earned €10 in total while smoking.' } },
      coffee: { badge: '🪙', name: { de: 'Goldene Kaffeetasse', en: 'Golden Coffee Cup' }, desc: { de: 'Insgesamt 10 € beim Kaffeetrinken verdient.', en: 'Earned €10 in total while drinking coffee.' } }
    },
```

Replace with:

```js
    variants: {
      poop: { badge: '💰', name: { de: 'Goldene Schüssel', en: 'Golden Bowl' }, desc: { de: function () { return 'Insgesamt ' + fmtMoney(10) + ' auf dem Thron verdient.'; }, en: function () { return 'Earned ' + fmtMoney(10) + ' in total on the throne.'; } } },
      smoke: { badge: '💸', name: { de: 'Goldener Aschenbecher', en: 'Golden Ashtray' }, desc: { de: function () { return 'Insgesamt ' + fmtMoney(10) + ' beim Rauchen verdient.'; }, en: function () { return 'Earned ' + fmtMoney(10) + ' in total while smoking.'; } } },
      coffee: { badge: '🪙', name: { de: 'Goldene Kaffeetasse', en: 'Golden Coffee Cup' }, desc: { de: function () { return 'Insgesamt ' + fmtMoney(10) + ' beim Kaffeetrinken verdient.'; }, en: function () { return 'Earned ' + fmtMoney(10) + ' in total while drinking coffee.'; } } }
    },
```

Find the `kroesus` achievement's `variants` block:

```js
    variants: {
      poop: { badge: '👑', name: { de: 'Klo-Krösus', en: 'Throne Tycoon' }, desc: { de: 'Insgesamt 50 € verdient. Der Thron trägt seinen Namen zu Recht.', en: 'Earned €50 in total. The throne earns its name.' } },
      smoke: { badge: '👑', name: { de: 'Qualm-Krösus', en: 'Smoke Tycoon' }, desc: { de: 'Insgesamt 50 € beim Rauchen verdient. Geld geht buchstäblich in Rauch auf — zu deinen Gunsten.', en: 'Earned €50 in total while smoking. Money literally goes up in smoke — in your favor.' } },
      coffee: { badge: '👑', name: { de: 'Kaffee-Krösus', en: 'Coffee Tycoon' }, desc: { de: 'Insgesamt 50 € beim Kaffeetrinken verdient. Teuerste Tasse aller Zeiten — im positiven Sinne.', en: 'Earned €50 in total while drinking coffee. Most valuable cup ever — in a good way.' } }
    },
```

Replace with:

```js
    variants: {
      poop: { badge: '👑', name: { de: 'Klo-Krösus', en: 'Throne Tycoon' }, desc: { de: function () { return 'Insgesamt ' + fmtMoney(50) + ' verdient. Der Thron trägt seinen Namen zu Recht.'; }, en: function () { return 'Earned ' + fmtMoney(50) + ' in total. The throne earns its name.'; } } },
      smoke: { badge: '👑', name: { de: 'Qualm-Krösus', en: 'Smoke Tycoon' }, desc: { de: function () { return 'Insgesamt ' + fmtMoney(50) + ' beim Rauchen verdient. Geld geht buchstäblich in Rauch auf — zu deinen Gunsten.'; }, en: function () { return 'Earned ' + fmtMoney(50) + ' in total while smoking. Money literally goes up in smoke — in your favor.'; } } },
      coffee: { badge: '👑', name: { de: 'Kaffee-Krösus', en: 'Coffee Tycoon' }, desc: { de: function () { return 'Insgesamt ' + fmtMoney(50) + ' beim Kaffeetrinken verdient. Teuerste Tasse aller Zeiten — im positiven Sinne.'; }, en: function () { return 'Earned ' + fmtMoney(50) + ' in total while drinking coffee. Most valuable cup ever — in a good way.'; } } }
    },
```

Find the `earned100` achievement's `variants` block:

```js
    variants: {
      poop: { badge: '🏦', name: { de: 'Thron-Imperium', en: 'Throne Empire' }, desc: { de: 'Insgesamt 100 € auf dem Thron verdient. Ein wahres Imperium.', en: 'Earned €100 in total on the throne. A true empire.' } },
      smoke: { badge: '🏦', name: { de: 'Rauch-Imperium', en: 'Smoke Empire' }, desc: { de: 'Insgesamt 100 € beim Rauchen verdient. Geld geht in Rauch auf — und wieder zurück.', en: 'Earned €100 in total while smoking. Money goes up in smoke — and comes back.' } },
      coffee: { badge: '🏦', name: { de: 'Kaffee-Imperium', en: 'Coffee Empire' }, desc: { de: 'Insgesamt 100 € beim Kaffeetrinken verdient. Ein Imperium aus Bohnen.', en: 'Earned €100 in total while drinking coffee. An empire built on beans.' } }
    },
```

Replace with:

```js
    variants: {
      poop: { badge: '🏦', name: { de: 'Thron-Imperium', en: 'Throne Empire' }, desc: { de: function () { return 'Insgesamt ' + fmtMoney(100) + ' auf dem Thron verdient. Ein wahres Imperium.'; }, en: function () { return 'Earned ' + fmtMoney(100) + ' in total on the throne. A true empire.'; } } },
      smoke: { badge: '🏦', name: { de: 'Rauch-Imperium', en: 'Smoke Empire' }, desc: { de: function () { return 'Insgesamt ' + fmtMoney(100) + ' beim Rauchen verdient. Geld geht in Rauch auf — und wieder zurück.'; }, en: function () { return 'Earned ' + fmtMoney(100) + ' in total while smoking. Money goes up in smoke — and comes back.'; } } },
      coffee: { badge: '🏦', name: { de: 'Kaffee-Imperium', en: 'Coffee Empire' }, desc: { de: function () { return 'Insgesamt ' + fmtMoney(100) + ' beim Kaffeetrinken verdient. Ein Imperium aus Bohnen.'; }, en: function () { return 'Earned ' + fmtMoney(100) + ' in total while drinking coffee. An empire built on beans.'; } } }
    },
```

Find the `tax` achievement's `variants` block:

```js
    variants: {
      poop: { badge: '🧾', name: { de: 'Steuerzahler des Monats', en: 'Taxpayer of the Month' }, desc: { de: 'Insgesamt 10 € an Abzügen „gespendet". Der Finanzminister dankt.', en: 'A total of €10 "donated" in deductions. The treasury thanks you.' } },
      smoke: { badge: '🧾', name: { de: 'Raucher-Steuerzahler', en: 'Smoker Taxpayer' }, desc: { de: 'Insgesamt 10 € an Abzügen beim Rauchen „gespendet". Zusätzlich zur Tabaksteuer.', en: 'A total of €10 "donated" in deductions while smoking. On top of the tobacco tax.' } },
      coffee: { badge: '🧾', name: { de: 'Kaffee-Steuerzahler', en: 'Coffee Taxpayer' }, desc: { de: 'Insgesamt 10 € an Abzügen beim Kaffeetrinken „gespendet". Der Finanzminister freut sich.', en: 'A total of €10 "donated" in deductions while drinking coffee. The treasury is pleased.' } }
    },
```

Replace with:

```js
    variants: {
      poop: { badge: '🧾', name: { de: 'Steuerzahler des Monats', en: 'Taxpayer of the Month' }, desc: { de: function () { return 'Insgesamt ' + fmtMoney(10) + ' an Abzügen „gespendet". Der Finanzminister dankt.'; }, en: function () { return 'A total of ' + fmtMoney(10) + ' "donated" in deductions. The treasury thanks you.'; } } },
      smoke: { badge: '🧾', name: { de: 'Raucher-Steuerzahler', en: 'Smoker Taxpayer' }, desc: { de: function () { return 'Insgesamt ' + fmtMoney(10) + ' an Abzügen beim Rauchen „gespendet". Zusätzlich zur Tabaksteuer.'; }, en: function () { return 'A total of ' + fmtMoney(10) + ' "donated" in deductions while smoking. On top of the tobacco tax.'; } } },
      coffee: { badge: '🧾', name: { de: 'Kaffee-Steuerzahler', en: 'Coffee Taxpayer' }, desc: { de: function () { return 'Insgesamt ' + fmtMoney(10) + ' an Abzügen beim Kaffeetrinken „gespendet". Der Finanzminister freut sich.'; }, en: function () { return 'A total of ' + fmtMoney(10) + ' "donated" in deductions while drinking coffee. The treasury is pleased.'; } } }
    },
```

- [ ] **Step 4: Implement — `js/app.js`**

Find the achievement-rendering line in `renderAchievements`:

```js
      var ds = document.createElement('div'); ds.className = 'desc'; ds.textContent = v.desc[lang] || v.desc.de;
```

Replace with:

```js
      var descRaw = v.desc[lang] || v.desc.de;
      var ds = document.createElement('div'); ds.className = 'desc'; ds.textContent = typeof descRaw === 'function' ? descRaw() : descRaw;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/achievements.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 6: Sanity-check, full regression, and commit**

```bash
node --check js/achievements.js js/app.js
node --test tests/achievements.test.mjs tests/stats-csv.test.mjs tests/i18n.test.mjs tests/salary.test.mjs tests/share.test.mjs
git add js/achievements.js js/app.js tests/achievements.test.mjs
git commit -m "Make gold/kroesus/earned100/tax achievement descriptions currency-aware"
```

---

## Task 8: Manual browser verification (no UI exposure, but full regression)

**Files:** none modified — this task is pure verification that nothing in the existing, currently-shipped UI broke, since `region` defaults to `'DE'` everywhere it isn't explicitly set to `'CH'` by a test.

- [ ] **Step 1: Run the full test suite**

```bash
for f in js/*.js; do node --check "$f" || echo "FAIL: $f"; done
node --test tests/salary.test.mjs tests/i18n.test.mjs tests/stats-csv.test.mjs tests/achievements.test.mjs tests/share.test.mjs
```

Expected: all `node --check` calls silent (no output = success), all test files report 0 failures.

- [ ] **Step 2: Manual browser regression pass**

Serve the app locally (`python3 -m http.server 8934` from the repo root) and, using a fresh `localStorage` (no `pst_region` key set — simulates every existing user):

1. Complete setup with a monthly salary, Steuerklasse 1, no church tax.
2. Start and end a session; confirm the summary shows the correct net/gross split as before.
3. Open the **Erfolge** tab; confirm all 16 achievements render (badges, names, descriptions) with no `[object Object]` or literal `function` text anywhere — this is the concrete failure mode if Step 4 of Task 7 were skipped or wrong.
4. Export CSV from **Verlauf**; open the downloaded file and confirm the header still says `(EUR)` everywhere (not `(CHF)`), matching pre-change behavior.
5. Confirm `Deine Bilanz`, `Dein Geschäftsjahr`, and the CSV import flow all still work exactly as before.

- [ ] **Step 3: Report**

If all of Step 2 matches prior behavior with a default (unset) `region`, this plan is complete: the backend is ready and fully tested, and existing users see zero change. Note in the PR description that the region toggle intentionally does not exist yet — it ships with the first canton(s) in the next plan.

---

## Explicitly out of scope for this plan (tracked, not forgotten)

- Cantonal/communal tax data for Zürich, Zug, Genève (`CH_CANTON_TAX` stays `{}`) — separate research pass, same rigor as Task 1's federal-tax verification.
- The region toggle and canton `<select>` in `index.html`/`js/app.js` — ships with the first canton(s), not before (see Goal section above for why).
- `index.html`'s "... in €" form labels (spec section 3): untouched by this plan. Since there is no way to reach `region==='CH'` through the UI yet, every current user is effectively `region==='DE'` regardless of what's stored, so the existing EUR-only labels remain accurate. These become region-aware as part of the UI task in the next plan, alongside the toggle itself.
- The remaining 23 cantons — follow-up batches after the first three.
- Married/family tariff — single-person tariff only, as decided in the spec.
