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
 * Runs inside the search page. Twice a second it posts the best image fully on screen (Google's preview of a
 * tapped result is the biggest), so the app can offer "Use this image". Tiny icons and data: thumbnails are skipped.
 * Google's own thumbnails (gstatic encrypted-tbn) are JPEGs, which flatten transparency to white, so an image from
 * the original site (usually the real PNG) beats one of them, and a bigger source file beats a smaller one.
 */
export const IMAGE_SEARCH_SCRIPT = `
(function () {
  var last = '';
  function pick() {
    var vw = window.innerWidth, vh = window.innerHeight, best = null, bestScore = 0;
    var imgs = document.images;
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var src = img.currentSrc || img.src || '';
      if (!/^https?:/i.test(src)) continue;
      var r = img.getBoundingClientRect();
      if (r.width < 80 || r.height < 80) continue;
      if (r.top < -r.height / 4 || r.bottom > vh + r.height / 4 || r.left < -10 || r.right > vw + 10) continue;
      var thumb = /gstatic\\.com|encrypted-tbn/i.test(src);
      var score = (r.width * r.height) * (thumb ? 1 : 4) + (img.naturalWidth * img.naturalHeight) / 1000;
      if (score > bestScore) { bestScore = score; best = img; }
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

/** A desktop Chrome user agent, so sites like WhatsApp Web serve their desktop page. */
export const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/** The page for what was typed in the search box: a web address opens directly, anything else is an image search. */
export function getUrlForQuery(query: string): string {
  const text = query.trim();
  if (/^https?:\/\/\S+$/i.test(text)) return text;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(text) && !/\s/.test(text)) return `https://${text}`;
  return getImageSearchUrl(text);
}

/** Runs before a page loads in desktop mode: reports a desktop platform, no touch and a wide viewport. */
export const DESKTOP_MODE_SCRIPT = `
(function () {
  try {
    Object.defineProperty(navigator, 'platform', { get: function () { return 'Win32'; } });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: function () { return 0; } });
    Object.defineProperty(navigator, 'userAgentData', { get: function () { return undefined; } });
    var fixViewport = function () {
      var meta = document.querySelector('meta[name=viewport]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        (document.head || document.documentElement).appendChild(meta);
      }
      meta.content = 'width=1280, initial-scale=0.3, minimum-scale=0.1, maximum-scale=3, user-scalable=yes';
    };
    fixViewport();
    document.addEventListener('DOMContentLoaded', fixViewport);
  } catch (e) {}
})();
true;
`;
