/**
 * Pixel work for replacing an image's own background. It runs inside a hidden WebView (which can decode any image
 * format and has a canvas), so everything here is kept as plain strings: Hermes can't reliably turn a function back
 * into source in release builds. The same string is evaluated in the unit tests.
 *
 * clearBackground(data, width, height, tolerance, fill) edits RGBA pixels in place:
 *  1. The background colour is the most common colour along the image's four edges (pixels that are already
 *     transparent count as background too).
 *  2. Background spreads inward from the edge pixels over neighbours close to that colour (4-connected), so the same
 *     colour inside the subject, such as white lettering, is never touched because the subject's outline blocks it.
 *  3. Pixels well inside the tolerance become fully see-through or the fill colour; those near its limit fade, which
 *     keeps soft edges from turning into a jagged halo.
 * tolerance is 0-100. fill is [r, g, b] or null for transparent.
 */
export const CLEAR_BACKGROUND_SOURCE = `
function clearBackground(data, width, height, tolerance, fill) {
  var total = width * height;
  var maxDistance = (tolerance / 100) * 220 + 1;
  var solidDistance = maxDistance * 0.55;

  function seen(i) {
    return data[i * 4 + 3] < 16;
  }

  // Most common edge colour, in 16-level buckets, then averaged for accuracy.
  var buckets = {};
  function sample(i) {
    if (seen(i)) return;
    var p = i * 4;
    var key = (data[p] >> 4) * 256 + (data[p + 1] >> 4) * 16 + (data[p + 2] >> 4);
    var b = buckets[key] || (buckets[key] = { n: 0, r: 0, g: 0, b: 0 });
    b.n++;
    b.r += data[p];
    b.g += data[p + 1];
    b.b += data[p + 2];
  }
  var x;
  var y;
  for (x = 0; x < width; x++) {
    sample(x);
    sample((height - 1) * width + x);
  }
  for (y = 1; y < height - 1; y++) {
    sample(y * width);
    sample(y * width + width - 1);
  }
  var best = null;
  for (var k in buckets) {
    if (!best || buckets[k].n > best.n) best = buckets[k];
  }
  var kr = best ? best.r / best.n : 255;
  var kg = best ? best.g / best.n : 255;
  var kb = best ? best.b / best.n : 255;

  function distance(i) {
    var p = i * 4;
    var dr = data[p] - kr;
    var dg = data[p + 1] - kg;
    var db = data[p + 2] - kb;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }
  function isBackground(i) {
    return seen(i) || distance(i) <= maxDistance;
  }

  // Spread inward from the edges.
  var mask = new Uint8Array(total);
  var stack = new Int32Array(total);
  var top = 0;
  function push(i) {
    if (mask[i] || !isBackground(i)) return;
    mask[i] = 1;
    stack[top++] = i;
  }
  for (x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (top > 0) {
    var i = stack[--top];
    var cx = i % width;
    if (cx > 0) push(i - 1);
    if (cx < width - 1) push(i + 1);
    if (i >= width) push(i - width);
    if (i < total - width) push(i + width);
  }

  // Rewrite the background; fade the outer band so edges stay smooth.
  for (var j = 0; j < total; j++) {
    if (!mask[j]) continue;
    var p2 = j * 4;
    var d = seen(j) ? 0 : distance(j);
    var keep = d <= solidDistance ? 0 : (d - solidDistance) / (maxDistance - solidDistance);
    if (keep > 1) keep = 1;
    // keep = how much of the original pixel remains (0 = pure background).
    var alpha = data[p2 + 3] / 255;
    var r = data[p2];
    var g = data[p2 + 1];
    var b = data[p2 + 2];
    if (keep > 0 && alpha > 0) {
      // Take the background colour back out of the blended pixel so it doesn't leave a pale fringe.
      r = Math.max(0, Math.min(255, (r - kr * (1 - keep)) / keep));
      g = Math.max(0, Math.min(255, (g - kg * (1 - keep)) / keep));
      b = Math.max(0, Math.min(255, (b - kb * (1 - keep)) / keep));
    }
    var a = keep * alpha;
    if (fill) {
      data[p2] = Math.round(r * a + fill[0] * (1 - a));
      data[p2 + 1] = Math.round(g * a + fill[1] * (1 - a));
      data[p2 + 2] = Math.round(b * a + fill[2] * (1 - a));
      data[p2 + 3] = 255;
    } else {
      data[p2] = Math.round(r);
      data[p2 + 1] = Math.round(g);
      data[p2 + 2] = Math.round(b);
      data[p2 + 3] = Math.round(a * 255);
    }
  }
}
`;

/** Longest side of the processed picture; icons are small, so this keeps the PNG light. */
const MAX_SIDE = 768;

/** The page the hidden WebView loads. Jobs arrive as JSON messages {id, base64, tolerance, fill}; the answer is
 *  posted back as {id, png} (base64) or {id, error}. */
export const CLEAR_PAGE_HTML = `<!doctype html><html><body><script>
${CLEAR_BACKGROUND_SOURCE}
function mimeOf(base64) {
  if (base64.indexOf('iVBOR') === 0) return 'image/png';
  if (base64.indexOf('/9j/') === 0) return 'image/jpeg';
  if (base64.indexOf('R0lGO') === 0) return 'image/gif';
  if (base64.indexOf('UklGR') === 0) return 'image/webp';
  return 'image/png';
}
function reply(message) {
  window.ReactNativeWebView.postMessage(JSON.stringify(message));
}
function run(job) {
  var image = new Image();
  image.onload = function () {
    try {
      var scale = Math.min(1, ${MAX_SIDE} / Math.max(image.naturalWidth, image.naturalHeight));
      var w = Math.max(1, Math.round(image.naturalWidth * scale));
      var h = Math.max(1, Math.round(image.naturalHeight * scale));
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, w, h);
      var pixels = context.getImageData(0, 0, w, h);
      clearBackground(pixels.data, w, h, job.tolerance, job.fill);
      context.putImageData(pixels, 0, 0);
      reply({ id: job.id, png: canvas.toDataURL('image/png').split(',')[1] });
    } catch (e) {
      reply({ id: job.id, error: String(e) });
    }
  };
  image.onerror = function () {
    reply({ id: job.id, error: 'decode' });
  };
  image.src = 'data:' + mimeOf(job.base64) + ';base64,' + job.base64;
}
function onMessage(event) {
  try {
    run(JSON.parse(event.data));
  } catch (e) {
    reply({ id: -1, error: String(e) });
  }
}
document.addEventListener('message', onMessage);
window.addEventListener('message', onMessage);
reply({ ready: true });
</script></body></html>`;
