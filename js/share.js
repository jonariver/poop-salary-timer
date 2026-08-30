var SHARE_IMAGES = {
  poop: '../assets/share/poop.png',
  smoke: '../assets/share/smoke.png',
  coffee: '../assets/share/coffee.png'
};
var shareImageFiles = {};

export function getShareImagePath(activity) {
  return SHARE_IMAGES[activity] || SHARE_IMAGES.poop;
}

function defaultDeps() {
  // fetch muss an globalThis gebunden bleiben: als bloße Referenz in ein Objekt gepackt und dann
  // als deps.fetch(...) aufgerufen, wirft Chrome sonst "Failed to execute 'fetch' on 'Window':
  // Illegal invocation" (native Funktion, Receiver-Check).
  return { navigator: navigator, fetch: fetch.bind(globalThis), File: File };
}

async function loadShareImageFile(activity, deps) {
  var cache = deps.cache || shareImageFiles;
  var file = cache[activity];
  if (file) return { file: file, loadedNow: false };
  var response = await deps.fetch(new URL(getShareImagePath(activity), import.meta.url));
  if (!response.ok) throw new Error('share image fetch failed: ' + response.status);
  var blob = await response.blob();
  file = new deps.File([blob], activity + '-salary-result.png', { type: blob.type || 'image/png' });
  cache[activity] = file;
  return { file: file, loadedNow: true };
}

// Lädt das Bild fürs Teilen schon im Hintergrund, bevor der Nutzer überhaupt auf "Teilen"
// tippt (z.B. sobald die Zusammenfassung nach Sitzungsende erscheint). Manche Browser (z.B.
// Brave auf Android) räumen der für navigator.share() nötigen Nutzer-Geste ein deutlich engeres
// Zeitfenster ein als Chrome — reicht das Laden des ~1-2MB-Bilds beim ersten Tap nicht mehr
// rechtzeitig, bräuchte es sonst einen zweiten Tap (siehe der 'ready'-Zweig unten). Best-effort:
// Fehler werden verschluckt, tryShareSessionImage versucht es beim eigentlichen Tap erneut.
export async function preloadShareImage(activity, dependencies) {
  var deps = dependencies || defaultDeps();
  try { await loadShareImageFile(activity, deps); } catch (err) { /* wird beim Tap erneut versucht */ }
}

export async function tryShareSessionImage(text, activity, dependencies) {
  var deps = dependencies || defaultDeps();
  if (!deps.navigator || typeof deps.navigator.share !== 'function' || typeof deps.navigator.canShare !== 'function') {
    return false;
  }
  var loaded;
  try {
    loaded = await loadShareImageFile(activity, deps);
  } catch (err) {
    return false;
  }
  var file = loaded.file;
  var shareData = { text: text, files: [file] };
  // Slow image loading can consume the transient user activation required by
  // the native share sheet. The cached file makes the next tap synchronous,
  // including a text-only fallback when this browser cannot share files.
  if (loaded.loadedNow && deps.navigator.userActivation && deps.navigator.userActivation.isActive === false) {
    return 'ready';
  }
  if (!deps.navigator.canShare({ files: [file] })) return false;
  await deps.navigator.share(shareData);
  return true;
}
