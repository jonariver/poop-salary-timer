# Kanton-Toggle-UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Region-Storage konsolidieren (ein einziger Ablageort für `region`/`canton`), Land-Umschalter + Kanton-Dropdown im Setup-Formular bauen, und drei echte, verifizierte Kantone (Zürich, Zug, Genève) in `CH_CANTON_TAX` befüllen — damit ein Nutzer zum ersten Mal tatsächlich `region: 'CH'` erreichen kann.

**Architecture:** `pst_settings` wird der einzige Ablageort für `region`/`canton` (der bisherige separate `pst_region`-Key entfällt ersatzlos, da nie an echte Nutzer ausgeliefert). `i18n.js` behält eine In-Memory-`region`-Variable (gebraucht von vielen Modulen ohne direkten Settings-Zugriff), aber ohne eigene Persistenz — `app.js` hält sie beim Boot und bei jedem Speichern synchron zu `pst_settings.region`. Das Setup-Formular bekommt einen Land-Toggle (Deutschland/Schweiz), der bei Schweiz das Steuerklasse-Feld durch ein Kanton-Dropdown ersetzt (3 auswählbare + 23 sichtbar-aber-deaktivierte Kantone, dynamisch aus `salary.CH_CANTON_TAX` und einer neuen `i18n.CANTON_NAMES`-Tabelle gerendert, damit ein späteres Hinzufügen von Kanton #4 keine UI-Code-Änderung braucht). Drei echte Kantonsdatensätze (Bracket-Tabelle + Gemeinde-Multiplikator je Kanton) sind bereits gegen offizielle Steuerrechner verifiziert (siehe Spec) und werden 1:1 übernommen.

**Tech Stack:** Vanilla ES modules, kein Build-Schritt, kein Framework (siehe `CLAUDE.md`). Tests mit Node's eingebautem Test-Runner (`node --test`).

**Spec:** `docs/superpowers/specs/2026-09-01-canton-toggle-ui-design.md`

## Global Constraints

- Kein Build-Schritt, kein Framework, kein npm/Bundler — reine ES-Module (`CLAUDE.md`).
- Kein Backend, keine Netzwerkaufrufe — alle Berechnung ist lokal/pure.
- `localStorage`-Keys sind ein Kompatibilitäts-Vertrag — **mit einer expliziten, begründeten Ausnahme in diesem Plan**: der `pst_region`-Key entfällt ersatzlos (Task 1), weil er nie über eine UI erreichbar war und daher nie an echte Nutzer ausgeliefert wurde. Alle anderen Keys bleiben unverändert. `pst_settings` bekommt zwei neue optionale Felder (`region`, `canton`) — additiv, kein bestehendes Feld wird umbenannt/entfernt.
- Bestehendes deutsches Verhalten bleibt für Nutzer ohne `region` in ihren gespeicherten Settings unverändert (Default weiterhin `'DE'`, wie im Vorgänger-Plan etabliert).
- `storage.js` bleibt das einzige Modul, das `localStorage` direkt anfasst (`CLAUDE.md`).
- Sanity-Check nach jeder Änderung: `node --check js/<file>.js`.
- Jedes user-facing Feature bekommt einen `js/whatsnew.js`-Eintrag (`CLAUDE.md`) — **anwendbar** auf diesen Plan (Task 5), da hier erstmals echte UI-Exposure für Schweiz-Nutzer entsteht.

---

## Task 1: Storage-Konsolidierung — `region` bekommt einen einzigen Ablageort

**Files:**
- Modify: `js/storage.js` (entfernt `LS_REGION`/`getRegion`/`saveRegion`)
- Modify: `js/i18n.js` (`setRegion` persistiert nicht mehr, Kommentar wird angepasst)
- Modify: `CLAUDE.md` (entfernt die `pst_region`-Zeile)
- Test: `tests/storage.test.mjs` (neue Datei)

**Interfaces:**
- Entfernt: `storage.getRegion()`, `storage.saveRegion(region)` (nie an echte Nutzer ausgeliefert, sicher entfernbar).
- Unverändert (Signatur): `i18n.getRegion()`, `i18n.setRegion(r)` — nur die interne Implementierung von `setRegion` ändert sich (kein `saveRegion()`-Aufruf mehr).

- [ ] **Step 1: Write the failing test**

Erstelle `tests/storage.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import * as storage from '../js/storage.js';

test('storage.js no longer exports getRegion/saveRegion (region lives in pst_settings now)', () => {
  assert.equal(storage.getRegion, undefined);
  assert.equal(storage.saveRegion, undefined);
});

test('storage.js still exports getLang/saveLang unchanged (regression)', () => {
  assert.equal(typeof storage.getLang, 'function');
  assert.equal(typeof storage.saveLang, 'function');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/storage.test.mjs`
Expected: FAIL — `storage.getRegion`/`storage.saveRegion` are currently defined functions, not `undefined`.

- [ ] **Step 3: Implement — `js/storage.js`**

Find:

```js
var LS_LANG = 'pst_lang';
var LS_REGION = 'pst_region';
var LS_ACHIEVEMENTS = 'pst_achievements';
```

Replace with:

```js
var LS_LANG = 'pst_lang';
var LS_ACHIEVEMENTS = 'pst_achievements';
```

Find:

```js
export function getLang() { return lsGet(LS_LANG); }
export function saveLang(lang) { lsSet(LS_LANG, lang); }

export function getRegion() { return lsGet(LS_REGION); }
export function saveRegion(region) { lsSet(LS_REGION, region); }

export function getRawAchievements() { var v = lsGet(LS_ACHIEVEMENTS); return isPlainObject(v) ? v : null; }
```

Replace with:

```js
export function getLang() { return lsGet(LS_LANG); }
export function saveLang(lang) { lsSet(LS_LANG, lang); }

export function getRawAchievements() { var v = lsGet(LS_ACHIEVEMENTS); return isPlainObject(v) ? v : null; }
```

- [ ] **Step 4: Implement — `js/i18n.js`**

Find:

```js
import { getLang as storedLang, saveLang, getRegion as storedRegion, saveRegion } from './storage.js';

var lang = storedLang() === 'en' ? 'en' : 'de';
// NOTE: this in-memory `region` (backed by the separate `pst_region` localStorage key) is NOT
// currently read by js/salary.js's `computeTaxRates`, which expects `region` on its own
// settings-object argument instead — see the comment in salary.js above `computeTaxRates`.
var region = storedRegion() === 'CH' ? 'CH' : 'DE';
```

Replace with:

```js
import { getLang as storedLang, saveLang } from './storage.js';

var lang = storedLang() === 'en' ? 'en' : 'de';
// `region` lives only in memory here — the persisted copy is `pst_settings.region` (read by
// salary.js's computeTaxRates via its settings-object argument). app.js keeps this in-memory
// value synced to pst_settings.region at boot and on every settings save via setRegion(); this
// module does not read or write localStorage for region itself.
var region = 'DE';
```

Find:

```js
export function getRegion() { return region; }
export function setRegion(r) {
  region = r === 'CH' ? 'CH' : 'DE';
  saveRegion(region);
}
```

Replace with:

```js
export function getRegion() { return region; }
export function setRegion(r) {
  region = r === 'CH' ? 'CH' : 'DE';
}
```

- [ ] **Step 5: Implement — `js/salary.js` (comment cleanup only, no behavior change)**

Find:

```js
export var CH_CANTON_TAX = {}; // wird in einem Folge-Schritt mit Kantonsdaten befüllt (siehe Spec Abschnitt 5)

// NOTE: `s.region` here is a field on the settings object passed in by the caller — it is a
// SEPARATE, unreconciled source of truth from the `pst_region` localStorage key that i18n.js
// reads/writes via `getRegion()`/`setRegion()`. Nothing currently keeps them in sync, since no
// UI writes `region` onto `pst_settings` yet. The next plan's region-toggle UI must either write
// `region` into `pst_settings` (mirroring i18n.js's `pst_region`) or otherwise unify the two, or
// a user could see CHF-formatted display numbers computed with German tax brackets (or vice versa).
export function computeTaxRates(s) {
```

Replace with:

```js
export var CH_CANTON_TAX = {}; // wird in Task 2 dieses Plans mit Kantonsdaten befüllt

// `s.region`/`s.canton` come from pst_settings, the single source of truth for region (see
// storage.js / i18n.js — app.js keeps i18n.js's in-memory region synced to this same field).
export function computeTaxRates(s) {
```

(Diese Codezeile `export var CH_CANTON_TAX = {};` wird in Task 2 nochmal ersetzt — hier nur der Kommentar.)

- [ ] **Step 6: Implement — `CLAUDE.md`**

Find:

```
  - `pst_lang` — `'de'|'en'`
  - `pst_region` — `'DE'|'CH'`, drives currency + tax model in `salary.js`/`i18n.js` (default `'DE'` if absent)
  - `pst_achievements` — `{poop:{[achId]:unlockedAtMs}, smoke:{...}, coffee:{...}}` (legacy flat shape auto-migrates on read, see `achievements.js`'s `migrateAchievements`)
```

Replace with:

```
  - `pst_lang` — `'de'|'en'`
  - `pst_achievements` — `{poop:{[achId]:unlockedAtMs}, smoke:{...}, coffee:{...}}` (legacy flat shape auto-migrates on read, see `achievements.js`'s `migrateAchievements`)
```

Find:

```
  - `pst_settings` — `{mode, monthly?, hoursPerWeek?, hourly?, rate, taxClass, church, churchRate, dedLabel}`
```

Replace with:

```
  - `pst_settings` — `{mode, monthly?, hoursPerWeek?, hourly?, rate, taxClass?, church?, churchRate?, dedLabel, region?, canton?}` (`taxClass`/`church`/`churchRate` only meaningful when `region!=='CH'`; `canton` only meaningful when `region==='CH'`; `region` defaults to `'DE'` if absent)
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node --test tests/storage.test.mjs tests/i18n.test.mjs tests/salary.test.mjs tests/stats-csv.test.mjs tests/achievements.test.mjs tests/share.test.mjs`
Expected: PASS, all files, no regressions (the existing `tests/i18n.test.mjs` tests only use `i18n.setRegion`/`i18n.getRegion`, whose public signatures are unchanged, so they should pass unmodified).

- [ ] **Step 8: Sanity-check and commit**

```bash
node --check js/storage.js js/i18n.js js/salary.js
git add js/storage.js js/i18n.js js/salary.js CLAUDE.md tests/storage.test.mjs
git commit -m "Consolidate region storage into pst_settings, remove unused pst_region key"
```

---

## Task 2: Kantonsdaten — Zürich, Zug, Genève in `CH_CANTON_TAX`

**Files:**
- Modify: `js/salary.js` (befüllt `CH_CANTON_TAX`, neue exportierte `computeChCantonalTax`-Funktion)
- Modify: `tests/salary.test.mjs` (korrigiert einen jetzt überholten Test, fügt Golden-Value-Tests hinzu)

**Interfaces:**
- Produces: `computeChCantonalTax(zvE, cantonCode)` — exportiert, direkt testbar (analog zu `computeChFederalTax` aus dem Vorgänger-Plan). Gibt `0` zurück für einen unbekannten/nicht-verfügbaren Kanton-Code.
- `CH_CANTON_TAX` bekommt drei Einträge: `ZH`, `ZG`, `GE`. `computeChTaxRates` (bestehend, unverändert in seiner Signatur) nutzt intern jetzt `computeChCantonalTax` statt der bisherigen Inline-Logik.

- [ ] **Step 1: Write the failing tests**

Zuerst den jetzt überholten Test korrigieren — dieser nahm an, dass ZH noch keine Daten hat, was ab diesem Task nicht mehr stimmt. Finde in `tests/salary.test.mjs`:

```js
test('computeTaxRates: CH branch works with no canton selected (cantonal tax contributes 0)', () => {
  var r = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 6000 });
  var rWithUnknownCanton = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 6000, canton: 'ZH' });
  // ZH isn't in CH_CANTON_TAX yet (next plan adds it) — both must be identical for now.
  assert.deepEqual(r, rWithUnknownCanton);
});
```

Ersetze mit:

```js
test('computeTaxRates: CH branch works with no canton selected (cantonal tax contributes 0)', () => {
  var r = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 6000 });
  var rWithUnavailableCanton = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 6000, canton: 'BE' });
  // BE (Bern) is not yet in CH_CANTON_TAX — both must be identical.
  assert.deepEqual(r, rWithUnavailableCanton);
});
```

Dann am Ende von `tests/salary.test.mjs` anfügen:

```js
import { computeChCantonalTax } from '../js/salary.js';

test('computeChCantonalTax: Zürich matches the official ESTV Steuerrechner (Stadt Zürich, 2026)', () => {
  var cases = [[80000, 9351.80], [150000, 23807.50]];
  cases.forEach(function (c) {
    var zvE = c[0], expected = c[1];
    var actual = computeChCantonalTax(zvE, 'ZH');
    assert.ok(Math.abs(actual - expected) < 1, 'zvE=' + zvE + ': expected ~' + expected + ', got ' + actual);
  });
});

test('computeChCantonalTax: Zug matches the official Kanton-Zug Steuerrechner (Stadt Zug, 2026)', () => {
  var cases = [[80000, 5109.65], [150000, 13434.85]];
  cases.forEach(function (c) {
    var zvE = c[0], expected = c[1];
    var actual = computeChCantonalTax(zvE, 'ZG');
    assert.ok(Math.abs(actual - expected) < 1, 'zvE=' + zvE + ': expected ~' + expected + ', got ' + actual);
  });
});

test('computeChCantonalTax: Genève matches the official AFC-GE barème at verified bracket boundaries (Ville de Genève, 2025)', () => {
  // Base-tax values (before the combined multiplier) verified to the cent against the official
  // AFC-GE cumulative tariff table at these exact bracket-boundary incomes; multiplied here by
  // the independently-derived Ville-de-Genève combined multiplier (1.7629).
  var cases = [[48309, 5536.21], [77518, 12333.25]];
  cases.forEach(function (c) {
    var zvE = c[0], expected = c[1];
    var actual = computeChCantonalTax(zvE, 'GE');
    assert.ok(Math.abs(actual - expected) < 1, 'zvE=' + zvE + ': expected ~' + expected + ', got ' + actual);
  });
});

test('computeChCantonalTax: unavailable canton returns 0', () => {
  assert.equal(computeChCantonalTax(80000, 'BE'), 0);
  assert.equal(computeChCantonalTax(80000, undefined), 0);
});

test('computeTaxRates: selecting an available canton increases lst vs. no canton', () => {
  var noCanton = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 6000 });
  var withZh = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 6000, canton: 'ZH' });
  assert.ok(withZh.lst > noCanton.lst);
  assert.ok(withZh.total <= 0.9);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/salary.test.mjs`
Expected: FAIL — `computeChCantonalTax` is not exported yet; the corrected "no canton" test still passes (BE was already absent before this task) but the new golden-value tests fail with a TypeError (not a function).

- [ ] **Step 3: Implement**

Find (this is the line Task 1's Step 5 left in place):

```js
export var CH_CANTON_TAX = {}; // wird in Task 2 dieses Plans mit Kantonsdaten befüllt
```

Replace with:

```js
export var CH_CANTON_TAX = {
  ZH: {
    taxModelYear: 2026,
    referenceMunicipality: 'Stadt Zürich',
    brackets: [
      { upTo: 7000, rate: 0 }, { upTo: 12000, rate: 0.02 }, { upTo: 16800, rate: 0.03 },
      { upTo: 24800, rate: 0.04 }, { upTo: 34500, rate: 0.05 }, { upTo: 45700, rate: 0.06 },
      { upTo: 58800, rate: 0.07 }, { upTo: 76400, rate: 0.08 }, { upTo: 110400, rate: 0.09 },
      { upTo: 144100, rate: 0.10 }, { upTo: 197400, rate: 0.11 }, { upTo: 266700, rate: 0.12 },
      { upTo: Infinity, rate: 0.13 }
    ],
    gemeindeMultiplier: 2.14 // Kantonssteuerfuss 95% + Stadt Zürich Gemeindesteuerfuss 119%
  },
  ZG: {
    taxModelYear: 2026,
    referenceMunicipality: 'Stadt Zug',
    brackets: [
      { upTo: 1100, rate: 0.005 }, { upTo: 3300, rate: 0.01 }, { upTo: 6100, rate: 0.02 },
      { upTo: 10100, rate: 0.03 }, { upTo: 15300, rate: 0.0325 }, { upTo: 21100, rate: 0.035 },
      { upTo: 26900, rate: 0.04 }, { upTo: 34900, rate: 0.045 }, { upTo: 46400, rate: 0.055 },
      { upTo: 59700, rate: 0.055 }, { upTo: 74700, rate: 0.065 }, { upTo: 94800, rate: 0.08 },
      { upTo: 120100, rate: 0.10 }, { upTo: 149900, rate: 0.09 }, { upTo: Infinity, rate: 0.08 }
    ],
    gemeindeMultiplier: 1.30 // Kantonssteuerfuss 78% + Stadt Zug Gemeindesteuerfuss 52%
  },
  GE: {
    taxModelYear: 2025, // 2026er Kantonsbarème noch nicht publiziert (ge.ch/document/.../2026 → 404, geprüft)
    referenceMunicipality: 'Ville de Genève',
    brackets: [
      { upTo: 18649, rate: 0.000 }, { upTo: 22469, rate: 0.073 }, { upTo: 24716, rate: 0.082 },
      { upTo: 26962, rate: 0.091 }, { upTo: 29210, rate: 0.100 }, { upTo: 34827, rate: 0.109 },
      { upTo: 39320, rate: 0.113 }, { upTo: 43815, rate: 0.123 }, { upTo: 48309, rate: 0.128 },
      { upTo: 77518, rate: 0.132 }, { upTo: 126950, rate: 0.142 }, { upTo: 170764, rate: 0.150 },
      { upTo: 193234, rate: 0.156 }, { upTo: 276369, rate: 0.158 }, { upTo: 294345, rate: 0.160 },
      { upTo: 414554, rate: 0.168 }, { upTo: 649355, rate: 0.176 }, { upTo: Infinity, rate: 0.180 }
    ],
    // Genf-Mechanik strukturell anders als ZH/ZG: kein einfacher Kanton%+Gemeinde%-Steuerfuss,
    // sondern eine Kette gesetzlicher Zuschläge/Rabatte, die sich linear zu einem Multiplikator
    // zusammenfassen lässt: (1.475 kantonaler Zuschlag × 0.88 gesetzlicher 12%-Rabatt + 0.01
    // Pflegezuschlag) + 0.4549 Gemeinde-Centimes Ville de Genève = 1.7629
    gemeindeMultiplier: 1.7629
  }
};

export function computeChCantonalTax(zvE, cantonCode) {
  var canton = CH_CANTON_TAX[cantonCode];
  return canton ? computeBracketTax(zvE, canton.brackets) * canton.gemeindeMultiplier : 0;
}
```

Find (inside `computeChTaxRates`):

```js
  var federalTax = computeChFederalTax(zvE);
  var canton = CH_CANTON_TAX[s.canton];
  var cantonalTax = canton ? computeBracketTax(zvE, canton.brackets) * canton.gemeindeMultiplier : 0;
  var lstAnnual = federalTax + cantonalTax;
```

Replace with:

```js
  var federalTax = computeChFederalTax(zvE);
  var cantonalTax = computeChCantonalTax(zvE, s.canton);
  var lstAnnual = federalTax + cantonalTax;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/salary.test.mjs`
Expected: PASS (25 tests total: 20 existing + 5 new, with the one corrected test still counted among the 20)

- [ ] **Step 5: Sanity-check, full regression, and commit**

```bash
node --check js/salary.js
node --test tests/salary.test.mjs tests/i18n.test.mjs tests/storage.test.mjs tests/stats-csv.test.mjs tests/achievements.test.mjs tests/share.test.mjs
git add js/salary.js tests/salary.test.mjs
git commit -m "Populate CH_CANTON_TAX with verified Zürich, Zug, and Genève data"
```

---

## Task 3: Schweiz-Inhalte — Übersetzungen, Kantonsnamen, `FUND_RATES_CH`

**Files:**
- Modify: `js/salary.js` (`FUND_RATES_CH`)
- Modify: `js/i18n.js` (neue `STR`-Einträge DE/EN, neue `CANTON_NAMES`-Tabelle)
- Modify: `tests/salary.test.mjs`, `tests/i18n.test.mjs`

**Interfaces:**
- Produces: `salary.FUND_RATES_CH` — Array von 3 Zahlen, gleiche Bedeutung/Reihenfolge wie `FUND_RATES` (CHF pro Sekunde), konsumiert von Task 4's `app.js`-Änderungen.
- Produces: `i18n.CANTON_NAMES` — `{ [cantonCode]: { de: string, en: string } }`, alle 26 Kantone, konsumiert von Task 4's Kanton-Dropdown-Rendering.
- Produces: neue `STR`-Keys `taxHintCh`, `fundedItemsCh`, `lblMonthlyCh`, `lblRateCh`, `lblKanton`, `landDe`, `landCh`, `kantonComingSoon` (DE + EN), konsumiert von Task 4.

- [ ] **Step 1: Write the failing tests**

Am Ende von `tests/salary.test.mjs` anfügen:

```js
import { FUND_RATES_CH } from '../js/salary.js';

test('FUND_RATES_CH has 3 positive, ascending, finite rates (mirrors FUND_RATES shape)', () => {
  assert.equal(FUND_RATES_CH.length, 3);
  FUND_RATES_CH.forEach(function (r) { assert.ok(isFinite(r) && r > 0); });
  assert.ok(FUND_RATES_CH[0] < FUND_RATES_CH[1]);
  assert.ok(FUND_RATES_CH[1] < FUND_RATES_CH[2]);
});
```

Am Ende von `tests/i18n.test.mjs` anfügen:

```js
test('CANTON_NAMES has all 26 cantons with non-empty de/en names, including the 3 available ones', () => {
  var codes = Object.keys(i18n.CANTON_NAMES);
  assert.equal(codes.length, 26);
  codes.forEach(function (code) {
    var n = i18n.CANTON_NAMES[code];
    assert.ok(n.de && n.de.length > 0, code + ' missing de name');
    assert.ok(n.en && n.en.length > 0, code + ' missing en name');
  });
  assert.equal(i18n.CANTON_NAMES.ZH.de, 'Zürich');
  assert.equal(i18n.CANTON_NAMES.ZG.de, 'Zug');
  assert.equal(i18n.CANTON_NAMES.GE.de, 'Genève');
});

test('taxHintCh and fundedItemsCh are distinct CH-specific content, not the DE strings', () => {
  i18n.setLang('de');
  assert.notEqual(i18n.t('taxHintCh'), i18n.t('taxHint'));
  assert.ok(i18n.t('taxHintCh').indexOf('€') === -1, 'CH tax hint must not mention €');
  var itemsCh = i18n.t('fundedItemsCh');
  var itemsDe = i18n.t('fundedItems');
  assert.equal(itemsCh.length, 3);
  assert.notDeepEqual(itemsCh, itemsDe);
});

test('lblMonthlyCh and lblRateCh mention CHF, not €', () => {
  i18n.setLang('de');
  assert.ok(i18n.t('lblMonthlyCh').indexOf('CHF') >= 0);
  assert.ok(i18n.t('lblMonthlyCh').indexOf('€') === -1);
  assert.ok(i18n.t('lblRateCh').indexOf('CHF') >= 0);
  assert.ok(i18n.t('lblRateCh').indexOf('€') === -1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/salary.test.mjs tests/i18n.test.mjs`
Expected: FAIL — `FUND_RATES_CH` is not exported; `i18n.CANTON_NAMES`/`taxHintCh`/`fundedItemsCh`/`lblMonthlyCh`/`lblRateCh` are `undefined`.

- [ ] **Step 3: Implement — `js/salary.js`**

Find:

```js
// "Damit finanziert": Euro pro Sekunde der Referenzgrößen (grobe Werte, siehe Disclaimer)
export var FUND_RATES = [563 / 2592000, 60000 / 31536000, 8000000000 / 31536000];
```

Replace with:

```js
// "Damit finanziert": Euro pro Sekunde der Referenzgrößen (grobe Werte, siehe Disclaimer)
export var FUND_RATES = [563 / 2592000, 60000 / 31536000, 8000000000 / 31536000];

// "Damit finanziert" (Schweiz): Franken pro Sekunde der Referenzgrößen (grobe Werte, siehe Disclaimer).
// Quellen: SKOS-Grundbedarf-Richtlinie (in Kraft seit 1.1.2025), VPOD-NGO-Lohnstudie 2022
// (Median-Bereich CHF 73'176–104'400/Jahr, hier gerundet), EDA-Länderprogramm Ukraine 2025–2028
// (für 2026 reserviertes Jahresbudget).
export var FUND_RATES_CH = [1061 / 2592000, 80000 / 31536000, 342250000 / 31536000];
```

- [ ] **Step 4: Implement — `js/i18n.js` (DE-Block)**

Find:

```js
    fundedItems: ['Bürgergeld-Regelsatz (1 Person)', 'NGO-Projektstelle', 'Ukraine-Hilfe (Deutschland gesamt)'],
```

Replace with:

```js
    fundedItems: ['Bürgergeld-Regelsatz (1 Person)', 'NGO-Projektstelle', 'Ukraine-Hilfe (Deutschland gesamt)'],
    taxHintCh: 'Vereinfachte Näherung (Bundes- und Kantonssteuer-Schätzung + AHV/IV/EO, ALV und BVG), keine amtliche Steuerrechnung. Krankenkassenprämien sind in der Schweiz kein Lohnabzug und daher nicht enthalten. Gemeindesteuerfuss der Kantonshauptstadt — deine tatsächliche Gemeinde kann abweichen. Beim Stundenlohn-Modus wird eine 40-Stunden-Woche angenommen, falls keine Wochenstunden bekannt sind.',
    fundedItemsCh: ['Sozialhilfe-Grundbedarf (1 Person)', 'NGO-Projektstelle', 'Ukraine-Hilfe (Schweiz gesamt)'],
    lblMonthlyCh: 'Monatslohn (brutto oder netto — deine Wahl) in CHF',
    lblRateCh: 'Stundenlohn in CHF',
    lblKanton: 'Kanton',
    landDe: 'Deutschland',
    landCh: 'Schweiz',
    kantonComingSoon: 'bald verfügbar',
```

- [ ] **Step 5: Implement — `js/i18n.js` (EN-Block)**

Find:

```js
    fundedItems: ["Citizen's benefit rate (1 person)", 'NGO project position', 'Ukraine aid (Germany total)'],
```

Replace with:

```js
    fundedItems: ["Citizen's benefit rate (1 person)", 'NGO project position', 'Ukraine aid (Germany total)'],
    taxHintCh: 'Simplified approximation (federal and cantonal tax estimate + AHV/IV/EO, ALV, and BVG), not an official tax calculation. Health insurance premiums are not a payroll deduction in Switzerland, so they are not included. Communal tax rate of the canton\'s capital — your actual municipality may differ. In hourly mode a 40-hour week is assumed if no weekly hours are known.',
    fundedItemsCh: ['Social assistance basic rate (1 person)', 'NGO project position', 'Ukraine aid (Switzerland total)'],
    lblMonthlyCh: 'Monthly salary (gross or net — your call) in CHF',
    lblRateCh: 'Hourly wage in CHF',
    lblKanton: 'Canton',
    landDe: 'Germany',
    landCh: 'Switzerland',
    kantonComingSoon: 'coming soon',
```

- [ ] **Step 6: Implement — `js/i18n.js` (`CANTON_NAMES`-Tabelle)**

Find:

```js
export function t(key) { return (STR[lang] && STR[lang][key] !== undefined ? STR[lang] : STR.de)[key]; }
```

Replace with:

```js
export var CANTON_NAMES = {
  ZH: { de: 'Zürich', en: 'Zurich' },
  ZG: { de: 'Zug', en: 'Zug' },
  GE: { de: 'Genève', en: 'Geneva' },
  AG: { de: 'Aargau', en: 'Aargau' },
  AI: { de: 'Appenzell Innerrhoden', en: 'Appenzell Innerrhoden' },
  AR: { de: 'Appenzell Ausserrhoden', en: 'Appenzell Ausserrhoden' },
  BE: { de: 'Bern', en: 'Bern' },
  BL: { de: 'Basel-Landschaft', en: 'Basel-Landschaft' },
  BS: { de: 'Basel-Stadt', en: 'Basel-Stadt' },
  FR: { de: 'Freiburg', en: 'Fribourg' },
  GL: { de: 'Glarus', en: 'Glarus' },
  GR: { de: 'Graubünden', en: 'Grisons' },
  JU: { de: 'Jura', en: 'Jura' },
  LU: { de: 'Luzern', en: 'Lucerne' },
  NE: { de: 'Neuenburg', en: 'Neuchâtel' },
  NW: { de: 'Nidwalden', en: 'Nidwalden' },
  OW: { de: 'Obwalden', en: 'Obwalden' },
  SG: { de: 'St. Gallen', en: 'St. Gallen' },
  SH: { de: 'Schaffhausen', en: 'Schaffhausen' },
  SO: { de: 'Solothurn', en: 'Solothurn' },
  SZ: { de: 'Schwyz', en: 'Schwyz' },
  TG: { de: 'Thurgau', en: 'Thurgau' },
  TI: { de: 'Tessin', en: 'Ticino' },
  UR: { de: 'Uri', en: 'Uri' },
  VD: { de: 'Waadt', en: 'Vaud' },
  VS: { de: 'Wallis', en: 'Valais' }
};

export function t(key) { return (STR[lang] && STR[lang][key] !== undefined ? STR[lang] : STR.de)[key]; }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node --test tests/salary.test.mjs tests/i18n.test.mjs`
Expected: PASS — `tests/salary.test.mjs` has 26 tests (25 from Task 2 + 1 new), `tests/i18n.test.mjs` has 9 tests (6 existing + 3 new), all green, no existing test broken.

- [ ] **Step 8: Sanity-check, full regression, and commit**

```bash
node --check js/salary.js js/i18n.js
node --test tests/salary.test.mjs tests/i18n.test.mjs tests/storage.test.mjs tests/stats-csv.test.mjs tests/achievements.test.mjs tests/share.test.mjs
git add js/salary.js js/i18n.js tests/salary.test.mjs tests/i18n.test.mjs
git commit -m "Add Swiss-specific content (tax hint, funded items, canton names) and FUND_RATES_CH"
```

---

## Task 4: Setup-Formular-UI — Land-Toggle, Kanton-Dropdown, region-aware Labels

**Files:**
- Modify: `index.html` (Land-Toggle-Markup, Kanton-Feld-Markup, neue IDs)
- Modify: `js/i18n.js` (`BINDINGS`-Array: 3 Einträge entfernt, 4 hinzugefügt)
- Modify: `js/app.js` (Land-State, `renderLandSwitch()`, `renderKantonOptions()`, Save/Fill-Handler, region-aware Funded-Items)

**Interfaces:**
- Consumes: `salary.CH_CANTON_TAX` (Task 2, für Verfügbarkeits-Check im Dropdown), `salary.FUND_RATES_CH` (Task 3), `i18n.CANTON_NAMES` + neue `STR`-Keys (Task 3).
- Kein automatisierter Test in diesem Task (kein DOM-Test-Harness im Repo, siehe `CLAUDE.md` — UI-Verhalten wird in Task 6 manuell verifiziert). `node --check` + vollständige bestehende Test-Suite als Regressions-Absicherung.

- [ ] **Step 1: Implement — `index.html`**

Find (der gesamte Setup-Formular-Block):

```html
    <h2 class="section">Was verdienst du eigentlich?</h2>
    <div class="mode-switch" role="group" aria-label="Eingabemodus">
      <button id="mode-monthly" aria-pressed="true">Monatslohn</button>
      <button id="mode-hourly" aria-pressed="false">Stundenlohn</button>
    </div>
    <div id="fields-monthly">
      <div class="field">
        <label for="inp-monthly">Monatslohn (brutto oder netto — deine Wahl) in €</label>
        <input id="inp-monthly" type="number" inputmode="decimal" min="0" step="50" placeholder="z. B. 3200">
      </div>
      <div class="field">
        <label for="inp-hours">Arbeitsstunden pro Woche</label>
        <input id="inp-hours" type="number" inputmode="decimal" min="1" max="100" step="0.5" placeholder="z. B. 40">
      </div>
    </div>
    <div id="fields-hourly" class="hidden">
      <div class="field">
        <label for="inp-rate">Stundenlohn in €</label>
        <input id="inp-rate" type="number" inputmode="decimal" min="0" step="0.5" placeholder="z. B. 18,50">
      </div>
    </div>
    <div class="tax-section">
      <h3 id="tax-title">Netto-Schätzung (optional) 🧾</h3>
      <div class="field">
        <label for="inp-taxclass" id="lbl-taxclass">Steuerklasse</label>
        <select id="inp-taxclass">
          <option value="">– (nur Brutto)</option>
          <option value="1">I</option>
          <option value="2">II</option>
          <option value="3">III</option>
          <option value="4">IV</option>
          <option value="5">V</option>
          <option value="6">VI</option>
        </select>
      </div>
      <div class="check-row">
        <input type="checkbox" id="inp-church">
        <label for="inp-church" id="lbl-church">Kirchensteuer</label>
        <select id="inp-church-rate">
          <option value="9">9 %</option>
          <option value="8">8 %</option>
        </select>
      </div>
      <div class="field">
        <label for="inp-dedlabel" id="lbl-dedlabel">Überschrift für den Abzugsblock</label>
        <input id="inp-dedlabel" type="text" maxlength="60" placeholder="Davon schnappt sich der Staat:">
      </div>
      <p class="tax-hint" id="tax-hint">Vereinfachte Näherung (Steuertarif-Schätzung + pauschal 20,5 % Sozialabgaben), keine amtliche Lohnsteuertabelle. Beim Stundenlohn-Modus wird eine 40-Stunden-Woche angenommen, falls keine Wochenstunden bekannt sind.</p>
    </div>
```

Replace with:

```html
    <h2 class="section">Was verdienst du eigentlich?</h2>
    <div class="mode-switch land-switch" id="land-switch" role="group" aria-label="Land">
      <button id="land-de" aria-pressed="true">Deutschland</button>
      <button id="land-ch" aria-pressed="false">Schweiz</button>
    </div>
    <div class="mode-switch" role="group" aria-label="Eingabemodus">
      <button id="mode-monthly" aria-pressed="true">Monatslohn</button>
      <button id="mode-hourly" aria-pressed="false">Stundenlohn</button>
    </div>
    <div id="fields-monthly">
      <div class="field">
        <label for="inp-monthly" id="lbl-monthly">Monatslohn (brutto oder netto — deine Wahl) in €</label>
        <input id="inp-monthly" type="number" inputmode="decimal" min="0" step="50" placeholder="z. B. 3200">
      </div>
      <div class="field">
        <label for="inp-hours">Arbeitsstunden pro Woche</label>
        <input id="inp-hours" type="number" inputmode="decimal" min="1" max="100" step="0.5" placeholder="z. B. 40">
      </div>
    </div>
    <div id="fields-hourly" class="hidden">
      <div class="field">
        <label for="inp-rate" id="lbl-rate">Stundenlohn in €</label>
        <input id="inp-rate" type="number" inputmode="decimal" min="0" step="0.5" placeholder="z. B. 18,50">
      </div>
    </div>
    <div class="tax-section">
      <h3 id="tax-title">Netto-Schätzung (optional) 🧾</h3>
      <div class="field" id="field-taxclass">
        <label for="inp-taxclass" id="lbl-taxclass">Steuerklasse</label>
        <select id="inp-taxclass">
          <option value="">– (nur Brutto)</option>
          <option value="1">I</option>
          <option value="2">II</option>
          <option value="3">III</option>
          <option value="4">IV</option>
          <option value="5">V</option>
          <option value="6">VI</option>
        </select>
      </div>
      <div class="field hidden" id="field-kanton">
        <label for="inp-kanton" id="lbl-kanton">Kanton</label>
        <select id="inp-kanton">
          <option value="">– (nur Brutto)</option>
        </select>
      </div>
      <div class="check-row" id="row-church">
        <input type="checkbox" id="inp-church">
        <label for="inp-church" id="lbl-church">Kirchensteuer</label>
        <select id="inp-church-rate">
          <option value="9">9 %</option>
          <option value="8">8 %</option>
        </select>
      </div>
      <div class="field">
        <label for="inp-dedlabel" id="lbl-dedlabel">Überschrift für den Abzugsblock</label>
        <input id="inp-dedlabel" type="text" maxlength="60" placeholder="Davon schnappt sich der Staat:">
      </div>
      <p class="tax-hint" id="tax-hint">Vereinfachte Näherung (Steuertarif-Schätzung + pauschal 20,5 % Sozialabgaben), keine amtliche Lohnsteuertabelle. Beim Stundenlohn-Modus wird eine 40-Stunden-Woche angenommen, falls keine Wochenstunden bekannt sind.</p>
    </div>
```

- [ ] **Step 2: Implement — `js/i18n.js` (`BINDINGS`-Array)**

Find:

```js
  ['label[for="inp-monthly"]', 'lblMonthly'],
  ['label[for="inp-hours"]', 'lblHours'],
  ['label[for="inp-rate"]', 'lblRate'],
```

Replace with:

```js
  ['label[for="inp-hours"]', 'lblHours'],
```

(`lblMonthly`/`lblRate` sind jetzt region-abhängig — `app.js`'s `renderLandSwitch()` setzt sie direkt, nicht mehr `applyBindings()`.)

Find:

```js
  ['#lbl-taxclass', 'lblTaxClass'],
  ['#inp-taxclass option[value=""]', 'taxNone'],
  ['#lbl-church', 'lblChurch'],
```

Replace with:

```js
  ['#lbl-taxclass', 'lblTaxClass'],
  ['#inp-taxclass option[value=""]', 'taxNone'],
  ['#inp-kanton option[value=""]', 'taxNone'],
  ['#lbl-kanton', 'lblKanton'],
  ['#land-de', 'landDe'],
  ['#land-ch', 'landCh'],
  ['#lbl-church', 'lblChurch'],
```

Find:

```js
  ['#inp-dedlabel', 'dedLabelDefault', 'placeholder'],
  ['#tax-hint', 'taxHint'],
  ['#stat-k-net', 'statKNet'],
```

Replace with:

```js
  ['#inp-dedlabel', 'dedLabelDefault', 'placeholder'],
  ['#stat-k-net', 'statKNet'],
```

(`taxHint` ist jetzt region-abhängig — `renderLandSwitch()` setzt `#tax-hint` direkt.)

- [ ] **Step 3: Implement — `js/app.js` (Boot-Zeit Region-Sync)**

Find:

```js
  // ---------- Settings ----------
  var settings = storage.getSettings(); // {mode:'monthly'|'hourly', monthly, hoursPerWeek, hourly, rate}
```

Replace with:

```js
  // ---------- Settings ----------
  var settings = storage.getSettings(); // {mode:'monthly'|'hourly', monthly, hoursPerWeek, hourly, rate}
  i18n.setRegion(settings ? settings.region : 'DE'); // hält i18n.js's In-Memory-region synchron, bevor irgendwo formatiert wird
```

- [ ] **Step 4: Implement — `js/app.js` (Land-Toggle + Kanton-Dropdown)**

Find:

```js
  // ---------- Setup form ----------
  var mode = (settings && settings.mode) || 'monthly';
  function renderModeSwitch() {
    $('mode-monthly').setAttribute('aria-pressed', String(mode === 'monthly'));
    $('mode-hourly').setAttribute('aria-pressed', String(mode === 'hourly'));
    $('fields-monthly').classList.toggle('hidden', mode !== 'monthly');
    $('fields-hourly').classList.toggle('hidden', mode !== 'hourly');
    updateDerived();
  }
  $('mode-monthly').addEventListener('click', function () { mode = 'monthly'; renderModeSwitch(); });
  $('mode-hourly').addEventListener('click', function () { mode = 'hourly'; renderModeSwitch(); });
```

Replace with:

```js
  // ---------- Setup form ----------
  var mode = (settings && settings.mode) || 'monthly';
  function renderModeSwitch() {
    $('mode-monthly').setAttribute('aria-pressed', String(mode === 'monthly'));
    $('mode-hourly').setAttribute('aria-pressed', String(mode === 'hourly'));
    $('fields-monthly').classList.toggle('hidden', mode !== 'monthly');
    $('fields-hourly').classList.toggle('hidden', mode !== 'hourly');
    updateDerived();
  }
  $('mode-monthly').addEventListener('click', function () { mode = 'monthly'; renderModeSwitch(); });
  $('mode-hourly').addEventListener('click', function () { mode = 'hourly'; renderModeSwitch(); });

  var land = (settings && settings.region) || 'DE';
  function renderKantonOptions() {
    var sel = $('inp-kanton');
    var prevValue = sel.value;
    while (sel.options.length > 1) sel.remove(1); // Option 0 ("– (nur Brutto)") bleibt erhalten
    var available = Object.keys(salary.CH_CANTON_TAX);
    available.forEach(function (code) {
      var opt = document.createElement('option');
      opt.value = code;
      opt.textContent = i18n.CANTON_NAMES[code][i18n.getLang()] + ' (' + code + ')';
      sel.appendChild(opt);
    });
    var divider = document.createElement('option');
    divider.disabled = true;
    divider.textContent = '──────────';
    sel.appendChild(divider);
    Object.keys(i18n.CANTON_NAMES)
      .filter(function (code) { return available.indexOf(code) === -1; })
      .sort(function (a, b) { return i18n.CANTON_NAMES[a][i18n.getLang()].localeCompare(i18n.CANTON_NAMES[b][i18n.getLang()]); })
      .forEach(function (code) {
        var opt = document.createElement('option');
        opt.value = code;
        opt.disabled = true;
        opt.textContent = i18n.CANTON_NAMES[code][i18n.getLang()] + ' — ' + t('kantonComingSoon');
        sel.appendChild(opt);
      });
    sel.value = prevValue;
  }
  function renderLandSwitch() {
    $('land-de').setAttribute('aria-pressed', String(land === 'DE'));
    $('land-ch').setAttribute('aria-pressed', String(land === 'CH'));
    $('field-taxclass').classList.toggle('hidden', land !== 'DE');
    $('row-church').classList.toggle('hidden', land !== 'DE');
    $('field-kanton').classList.toggle('hidden', land !== 'CH');
    $('lbl-monthly').textContent = land === 'CH' ? t('lblMonthlyCh') : t('lblMonthly');
    $('lbl-rate').textContent = land === 'CH' ? t('lblRateCh') : t('lblRate');
    $('tax-hint').textContent = land === 'CH' ? t('taxHintCh') : t('taxHint');
    renderKantonOptions();
  }
  $('land-de').addEventListener('click', function () { land = 'DE'; renderLandSwitch(); });
  $('land-ch').addEventListener('click', function () { land = 'CH'; renderLandSwitch(); });
```

- [ ] **Step 5: Implement — `js/app.js` (`fillSetupForm`)**

Find:

```js
  function fillSetupForm() {
    if (!settings) return;
    mode = settings.mode || mode;
    if (settings.monthly) $('inp-monthly').value = settings.monthly;
    if (settings.hoursPerWeek) $('inp-hours').value = settings.hoursPerWeek;
    if (settings.hourly) $('inp-rate').value = settings.hourly;
    $('inp-taxclass').value = settings.taxClass || '';
    $('inp-church').checked = !!settings.church;
    $('inp-church-rate').value = String(Number(settings.churchRate) === 8 ? 8 : 9);
    $('inp-dedlabel').value = settings.dedLabel || '';
    renderModeSwitch();
  }
```

Replace with:

```js
  function fillSetupForm() {
    if (!settings) return;
    mode = settings.mode || mode;
    land = settings.region || land;
    if (settings.monthly) $('inp-monthly').value = settings.monthly;
    if (settings.hoursPerWeek) $('inp-hours').value = settings.hoursPerWeek;
    if (settings.hourly) $('inp-rate').value = settings.hourly;
    $('inp-taxclass').value = settings.taxClass || '';
    $('inp-church').checked = !!settings.church;
    $('inp-church-rate').value = String(Number(settings.churchRate) === 8 ? 8 : 9);
    $('inp-dedlabel').value = settings.dedLabel || '';
    renderModeSwitch();
    renderLandSwitch();
    $('inp-kanton').value = settings.canton || '';
  }
```

- [ ] **Step 6: Implement — `js/app.js` (Save-Handler)**

Find:

```js
    err.style.display = 'none';
    s.rate = salary.computeRate(s);
    s.taxClass = $('inp-taxclass').value || null;
    s.church = $('inp-church').checked;
    s.churchRate = Number($('inp-church-rate').value) === 8 ? 8 : 9;
    s.dedLabel = $('inp-dedlabel').value.trim();
    settings = s;
    storage.saveSettings(s);
    renderRateChip();
    show('timer');
    renderTimer();
```

Replace with:

```js
    err.style.display = 'none';
    s.rate = salary.computeRate(s);
    s.region = land;
    s.taxClass = land === 'DE' ? ($('inp-taxclass').value || null) : null;
    s.church = land === 'DE' ? $('inp-church').checked : false;
    s.churchRate = Number($('inp-church-rate').value) === 8 ? 8 : 9;
    s.canton = land === 'CH' ? ($('inp-kanton').value || null) : null;
    s.dedLabel = $('inp-dedlabel').value.trim();
    settings = s;
    storage.saveSettings(s);
    i18n.setRegion(land);
    i18n.buildFormatters();
    renderRateChip();
    show('timer');
    renderTimer();
```

- [ ] **Step 7: Implement — `js/app.js` (region-aware Funded-Items in `renderSummary`)**

Find:

```js
    $('funded-title').textContent = t('fundedTitle');
    $('funded-disclaimer').textContent = t('fundedDisclaimer');
    var list = $('funded-list');
    list.innerHTML = '';
    t('fundedItems').forEach(function (name, i) {
      var li = document.createElement('li');
      li.textContent = i18n.fmtFunded(tax.ded / salary.FUND_RATES[i]) + ' ' + name;
      list.appendChild(li);
    });
  }
```

Replace with:

```js
    $('funded-title').textContent = t('fundedTitle');
    $('funded-disclaimer').textContent = t('fundedDisclaimer');
    var list = $('funded-list');
    list.innerHTML = '';
    var fundRates = (settings && settings.region === 'CH') ? salary.FUND_RATES_CH : salary.FUND_RATES;
    var fundedItemsKey = (settings && settings.region === 'CH') ? 'fundedItemsCh' : 'fundedItems';
    t(fundedItemsKey).forEach(function (name, i) {
      var li = document.createElement('li');
      li.textContent = i18n.fmtFunded(tax.ded / fundRates[i]) + ' ' + name;
      list.appendChild(li);
    });
  }
```

- [ ] **Step 8: Implement — `js/app.js` (region-aware Funded-Items in `buildTaxShareText`)**

Find:

```js
    var funded = t('fundedItems').map(function (name, i) {
      return i18n.fmtFunded(tax.ded / salary.FUND_RATES[i]) + ' ' + name;
    }).join('\n');
```

Replace with:

```js
    var fundRates = (settings && settings.region === 'CH') ? salary.FUND_RATES_CH : salary.FUND_RATES;
    var fundedItemsKey = (settings && settings.region === 'CH') ? 'fundedItemsCh' : 'fundedItems';
    var funded = t(fundedItemsKey).map(function (name, i) {
      return i18n.fmtFunded(tax.ded / fundRates[i]) + ' ' + name;
    }).join('\n');
```

- [ ] **Step 9: Implement — `js/app.js` (`applyLang()` ruft `renderLandSwitch()` erneut auf)**

Find:

```js
  function applyLang() {
    i18n.applyBindings();
    i18n.buildFormatters();
    $('btn-save-settings').textContent = settings ? t('btnSaveChanges') : t('btnSaveFirst');
    renderRateChip();
    renderTimer();
    renderActivityPicker();
    renderHistory();
    renderYear();
    if (!views.summary.classList.contains('hidden')) renderSummary();
    if (!whatsNewOverlay.classList.contains('hidden')) renderWhatsNewList();
  }
```

Replace with:

```js
  function applyLang() {
    i18n.applyBindings();
    i18n.buildFormatters();
    $('btn-save-settings').textContent = settings ? t('btnSaveChanges') : t('btnSaveFirst');
    renderRateChip();
    renderTimer();
    renderActivityPicker();
    renderHistory();
    renderYear();
    renderLandSwitch();
    if (!views.summary.classList.contains('hidden')) renderSummary();
    if (!whatsNewOverlay.classList.contains('hidden')) renderWhatsNewList();
  }
```

- [ ] **Step 10: Sanity-check, full regression, and commit**

```bash
node --check js/app.js js/i18n.js
node --test tests/salary.test.mjs tests/i18n.test.mjs tests/storage.test.mjs tests/stats-csv.test.mjs tests/achievements.test.mjs tests/share.test.mjs
git add index.html js/i18n.js js/app.js
git commit -m "Add Land toggle and Kanton dropdown to the setup form"
```

(Manuelle Browser-Verifikation der UI folgt in Task 6 — hier ist nur die automatisierte Regressions-Suite die Absicherung, da kein DOM-Test-Harness existiert.)

---

## Task 5: `whatsnew.js`-Eintrag

**Files:**
- Modify: `js/whatsnew.js`

**Interfaces:**
- Keine neuen Exports — nur ein neues Element in `ENTRIES` (bestehendes Array, newest first).

- [ ] **Step 1: Implement**

Find:

```js
export var ENTRIES = [
  {
    id: 17,
```

Replace with:

```js
export var ENTRIES = [
  {
    id: 18,
    emoji: '🇨🇭',
    title: { de: 'Jetzt auch für die Schweiz', en: 'Now available for Switzerland' },
    body: {
      de: 'Land umschaltbar auf Schweiz, mit Kanton-Auswahl für Zürich, Zug und Genève — inklusive Bundes-, Kantons- und Gemeindesteuer sowie AHV/IV/EO, ALV und BVG. Weitere Kantone folgen.',
      en: 'You can now switch to Switzerland, with canton selection for Zürich, Zug, and Genève — including federal, cantonal, and communal tax plus AHV/IV/EO, ALV, and BVG. More cantons to come.'
    }
  },
  {
    id: 17,
```

- [ ] **Step 2: Sanity-check and commit**

```bash
node --check js/whatsnew.js
node --test tests/salary.test.mjs tests/i18n.test.mjs tests/storage.test.mjs tests/stats-csv.test.mjs tests/achievements.test.mjs tests/share.test.mjs
git add js/whatsnew.js
git commit -m "Add whatsnew entry for Swiss canton support"
```

---

## Task 6: Manuelle Browser-Verifikation

**Files:** keine — reine Verifikation, kein Code.

- [ ] **Step 1: Vollständige Test-Suite**

```bash
for f in js/*.js; do node --check "$f" || echo "FAIL: $f"; done
node --test
```

Erwartet: alle `node --check`-Aufrufe still (kein Output = Erfolg), alle Tests grün.

- [ ] **Step 2: Manueller Browser-Durchlauf**

App lokal servieren (`python3 -m http.server 8934` im Repo-Root) und mit frischem `localStorage`:

1. **DE-Regression (Bestandsnutzer-Simulation):** Setup mit Monatslohn, Steuerklasse I, ohne Kirchensteuer speichern — Land-Toggle steht auf "Deutschland", Steuerklasse-Feld sichtbar, Kanton-Feld unsichtbar. Session starten/beenden, Zusammenfassung zeigt Brutto/Netto/Abzug korrekt in €. "Damit hast du finanziert" zeigt die deutschen Posten (Bürgergeld/NGO/Ukraine-Hilfe Deutschland).
2. **Land-Umschalter live:** Im Setup-Formular auf "Schweiz" klicken (vor dem Speichern) — Label wechselt sofort zu "... in CHF", Hinweistext wechselt zur Schweizer Variante, Steuerklasse-Feld + Kirchensteuer-Zeile verschwinden, Kanton-Dropdown erscheint.
3. **Kanton-Dropdown:** Zürich, Zug, Genève sind auswählbar; die übrigen 23 Kantone sind sichtbar aber nicht auswählbar (grau, "— bald verfügbar"), alphabetisch sortiert nach dem Trenner.
4. **Für jeden der 3 Kantone (Zürich, Zug, Genève):** Setup speichern → Session starten/beenden → Netto/Brutto-Split plausibel (höherer Abzug als bei "kein Kanton", da jetzt Kantons-/Gemeindesteuer einfließt) → "Damit hast du finanziert" zeigt die Schweizer Posten in CHF (Sozialhilfe-Grundbedarf/NGO-Projektstelle/Ukraine-Hilfe Schweiz).
5. **CSV-Export bei Schweiz:** Verlauf → CSV exportieren → Header sagt `(CHF)`, nicht `(EUR)`.
6. **Hin- und Herschalten CH→DE→CH:** Vorherige Kanton-Auswahl bleibt beim Zurückwechseln zu Schweiz erhalten, keine Datenkorruption, kein JS-Fehler in der Konsole.
7. **Sprachumschalter DE↔EN bei aktivem Land=Schweiz:** Kanton-Namen und "— bald verfügbar"/"— coming soon" wechseln korrekt mit, Hinweistext und Währungslabel bleiben auf CHF (region unverändert durch Sprachwechsel, wie in der Vorgänger-Spec verifiziert).
8. **Achievements-Tab bei Schweiz:** Keine `[object Object]`- oder literalen `function`-Texte, `fmtMoney`-Beträge zeigen CHF.

- [ ] **Step 3: Report**

Wenn alle Schritte aus Step 2 wie erwartet funktionieren, ist dieser Plan abgeschlossen: die Schweiz ist über die UI erreichbar, mit drei echten, verifizierten Kantonen. Notiere in der PR-Beschreibung, welche 23 Kantone noch fehlen (Folge-Batches) und dass Familientarif/verheiratet weiterhin nicht unterstützt wird (bewusste Einschränkung laut Spec).
