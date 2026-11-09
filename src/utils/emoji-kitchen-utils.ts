import kitchenIndex from '../data/emoji-kitchen-index.json';

/** Compact list of every Emoji Kitchen pair. Built by scripts/build-emoji-kitchen-index.mjs, which explains the format. */
interface KitchenIndex {
  /** Release dates, part of each image's URL. */
  d: string[];
  /** Codepoints of every emoji that has mixes, e.g. "1f355" or "2764-fe0f". */
  e: string[];
  /** Per emoji, 3 characters per partner: partner index (2 digits) + `dateIndex * 2 + (this emoji is left ? 1 : 0)`. */
  p: string[];
}

export interface KitchenMix {
  /** Codepoints of the emoji that leads the image URL. */
  left: string;
  right: string;
  date: string;
}

const ALPHABET = Array.from({ length: 0x7e - 0x23 + 1 }, (_, i) => String.fromCharCode(0x23 + i))
  .filter(c => c !== '\\')
  .join('');
const BASE = ALPHABET.length;
const KITCHEN_BASE_URL = 'https://www.gstatic.com/android/keyboard/emojikitchen';

const index = kitchenIndex as KitchenIndex;
let codepointToIndex: Map<string, number> | undefined;
const partnerCache = new Map<number, Map<number, { date: string; selfIsLeft: boolean }>>();

/** Codepoints of an emoji as lowercase hex joined by "-", the form the index and URLs use: "🍕" -> "1f355". */
export function emojiToCodepoints(emoji: string): string {
  return Array.from(emoji, char => char.codePointAt(0)!.toString(16)).join('-');
}

export function codepointsToEmoji(codepoints: string): string {
  return String.fromCodePoint(...codepoints.split('-').map(hex => Number.parseInt(hex, 16)));
}

/** Variation selector 16 is optional in typed emoji (❤ vs ❤️), so lookups ignore it. */
function stripVariation(codepoints: string): string {
  return codepoints
    .split('-')
    .filter(cp => cp !== 'fe0f')
    .join('-');
}

function getIndexOf(codepoints: string): number | undefined {
  if (!codepointToIndex) {
    codepointToIndex = new Map();
    index.e.forEach((cp, i) => {
      codepointToIndex!.set(cp, i);
      const loose = stripVariation(cp);
      if (!codepointToIndex!.has(loose)) codepointToIndex!.set(loose, i);
    });
  }
  return codepointToIndex.get(codepoints) ?? codepointToIndex.get(stripVariation(codepoints));
}

function decode(char: string): number {
  return ALPHABET.indexOf(char);
}

function getPartners(i: number): Map<number, { date: string; selfIsLeft: boolean }> {
  let partners = partnerCache.get(i);
  if (partners) return partners;
  partners = new Map();
  const encoded = index.p[i];
  for (let k = 0; k + 2 < encoded.length; k += 3) {
    const partner = decode(encoded[k]) * BASE + decode(encoded[k + 1]);
    const meta = decode(encoded[k + 2]);
    partners.set(partner, { date: index.d[meta >> 1], selfIsLeft: (meta & 1) === 1 });
  }
  partnerCache.set(i, partners);
  return partners;
}

/** Whether the emoji appears in Emoji Kitchen at all. */
export function isKitchenEmoji(emoji: string): boolean {
  return getIndexOf(emojiToCodepoints(emoji)) != null;
}

/** Every emoji (as the index spells its codepoints) that can be mixed. */
export function getKitchenCodepoints(): readonly string[] {
  return index.e;
}

/** Codepoints of every emoji that mixes with this one. Empty when it has no mixes. */
export function getKitchenPartners(emoji: string): string[] {
  const i = getIndexOf(emojiToCodepoints(emoji));
  if (i == null) return [];
  return [...getPartners(i).keys()].map(partner => index.e[partner]);
}

/** The mix of two emoji (either order), or null when Emoji Kitchen has no image for the pair. */
export function findKitchenMix(a: string, b: string): KitchenMix | null {
  const ia = getIndexOf(emojiToCodepoints(a));
  const ib = getIndexOf(emojiToCodepoints(b));
  if (ia == null || ib == null) return null;
  const hit = getPartners(ia).get(ib);
  if (!hit) return null;
  const [left, right] = hit.selfIsLeft ? [ia, ib] : [ib, ia];
  return { left: index.e[left], right: index.e[right], date: hit.date };
}

/** Image URL of a mix on Google's server. */
export function getKitchenUrl(mix: KitchenMix): string {
  const u = (cp: string) => `u${cp.replaceAll('-', '-u')}`;
  return `${KITCHEN_BASE_URL}/${mix.date}/${u(mix.left)}/${u(mix.left)}_${u(mix.right)}.png`;
}

/** Codepoints without the optional variation selector, for comparing emoji from different sources. */
export function getLooseCodepoints(emoji: string): string {
  return stripVariation(emojiToCodepoints(emoji));
}

/** Loose codepoints of every emoji that can be mixed (when `emoji` is unset) or that mixes with `emoji`. */
export function getKitchenChoices(emoji?: string): Set<string> {
  const codepoints = emoji ? getKitchenPartners(emoji) : index.e;
  return new Set(codepoints.map(stripVariation));
}
