// ---------- Timer state ----------
// active = {accumulatedMs, startTs, activity}  — startTs !== null means running
import { getActive as loadActive, saveActive, clearActive } from './storage.js';

var active = loadActive() || null;

export function getActive() { return active; }

export function elapsedMs() {
  if (!active) return 0;
  return active.accumulatedMs + (active.startTs ? (Date.now() - active.startTs) : 0);
}

export function startOrResume(activityKeyForNewSession) {
  if (!active) active = { accumulatedMs: 0, startTs: Date.now(), activity: activityKeyForNewSession };
  else active.startTs = Date.now();
  saveActive(active);
  return active;
}

export function pause() {
  if (active && active.startTs) {
    active.accumulatedMs += Date.now() - active.startTs;
    active.startTs = null;
    saveActive(active);
  }
}

export function end() {
  var durationMs = elapsedMs();
  var sessActivity = active ? active.activity : undefined;
  active = null;
  clearActive();
  return { durationMs: durationMs, activity: sessActivity };
}
