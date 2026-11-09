import {
  codepointsToEmoji,
  emojiToCodepoints,
  findKitchenMix,
  getKitchenPartners,
  getKitchenUrl,
  isKitchenEmoji,
} from '../src/utils/emoji-kitchen-utils';
import {
  applyStackPreset,
  DEFAULT_LAYER,
  getIconCacheName,
  getIconImageUrl,
  getLayerOffset,
  getLayerPolar,
  iconText,
  mixIcon,
  parseIcon,
  stackIcon,
  toStackLayers,
} from '../src/utils/icon-utils';

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
