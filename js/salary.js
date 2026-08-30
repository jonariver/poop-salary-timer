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
export function computeTaxRates(s) {
  if (!s || !s.taxClass) return null;
  var annualGross = s.mode === 'hourly'
    ? (s.hourly || 0) * ((s.hoursPerWeek || 40) * 52)
    : (s.monthly || 0) * 12;
  if (!(annualGross > 0)) return null;
  var GF = 12096; // Grundfreibetrag (Näherung)
  function T(z) { // Einkommensteuer-Tarif (Näherung, Formel 2025)
    if (z <= GF) return 0;
    if (z <= 17443) { var y = (z - GF) / 10000; return (932.30 * y + 1400) * y; }
    if (z <= 68480) { var q = (z - 17443) / 10000; return (176.64 * q + 2397) * q + 1015.13; }
    if (z <= 277825) return 0.42 * z - 10911.92;
    return 0.45 * z - 19246.67;
  }
  var zvE = Math.max(0, annualGross * 0.86 - 1230); // grob: Vorsorge + Werbungskosten
  var cls = String(s.taxClass);
  var lstAnnual;
  if (cls === '3') lstAnnual = 2 * T(zvE / 2);
  else if (cls === '2') lstAnnual = T(Math.max(0, zvE - 4260));
  else if (cls === '5' || cls === '6') lstAnnual = T(zvE + GF);
  else lstAnnual = T(zvE);
  var lstRate = Math.max(0, Math.min(0.45, lstAnnual / annualGross));
  var soliRate = lstAnnual > 19950 ? lstRate * 0.055 : 0;
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
