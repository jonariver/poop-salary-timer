// ---------- Sprache / i18n ----------
// Everything that depends on the current language or locale: the translation
// dictionary, the Intl formatter instances, and locale-aware text formatting.
import { getLang as storedLang, saveLang } from './storage.js';

var lang = storedLang() === 'en' ? 'en' : 'de';

var STR = {
  de: {
    tagline: 'Zeit ist Geld. Auch hier.',
    setupTitle: 'Was verdienst du eigentlich?',
    modeMonthly: 'Monatslohn', modeHourly: 'Stundenlohn',
    lblMonthly: 'Monatslohn (brutto oder netto — deine Wahl) in €',
    lblHours: 'Arbeitsstunden pro Woche',
    lblRate: 'Stundenlohn in €',
    phMonthly: 'z. B. 3200', phHours: 'z. B. 40', phRate: 'z. B. 18,50',
    derivedPre: 'Das macht ', derivedPost: ' pro Stunde. Jede Minute dort drin: bares Geld.',
    formError: 'Bitte gib gültige Werte ein.',
    btnSaveFirst: 'Speichern & loslegen', btnSaveChanges: 'Änderungen speichern',
    privacyNote: '🔒 Alles bleibt auf deinem Gerät. Dein Lohn wird nur lokal im Browser gespeichert — kein Server, kein Konto, keine neugierigen Blicke.',
    chipTitle: 'Verdienst ändern',
    activityPickerLabel: 'Aktivität wählen',
    achCategoryPickerLabel: 'Kategorie wählen',
    activityPoop: 'Kacken', activitySmoke: 'Rauchen', activityCoffee: 'Kaffee',
    stateReady: 'Bereit', stateRunning: 'Es läuft 💸', statePaused: 'Pausiert',
    btnStart: 'Start', btnResume: 'Weiter',
    holdHint: 'Kurz drücken: Pause &nbsp;·&nbsp; Gedrückt halten: Sitzung beenden',
    sumKDuration: 'Sitzungsdauer', sumKEarned: 'Verdient',
    btnSaveSession: 'Session speichern', btnShareSession: '📤 Teilen', btnDiscard: 'Verwerfen',
    h2Balance: 'Deine Bilanz 📈',
    statKTotal: 'Gesamt verdient', statKTime: 'Gesamtzeit', statKCount: 'Sitzungen', statKAvg: 'Ø pro Sitzung',
    h2Year: 'Dein Geschäftsjahr 🧾',
    statKMonthEarned: 'Verdienst diesen Monat', statKMonthCount: 'Sitzungen diesen Monat',
    statKYearAvg: 'Ø pro Sitzung (Jahr)', statKBestWeekday: 'Bester Wochentag',
    statKLongest: 'Längste Sitzung', statKPriciest: 'Teuerste Sitzung',
    statKYearTime: 'Gesamtzeit (Jahr)', statKStreak: 'Aktuelle Serie', statKBestStreak: 'Beste Serie (Jahr)',
    yearProjectionPre: 'Hochgerechnet aufs Jahr: ',
    yearNotEnoughData: 'Noch wenig Daten für eine Hochrechnung — sammle ein paar Sitzungen an verschiedenen Tagen. 🌱',
    h2Heatmap: 'Sitzungs-Heatmap 🔥',
    heatmapLess: 'Weniger', heatmapMore: 'Mehr',
    heatmapDetailHint: 'Tippe auf einen Tag, um Details zu sehen.',
    heatmapDetailNone: function (dateStr) { return dateStr + ' — keine Sitzung.'; },
    heatmapDetailSome: function (dateStr, count, durWords, earnedStr) {
      return dateStr + ' — ' + count + ' Sitzung' + (count === 1 ? '' : 'en') + ' · ' + durWords + ' · ' + earnedStr;
    },
    h2Sessions: 'Sitzungen', btnBackfill: '+ Nachtragen',
    lblDate: 'Datum', lblTime: 'Uhrzeit', lblDuration: 'Dauer in Minuten', phDuration: 'z. B. 12',
    bfDerivedPre: 'Macht ', bfDerivedPost: ' — nachträglich, aber verdient.',
    bfError: 'Bitte Datum, Uhrzeit und Dauer angeben.',
    bfErrorFuture: 'Diese Sitzung liegt in der Zukunft.',
    btnBfSave: 'Eintragen', btnCancel: 'Abbrechen',
    emptyHistory: 'Noch keine gespeicherten Sitzungen.<br>Dein erstes Geschäft wartet.',
    btnExport: '⬇️ CSV exportieren', btnImport: '⬆️ CSV importieren',
    exportReminderTextNever: 'Denk dran: Deine Daten liegen nur in diesem Browser — du hast sie noch nie exportiert.',
    exportReminderTextDays: function (days) { return 'Denk dran: Deine Daten liegen nur in diesem Browser — zuletzt vor ' + days + ' Tag' + (days === 1 ? '' : 'en') + ' exportiert.'; },
    btnExportNow: 'Jetzt exportieren', exportReminderDismissAria: 'Erinnerung schließen',
    h2Achievements: 'Erfolge 🏆', btnShareAch: '📤 Erfolge teilen',
    importTitle: 'CSV importieren ⬆️',
    importHint: 'Datei auswählen oder CSV-Inhalt unten einfügen. Erwartetes Format wie beim Export: Datum;Uhrzeit;Dauer (Sekunden);Verdient (EUR);Stundenlohn (EUR);Nachgetragen',
    importError: 'Keine gültigen Zeilen gefunden.',
    btnImportRun: 'Importieren',
    shareTitleDefault: 'Zum Teilen kopieren 📤', btnCopy: 'Kopieren', btnClose: 'Schließen',
    toastUnlocked: 'Erfolg freigeschaltet',
    toastCopied: 'In die Zwischenablage kopiert 📋',
    toastShareImageReady: 'Teilen ist bereit — tippe noch einmal auf Teilen 📤',
    toastNoExport: 'Keine Sitzungen zum Exportieren 🤷',
    toastExported: 'CSV heruntergeladen ✅',
    toastExportFailed: 'Export fehlgeschlagen ❌',
    csvHeader: 'Datum;Uhrzeit;Dauer (Sekunden);Verdient (EUR);Stundenlohn (EUR);Nachgetragen;Netto (EUR);Abzug (EUR);Aktivität',
    csvYes: 'ja', csvNo: 'nein',
    tabTimer: '⏱️ Timer', tabHistory: '📊 Verlauf', tabYear: '📅 Jahr', tabAchievements: '🏆 Erfolge', tabSettings: '⚙️ Daten',
    tagBackfilled: 'nachgetragen', clockSuffix: ' Uhr', delAria: 'Sitzung löschen',
    unitSec: ' Sek.', unitMin: ' Min.', unitHour: ' Std. ',
    unitDays: 'Tagen', unitMinShort: 'Min.', bestTime: 'Bestzeit ',
    unitHourShort: ' Std.', unitDaysShort: ' Tage',
    taxTitle: 'Netto-Schätzung (optional) 🧾',
    lblTaxClass: 'Steuerklasse', taxNone: '– (nur Brutto)',
    lblChurch: 'Kirchensteuer',
    lblDedLabel: 'Überschrift für den Abzugsblock',
    dedLabelDefault: 'Davon schnappt sich der Staat:',
    taxHint: 'Vereinfachte Näherung (Steuertarif-Schätzung + pauschal 20,5 % Sozialabgaben), keine amtliche Lohnsteuertabelle. Beim Stundenlohn-Modus wird eine 40-Stunden-Woche angenommen, falls keine Wochenstunden bekannt sind.',
    netLabel: 'Netto', sumKGross: 'Brutto', sumKNet: 'Netto', sumKDed: 'Abzug',
    statKNet: 'Netto gesamt', statKDed: 'Abzug gesamt',
    dedLst: 'Lohnsteuer', dedSoli: 'Soli', dedChurch: 'Kirchensteuer', dedSv: 'Sozialversicherung',
    fundedTitle: 'Damit hast du finanziert:',
    fundedDisclaimer: 'Augenzwinkernde Schätzung, kein echter Haushaltsbezug.',
    fundedItems: ['Bürgergeld-Regelsatz (1 Person)', 'NGO-Projektstelle', 'Ukraine-Hilfe (Deutschland gesamt)'],
    summarySub: function (dur) { return 'Du warst ' + dur + ' auf Firmenkosten unterwegs.'; },
    titles: {
      poop: ['Sauberes Geschäft.', 'Sitzung erfolgreich beendet.', 'Das lief sauber durch.', 'Feierabend auf dem Thron.', 'Erledigt. Im besten Sinne.'],
      smoke: ['Kurze Pause, gut bezahlt.', 'Rauchpause abgerechnet.', 'Das ging in Rauch auf — profitabel.', 'Feierabend am Aschenbecher.', 'Erledigt. Im besten Sinne.'],
      coffee: ['Kaffeepause abgerechnet.', 'Kurzer Break, voller Lohn.', 'Tasse leer, Konto voller.', 'Feierabend an der Kaffeemaschine.', 'Erledigt. Im besten Sinne.']
    },
    factNothing: {
      poop: 'Das reicht noch für nichts — aber Rom wurde auch nicht an einem Klogang erbaut.',
      smoke: 'Das reicht noch für nichts — aber Rom wurde auch nicht in einer Rauchpause erbaut.',
      coffee: 'Das reicht noch für nichts — aber Rom wurde auch nicht in einer Kaffeepause erbaut.'
    },
    factPct: function (pct, item) { return 'Das sind schon ' + pct + ' % von ' + item + '. Dranbleiben!'; },
    factOne: function (item) { return 'Dafür gibt es ' + item + '. Wohl verdient!'; },
    factMany: function (n, items) { return 'Dafür gibt es ' + n + ' ' + items + '. Wohl verdient!'; },
    comparisons: [
      { price: 0.75, singular: 'ein Brötchen', plural: 'Brötchen' },
      { price: 1.5,  singular: 'eine Butterbrezel', plural: 'Butterbrezeln' },
      { price: 2.2,  singular: 'einen Espresso', plural: 'Espressi' },
      { price: 4.5,  singular: 'einen Cappuccino to go', plural: 'Cappuccini to go' },
      { price: 8,    singular: 'einen Döner', plural: 'Döner' },
      { price: 13,   singular: 'ein Kinoticket', plural: 'Kinotickets' }
    ],
    shareSession: function (activity, dur, money, fact) {
      var line = activity === 'smoke'
        ? 'Ich war ' + dur + ' rauchen und habe dabei ' + money + ' verdient. 💸'
        : activity === 'coffee'
          ? 'Ich war ' + dur + ' Kaffee trinken und habe dabei ' + money + ' verdient. 💸'
          : 'Ich war ' + dur + ' auf dem Thron und habe dabei ' + money + ' verdient. 💸';
      return '💩 Poop Salary Timer\n' + line + '\n' + fact;
    },
    shareAchTitle: function (cat, n, total) {
      var label = cat === 'smoke' ? 'Rauch' : cat === 'coffee' ? 'Kaffee' : 'Klo';
      return '🏆 Meine ' + label + '-Erfolge (' + n + '/' + total + '):\n';
    },
    shareAchNone: 'Noch keine — aber das Sitzungsjahr ist noch lang.',
    shareAchFooter: '\n— gemessen mit dem Poop Salary Timer 💩',
    toastImported: function (added, skipped) { return added + ' Sitzung' + (added === 1 ? '' : 'en') + ' importiert' + (skipped ? ' · ' + skipped + ' übersprungen' : '') + ' ✅'; },
    whatsNewAria: 'Neuigkeiten',
    whatsNewTitle: "Was gibt's Neues 🎉",
    milestones: [
      { emoji: '☕', label: 'Kaffee' },
      { emoji: '🥙', label: 'Döner' },
      { emoji: '🎬', label: 'Kinoticket' },
      { emoji: '🍺', label: 'Bierkasten' },
      { emoji: '🎧', label: 'AirPods' },
      { emoji: '🎮', label: 'PS5' }
    ],
    milestoneReached: function (emoji, label) { return emoji + ' ' + label + ' finanziert!'; },
    milestoneNext: function (amount, emoji, label) { return 'Noch ' + amount + ' bis zum nächsten Meilenstein: ' + emoji + ' ' + label; }
  },
  en: {
    tagline: 'Time is money. Even here.',
    setupTitle: 'So, what do you earn?',
    modeMonthly: 'Monthly salary', modeHourly: 'Hourly wage',
    lblMonthly: 'Monthly salary (gross or net — your call) in €',
    lblHours: 'Working hours per week',
    lblRate: 'Hourly wage in €',
    phMonthly: 'e.g. 3200', phHours: 'e.g. 40', phRate: 'e.g. 18.50',
    derivedPre: 'That makes ', derivedPost: ' per hour. Every minute in there: cold, hard cash.',
    formError: 'Please enter valid values.',
    btnSaveFirst: 'Save & get going', btnSaveChanges: 'Save changes',
    privacyNote: '🔒 Everything stays on your device. Your salary is stored only locally in your browser — no server, no account, no prying eyes.',
    chipTitle: 'Change earnings',
    activityPickerLabel: 'Choose activity',
    achCategoryPickerLabel: 'Choose category',
    activityPoop: 'Pooping', activitySmoke: 'Smoking', activityCoffee: 'Coffee',
    stateReady: 'Ready', stateRunning: 'Earning 💸', statePaused: 'Paused',
    btnStart: 'Start', btnResume: 'Resume',
    holdHint: 'Tap: pause &nbsp;·&nbsp; Press and hold: end session',
    sumKDuration: 'Session length', sumKEarned: 'Earned',
    btnSaveSession: 'Save session', btnShareSession: '📤 Share', btnDiscard: 'Discard',
    h2Balance: 'Your balance 📈',
    statKTotal: 'Total earned', statKTime: 'Total time', statKCount: 'Sessions', statKAvg: 'Avg per session',
    h2Year: 'Your business year 🧾',
    statKMonthEarned: 'Earned this month', statKMonthCount: 'Sessions this month',
    statKYearAvg: 'Avg per session (year)', statKBestWeekday: 'Best weekday',
    statKLongest: 'Longest session', statKPriciest: 'Priciest session',
    statKYearTime: 'Total time (year)', statKStreak: 'Current streak', statKBestStreak: 'Best streak (year)',
    yearProjectionPre: 'Projected for the year: ',
    yearNotEnoughData: 'Not enough data yet for a projection — log a few sessions on different days. 🌱',
    h2Heatmap: 'Session heatmap 🔥',
    heatmapLess: 'Less', heatmapMore: 'More',
    heatmapDetailHint: 'Tap a day to see details.',
    heatmapDetailNone: function (dateStr) { return dateStr + ' — no session.'; },
    heatmapDetailSome: function (dateStr, count, durWords, earnedStr) {
      return dateStr + ' — ' + count + ' session' + (count === 1 ? '' : 's') + ' · ' + durWords + ' · ' + earnedStr;
    },
    h2Sessions: 'Sessions', btnBackfill: '+ Add missed one',
    lblDate: 'Date', lblTime: 'Time', lblDuration: 'Duration in minutes', phDuration: 'e.g. 12',
    bfDerivedPre: 'Makes ', bfDerivedPost: ' — belated, but well earned.',
    bfError: 'Please provide date, time and duration.',
    bfErrorFuture: 'This session is in the future.',
    btnBfSave: 'Add session', btnCancel: 'Cancel',
    emptyHistory: 'No saved sessions yet.<br>Your first business awaits.',
    btnExport: '⬇️ Export CSV', btnImport: '⬆️ Import CSV',
    exportReminderTextNever: "Reminder: your data only lives in this browser — you've never exported it.",
    exportReminderTextDays: function (days) { return 'Reminder: your data only lives in this browser — last exported ' + days + ' day' + (days === 1 ? '' : 's') + ' ago.'; },
    btnExportNow: 'Export now', exportReminderDismissAria: 'Dismiss reminder',
    h2Achievements: 'Achievements 🏆', btnShareAch: '📤 Share achievements',
    importTitle: 'Import CSV ⬆️',
    importHint: 'Pick a file or paste CSV content below. Expected format matches the export: Date;Time;Duration (seconds);Earned (EUR);Hourly wage (EUR);Backfilled',
    importError: 'No valid rows found.',
    btnImportRun: 'Import',
    shareTitleDefault: 'Copy to share 📤', btnCopy: 'Copy', btnClose: 'Close',
    toastUnlocked: 'Achievement unlocked',
    toastCopied: 'Copied to clipboard 📋',
    toastShareImageReady: 'Sharing is ready — tap Share once more 📤',
    toastNoExport: 'No sessions to export 🤷',
    toastExported: 'CSV downloaded ✅',
    toastExportFailed: 'Export failed ❌',
    csvHeader: 'Date;Time;Duration (seconds);Earned (EUR);Hourly wage (EUR);Backfilled;Net (EUR);Deduction (EUR);Activity',
    csvYes: 'yes', csvNo: 'no',
    tabTimer: '⏱️ Timer', tabHistory: '📊 History', tabYear: '📅 Year', tabAchievements: '🏆 Awards', tabSettings: '⚙️ Data',
    tagBackfilled: 'backfilled', clockSuffix: '', delAria: 'Delete session',
    unitSec: ' sec', unitMin: ' min', unitHour: ' h ',
    unitDays: 'days', unitMinShort: 'min', bestTime: 'Best time ',
    unitHourShort: ' h', unitDaysShort: ' days',
    taxTitle: 'Net estimate (optional) 🧾',
    lblTaxClass: 'Tax class (Germany)', taxNone: '– (gross only)',
    lblChurch: 'Church tax',
    lblDedLabel: 'Headline for the deduction block',
    dedLabelDefault: "The taxman's cut:",
    taxHint: 'Simplified approximation (estimated tax tariff + flat 20.5% social contributions), not an official payroll tax table. In hourly mode a 40-hour week is assumed if no weekly hours are known.',
    netLabel: 'Net', sumKGross: 'Gross', sumKNet: 'Net', sumKDed: 'Deducted',
    statKNet: 'Total net', statKDed: 'Total deducted',
    dedLst: 'Income tax', dedSoli: 'Solidarity surcharge', dedChurch: 'Church tax', dedSv: 'Social security',
    fundedTitle: 'With that you funded:',
    fundedDisclaimer: 'Tongue-in-cheek estimate, no actual budget reference.',
    fundedItems: ["Citizen's benefit rate (1 person)", 'NGO project position', 'Ukraine aid (Germany total)'],
    summarySub: function (dur) { return 'You spent ' + dur + ' on company time.'; },
    titles: {
      poop: ['Clean business.', 'Session completed successfully.', 'That went smoothly.', 'Clocking out of the throne room.', 'Done. In the best sense.'],
      smoke: ['Short break, well paid.', 'Smoke break, invoiced.', 'That went up in smoke — profitably.', 'Clocking out at the ashtray.', 'Done. In the best sense.'],
      coffee: ['Coffee break, invoiced.', 'Short break, full pay.', 'Cup empty, wallet fuller.', 'Clocking out at the coffee machine.', 'Done. In the best sense.']
    },
    factNothing: {
      poop: "That buys you nothing yet — but Rome wasn't built in one bathroom break either.",
      smoke: "That buys you nothing yet — but Rome wasn't built in one smoke break either.",
      coffee: "That buys you nothing yet — but Rome wasn't built in one coffee break either."
    },
    factPct: function (pct, item) { return "That's already " + pct + '% of ' + item + '. Keep going!'; },
    factOne: function (item) { return 'That buys you ' + item + '. Well earned!'; },
    factMany: function (n, items) { return 'That buys you ' + n + ' ' + items + '. Well earned!'; },
    comparisons: [
      { price: 0.75, singular: 'a bread roll', plural: 'bread rolls' },
      { price: 1.5,  singular: 'a soft pretzel', plural: 'soft pretzels' },
      { price: 2.2,  singular: 'an espresso', plural: 'espressos' },
      { price: 4.5,  singular: 'a cappuccino to go', plural: 'cappuccinos to go' },
      { price: 8,    singular: 'a kebab', plural: 'kebabs' },
      { price: 13,   singular: 'a movie ticket', plural: 'movie tickets' }
    ],
    shareSession: function (activity, dur, money, fact) {
      var line = activity === 'smoke'
        ? 'I spent ' + dur + ' smoking and earned ' + money + '. 💸'
        : activity === 'coffee'
          ? 'I spent ' + dur + ' on a coffee break and earned ' + money + '. 💸'
          : 'I spent ' + dur + ' on the throne and earned ' + money + '. 💸';
      return '💩 Poop Salary Timer\n' + line + '\n' + fact;
    },
    shareAchTitle: function (cat, n, total) {
      var label = cat === 'smoke' ? 'Smoking' : cat === 'coffee' ? 'Coffee' : 'Toilet';
      return '🏆 My ' + label + ' achievements (' + n + '/' + total + '):\n';
    },
    shareAchNone: 'None yet — but the fiscal year on the throne is long.',
    shareAchFooter: '\n— measured with the Poop Salary Timer 💩',
    toastImported: function (added, skipped) { return added + ' session' + (added === 1 ? '' : 's') + ' imported' + (skipped ? ' · ' + skipped + ' skipped' : '') + ' ✅'; },
    whatsNewAria: "What's new",
    whatsNewTitle: "What's New 🎉",
    milestones: [
      { emoji: '☕', label: 'Coffee' },
      { emoji: '🥙', label: 'Kebab' },
      { emoji: '🎬', label: 'Movie ticket' },
      { emoji: '🍺', label: 'Case of beer' },
      { emoji: '🎧', label: 'AirPods' },
      { emoji: '🎮', label: 'PS5' }
    ],
    milestoneReached: function (emoji, label) { return emoji + ' ' + label + ' funded!'; },
    milestoneNext: function (amount, emoji, label) { return 'Next milestone in ' + amount + ': ' + emoji + ' ' + label; }
  }
};

export function t(key) { return (STR[lang] && STR[lang][key] !== undefined ? STR[lang] : STR.de)[key]; }
export function getLang() { return lang; }
export function setLang(l) {
  lang = l;
  saveLang(l);
}

// ---------- Formatting (sprachabhaengig) ----------
var fmt2, fmt4, dateFmt, timeFmt, achDateFmt, weekdayFmt, monthShortFmt;
export function buildFormatters() {
  var loc = lang === 'en' ? 'en-GB' : 'de-DE';
  fmt2 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR' });
  fmt4 = new Intl.NumberFormat(loc, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  dateFmt = new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric', month: 'short' });
  timeFmt = new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit' });
  achDateFmt = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' });
  weekdayFmt = new Intl.DateTimeFormat(loc, { weekday: 'long' });
  monthShortFmt = new Intl.DateTimeFormat(loc, { month: 'short' });
}
buildFormatters();
export function getDateFmt() { return dateFmt; }
export function getTimeFmt() { return timeFmt; }
export function getAchDateFmt() { return achDateFmt; }
export function fmtWeekdayLong(ts) { return weekdayFmt.format(new Date(ts)); }
export function fmtMonthShort(ts) { return monthShortFmt.format(new Date(ts)); }

export function fmtMoneyLive(v) { return fmt4.format(v) + ' €'; }
export function fmtMoney(v) { return fmt2.format(v); }
export function pad(n) { return (n < 10 ? '0' : '') + n; }
export function fmtElapsed(ms) {
  var s = Math.floor(ms / 1000);
  var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? h + ':' + pad(m) + ':' + pad(sec) : pad(m) + ':' + pad(sec);
}
export function fmtDurationWords(ms) {
  var totalMin = Math.round(ms / 60000);
  if (totalMin < 1) return Math.round(ms / 1000) + t('unitSec');
  var h = Math.floor(totalMin / 60), m = totalMin % 60;
  if (h > 0) return h + t('unitHour') + m + t('unitMin');
  return totalMin + t('unitMin');
}
export function fmtFunded(sec) {
  function num(v, d) { var o = v.toFixed(d); return lang === 'de' ? o.replace('.', ',') : o; }
  if (sec < 1) return num(sec, 2) + t('unitSec');
  if (sec < 90) return Math.round(sec) + t('unitSec');
  if (sec < 5400) return Math.round(sec / 60) + t('unitMin');
  if (sec < 172800) return num(sec / 3600, 1) + t('unitHourShort');
  return Math.round(sec / 86400) + t('unitDaysShort');
}
export function fmtMilestoneMessage(status) {
  var milestones = t('milestones');
  var parts = [];
  if (status.reachedIndex >= 0) {
    var reached = milestones[status.reachedIndex];
    parts.push(t('milestoneReached')(reached.emoji, reached.label));
  }
  if (status.remaining !== null) {
    var next = milestones[status.reachedIndex + 1];
    parts.push(t('milestoneNext')(fmtMoney(status.remaining), next.emoji, next.label));
  }
  return parts.join(' · ');
}
export function funFact(earned, activity) {
  if (earned < 0.05) { var variants = t('factNothing'); return variants[activity] || variants.poop; }
  var comparisons = t('comparisons');
  var best = null;
  for (var i = 0; i < comparisons.length; i++) {
    var c = comparisons[i];
    if (earned >= c.price) best = c;
  }
  if (!best) {
    var cheapest = comparisons[0];
    var pct = Math.round((earned / cheapest.price) * 100);
    return t('factPct')(pct, cheapest.singular);
  }
  var n = Math.floor(earned / best.price);
  return n === 1 ? t('factOne')(best.singular) : t('factMany')(n, best.plural);
}

// ---------- Sprachumschalter: DOM-Bindungen für statischen Text ----------
var BINDINGS = [
  ['.tagline', 'tagline'],
  ['#view-setup h2', 'setupTitle'],
  ['#mode-monthly', 'modeMonthly'],
  ['#mode-hourly', 'modeHourly'],
  ['label[for="inp-monthly"]', 'lblMonthly'],
  ['label[for="inp-hours"]', 'lblHours'],
  ['label[for="inp-rate"]', 'lblRate'],
  ['#inp-monthly', 'phMonthly', 'placeholder'],
  ['#inp-hours', 'phHours', 'placeholder'],
  ['#inp-rate', 'phRate', 'placeholder'],
  ['#act-poop .act-name', 'activityPoop'],
  ['#act-smoke .act-name', 'activitySmoke'],
  ['#act-coffee .act-name', 'activityCoffee'],
  ['#ach-cat-poop .act-name', 'activityPoop'],
  ['#ach-cat-smoke .act-name', 'activitySmoke'],
  ['#ach-cat-coffee .act-name', 'activityCoffee'],
  ['#derived-pre', 'derivedPre'],
  ['#derived-post', 'derivedPost'],
  ['#form-error', 'formError'],
  ['#tax-title', 'taxTitle'],
  ['#lbl-taxclass', 'lblTaxClass'],
  ['#inp-taxclass option[value=""]', 'taxNone'],
  ['#lbl-church', 'lblChurch'],
  ['#lbl-dedlabel', 'lblDedLabel'],
  ['#inp-dedlabel', 'dedLabelDefault', 'placeholder'],
  ['#tax-hint', 'taxHint'],
  ['#stat-k-net', 'statKNet'],
  ['#stat-k-ded', 'statKDed'],
  ['#sum-k-net', 'sumKNet'],
  ['#sum-k-ded', 'sumKDed'],
  ['.privacy-note', 'privacyNote'],
  ['#chip-rate', 'chipTitle', 'title'],
  ['#sum-k-duration', 'sumKDuration'],
  ['#sum-k-earned', 'sumKEarned'],
  ['#btn-save-session', 'btnSaveSession'],
  ['#btn-share-session', 'btnShareSession'],
  ['#btn-discard-session', 'btnDiscard'],
  ['#h2-balance', 'h2Balance'],
  ['#stat-k-total', 'statKTotal'],
  ['#stat-k-time', 'statKTime'],
  ['#stat-k-count', 'statKCount'],
  ['#stat-k-avg', 'statKAvg'],
  ['#h2-year', 'h2Year'],
  ['#stat-k-month-earned', 'statKMonthEarned'],
  ['#stat-k-month-count', 'statKMonthCount'],
  ['#stat-k-year-avg', 'statKYearAvg'],
  ['#stat-k-best-weekday', 'statKBestWeekday'],
  ['#stat-k-longest', 'statKLongest'],
  ['#stat-k-priciest', 'statKPriciest'],
  ['#stat-k-year-time', 'statKYearTime'],
  ['#stat-k-streak', 'statKStreak'],
  ['#stat-k-best-streak', 'statKBestStreak'],
  ['#year-projection-pre', 'yearProjectionPre'],
  ['#year-not-enough-data', 'yearNotEnoughData'],
  ['#h2-heatmap', 'h2Heatmap'],
  ['#heatmap-legend-less', 'heatmapLess'],
  ['#heatmap-legend-more', 'heatmapMore'],
  ['#h2-sessions', 'h2Sessions'],
  ['#btn-show-backfill', 'btnBackfill'],
  ['label[for="bf-date"]', 'lblDate'],
  ['label[for="bf-time"]', 'lblTime'],
  ['label[for="bf-duration"]', 'lblDuration'],
  ['#bf-duration', 'phDuration', 'placeholder'],
  ['#bf-derived-pre', 'bfDerivedPre'],
  ['#bf-derived-post', 'bfDerivedPost'],
  ['#bf-error', 'bfError'],
  ['#bf-save', 'btnBfSave'],
  ['#bf-cancel', 'btnCancel'],
  ['#empty-history-text', 'emptyHistory', 'html'],
  ['#btn-export-csv', 'btnExport'],
  ['#btn-import-csv', 'btnImport'],
  ['#h2-achievements', 'h2Achievements'],
  ['#btn-share-achievements', 'btnShareAch'],
  ['#import-title', 'importTitle'],
  ['#import-hint', 'importHint'],
  ['#import-error', 'importError'],
  ['#import-run', 'btnImportRun'],
  ['#import-cancel', 'btnCancel'],
  ['#share-copy', 'btnCopy'],
  ['#share-close', 'btnClose'],
  ['#ach-toast-label', 'toastUnlocked'],
  ['#whatsnew-btn', 'whatsNewAria', 'title'],
  ['#whatsnew-title', 'whatsNewTitle'],
  ['#whatsnew-close', 'btnClose'],
  ['#tab-timer', 'tabTimer'],
  ['#tab-history', 'tabHistory'],
  ['#tab-year', 'tabYear'],
  ['#tab-achievements', 'tabAchievements'],
  ['#tab-settings', 'tabSettings']
];

export function applyBindings() {
  document.documentElement.lang = lang;
  document.getElementById('lang-de').setAttribute('aria-pressed', String(lang === 'de'));
  document.getElementById('lang-en').setAttribute('aria-pressed', String(lang === 'en'));
  BINDINGS.forEach(function (b) {
    var el = document.querySelector(b[0]);
    if (!el) return;
    var val = t(b[1]);
    if (b[2] === 'placeholder' || b[2] === 'title') el.setAttribute(b[2], val);
    else if (b[2] === 'html') el.innerHTML = val;
    else el.textContent = val;
  });
  document.getElementById('activity-picker').setAttribute('aria-label', t('activityPickerLabel'));
  document.getElementById('ach-category-picker').setAttribute('aria-label', t('achCategoryPickerLabel'));
  document.getElementById('whatsnew-btn').setAttribute('aria-label', t('whatsNewAria'));
}
