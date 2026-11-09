import { findKitchenMix, getKitchenUrl, type KitchenMix } from './emoji-kitchen-utils';

/**
 * Icons (behaviours, categories, groups, places, checklists, moods and sensations) are stored as one string so old
 * data stays valid:
 *  - plain emoji: "🍕"
 *  - Emoji Kitchen mix: "mix:🍕+🔥"
 *  - stacked emoji: "stack:☕|😴,0.55,0.62,45,-20" (layers bottom to top, see StackLayer)
 *  - image: "https://…", optionally cropped: "https://… crop:0.5,0.4,1.6" (see ImageCrop)
 *    (behaviours may also hold the older `{ uri }` object)
 */
export type IconValue = string | { uri: string } | null | undefined;

export interface StackLayer {
  emoji: string;
  /** Glyph size as a fraction of the icon box. */
  size: number;
  /** Offset from the centre as a fraction of half the box. */
  distance: number;
  /** Where the offset points, in degrees clockwise from straight up. */
  direction: number;
  /** Rotation of the glyph in degrees, clockwise. */
  rotation: number;
  opacity: number;
  mirror: boolean;
}

export type ParsedIcon =
  | { kind: 'none' }
  | { kind: 'emoji'; emoji: string }
  | { kind: 'mix'; left: string; right: string; mix: KitchenMix | null }
  | { kind: 'stack'; layers: StackLayer[] }
  | { kind: 'image'; uri: string; crop?: ImageCrop };

/** Which part of an image an icon shows: the centre point (fractions of the image) and how far it is zoomed in.
 *  Zoom 1 means the image's short side fills the icon. */
export interface ImageCrop {
  x: number;
  y: number;
  zoom: number;
}

export const DEFAULT_CROP: ImageCrop = { x: 0.5, y: 0.5, zoom: 1 };
export const MAX_CROP_ZOOM = 5;
const IMAGE_PATTERN = /^(https?:\/\/\S+)(?:\s+crop:(-?[\d.]+),(-?[\d.]+),(-?[\d.]+))?$/i;

const MIX_PREFIX = 'mix:';
const STACK_PREFIX = 'stack:';
export const MAX_STACK_LAYERS = 4;

export const DEFAULT_LAYER: Omit<StackLayer, 'emoji'> = {
  size: 1,
  distance: 0,
  direction: 0,
  rotation: 0,
  opacity: 1,
  mirror: false,
};

export function isImageUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

function parseImage(text: string): ParsedIcon | null {
  const match = IMAGE_PATTERN.exec(text);
  if (!match) return null;
  const [, uri, x, y, zoom] = match;
  if (x == null) return { kind: 'image', uri };
  return { kind: 'image', uri, crop: { x: Number(x), y: Number(y), zoom: Number(zoom) } };
}

/** Stores an image link with its crop; an untouched crop is left off. */
export function imageIcon(uri: string, crop?: ImageCrop): string {
  const url = uri.trim();
  if (!crop || (crop.x === DEFAULT_CROP.x && crop.y === DEFAULT_CROP.y && crop.zoom === DEFAULT_CROP.zoom)) return url;
  return `${url} crop:${round(crop.x, 3)},${round(crop.y, 3)},${round(crop.zoom, 2)}`;
}

/** Keeps the crop inside the image: zoom 1-MAX, and the centre far enough in that the icon is always covered. */
export function clampCrop(crop: ImageCrop, width: number, height: number): ImageCrop {
  const zoom = Math.min(MAX_CROP_ZOOM, Math.max(1, crop.zoom));
  const short = Math.min(width, height);
  // Half the visible box as a fraction of each image dimension.
  const halfX = short / zoom / width / 2;
  const halfY = short / zoom / height / 2;
  const clamp = (v: number, half: number) => Math.min(1 - half, Math.max(half, v));
  return { x: clamp(crop.x, halfX), y: clamp(crop.y, halfY), zoom };
}

/** Where to draw an image of natural size width x height so the crop fills a square box. */
export function getCropFrame(width: number, height: number, box: number, crop: ImageCrop = DEFAULT_CROP) {
  const { x, y, zoom } = clampCrop(crop, width, height);
  const scale = (box / Math.min(width, height)) * zoom;
  const w = width * scale;
  const h = height * scale;
  return { width: w, height: h, left: box / 2 - x * w, top: box / 2 - y * h };
}

function toNumber(raw: string | undefined, fallback: number): number {
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function parseLayer(raw: string): StackLayer | null {
  const [emoji, size, distance, direction, rotation, opacity, mirror] = raw.split(',');
  if (!emoji) return null;
  return {
    emoji,
    size: toNumber(size, DEFAULT_LAYER.size),
    distance: toNumber(distance, DEFAULT_LAYER.distance),
    direction: toNumber(direction, DEFAULT_LAYER.direction),
    rotation: toNumber(rotation, DEFAULT_LAYER.rotation),
    opacity: toNumber(opacity, DEFAULT_LAYER.opacity),
    mirror: mirror === '1',
  };
}

export function parseIcon(value: IconValue): ParsedIcon {
  if (value && typeof value === 'object') return parseImage(value.uri?.trim() ?? '') ?? { kind: 'none' };
  const text = value?.trim();
  if (!text) return { kind: 'none' };
  const image = parseImage(text);
  if (image) return image;
  if (text.startsWith(MIX_PREFIX)) {
    const [left, right] = text.slice(MIX_PREFIX.length).split('+');
    if (left && right) return { kind: 'mix', left, right, mix: findKitchenMix(left, right) };
    return left ? { kind: 'emoji', emoji: left } : { kind: 'none' };
  }
  if (text.startsWith(STACK_PREFIX)) {
    const layers = text
      .slice(STACK_PREFIX.length)
      .split('|')
      .map(parseLayer)
      .filter((layer): layer is StackLayer => layer != null)
      .slice(0, MAX_STACK_LAYERS);
    return layers.length > 0 ? { kind: 'stack', layers } : { kind: 'none' };
  }
  return { kind: 'emoji', emoji: text };
}

export function mixIcon(left: string, right: string): string {
  return `${MIX_PREFIX}${left}+${right}`;
}

function round(n: number, digits: number): string {
  return String(Number(n.toFixed(digits)));
}

function serializeLayer(layer: StackLayer): string {
  const fields = [
    round(layer.size, 2),
    round(layer.distance, 2),
    round(layer.direction, 0),
    round(layer.rotation, 0),
    round(layer.opacity, 2),
    layer.mirror ? '1' : '0',
  ];
  const defaults = ['1', '0', '0', '0', '1', '0'];
  while (fields.length > 0 && fields[fields.length - 1] === defaults[fields.length - 1]) fields.pop();
  return [layer.emoji, ...fields].join(',');
}

/** Stores a stack. A single untouched layer is just that emoji. */
export function stackIcon(layers: StackLayer[]): string {
  const kept = layers.filter(layer => layer.emoji).slice(0, MAX_STACK_LAYERS);
  if (kept.length === 0) return '';
  const parts = kept.map(serializeLayer);
  if (parts.length === 1 && parts[0] === kept[0].emoji) return kept[0].emoji;
  return `${STACK_PREFIX}${parts.join('|')}`;
}

/** Layers to start the stack editor from: the current stack, or the current emoji/mix as layer 1. */
export function toStackLayers(value: IconValue): StackLayer[] {
  const parsed = parseIcon(value);
  if (parsed.kind === 'stack') return parsed.layers;
  if (parsed.kind === 'emoji') return [{ ...DEFAULT_LAYER, emoji: parsed.emoji }];
  if (parsed.kind === 'mix') return [{ ...DEFAULT_LAYER, emoji: parsed.left }, presetLayer('badge', parsed.right)];
  return [];
}

/** Where a layer's centre sits, in px from the box centre (y grows downward). */
export function getLayerOffset(layer: Pick<StackLayer, 'distance' | 'direction'>, boxSize: number) {
  const radians = (layer.direction * Math.PI) / 180;
  const reach = (layer.distance * boxSize) / 2;
  return { x: Math.sin(radians) * reach, y: -Math.cos(radians) * reach };
}

/** Inverse of getLayerOffset, for dragging a layer on the canvas. Distance is capped at the box edge. */
export function getLayerPolar(x: number, y: number, boxSize: number): Pick<StackLayer, 'distance' | 'direction'> {
  const distance = Math.min(1, Math.hypot(x, y) / (boxSize / 2));
  const degrees = (Math.atan2(x, -y) * 180) / Math.PI;
  return { distance, direction: Math.round((degrees + 360) % 360) };
}

export type StackPreset = 'badge' | 'side' | 'wearing' | 'inside' | 'over';

export const STACK_PRESETS: { id: StackPreset; label: string }[] = [
  { id: 'badge', label: 'Badge' },
  { id: 'side', label: 'Side by side' },
  { id: 'wearing', label: 'Wearing' },
  { id: 'inside', label: 'Inside' },
  { id: 'over', label: 'Over' },
];

/** The settings a preset gives an added layer. */
export function presetLayer(preset: StackPreset, emoji: string): StackLayer {
  switch (preset) {
    case 'side':
      return { ...DEFAULT_LAYER, emoji, size: 0.62, distance: 0.42, direction: 90, rotation: 12 };
    case 'wearing':
      return { ...DEFAULT_LAYER, emoji, size: 0.6, distance: 0.62, direction: 0 };
    case 'inside':
      return { ...DEFAULT_LAYER, emoji, size: 0.42 };
    case 'over':
      return { ...DEFAULT_LAYER, emoji, size: 1.1, opacity: 0.85 };
    default:
      return { ...DEFAULT_LAYER, emoji, size: 0.55, distance: 0.62, direction: 135 };
  }
}

/** Applies a preset to a whole stack: the base layer adjusts too (e.g. both shrink for Side by side). */
export function applyStackPreset(layers: StackLayer[], preset: StackPreset): StackLayer[] {
  if (layers.length < 2) return layers;
  const [base, ...rest] = layers;
  const nextBase: StackLayer =
    preset === 'side'
      ? { ...base, size: 0.62, distance: 0.42, direction: 270, rotation: -12 }
      : preset === 'wearing'
        ? { ...base, size: 0.85, distance: 0.15, direction: 180, rotation: 0 }
        : { ...base, size: 1, distance: 0, direction: 0, rotation: 0 };
  return [nextBase, ...rest.map(layer => presetLayer(preset, layer.emoji))];
}

/** Text to show where only text fits (notification titles, inline labels): the main emoji, or '' for an image. */
export function iconText(value: IconValue): string {
  const parsed = parseIcon(value);
  switch (parsed.kind) {
    case 'emoji':
      return parsed.emoji;
    case 'mix':
      return parsed.left;
    case 'stack':
      return parsed.layers[0].emoji;
    default:
      return '';
  }
}

/** URL to download and cache for this icon, if it is drawn from an image. */
export function getIconImageUrl(parsed: ParsedIcon): string | null {
  if (parsed.kind === 'image') return parsed.uri;
  if (parsed.kind === 'mix' && parsed.mix) return getKitchenUrl(parsed.mix);
  return null;
}

/** Stable file name for a cached icon image: two 32-bit string hashes plus the URL's image extension. */
export function getIconCacheName(url: string): string {
  let fnv = 0x811c9dc5;
  let djb = 5381;
  for (let i = 0; i < url.length; i++) {
    const code = url.charCodeAt(i);
    fnv = Math.imul(fnv ^ code, 0x01000193) >>> 0;
    djb = (Math.imul(djb, 33) + code) >>> 0;
  }
  const extension = /\.(png|jpe?g|gif|webp)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase() ?? 'img';
  return `${fnv.toString(16).padStart(8, '0')}${djb.toString(16).padStart(8, '0')}.${extension}`;
}
