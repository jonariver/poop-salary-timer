var SHARE_IMAGES = {
  poop: '../assets/share/poop.png',
  smoke: '../assets/share/smoke.png',
  coffee: '../assets/share/coffee.png'
};
var shareImageFiles = {};

export function getShareImagePath(activity) {
  return SHARE_IMAGES[activity] || SHARE_IMAGES.poop;
}

export async function tryShareSessionImage(text, activity, dependencies) {
  // fetch muss an globalThis gebunden bleiben: als bloße Referenz in ein Objekt gepackt und dann
  // als deps.fetch(...) aufgerufen, wirft Chrome sonst "Failed to execute 'fetch' on 'Window':
  // Illegal invocation" (native Funktion, Receiver-Check), was hier still im catch verschluckt wurde.
  var deps = dependencies || { navigator: navigator, fetch: fetch.bind(globalThis), File: File };
  if (!deps.navigator || typeof deps.navigator.share !== 'function' || typeof deps.navigator.canShare !== 'function') {
    return false;
  }
  var cache = deps.cache || shareImageFiles;
  var file = cache[activity];
  var loadedNow = false;
  if (!file) {
    try {
      var response = await deps.fetch(new URL(getShareImagePath(activity), import.meta.url));
      if (!response.ok) return false;
      var blob = await response.blob();
      file = new deps.File([blob], activity + '-salary-result.png', {
        type: blob.type || 'image/png'
      });
      cache[activity] = file;
      loadedNow = true;
    } catch (err) {
      return false;
    }
  }
  var shareData = { text: text, files: [file] };
  // Slow image loading can consume the transient user activation required by
  // the native share sheet. The cached file makes the next tap synchronous,
  // including a text-only fallback when this browser cannot share files.
  if (loadedNow && deps.navigator.userActivation && deps.navigator.userActivation.isActive === false) {
    return 'ready';
  }
  if (!deps.navigator.canShare({ files: [file] })) return false;
  await deps.navigator.share(shareData);
  return true;
}
