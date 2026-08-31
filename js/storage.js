// ---------- Storage (best-effort, all local) ----------
// The only module that touches localStorage directly. Keys and JSON shapes
// must stay exactly as they were pre-refactor — existing users' data depends on it.

var LS_SETTINGS = 'pst_settings';
var LS_SESSIONS = 'pst_sessions';
var LS_ACTIVE = 'pst_active';
var LS_ACTIVITY = 'pst_activity';
var LS_LANG = 'pst_lang';
var LS_REGION = 'pst_region';
var LS_ACHIEVEMENTS = 'pst_achievements';
var LS_ACH_CATEGORY = 'pst_ach_category';
var LS_WHATSNEW_SEEN = 'pst_whatsnew_seen';
var LS_LAST_EXPORT = 'pst_last_export';
var LS_EXPORT_REMINDER_DISMISSED = 'pst_export_reminder_dismissed';

function lsGet(key) {
  try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode etc. */ }
}
function lsDel(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}
function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

// Getter geben bei kaputten/falsch geformten Daten (z.B. `pst_sessions` versehentlich als `{}`
// statt Array) einen sicheren leeren Zustand zurück, statt den Wert unverändert durchzureichen —
// Aufrufer wie renderHistory() erwarten sonst z.B. ein Array und würden beim ersten .sort()/.map() crashen.
export function getSettings() { var v = lsGet(LS_SETTINGS); return isPlainObject(v) ? v : null; }
export function saveSettings(settings) { lsSet(LS_SETTINGS, settings); }

export function getSessions() { var v = lsGet(LS_SESSIONS); return Array.isArray(v) ? v : []; }
export function saveSessions(sessions) { lsSet(LS_SESSIONS, sessions); }

export function getActive() { var v = lsGet(LS_ACTIVE); return isPlainObject(v) ? v : null; }
export function saveActive(active) { lsSet(LS_ACTIVE, active); }
export function clearActive() { lsDel(LS_ACTIVE); }

export function getActivity() { return lsGet(LS_ACTIVITY); }
export function saveActivity(key) { lsSet(LS_ACTIVITY, key); }

export function getLang() { return lsGet(LS_LANG); }
export function saveLang(lang) { lsSet(LS_LANG, lang); }

export function getRegion() { return lsGet(LS_REGION); }
export function saveRegion(region) { lsSet(LS_REGION, region); }

export function getRawAchievements() { var v = lsGet(LS_ACHIEVEMENTS); return isPlainObject(v) ? v : null; }
export function saveAchievements(data) { lsSet(LS_ACHIEVEMENTS, data); }

export function getAchCategory() { return lsGet(LS_ACH_CATEGORY); }
export function saveAchCategory(key) { lsSet(LS_ACH_CATEGORY, key); }

export function getWhatsNewSeen() { return lsGet(LS_WHATSNEW_SEEN); }
export function saveWhatsNewSeen(id) { lsSet(LS_WHATSNEW_SEEN, id); }

export function getLastExport() { return lsGet(LS_LAST_EXPORT); }
export function saveLastExport(ts) { lsSet(LS_LAST_EXPORT, ts); }

export function getExportReminderDismissed() { return lsGet(LS_EXPORT_REMINDER_DISMISSED); }
export function saveExportReminderDismissed(ts) { lsSet(LS_EXPORT_REMINDER_DISMISSED, ts); }
