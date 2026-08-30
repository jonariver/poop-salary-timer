// ---------- Session statistics & CSV export/import ----------
import { t, getLang, pad } from './i18n.js';

export function actKeyOf(x) { return (x === 'smoke' || x === 'coffee') ? x : 'poop'; }

// Tages-Streaks aus sortierten, eindeutigen Tages-Start-Timestamps: beste Serie insgesamt
// plus die aktuell laufende Serie (nur "aktuell", wenn der letzte aktive Tag heute oder gestern war).
function computeStreaks(dayTsSortedAsc, now) {
  if (!dayTsSortedAsc.length) return { current: 0, best: 0 };
  var best = 1, run = 1;
  for (var i = 1; i < dayTsSortedAsc.length; i++) {
    if (Math.round((dayTsSortedAsc[i] - dayTsSortedAsc[i - 1]) / 86400000) === 1) { run++; if (run > best) best = run; }
    else run = 1;
  }
  var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  var lastDay = dayTsSortedAsc[dayTsSortedAsc.length - 1];
  var gapDays = Math.round((todayStart - lastDay) / 86400000);
  return { current: gapDays <= 1 ? run : 0, best: best };
}

export function sessionStats(sessions) {
  var totalEarned = 0, maxDuration = 0, hasEarly = false, hasNight = false, totalDed = 0;
  var minEligibleMs = Infinity; // kürzeste Sitzung ab 30 Sek. (gegen Versehens-Klicks)
  var days = {}, perDay = {}, maxSameDay = 0;
  sessions.forEach(function (s) {
    totalEarned += s.earned;
    if (typeof s.ded === 'number') totalDed += s.ded;
    if (s.durationMs > maxDuration) maxDuration = s.durationMs;
    if (s.durationMs >= 30000 && s.durationMs < minEligibleMs) minEligibleMs = s.durationMs;
    var d = new Date(s.ts);
    var h = d.getHours();
    if (h < 9) hasEarly = true;
    if (h >= 22 || h < 5) hasNight = true;
    var key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    days[key] = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    perDay[key] = (perDay[key] || 0) + 1;
    if (perDay[key] > maxSameDay) maxSameDay = perDay[key];
  });
  var dayTs = Object.keys(days).map(function (k) { return days[k]; }).sort(function (a, b) { return a - b; });
  var bestStreak = computeStreaks(dayTs, new Date()).best;
  return {
    count: sessions.length, totalEarned: totalEarned, maxDuration: maxDuration,
    hasEarly: hasEarly, hasNight: hasNight, bestStreak: bestStreak,
    minEligibleMs: minEligibleMs, maxSameDay: maxSameDay, totalDed: totalDed
  };
}

// Kennzahlen fürs laufende Kalenderjahr ("Dein Geschäftsjahr"): Monatswerte, Jahres-Rekorde
// und eine grobe Jahreshochrechnung. `now` ist injizierbar für Tests/manuelle Prüfung.
export function businessYearStats(sessions, now) {
  now = now || new Date();
  var nowMs = now.getTime();
  sessions = sessions.filter(function (s) { return s.ts <= nowMs; }); // manuell nachgetragene Zukunfts-Sessions dürfen Jahreswerte/Streak nicht verfälschen
  var year = now.getFullYear(), month = now.getMonth();

  var monthEarned = 0, monthCount = 0, yearEarned = 0, yearMs = 0, yearCount = 0;
  var weekdayEarned = [0, 0, 0, 0, 0, 0, 0], weekdayRepTs = [null, null, null, null, null, null, null];
  var longest = null, priciest = null, days = {}, allDays = {};

  sessions.forEach(function (s) {
    var d = new Date(s.ts);
    // Alle Sessions fließen in allDays ein (für currentStreak, die jahresübergreifend laufen soll);
    // der Rest bleibt jahresgefiltert.
    var allKey = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    if (!allDays[allKey]) allDays[allKey] = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (d.getFullYear() !== year) return;
    yearEarned += s.earned;
    yearMs += s.durationMs;
    yearCount++;
    if (d.getMonth() === month) { monthEarned += s.earned; monthCount++; }
    var wd = d.getDay();
    weekdayEarned[wd] += s.earned;
    if (weekdayRepTs[wd] === null) weekdayRepTs[wd] = s.ts;
    if (!longest || s.durationMs > longest.durationMs) longest = s;
    if (!priciest || s.earned > priciest.earned) priciest = s;
    days[allKey] = allDays[allKey];
  });

  var dayTs = Object.keys(days).map(function (k) { return days[k]; }).sort(function (a, b) { return a - b; });
  var allDayTs = Object.keys(allDays).map(function (k) { return allDays[k]; }).sort(function (a, b) { return a - b; });
  // bestStreak bleibt auf das laufende Jahr begrenzt, currentStreak läuft jahresübergreifend
  // (eine Serie 30.12. → 01.01. darf am Jahreswechsel nicht künstlich abreißen).
  var bestStreak = computeStreaks(dayTs, now).best;
  var currentStreak = computeStreaks(allDayTs, now).current;

  var bestWeekdayIdx = -1, bestWeekdayEarned = 0;
  for (var i = 0; i < 7; i++) {
    if (weekdayEarned[i] > bestWeekdayEarned) { bestWeekdayEarned = weekdayEarned[i]; bestWeekdayIdx = i; }
  }

  var yearAvg = yearCount ? yearEarned / yearCount : 0;

  var startOfYear = new Date(year, 0, 1).getTime();
  var todayStart = new Date(year, now.getMonth(), now.getDate()).getTime();
  var daysElapsed = Math.max(1, Math.round((todayStart - startOfYear) / 86400000) + 1);
  var daysInYear = Math.round((Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000);
  var projectionEligible = yearCount >= 3 && dayTs.length >= 3;

  return {
    monthEarned: monthEarned, monthCount: monthCount,
    yearCount: yearCount, yearAvg: yearAvg, yearTotalMs: yearMs,
    longest: longest, priciest: priciest,
    bestWeekdayIdx: bestWeekdayIdx,
    bestWeekdayTs: bestWeekdayIdx >= 0 ? weekdayRepTs[bestWeekdayIdx] : null,
    weekdayEarned: weekdayEarned, // Sonntag-indiziert (JS Date#getDay()), 0=So..6=Sa
    currentStreak: currentStreak, bestStreak: bestStreak,
    projectionEligible: projectionEligible,
    projection: projectionEligible ? (yearEarned / daysElapsed) * daysInYear : null
  };
}

// Tages-Heatmap fürs laufende Kalenderjahr (Montag-Start): ein Eintrag pro Kalendertag von
// 1. Jan bis 31. Dez, außerdem in Wochen-Spalten gruppiert fürs Grid-Rendering. Intensitätsstufe
// 0-4 relativ zum verdienststärksten Tag des Jahres (0 nur bei exakt 0 €).
export function yearHeatmap(sessions, now) {
  now = now || new Date();
  var nowMs = now.getTime();
  sessions = sessions.filter(function (s) { return s.ts <= nowMs; }); // keine Zukunfts-Sessions in der Heatmap einfärben
  var year = now.getFullYear();

  var byDay = {};
  sessions.forEach(function (s) {
    var d = new Date(s.ts);
    if (d.getFullYear() !== year) return;
    var key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    var entry = byDay[key] || (byDay[key] = { earned: 0, count: 0, durationMs: 0 });
    entry.earned += s.earned;
    entry.count += 1;
    entry.durationMs += s.durationMs;
  });

  var days = [], maxEarned = 0;
  var cursor = new Date(year, 0, 1);
  var end = new Date(year, 11, 31).getTime();
  while (cursor.getTime() <= end) {
    var key2 = cursor.getFullYear() + '-' + cursor.getMonth() + '-' + cursor.getDate();
    var e = byDay[key2];
    var earned = e ? e.earned : 0;
    if (earned > maxEarned) maxEarned = earned;
    days.push({
      ts: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()).getTime(),
      earned: earned, count: e ? e.count : 0, durationMs: e ? e.durationMs : 0
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  days.forEach(function (day) {
    day.level = day.earned <= 0 ? 0 : Math.min(4, Math.ceil((day.earned / maxEarned) * 4));
  });

  // Montag = erste Zeile. Führende/folgende Lücken (vor dem 1. Jan / nach dem 31. Dez) werden mit null aufgefüllt.
  var firstWeekday = (new Date(year, 0, 1).getDay() + 6) % 7; // 0=Mo ... 6=So
  var weeks = [], col = [];
  for (var i = 0; i < firstWeekday; i++) col.push(null);
  days.forEach(function (day) {
    col.push(day);
    if (col.length === 7) { weeks.push(col); col = []; }
  });
  if (col.length) {
    while (col.length < 7) col.push(null);
    weeks.push(col);
  }

  return { days: days, weeks: weeks, maxEarned: maxEarned };
}

// ---------- CSV Export / Import ----------
function csvNum(v, dec) {
  var out = v.toFixed(dec);
  return getLang() === 'de' ? out.replace('.', ',') : out;
}
function actName(key) {
  return key === 'smoke' ? t('activitySmoke') : key === 'coffee' ? t('activityCoffee') : t('activityPoop');
}
function actFromLabel(x) {
  var s = String(x || '').trim().toLowerCase();
  if (/^(rauchen|smoking|smoke)$/.test(s)) return 'smoke';
  if (/^(kaffee|coffee)$/.test(s)) return 'coffee';
  return 'poop';
}

export function csvFromSessions(sessions) {
  var lines = [t('csvHeader')];
  sessions.slice().sort(function (a, b) { return a.ts - b.ts; }).forEach(function (s) {
    var d = new Date(s.ts);
    lines.push(
      d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ';' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ';' +
      Math.round(s.durationMs / 1000) + ';' +
      csvNum(s.earned, 4) + ';' +
      csvNum(s.rate || 0, 2) + ';' +
      (s.manual ? t('csvYes') : t('csvNo')) + ';' +
      (typeof s.net === 'number' ? csvNum(s.net, 4) : '') + ';' +
      (typeof s.ded === 'number' ? csvNum(s.ded, 4) : '') + ';' +
      actName(actKeyOf(s.activity))
    );
  });
  return lines.join('\n');
}

function parseCsvNumber(x) { return parseFloat(String(x).trim().replace(',', '.')); }

export function parseCsv(text, fallbackRate) {
  var rows = [];
  var lines = String(text).split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var sep = line.indexOf(';') >= 0 ? ';' : ',';
    var cells = line.split(sep).map(function (c) { return c.trim(); });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cells[0])) continue; // Kopfzeile oder unlesbar
    if (cells.length < 3) continue;
    var ts = new Date(cells[0] + 'T' + (cells[1] || '12:00')).getTime();
    var durSec = parseCsvNumber(cells[2]);
    if (!isFinite(ts) || !(durSec > 0)) continue;
    var rate = parseCsvNumber(cells[4]);
    if (!isFinite(rate) || rate < 0) rate = fallbackRate || 0;
    var earned = parseCsvNumber(cells[3]);
    if (!isFinite(earned) || earned < 0) earned = (durSec / 3600) * rate;
    var row = {
      ts: ts,
      durationMs: Math.round(durSec * 1000),
      earned: earned,
      rate: rate,
      manual: /^(ja|yes)$/i.test(String(cells[5] || '').trim()),
      activity: actFromLabel(cells[8])
    };
    var net = parseCsvNumber(cells[6]);
    var ded = parseCsvNumber(cells[7]);
    if (isFinite(net) && net >= 0) row.net = net;
    if (isFinite(ded) && ded >= 0) row.ded = ded;
    rows.push(row);
  }
  return rows;
}

// Aktivität und (auf CSV-Exportgenauigkeit gerundeter) Verdienst fließen mit ein, damit zwei
// verschiedene Sessions mit zufällig gleichem Zeitpunkt/gleicher Dauer nicht als Duplikat gelten.
export function sessionKey(ts, durationMs, activity, earned) {
  var key = Math.round(ts / 1000) + '_' + Math.round(durationMs / 1000);
  if (activity !== undefined) key += '_' + actKeyOf(activity);
  if (earned !== undefined) key += '_' + Math.round((earned || 0) * 10000);
  return key;
}
