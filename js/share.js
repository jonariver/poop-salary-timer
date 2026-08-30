var SHARE_IMAGES = {
  poop: '../assets/share/poop.png',
  smoke: '../assets/share/smoke.png',
  coffee: '../assets/share/coffee.png'
};

export function getShareImagePath(activity) {
  return SHARE_IMAGES[activity] || SHARE_IMAGES.poop;
}

export async function tryShareSessionImage(text, activity, dependencies) {
  var deps = dependencies || { navigator: navigator, fetch: fetch, File: File };
  if (!deps.navigator || typeof deps.navigator.share !== 'function' || typeof deps.navigator.canShare !== 'function') {
    return false;
  }
  var file;
  try {
    var response = await deps.fetch(new URL(getShareImagePath(activity), import.meta.url));
    if (!response.ok) return false;
    var blob = await response.blob();
    file = new deps.File([blob], activity + '-salary-result.png', {
      type: blob.type || 'image/png'
    });
  } catch (err) {
    return false;
  }
  var shareData = { text: text, files: [file] };
  if (!deps.navigator.canShare(shareData)) return false;
  await deps.navigator.share(shareData);
  return true;
}
