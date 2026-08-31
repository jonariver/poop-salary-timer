// ---------- Salary / tax calculation ----------
// Pure functions only: no DOM, no localStorage, no i18n. Every function's
// output depends only on its arguments.

export function computeRate(s) {
  if (!s) return 0;
  if (s.mode === 'hourly') return s.hourly || 0;
  var weeklyHours = s.hoursPerWeek || 0;
  var monthlyHours = weeklyHours * 52 / 12; // Ø Wochen pro Monat: 4,33
  return monthlyHours > 0 ? (s.monthly || 0) / monthlyHours : 0;
}

// ---------- Netto-Schätzung (vereinfachte Näherung, keine amtliche Tabelle) ----------
// Tarifparameter nach § 32a EStG für das unten genannte Steuerjahr (Grundfreibetrag,
// Tarifzonen-Eckwerte und -Koeffizienten) plus Soli-Freigrenze. Bei Wechsel auf ein neues
// Steuerjahr: TAX_MODEL_YEAR und TAX_PARAMS gemeinsam ersetzen, nicht einzelne Werte anpassen.
export var TAX_MODEL_YEAR = 2026;
var TAX_PARAMS = {
  grundfreibetrag: 12348,
  zone2End: 17799,
  zone3End: 69878,
  zone4End: 277825,
  zone2: { a: 914.51, b: 1400 },
  zone3: { a: 173.10, b: 2397, c: 1034.87 },
  zone4Rate: 0.42, zone4Sub: 11135.63,
  zone5Rate: 0.45, zone5Sub: 19470.38,
  soliThreshold: 20350,
  entlastungAlleinerziehende: 4260
};

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
  // zvE exceeds every listed bracket: continue taxing the remainder at the top bracket's rate,
  // so a future cantonal table's finite top `upTo` doesn't silently under-tax high incomes.
  tax += (zvE - lower) * brackets[brackets.length - 1].rate;
  return tax;
}

export function computeChFederalTax(zvE) {
  if (zvE >= 793900) return zvE * CH_FEDERAL_TOP_RATE;
  return computeBracketTax(zvE, CH_FEDERAL_BRACKETS);
}

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

export var CH_CANTON_TAX = {}; // wird in einem Folge-Schritt mit Kantonsdaten befüllt (siehe Spec Abschnitt 5)

// NOTE: `s.region` here is a field on the settings object passed in by the caller — it is a
// SEPARATE, unreconciled source of truth from the `pst_region` localStorage key that i18n.js
// reads/writes via `getRegion()`/`setRegion()`. Nothing currently keeps them in sync, since no
// UI writes `region` onto `pst_settings` yet. The next plan's region-toggle UI must either write
// `region` into `pst_settings` (mirroring i18n.js's `pst_region`) or otherwise unify the two, or
// a user could see CHF-formatted display numbers computed with German tax brackets (or vice versa).
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

export function computeNet(gross, settings) {
  var r = computeTaxRates(settings);
  if (!r) return null;
  return {
    net: gross * (1 - r.total),
    ded: gross * r.total,
    lst: gross * r.lst,
    soli: gross * r.soli,
    church: gross * r.church,
    sv: gross * r.sv
  };
}

export function calculateEarnings(durationMs, hourlyRate) {
  return (durationMs / 3600000) * hourlyRate;
}

// "Damit finanziert": Euro pro Sekunde der Referenzgrößen (grobe Werte, siehe Disclaimer)
export var FUND_RATES = [563 / 2592000, 60000 / 31536000, 8000000000 / 31536000];

// Preis-Meilensteine im Live-Timer (aufsteigend sortiert). Labels/Emoji leben in i18n.js.
export var MILESTONE_PRICES = [4, 8, 15, 20, 130, 500];

export function milestoneStatus(earned, prices) {
  var reachedIndex = -1;
  for (var i = 0; i < prices.length; i++) {
    if (earned >= prices[i]) reachedIndex = i;
    else break;
  }
  var remaining = reachedIndex + 1 < prices.length ? prices[reachedIndex + 1] - earned : null;
  return { reachedIndex: reachedIndex, remaining: remaining };
}
