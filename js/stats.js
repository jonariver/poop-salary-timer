// ---------- Session statistics & CSV export/import ----------
import { t, getLang, pad } from './i18n.js';

export function actKeyOf(x) { return (x === 'smoke' || x === 'coffee') ? x : 'poop'; }

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
  var bestStreak = dayTs.length ? 1 : 0, cur = 1;
  for (var i = 1; i < dayTs.length; i++) {
    if (Math.round((dayTs[i] - dayTs[i - 1]) / 86400000) === 1) { cur++; if (cur > bestStreak) bestStreak = cur; }
    else cur = 1;
  }
  return {
    count: sessions.length, totalEarned: totalEarned, maxDuration: maxDuration,
    hasEarly: hasEarly, hasNight: hasNight, bestStreak: bestStreak,
    minEligibleMs: minEligibleMs, maxSameDay: maxSameDay, totalDed: totalDed
  };
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

export function sessionKey(ts, durationMs) { return Math.round(ts / 1000) + '_' + Math.round(durationMs / 1000); }
