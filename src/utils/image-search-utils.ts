/** Google Images results page for a query. */
export function getImageSearchUrl(query: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query.trim())}`;
}

export interface ImageCandidate {
  src: string;
  width: number;
  height: number;
}

/** Reads a candidate posted by the search page script; anything else (or a non-http image) is ignored. */
export function parseImageCandidate(data: string): ImageCandidate | null {
  try {
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { src, width, height } = parsed as Record<string, unknown>;
    if (typeof src !== 'string' || !/^https?:\/\/\S+$/i.test(src)) return null;
    return { src, width: Number(width) || 0, height: Number(height) || 0 };
  } catch {
    return null;
  }
}

/**
 * Runs inside the search page. Twice a second it posts the biggest image fully on screen (Google's preview of a
 * tapped result is the biggest), so the app can offer "Use this image". Tiny icons and data: thumbnails are skipped.
 */
export const IMAGE_SEARCH_SCRIPT = `
(function () {
  var last = '';
  function pick() {
    var vw = window.innerWidth, vh = window.innerHeight, best = null, bestArea = 0;
    var imgs = document.images;
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var src = img.currentSrc || img.src || '';
      if (!/^https?:/i.test(src)) continue;
      var r = img.getBoundingClientRect();
      if (r.width < 80 || r.height < 80) continue;
      if (r.top < -r.height / 4 || r.bottom > vh + r.height / 4 || r.left < -10 || r.right > vw + 10) continue;
      var area = r.width * r.height;
      if (area > bestArea) { bestArea = area; best = img; }
    }
    var next = best ? JSON.stringify({ src: best.currentSrc || best.src, width: best.naturalWidth, height: best.naturalHeight }) : '';
    if (next !== last) {
      last = next;
      window.ReactNativeWebView.postMessage(next || '{}');
    }
  }
  setInterval(pick, 500);
  pick();
})();
true;
`;
