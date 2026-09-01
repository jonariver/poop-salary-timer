# Kanton-Toggle-UI: Region-Umschalter, Kanton-Auswahl, drei echte Kantone

## Kontext

Der Vorgänger-Plan (`2026-08-31-swiss-region-support-design.md`, gemergt via
PR #42) hat den vollständigen Schweizer Steuer-/Sozialabgaben-Backend
implementiert — CHF-Formatierung, Bundessteuer, AHV/IV/EO+ALV+BVG,
`computeTaxRates`-Dispatcher DE/CH — aber **bewusst ohne UI-Exposure**:
`CH_CANTON_TAX` blieb leer, kein Land-Toggle, keine Kanton-Auswahl. Diese
Spec liefert den fehlenden Rest: die UI, mit der ein Nutzer tatsächlich
`region: 'CH'` erreichen kann, plus die ersten drei echten Kantone (Zürich,
Zug, Genève), recherchiert und gegen offizielle Steuerrechner verifiziert.

Der Abschluss-Review des Vorgänger-Plans hat zusätzlich einen strukturellen
Mangel aufgedeckt: `region` hatte zwei getrennte, nicht synchronisierte
Ablageorte (`pst_region`-Key in `storage.js`, gelesen von `i18n.js`; `s.region`
im an `computeTaxRates()` übergebenen Settings-Objekt). Da `pst_region` nie
über eine UI erreichbar war, hat kein echter Nutzer diesen Key je gesetzt —
der ideale Zeitpunkt, das vor dem ersten UI-Release zu konsolidieren, statt
später eine Migration zu brauchen.

## Ziele

- Ein einziger, konsistenter Ablageort für `region`/`canton` (in
  `pst_settings`, nicht mehr als eigener `pst_region`-Key).
- Land-Umschalter (Deutschland/Schweiz) im Setup-Formular, live (vor dem
  Speichern) sichtbar in Währungslabels und Hinweistext.
- Kanton-Dropdown bei Land=Schweiz, das alle 26 Kantone zeigt: die drei
  recherchierten sind auswählbar, die restlichen 23 sind sichtbar aber
  deaktiviert ("bald verfügbar") — ehrliche Erwartungshaltung statt
  stillschweigend falscher Schätzung.
- Drei echte, gegen offizielle Quellen verifizierte Kantonsdatensätze
  (Zürich, Zug, Genève) in `CH_CANTON_TAX`.
- Schweiz-spezifischer Hinweistext (ersetzt die falsche "pauschal 20,5 %"-
  Formulierung für CH) und Schweiz-spezifische "Damit hast du finanziert"-
  Vergleichswerte (statt deutscher Bürgergeld-/Ukraine-Hilfe-Zahlen).
- Bestehendes deutsches Verhalten bleibt für Bestandsnutzer unverändert
  (reiner Zusatz).

## Nicht Bestandteil dieser Spec

- Die restlichen 23 Kantone (Folge-Batches, gleiche Recherche-Methodik).
- Verheiratete-/Familientarif (weiterhin nur Alleinstehenden-Tarif, wie im
  ursprünglichen Brainstorm entschieden).
- Automatische jährliche Aktualisierung der Steuerdaten (bleibt manuelle
  Pflege pro Steuerjahr, wie beim deutschen Modell und dem Bundestarif).
- Genf-spezifische Sonderfälle wie "bouclier fiscal" (Steuerbremse bei sehr
  hohem Vermögen) — bei den typischen Gehältern dieser App irrelevant.
- Eine generische `currencyCode()`-Konsolidierung über alle drei
  Vorkommen hinweg (`i18n.js` intern, `stats.js`) — der letzte Review hatte
  das als Minor/Nice-to-have geparkt; diese Spec fügt mit `fundedItems`
  einen vierten Verwendungsort hinzu, konsolidiert aber nicht rückwirkend.

## Architektur-Überblick

```
pst_settings (einziger Ablageort, kein separater pst_region-Key mehr)
  { ..., region: 'DE'|'CH', canton?: 'ZH'|'ZG'|'GE'|... }
        │
        ├─ app.js Boot/Save: i18n.setRegion(settings.region) hält
        │            i18n.js's In-Memory-region synchron
        │            (i18n.js selbst schreibt/liest kein localStorage mehr)
        │
        ├─ index.html Setup-Formular:
        │     Land-Toggle → Steuerklasse+Kirchensteuer (DE)
        │                   vs. Kanton-Dropdown (CH)
        │
        └─ salary.js: computeTaxRates(s) liest s.region/s.canton
                (Dispatcher existiert bereits — diese Spec befüllt nur
                CH_CANTON_TAX mit echten Daten, keine Code-Änderung am
                Dispatcher selbst nötig)
```

## 1. Storage-Konsolidierung: `region` bekommt einen einzigen Ablageort

**Entfernen** (nie an echte Nutzer ausgeliefert, daher ohne Migration
sicher):
- `js/storage.js`: `LS_REGION`, `getRegion()`, `saveRegion()`.
- `CLAUDE.md`: die `pst_region`-Zeile aus der Storage-Contract-Liste.

**Ändern:**
- `js/i18n.js`: `region`-Variable bleibt (wird von vielen Stellen ohne
  direkten Settings-Zugriff gebraucht — Achievements, Share-Text,
  CSV-Export), verliert aber ihre eigene Persistenz. `setRegion(r)` setzt
  nur noch den In-Memory-Wert (keine `saveRegion()`-Aufruf mehr).
  `getRegion()` unverändert.
- `js/app.js`: Boot-Sequenz ruft nach `storage.getSettings()` zusätzlich
  `i18n.setRegion(settings.region)` auf (Default `'DE'`, wie bisher über
  `setRegion`'s eigene Normalisierung). Der Save-Handler
  (`btn-save-settings`-Listener) tut dasselbe nach dem Schreiben der neuen
  Settings, **vor** `renderRateChip()`/`show('timer')`, damit die
  Folge-Renders bereits die richtige Region sehen.
- `js/salary.js`: keine Änderung — `computeTaxRates(s)` liest `s.region`
  bereits aus dem übergebenen Settings-Objekt, das jetzt tatsächlich befüllt
  wird.

**`CLAUDE.md`**-Update: `pst_settings`-Zeile wird um `region?, canton?`
ergänzt (der letzte Review hatte das bereits als Minor-Fix vorweggenommen —
diese Spec macht die Felder jetzt tatsächlich befüllt statt nur dokumentiert-
aber-ungenutzt).

## 2. Setup-Formular: Land-Umschalter + Kanton-Dropdown

**Neuer Land-Toggle** (`index.html`, oberhalb der Monatslohn/Stundenlohn-
Felder, gleiches Muster wie der bestehende `mode-switch`):

```html
<div class="land-switch" role="group" aria-label="Land">
  <button id="land-de" aria-pressed="true">Deutschland</button>
  <button id="land-ch" aria-pressed="false">Schweiz</button>
</div>
```

`js/app.js` bekommt eine `land`-Variable (analog zu `mode`), Default aus
`settings.region || 'DE'`. Ein Klick auf `land-ch`/`land-de` toggled sofort
(vor dem Speichern):
- Währungslabels (`Monatslohn ... in €` → `... in CHF`, `derived-rate`-Text)
- Hinweistext (`tax-hint`, siehe Abschnitt 4)
- Sichtbarkeit: Steuerklasse-Feld + Kirchensteuer-Checkbox (DE) vs.
  Kanton-Dropdown (CH) — analog zum bestehenden `fields-monthly`/
  `fields-hourly`-Sichtbarkeits-Toggle.

**Kanton-Dropdown** (`index.html`, ersetzt/ergänzt die Steuerklasse-Zeile
strukturell, aber als eigenes, per JS ein-/ausgeblendetes Feld):

```html
<div class="field" id="field-kanton">
  <label for="inp-kanton">Kanton</label>
  <select id="inp-kanton">
    <option value="">– (nur Brutto)</option>
    <optgroup label="Verfügbar">
      <option value="ZH">Zürich (ZH)</option>
      <option value="ZG">Zug (ZG)</option>
      <option value="GE">Genève (GE)</option>
    </optgroup>
    <optgroup label="Bald verfügbar">
      <option value="AG" disabled>Aargau — bald verfügbar</option>
      <option value="AR" disabled>Appenzell Ausserrhoden — bald verfügbar</option>
      <!-- ... alle 23 übrigen Kantone, alphabetisch, disabled -->
      <option value="ZH2" disabled>… </option>
    </optgroup>
  </select>
</div>
```

Die konkrete Liste der 23 deaktivierten Kantone (Name + Kürzel, alphabetisch
nach deutschem Namen) wird im Implementierungsplan als vollständige,
copy-paste-fertige Konstante ausgeschrieben (keine Recherche nötig — reine
amtliche Kantonsliste).

`js/app.js`: `fillSetupForm()` liest zusätzlich `settings.canton` in
`inp-kanton`; der Save-Handler liest `s.region = land; s.canton = land === 'CH' ? ($('inp-kanton').value || null) : null;`
analog zu `s.taxClass`. Beim Wechsel zurück zu Deutschland wird das
Kanton-Feld nur versteckt, nicht geleert — beim erneuten Wechsel zu Schweiz
ist die vorherige Auswahl noch da (kein Datenverlust, kein UI-Overhead für
einen Reset, der ohnehin nichts weiter tut, weil `canton` bei `region!=='CH'`
gar nicht gelesen/gespeichert wird).

## 3. Kantonsdaten: Zürich, Zug, Genève (Steuerjahr 2026 bzw. 2025)

Alle drei Datensätze wurden gegen offizielle Steuerrechner/-quellen
verifiziert, mit derselben Sorgfalt wie der Bundestarif in der Vorgänger-
Spec. Sie füllen `CH_CANTON_TAX` (aktuell `export var CH_CANTON_TAX = {}`
in `js/salary.js`):

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
```

### Verifikation

Kanton- und Gemeindesteuer kombiniert (ohne Bund, ohne Kirche), Alleinstehend
/ konfessionslos, gegen offizielle bzw. offiziell-abgeleitete Quellen:

| Kanton | zvE (CHF) | Eigene Rechnung | Offizielle Quelle | Δ |
|---|---|---|---|---|
| ZH | 80'000 | 9'351.80 | 9'352 (ESTV-Steuerrechner `swisstaxcalculator.estv.admin.ch`, live geprüft, Steuerjahr 2026) | 0.20 |
| ZH | 150'000 | 23'807.50 | 23'808 (dito) | 0.50 |
| ZG | 80'000 | 5'109.65 | 5'109.60 (Kanton-Zug-Steuerrechner `steuern.zg.ch`, live geprüft) | 0.05 |
| ZG | 150'000 | 13'434.85 | 13'434.80 (dito) | 0.05 |

Alle Abweichungen sind Rappen-Rundungsartefakte einzelner Teilkomponenten
(z.B. rundet der Kanton-Zug-Rechner Kanton- und Gemeindeanteil getrennt),
keine Datenfehler — dieselbe Größenordnung wie die Bundestarif-Verifikation
der Vorgänger-Spec.

**Genève wird separat verifiziert**, weil die Kantonssteuer dort strukturell
anders funktioniert (siehe Mechanik-Erklärung oben): Die reine Bracket-
Tabelle wurde direkt gegen die amtliche AFC-GE-Tariftabelle geprüft — alle
kumulierten „Impôt total"-Werte an den Bracket-Grenzen stimmen auf den
Rappen genau überein, u.a. bei zvE 48'309 (eigene Rechnung 3'140.38 vs.
amtlich 3'140.40) und zvE 77'518 (6'995.97 vs. 6'996.00). Der
Kanton-Multiplikator-Anteil (1.308, also ohne die Gemeinde-Centimes) wurde
separat gegen eine Musterrechnung von `fbk-conseils.ch` (Genfer
Steuerberatung) verifiziert: deren Basissteuer B=CHF 8'769 × 1.308 =
CHF 11'469.05, exakt wie im Artikel angegeben. Ein ursprünglich in diesem
Dokument enthaltener Prüfpunkt bei zvE=90'000 wurde entfernt — er vermischte
fälschlich die eigene Bracket-Berechnung (die bei exakt 90'000 CHF 8'768.41
statt der Artikel-Zahl 8'769 ergibt, vermutlich weil das Beispiel-Einkommen
im Artikel nicht exakt 90'000 war) mit dem separat verifizierten
Kanton-Multiplikator. Die Gemeinde-Centimes für Ville de Genève (45.49%)
sind unabhängig aus drei offiziellen/halboffiziellen Quellen bestätigt
(siehe Quellenliste), aber nicht end-to-end an einem Ville-de-Genève-
spezifischen Gesamtbeispiel durchgerechnet — dieselbe Einschränkung, die die
ursprüngliche Recherche bereits selbst benannt hatte.

Quellen (vollständig, für spätere Nachprüfung):
- ZH Bracket-Tabelle: ESTV Kantonsblatt Zürich, `estv2.admin.ch/stp/kb/zh-de.pdf`, Stand Februar 2026
- ZH Kantons-/Gemeindesteuerfuss: `zh.ch` "Aktuelle Gemeindesteuerfüsse" (95%), Stadt-Zürich-Gemeinderatsbeschluss vom 11.12.2025 (119%)
- ZH Verifikation: `swisstaxcalculator.estv.admin.ch`, Wohnort 8000 Zürich, Steuerjahr 2026, live abgefragt
- ZG Bracket-Tabelle + Steuerfüsse: Kanton Zug, "Grundtarif 2001 bis 2026.pdf" und "Steuerfüsse 2026_effektiv 21.1.26.pdf", `cdn.zg.ch`
- ZG Verifikation: `steuern.zg.ch/private/calculator/incomeandwealth`, live abgefragt
- GE Bracket-Tabelle + Mechanik: AFC-GE "Barèmes ICC ... 2025", `ge.ch/document/42267/telecharger`; Rabattgesetz `rsGE D 3 06`; Gemeinde-Centimes `rsGE D 3 05.30`
- GE Verifikation: `fbk-conseils.ch/en/calculate-icc-geneva/` (Musterrechnung "Chloé")

## 4. Schweiz-spezifische Inhalte (Hinweistext, "Damit hast du finanziert")

**`taxHint`** — neue CH-Variante in `js/i18n.js`s `STR`-Dictionary (DE/EN),
ersetzt für `region==='CH'` die (für die Schweiz sachlich falsche) deutsche
"pauschal 20,5 %"-Formulierung:

> DE: „Vereinfachte Näherung (Bundes- und Kantonssteuer-Schätzung +
> AHV/IV/EO, ALV und BVG), keine amtliche Steuerrechnung. Krankenkassen-
> prämien sind in der Schweiz kein Lohnabzug und daher nicht enthalten.
> Gemeindesteuerfuss der Kantonshauptstadt — deine tatsächliche Gemeinde
> kann abweichen. Beim Stundenlohn-Modus wird eine 40-Stunden-Woche
> angenommen, falls keine Wochenstunden bekannt sind."

Englische Entsprechung analog. `js/app.js`s Land-Toggle-Handler setzt
`$('tax-hint').textContent` live um (wie die Währungslabels in Abschnitt 2).

**`fundedItems` / `FUND_RATES`** — Schweizer Pendant zu den deutschen
Vergleichswerten (Bürgergeld/NGO-Stelle/Ukraine-Hilfe-Deutschland), recherchiert
und mit Quellen belegt:

| Position | Wert | Quelle |
|---|---|---|
| Sozialhilfe-Grundbedarf (1 Person) | CHF 1'061/Monat | SKOS-Richtlinie, in Kraft seit 1.1.2025, kantonal verpflichtend spätestens ab 2026 |
| NGO-Projektstelle | CHF 80'000/Jahr | VPOD-NGO-Lohnstudie 2022, Median-Bereich CHF 73'176–104'400/Jahr, gerundet |
| Ukraine-Hilfe (Schweiz gesamt) | CHF 342.25 Mio./Jahr | EDA-Länderprogramm Ukraine 2025–2028, für 2026 reserviertes Jahresbudget |

```js
export var FUND_RATES_CH = [
  1061 / 2592000,      // Sozialhilfe-Grundbedarf, 30-Tage-Monat (gleiche Konvention wie FUND_RATES[0])
  80000 / 31536000,    // NGO-Projektstelle, Jahreslohn
  342250000 / 31536000 // Ukraine-Hilfe Schweiz, Jahresbudget 2026
];
```

`js/i18n.js`: neue `fundedItems`-CH-Varianten (DE/EN) neben den bestehenden
deutschen Strings — z.B. über eine zweite Übersetzungs-Sektion analog zur
bestehenden Struktur, ausgewählt nach `region`.

`js/app.js`: `renderSummary()` und `buildTaxShareText()` (die beiden
bestehenden `fundedItems`/`FUND_RATES`-Verwendungsstellen) wählen je nach
`settings.region` zwischen `salary.FUND_RATES`/`t('fundedItems')` (DE) und
`salary.FUND_RATES_CH`/`t('fundedItemsCH')` (CH) — kleine, lokale Änderung an
beiden Call-Sites, kein neues Modul nötig.

**`whatsnew.js`**: neuer Eintrag Pflicht (user-facing Feature laut
CLAUDE.md) — launig, DE/EN, im bestehenden Ton ("🇨🇭 Jetzt auch für die
Schweiz: Zürich, Zug und Genève sind da").

## 5. Testing-Ansatz

**Automatisiert** (`node --test`, wie bisher):
- `tests/salary.test.mjs`: Golden-Value-Tests für alle drei Kantone, direkt
  aus der Verifikationstabelle in Abschnitt 3 (`computeTaxRates({region:'CH', canton:'ZH'|'ZG'|'GE', ...})`
  bei den geprüften zvE-Werten, Toleranz < 1 CHF).
- Bestehender DE-Golden-Value-Regressionstest bleibt unverändert grün
  (Global Constraint, wie im Vorgänger-Plan).
- `tests/i18n.test.mjs`: `setRegion`/`getRegion` jetzt ohne eigenen
  `pst_region`-Key — bestehende Tests werden entsprechend angepasst
  (kein `storage.getRegion`/`saveRegion` mehr, `setRegion` schreibt nicht
  mehr in `localStorage`).
- Neuer Test: `FUND_RATES_CH`-Werte sind positive, plausible Sekundenraten.

**Manuell** (kein DOM-Test-Harness im Repo, wie bei Achievements/Timer
bisher üblich):
- Land-Umschalter: Live-Wechsel €→CHF in Labels/Hinweistext vor dem
  Speichern.
- Kanton-Dropdown: 3 aktive + 23 deaktivierte Optionen korrekt sortiert/
  beschriftet, native `disabled` verhindert Auswahl der 23 gesperrten.
- Für jeden der 3 Kantone: Setup speichern → Session starten/beenden →
  Netto/Brutto-Split plausibel, "Damit hast du finanziert" zeigt Schweizer
  Posten in CHF.
- CSV-Export bei `region==='CH'` → Header sagt `(CHF)`.
- Wechsel CH→DE→CH: Kanton-Auswahl bleibt erhalten, keine Datenkorruption.
- Bestehender DE-Flow mit frischem `localStorage` (kein `region` gesetzt)
  bleibt exakt wie vorher — vollständiger Regressions-Durchlauf wie beim
  Vorgänger-Plan.
