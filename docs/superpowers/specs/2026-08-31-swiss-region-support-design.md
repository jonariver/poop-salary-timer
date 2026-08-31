# Schweiz-Unterstützung: CHF, Bundes-/Kantons-/Gemeindesteuer, Sozialabgaben

## Kontext

Der Nutzer wollte wissen, wie aufwändig es wäre, die App (aktuell EUR +
deutsches Steuer-/Sozialabgabenmodell) auch für Schweizer Franken und
Schweizer Steuern/Sozialabgaben nutzbar zu machen, und hat sich nach der
Aufwandseinschätzung für „alles" entschieden: CHF-Unterstützung, Schweizer
Sozialabgaben (AHV/IV/EO, ALV, BVG-Näherung) und die volle
Bundes-/Kantons-/Gemeindesteuer — mit einer Kanton-Auswahl statt nur eines
Referenzkantons, weil die Steuerlast zwischen Kantonen real um mehr als das
Doppelte variieren kann.

Das ist architektonisch, nicht bloß eine Erweiterung eines bestehenden
Musters: ein neues Land/Region-Konzept zieht sich durch Storage-Contract,
Steuerberechnung, Währungsformatierung und mehrere UI-Stellen. Die
bestehende deutsche Steuerlogik (`TAX_MODEL_YEAR`/`TAX_PARAMS` in
`js/salary.js`) ist sauber isoliert und dient als Vorbild für die Kapselung,
aber das Schweizer System ist strukturell anders (dreistufig: Bund + Kanton
+ Gemeinde, statt einer einzelnen Bundesformel) und lässt sich nicht als
zweiter Parametersatz in dieselbe Funktion einsetzen.

**Bewusste Phasengrenze:** Diese Spec deckt die vollständige Architektur ab
und liefert bereits echte, verifizierte Bundessteuer-Zahlen (siehe unten).
Die drei Pilot-Kantone (Zürich, Zug, Genf) — inklusive kantonalem Tarif und
Gemeinde-Multiplikator — sind bewusst als **separater Folge-Schritt**
vorgesehen: die Bundessteuer-Recherche allein erforderte mehrere PDF-Extraktions-
und Konsistenzprüfungs-Durchgänge (offizielle PDF-Tabellen lassen sich nicht
direkt als Text auslesen, Spalten werden beim Extrahieren durcheinander-
gewürfelt); dieselbe Sorgfalt pro Kanton in einem Zug zu erzwingen würde das
Fehlerrisiko bei echten Finanzdaten erhöhen. Diese Spec spezifiziert daher
den vollständigen Mechanismus (inkl. wo/wie Kantonsdaten eingehängt werden)
so, dass die drei Kantone in einem fokussierten Folge-Schritt nachgezogen
werden können, ohne die Architektur nochmal anzufassen.

## Ziele

- Neues, von der Sprache unabhängiges Setting `region` (`'DE'|'CH'`),
  Default `'DE'` — Bestandsnutzer bemerken keine Verhaltensänderung.
- CHF-Währungsformatierung inkl. korrekter Schweizer Zahlformat-Konventionen.
- Schweizer Bundessteuer vollständig implementiert mit echten 2026er-Werten.
- Architektur für Kantons-/Gemeindesteuer steht, drei Kantone folgen als
  nächster Schritt (siehe „Nicht Bestandteil dieser Spec").
- Schweizer Sozialabgaben (AHV/IV/EO, ALV, BVG-Näherung) als Ersatz für die
  deutsche 20,5 %-SV-Pauschale im CH-Zweig.
- Bestehende deutsche Berechnung bleibt unverändert (reiner Zusatz, keine
  Umstellung).

## Nicht Bestandteil dieser Spec

- Konkrete Kantons-/Gemeindesteuersätze für Zürich, Zug, Genf (Folge-Schritt,
  gleiche Recherche-Methodik wie hier für den Bund demonstriert).
- Verheiratete-/Familientarif (nur Alleinstehenden-Tarif fürs MVP, wie im
  Brainstorm entschieden).
- Die übrigen 23 Kantone (separate, klar abgegrenzte Folge-Batches nach den
  ersten drei).
- Automatische jährliche Aktualisierung der Steuerdaten (bleibt wie beim
  deutschen Modell manuelle Pflege pro Steuerjahr).

## Architektur-Überblick

```
pst_settings.region ('DE' | 'CH', Default 'DE')
        │
        ├─ i18n.js: Locale + Currency-Formatter hängen von region UND lang ab
        │            (lang bleibt unabhängig wählbar)
        │
        └─ salary.js: computeTaxRates() verzweigt auf settings.region
                ├─ region==='DE' → bestehende computeTaxRates()-Logik (unverändert)
                └─ region==='CH' → neue computeChTaxRates()
                        ├─ Bundessteuer: computeChFederalTax(zvE) — Stufentarif, diese Spec
                        ├─ Kantonssteuer: computeChCantonalTax(zvE, canton) — Folge-Schritt
                        ├─ Gemeindesteuer: Multiplikator auf Kantonssteuer — Folge-Schritt
                        └─ Sozialabgaben: AHV/IV/EO + ALV + BVG-Näherung, diese Spec
```

## 1. Datenmodell / Storage-Contract

Erweiterung von `pst_settings` (dokumentiert in `CLAUDE.md`), **additiv**,
keine bestehenden Felder werden umbenannt oder entfernt:

```
pst_settings: {
  mode, monthly?, hoursPerWeek?, hourly?, rate,   // unverändert
  region,           // NEU: 'DE' | 'CH', Default 'DE' falls nicht gesetzt
  taxClass, church, churchRate,                    // nur bei region==='DE' relevant, bleiben unverändert im Objekt
  canton,           // NEU: nur bei region==='CH', z.B. 'ZH'|'ZG'|'GE' (Folge-Schritt: erst 3 Werte gültig)
  dedLabel          // unverändert, region-unabhängig
}
```

`storage.js` bleibt unverändert (reines Pass-Through, keine Validierung nötig
— passt zum bestehenden Muster). Fehlt `region` bei bestehenden Nutzern
(Altdaten), behandelt `computeTaxRates()` das wie `'DE'` (Default-Fallback im
Code, kein Migrations-Schritt nötig).

## 2. Währung & Locale-Formatierung (`js/i18n.js`)

Aktuell: `loc` hängt nur von `lang` ab, `currency` ist hart auf `'EUR'`
codiert (`fmt2 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR' })`).

Neu: `buildFormatters()` bekommt zusätzlich `region` als Eingabe (aus den
gespeicherten Settings, analog zu `lang`):

```js
var loc = region === 'CH'
  ? (lang === 'en' ? 'en-CH' : 'de-CH')
  : (lang === 'en' ? 'en-GB' : 'de-DE');
var currency = region === 'CH' ? 'CHF' : 'EUR';
fmt2 = new Intl.NumberFormat(loc, { style: 'currency', currency: currency });
```

`de-CH`/`en-CH` sorgen für die korrekten Schweizer Zahlformat-Konventionen
(Tausendertrennzeichen `'` statt `.`). `fmtMoneyLive()` (aktuell manuelles
Anhängen von `' €'`) muss ebenfalls währungsabhängig werden (`' CHF'` statt
`' €'` bzw. besser: das Währungssymbol aus `fmt2`/einer kleinen Region-Map
ableiten statt erneut hart zu codieren).

## 3. Content-Sweep (hartcodierte €-Vorkommen)

Die Exploration fand literale „€"/„EUR"-Vorkommen außerhalb der
Formatter-Funktionen, die bei CHF falsch blieben, wenn sie unangetastet
bleiben:
- `js/achievements.js`: Badge-Beschreibungen wie „Insgesamt 10 € verdient"
  — Text wird von statischem String auf `desc: function(amount) { ... }`
  umgestellt, `amount` über `fmtMoney()` befüllt (analog zum bestehenden
  Muster bei `factNothing`/`titles`, die schon pro Variante strukturiert
  sind).
- `js/i18n.js`: `csvHeader`, `importHint` — „(EUR)“-Suffixe werden
  region-abhängig (`(EUR)` vs. `(CHF)`), CSV-Export/-Import selbst bleibt
  strukturell unverändert (nur das Label ändert sich).
- `index.html`: Formular-Labels „... in €" — werden entweder region-abhängig
  per JS gesetzt (analog zu den bestehenden `applyBindings()`-Mechanismus)
  oder generisch („Betrag") formuliert; Details bei Umsetzung.

## 4. Schweizer Bundessteuer — verifizierte Daten (Steuerjahr 2026)

Quelle: offizielle PDF-Tariftabelle des Kantons Basel-Landschaft, die den
gesetzlichen Bundestarif (Bundesgesetz über die direkte Bundessteuer, DBG)
reproduziert, gültig ab 2026, „Tarif für Alleinstehende (Grundtarif)".
Konsistenz an mehreren Einkommensstufen gegengerechnet (z.B. bei CHF 100'000
und CHF 200'000 Abweichung < 10 Rappen zur Originaltabelle — reine
Rundungsartefakte der Kumulierung, siehe Berechnungsmethode unten).

**Stufentarif (marginal, pro Bracket):**

| zvE von (CHF) | zvE bis (CHF) | Grenzsteuersatz |
|---|---|---|
| 0 | 15'200 | 0 % |
| 15'200 | 33'200 | 0,77 % |
| 33'200 | 43'500 | 0,88 % |
| 43'500 | 58'000 | 2,64 % |
| 58'000 | 76'200 | 2,97 % |
| 76'200 | 82'100 | 5,94 % |
| 82'100 | 108'900 | 6,60 % |
| 108'900 | 141'500 | 8,80 % |
| 141'500 | 185'100 | 11,00 % |
| 185'100 | 793'900 | 13,20 % |
| ab 793'900 | — | pauschal 11,5 % vom gesamten zvE |

(Die letzte Zeile ist eine bewusste Vereinfachung: die offizielle Tabelle hat
zwischen 793'900 und ca. 794'100 eine sehr schmale ~200-CHF-Übergangszone auf
dem Weg zur gesetzlich explizit genannten Regel „ab CHF 1'000'000: 11,5 % vom
ganzen Betrag" — der Unterschied beträgt wenige Rappen und ist für eine
„vereinfachte Näherung"-App vernachlässigbar, analog zur bestehenden
Behandlung der deutschen Reichensteuer-Grenze.)

**Berechnungsmethode** (analog zum bestehenden `T(z)`-Muster in
`salary.js`, aber Stufensumme statt quadratischer Zonenformel, da der
Schweizer Bundestarif stückweise linear statt stückweise quadratisch ist):

```js
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
var CH_FEDERAL_TOP_RATE = 0.115; // ab 793'900, pauschal vom gesamten zvE

function computeChFederalTax(zvE) {
  if (zvE >= 793900) return zvE * CH_FEDERAL_TOP_RATE;
  var tax = 0, lower = 0;
  for (var i = 0; i < CH_FEDERAL_BRACKETS.length; i++) {
    var b = CH_FEDERAL_BRACKETS[i];
    if (zvE <= b.upTo) { tax += (zvE - lower) * b.rate; break; }
    tax += (b.upTo - lower) * b.rate;
    lower = b.upTo;
  }
  return tax;
}
```

Diese Funktion und die Bracket-Tabelle leben — analog zu `TAX_PARAMS` für
Deutschland — in einem eigenen, klar mit Steuerjahr versehenen Block in
`salary.js` (z.B. `CH_TAX_MODEL_YEAR = 2026`).

## 5. Schweizer Kantons-/Gemeindesteuer (Architektur, Daten folgen)

Struktur, in die die drei Pilot-Kantone eingehängt werden:

```js
var CH_CANTON_TAX = {
  // Platzhalter-Struktur, Werte werden im Folge-Schritt recherchiert:
  // ZH: { brackets: [...], gemeindeMultiplier: X.XX },
  // ZG: { brackets: [...], gemeindeMultiplier: X.XX },
  // GE: { brackets: [...], gemeindeMultiplier: X.XX }
};

function computeChCantonalTax(zvE, canton) {
  var c = CH_CANTON_TAX[canton];
  if (!c) return null; // Kanton noch nicht hinterlegt
  var simpleTax = computeBracketTax(zvE, c.brackets); // gleiche Stufenlogik wie computeChFederalTax
  return simpleTax * c.gemeindeMultiplier; // Referenz-Gemeinde statt aller 2'200 Gemeinden
}
```

`computeBracketTax()` wird aus `computeChFederalTax()` als gemeinsame
Hilfsfunktion extrahiert (beide nutzen dieselbe Stufenlogik, nur mit
unterschiedlichen Bracket-Tabellen) — vermeidet Code-Duplikation zwischen
Bundes- und Kantonssteuer.

**Wichtig für den Folge-Schritt:** jeder Kanton braucht (a) seinen eigenen
progressiven „einfache Steuer"-Tarif (Bracket-Struktur wie oben) und (b)
einen kombinierten Kanton+Referenz-Gemeinde-Multiplikator (ein Prozentsatz,
der auf die „einfache Steuer" angewendet wird — vermeidet 2'200
Gemeinde-Einträge). Referenz-Gemeinde jeweils die Kantonshauptstadt
(Zürich-Stadt, Zug-Stadt, Genf-Stadt), analog zur „ein Referenzkanton"-Logik,
die schon für die Gesamtaufwandseinschätzung galt.

## 6. Schweizer Sozialabgaben

Ersetzt im CH-Zweig die deutsche 20,5 %-SV-Pauschale:

| Abgabe | Arbeitnehmeranteil | Bemessungsgrenze |
|---|---|---|
| AHV/IV/EO | 5,3 % | keine |
| ALV | 1,1 % | CHF 148'200/Jahr (darüber kein weiterer ALV-Abzug) |
| BVG (Pensionskasse) | ~6,25 % Näherung (siehe unten) | Koordinationsabzug CHF 26'460, versicherter Lohn max. CHF 90'720, Eintrittsschwelle CHF 22'680 |

**BVG-Näherung:** die gesetzlichen Mindest-Altersgutschriften (BVG) sind
altersgestaffelt und werden mindestens hälftig zwischen Arbeitgeber und
Arbeitnehmer geteilt:

| Alter | Gesamtsatz | Arbeitnehmeranteil (hälftig) |
|---|---|---|
| 25–34 | 7 % | 3,5 % |
| 35–44 | 10 % | 5,0 % |
| 45–54 | 15 % | 7,5 % |
| 55–65 | 18 % | 9,0 % |

Da die App aktuell kein Alter erfasst und ein neues Pflichtfeld dafür über
den entschiedenen Scope hinausginge, wird ein **ungewichteter Mittelwert der
vier Arbeitnehmeranteile** als Pauschale verwendet: (3,5+5,0+7,5+9,0)/4 =
**6,25 %**, klar im Disclaimer als grobe Näherung gekennzeichnet (analog zur
bestehenden „vereinfachte Näherung"-Formulierung). BVG greift nur auf den
koordinierten Lohn (Bruttolohn abzüglich Koordinationsabzug CHF 26'460,
gedeckelt zwischen der Eintrittsschwelle CHF 22'680 und dem maximal
versicherten Lohn CHF 90'720) und nur, wenn der Jahreslohn die
Eintrittsschwelle übersteigt.

**Explizit nicht enthalten:** Krankenversicherung — in der Schweiz keine
Lohnabzugsposition, sondern eine private, separate Prämie. Der bestehende
Disclaimer-Text (`taxHint`) wird um einen CH-spezifischen Hinweis ergänzt,
der das explizit klarstellt, damit Nutzer nicht denken, die App habe die
Krankenkasse vergessen.

`computeChTaxRates(settings)` gibt (analog zu `computeTaxRates()` für
Deutschland) `{ sv, lst, ... , total }` zurück, wobei `sv` hier die Summe aus
AHV/IV/EO + ALV + BVG-Näherung ist und `lst` die Summe aus Bundes- + Kantons-
+ Gemeindesteuer — gleiche Rückgabeform wie beim deutschen Zweig, damit
`computeNet()` und alle UI-Stellen, die `net`/`ded`/`lst`/`soli`/`church`/`sv`
konsumieren, unverändert bleiben (nur `soli`/`church` sind bei CH immer 0).

## 7. UI-Änderungen (`index.html`, `js/app.js`)

- Neuer Land-Umschalter im Setup-Formular (🇩🇪/🇨🇭), analog zum bestehenden
  Sprachumschalter-Muster (zwei Buttons, `aria-pressed`).
- Bedingte Anzeige: bei `region==='DE'` bleibt das bestehende
  Steuerklasse-/Kirchensteuer-Formular sichtbar; bei `region==='CH'`
  erscheint stattdessen ein Kanton-Dropdown (zunächst nur 3 Einträge,
  restliche Kantone folgen mit den Folge-Batches — Dropdown ist so gebaut,
  dass neue Kantone nur einen neuen `CH_CANTON_TAX`-Eintrag brauchen, keine
  UI-Änderung).
- `#tax-hint` bekommt einen region-abhängigen Text (deutscher Disclaimer
  bleibt wie er ist; CH-Variante erwähnt explizit Bund+Kanton+Gemeinde,
  BVG-Näherung und die bewusst ausgeklammerte Krankenkasse).

## Verifikation

- `node --check js/*.js` nach jeder Änderung.
- Isolierter Node-Test für `computeChFederalTax()`: Stichproben gegen die
  offizielle Tabelle bei mehreren zvE-Werten (0, 15'200, 33'200, 100'000,
  200'000, 793'900, 1'000'000, 2'000'000) — Abweichung muss < 1 CHF sein
  (Rundungstoleranz).
- Isolierter Node-Test für die Sozialabgaben-Sätze (AHV/IV/EO-Deckelung bei
  ALV, BVG-Näherung greift nur oberhalb des Koordinationsabzugs).
- Regressionstest: bestehende deutsche Berechnung (`computeTaxRates` für
  `region==='DE'` bzw. fehlendes `region`-Feld) liefert exakt dieselben
  Werte wie vor der Änderung — kein Verhalten für Bestandsnutzer ändert sich.
- Browser-Test: Land-Umschalter, bedingte Formularfelder, CHF-Formatierung
  in Live-Anzeige/Zusammenfassung/Verlauf/CSV-Export, DE/EN unabhängig vom
  Land wählbar.

## Nächster Schritt

Nutzer-Review dieser Spec, danach `writing-plans`-Skill für den
Implementierungsplan der hier beschriebenen Architektur + Bundessteuer
(Teile 1-4, 6-7). Die Kantonssteuer-Datenrecherche (Teil 5, Zürich/Zug/Genf)
wird als eigener, fokussierter Rechercheschritt direkt im Anschluss
behandelt, bevor deren Umsetzung geplant wird.
