import {
  codepointsToEmoji,
  emojiToCodepoints,
  findKitchenMix,
  getKitchenPartners,
  getKitchenUrl,
  isKitchenEmoji,
} from '../src/utils/emoji-kitchen-utils';
import { hexToHsl, hslToHex, normalizeHex } from '../src/utils/hex-color-utils';
import {
  applyStackPreset,
  clampCrop,
  DEFAULT_LAYER,
  getClearedCacheName,
  getCropFrame,
  getIconCacheName,
  getIconImageUrl,
  getIconTileBox,
  getLayerOffset,
  getLayerPolar,
  iconText,
  imageIcon,
  mixIcon,
  normalizeRotation,
  parseIcon,
  screenToImageDelta,
  stackIcon,
  toStackLayers,
} from '../src/utils/icon-utils';
import { CLEAR_BACKGROUND_SOURCE } from '../src/utils/image-clear-script';
import { getImageSearchUrl, parseImageCandidate } from '../src/utils/image-search-utils';

describe('emoji kitchen index', () => {
  it('finds a mix in either order with the URL Google serves', () => {
    const mix = findKitchenMix('🔥', '🍕');
    expect(mix).toEqual({ left: '1f355', right: '1f525', date: '20241021' });
    expect(getKitchenUrl(mix!)).toBe(
      'https://www.gstatic.com/android/keyboard/emojikitchen/20241021/u1f355/u1f355_u1f525.png',
    );
    expect(findKitchenMix('🍕', '🔥')).toEqual(mix);
  });

  it('keeps the left/right order of the published image', () => {
    const mix = findKitchenMix('☕', '😴');
    expect(getKitchenUrl(mix!)).toBe(
      'https://www.gstatic.com/android/keyboard/emojikitchen/20230301/u1f634/u1f634_u2615.png',
    );
  });

  it('ignores the variation selector', () => {
    expect(findKitchenMix('❤', '🍕')).toEqual(findKitchenMix('❤️', '🍕'));
    expect(findKitchenMix('❤', '🍕')).not.toBeNull();
    expect(isKitchenEmoji('❤')).toBe(true);
  });

  it('returns null for pairs Google never made', () => {
    expect(findKitchenMix('🏃', '🔥')).toBeNull();
    expect(getKitchenPartners('🏃')).toEqual([]);
  });

  it('lists partners', () => {
    const partners = getKitchenPartners('🍕');
    expect(partners.length).toBeGreaterThan(100);
    expect(partners).toContain('1f525');
  });

  it('converts codepoints', () => {
    expect(emojiToCodepoints('❤️')).toBe('2764-fe0f');
    expect(codepointsToEmoji('2764-fe0f')).toBe('❤️');
  });
});

describe('parseIcon', () => {
  it('reads every stored shape', () => {
    expect(parseIcon('🍕')).toEqual({ kind: 'emoji', emoji: '🍕' });
    expect(parseIcon('')).toEqual({ kind: 'none' });
    expect(parseIcon(undefined)).toEqual({ kind: 'none' });
    expect(parseIcon('https://x.test/a.png')).toEqual({ kind: 'image', uri: 'https://x.test/a.png' });
    expect(parseIcon({ uri: 'https://x.test/a.png' })).toEqual({ kind: 'image', uri: 'https://x.test/a.png' });
    expect(parseIcon(mixIcon('🍕', '🔥'))).toMatchObject({ kind: 'mix', left: '🍕', right: '🔥' });
  });

  it('round-trips a stack and drops defaults', () => {
    const layers = [
      { ...DEFAULT_LAYER, emoji: '☕' },
      { ...DEFAULT_LAYER, emoji: '😴', size: 0.55, distance: 0.62, direction: 45, rotation: -20 },
      { ...DEFAULT_LAYER, emoji: '✨', opacity: 0.5, mirror: true },
    ];
    const stored = stackIcon(layers);
    expect(stored).toBe('stack:☕|😴,0.55,0.62,45,-20|✨,1,0,0,0,0.5,1');
    expect(parseIcon(stored)).toEqual({ kind: 'stack', layers });
  });

  it('stores a lone untouched layer as the plain emoji', () => {
    expect(stackIcon([{ ...DEFAULT_LAYER, emoji: '☕' }])).toBe('☕');
    expect(stackIcon([])).toBe('');
  });
});

describe('icon helpers', () => {
  it('gives text for text-only places', () => {
    expect(iconText('🍕')).toBe('🍕');
    expect(iconText(mixIcon('🍕', '🔥'))).toBe('🍕');
    expect(iconText('stack:☕|😴,0.5')).toBe('☕');
    expect(iconText('https://x.test/a.png')).toBe('');
  });

  it('only downloads images and known mixes', () => {
    expect(getIconImageUrl(parseIcon('🍕'))).toBeNull();
    expect(getIconImageUrl(parseIcon(mixIcon('🏃', '🔥')))).toBeNull();
    expect(getIconImageUrl(parseIcon(mixIcon('🍕', '🔥')))).toContain('u1f355_u1f525');
  });

  it('turns a mix into a stack to edit', () => {
    const layers = toStackLayers(mixIcon('🍕', '🔥'));
    expect(layers.map(l => l.emoji)).toEqual(['🍕', '🔥']);
  });

  it('applies presets to added layers', () => {
    const side = applyStackPreset(toStackLayers(mixIcon('🍕', '🍺')), 'side');
    expect(side[0].direction).toBe(270);
    expect(side[1].direction).toBe(90);
  });

  it('converts between offsets and polar values', () => {
    const offset = getLayerOffset({ distance: 1, direction: 90 }, 100);
    expect(offset.x).toBeCloseTo(50);
    expect(offset.y).toBeCloseTo(0);
    expect(getLayerPolar(0, -25, 100)).toEqual({ distance: 0.5, direction: 0 });
    expect(getLayerPolar(0, 500, 100)).toEqual({ distance: 1, direction: 180 });
  });

  it('names cache files stably', () => {
    const name = getIconCacheName('https://x.test/a.PNG?v=1');
    expect(name).toMatch(/^[0-9a-f]{16}\.png$/);
    expect(getIconCacheName('https://x.test/a.PNG?v=1')).toBe(name);
    expect(getIconCacheName('https://x.test/b')).toMatch(/\.img$/);
  });
});

describe('image crop', () => {
  it('round-trips a cropped image and keeps old values', () => {
    const stored = imageIcon('https://x.test/a.png', { x: 0.3, y: 0.6, zoom: 2 });
    expect(stored).toBe('https://x.test/a.png crop:0.3,0.6,2');
    expect(parseIcon(stored)).toEqual({
      kind: 'image',
      uri: 'https://x.test/a.png',
      crop: { x: 0.3, y: 0.6, zoom: 2 },
    });
    expect(parseIcon({ uri: stored })).toEqual(parseIcon(stored));
    expect(imageIcon('https://x.test/a.png', { x: 0.5, y: 0.5, zoom: 1 })).toBe('https://x.test/a.png');
    expect(iconText(stored)).toBe('');
  });

  it('downloads the image without the crop', () => {
    expect(getIconImageUrl(parseIcon('https://x.test/a.png crop:0.3,0.6,2'))).toBe('https://x.test/a.png');
  });

  it('keeps the icon covered', () => {
    // A 200x100 image at zoom 1 shows its middle 100x100: x can range 0.25-0.75, y is fixed at 0.5.
    expect(clampCrop({ x: 0, y: 0, zoom: 1 }, 200, 100)).toEqual({ x: 0.25, y: 0.5, zoom: 1 });
    expect(clampCrop({ x: 0.5, y: 0.5, zoom: 9 }, 100, 100).zoom).toBe(3);
  });

  it('places the image so the crop centre is in the middle', () => {
    expect(getCropFrame(200, 100, 50)).toMatchObject({ width: 100, height: 50, left: -25, top: 0 });
    expect(getCropFrame(100, 100, 50, { x: 0.25, y: 0.25, zoom: 2 })).toMatchObject({
      width: 100,
      height: 100,
      left: 0,
      top: 0,
    });
  });
});

describe('image search', () => {
  it('builds the search URL', () => {
    expect(getImageSearchUrl(' oat milk ')).toBe('https://www.google.com/search?tbm=isch&q=oat%20milk');
  });

  it('accepts only http image candidates', () => {
    expect(parseImageCandidate('{"src":"https://x.test/a.jpg","width":640,"height":480}')).toEqual({
      src: 'https://x.test/a.jpg',
      width: 640,
      height: 480,
    });
    expect(parseImageCandidate('{"src":"data:image/png;base64,AAA"}')).toBeNull();
    expect(parseImageCandidate('{}')).toBeNull();
    expect(parseImageCandidate('not json')).toBeNull();
  });
});

describe('image rotation and background', () => {
  it('round-trips rotation', () => {
    const crop = { x: 0.5, y: 0.5, zoom: 0.8, rotation: 90 };
    const stored = imageIcon('https://x.test/a.png', crop);
    expect(stored).toBe('https://x.test/a.png crop:0.5,0.5,0.8,90');
    expect(parseIcon(stored)).toEqual({ kind: 'image', uri: 'https://x.test/a.png', crop });
  });

  it('round-trips a replaced picture background, with or without a crop', () => {
    const url = 'https://x.test/a.png';
    expect(imageIcon(url, undefined, { tolerance: 25 })).toBe(`${url} clear:25,none`);
    expect(parseIcon(`${url} clear:25,none`)).toEqual({ kind: 'image', uri: url, clear: { tolerance: 25 } });
    const both = imageIcon(url, { x: 0.4, y: 0.5, zoom: 1.5 }, { tolerance: 40, fill: 'F9A825'.toLowerCase() });
    expect(both).toBe(`${url} crop:0.4,0.5,1.5 clear:40,f9a825`);
    expect(parseIcon(both)).toEqual({
      kind: 'image',
      uri: url,
      crop: { x: 0.4, y: 0.5, zoom: 1.5 },
      clear: { tolerance: 40, fill: 'f9a825' },
    });
    expect(getIconImageUrl(parseIcon(both))).toBe(url);
  });

  it('names the processed copy per setting, always as a png', () => {
    const a = getClearedCacheName('https://x.test/a.jpg', { tolerance: 20 });
    expect(a).toMatch(/\.png$/);
    expect(getClearedCacheName('https://x.test/a.jpg', { tolerance: 25 })).not.toBe(a);
    expect(getClearedCacheName('https://x.test/a.jpg', { tolerance: 20, fill: 'ffffff' })).not.toBe(a);
    expect(a).not.toBe(getIconCacheName('https://x.test/a.jpg'));
  });

  it('ignores the background colour an older build stored after the rotation', () => {
    expect(parseIcon('https://x.test/a.png crop:0.5,0.5,0.8,90,ffffff')).toEqual({
      kind: 'image',
      uri: 'https://x.test/a.png',
      crop: { x: 0.5, y: 0.5, zoom: 0.8, rotation: 90 },
    });
  });

  it('keeps old crops and leaves defaults off', () => {
    expect(parseIcon('https://x.test/a.png crop:0.3,0.6,2')).toMatchObject({ crop: { x: 0.3, y: 0.6, zoom: 2 } });
    expect(imageIcon('https://x.test/a.png', { x: 0.5, y: 0.5, zoom: 1, rotation: 0 })).toBe('https://x.test/a.png');
    expect(imageIcon('https://x.test/a.png', { x: 0.5, y: 0.5, zoom: 1, rotation: 360 })).toBe('https://x.test/a.png');
  });

  it('folds rotation into -180..180', () => {
    expect(normalizeRotation(270)).toBe(-90);
    expect(normalizeRotation(-190)).toBe(170);
    expect(normalizeRotation(180)).toBe(180);
    expect(normalizeRotation(-180)).toBe(-180);
    expect(normalizeRotation(540)).toBe(180);
    expect(normalizeRotation(360)).toBe(0);
  });

  it('only demands full coverage when unrotated and zoomed in', () => {
    expect(clampCrop({ x: 0, y: 0, zoom: 1, rotation: 45 }, 200, 100)).toMatchObject({ x: 0, y: 0 });
    expect(clampCrop({ x: 0, y: 0, zoom: 0.5 }, 200, 100)).toMatchObject({ x: 0, y: 0, zoom: 0.5 });
    expect(clampCrop({ x: 0, y: 0, zoom: 0.1 }, 100, 100).zoom).toBe(0.3);
  });

  it('turns finger movement into image movement', () => {
    expect(screenToImageDelta(10, 0, 0)).toEqual({ x: 10, y: 0 });
    const turned = screenToImageDelta(10, 0, 90);
    expect(turned.x).toBeCloseTo(0);
    expect(turned.y).toBeCloseTo(-10);
  });
});

describe('hex colours', () => {
  it('normalises and converts', () => {
    expect(normalizeHex('#ABC')).toBe('aabbcc');
    expect(normalizeHex(' FFAA00 ')).toBe('ffaa00');
    expect(normalizeHex('nope')).toBeNull();
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('ff0000');
    expect(hexToHsl('00ff00')).toEqual({ h: 120, s: 100, l: 50 });
    expect(hexToHsl('808080')).toEqual({ h: 0, s: 0, l: 50 });
  });
});

describe('clearing the picture background', () => {
  type Clear = (
    data: Uint8ClampedArray,
    w: number,
    h: number,
    tolerance: number,
    fill: [number, number, number] | null,
  ) => void;
  const clearBackground = new Function(`${CLEAR_BACKGROUND_SOURCE}; return clearBackground;`)() as Clear;

  const SIZE = 40;
  const at = (x: number, y: number) => (y * SIZE + x) * 4;

  /** White picture with a red can (10..29), white lettering inside it (18..21) and a light grey shadow line. */
  function can() {
    const data = new Uint8ClampedArray(SIZE * SIZE * 4);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = at(x, y);
        const inCan = x >= 10 && x < 30 && y >= 5 && y < 35;
        const lettering = x >= 18 && x < 22 && y >= 18 && y < 22;
        const [r, g, b] = inCan && !lettering ? [220, 40, 20] : [255, 255, 255];
        data.set([r, g, b, 255], i);
      }
    }
    return data;
  }

  it('makes the edge-connected background transparent but keeps white inside the subject', () => {
    const data = can();
    clearBackground(data, SIZE, SIZE, 20, null);
    expect(data[at(0, 0) + 3]).toBe(0);
    expect(data[at(5, 20) + 3]).toBe(0);
    expect(data[at(39, 39) + 3]).toBe(0);
    expect(Array.from(data.slice(at(12, 10), at(12, 10) + 4))).toEqual([220, 40, 20, 255]);
    // The lettering is white, like the background, but enclosed by the can.
    expect(Array.from(data.slice(at(19, 19), at(19, 19) + 4))).toEqual([255, 255, 255, 255]);
  });

  it('puts a chosen colour behind the subject instead', () => {
    const data = can();
    clearBackground(data, SIZE, SIZE, 20, [0, 128, 255]);
    expect(Array.from(data.slice(at(2, 2), at(2, 2) + 4))).toEqual([0, 128, 255, 255]);
    expect(Array.from(data.slice(at(19, 19), at(19, 19) + 4))).toEqual([255, 255, 255, 255]);
  });

  it('copes with a slightly noisy background, as in jpeg photos', () => {
    const data = can();
    for (let i = 0; i < SIZE * SIZE; i++) {
      const p = i * 4;
      if (data[p + 1] === 255) {
        data[p] = 255 - (i % 7);
        data[p + 1] = 255 - (i % 5);
        data[p + 2] = 255 - (i % 3);
      }
    }
    clearBackground(data, SIZE, SIZE, 20, null);
    expect(data[at(1, 1) + 3]).toBe(0);
    expect(data[at(38, 25) + 3]).toBe(0);
    expect(data[at(12, 10) + 3]).toBe(255);
  });

  it('leaves the subject alone at zero amount and removes only exact matches', () => {
    const data = can();
    clearBackground(data, SIZE, SIZE, 0, null);
    expect(data[at(0, 0) + 3]).toBe(0);
    expect(data[at(12, 10) + 3]).toBe(255);
  });

  it('works out the background colour from the edges, not assuming white', () => {
    const data = new Uint8ClampedArray(SIZE * SIZE * 4);
    for (let i = 0; i < SIZE * SIZE; i++) data.set([10, 10, 10, 255], i * 4);
    for (let y = 10; y < 30; y++) for (let x = 10; x < 30; x++) data.set([250, 250, 250, 255], at(x, y));
    clearBackground(data, SIZE, SIZE, 20, null);
    expect(data[at(0, 0) + 3]).toBe(0);
    expect(data[at(20, 20) + 3]).toBe(255);
  });
});

describe('getIconTileBox', () => {
  it('fills the tile with image icons and leaves emoji unboxed', () => {
    expect(getIconTileBox('https://example.com/a.png', 44)).toBe(44);
    expect(getIconTileBox('🍕', 44, 0.86)).toBeUndefined();
    expect(getIconTileBox(undefined, 44)).toBeUndefined();
  });

  it('scales mixes and stacks only when asked', () => {
    expect(getIconTileBox(mixIcon('🍕', '🔥'), 44)).toBeUndefined();
    expect(getIconTileBox(mixIcon('🍕', '🔥'), 50, 0.86)).toBe(43);
  });
});
