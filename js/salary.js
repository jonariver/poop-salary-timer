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

export function computeTaxRates(s) {
  if (!s || !s.taxClass) return null;
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
