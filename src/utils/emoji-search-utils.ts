import type { EmojisByCategory } from 'rn-emoji-keyboard';

const VARIATION = /️/g;
const SKIN_TONE = /[\u{1F3FB}-\u{1F3FF}]/gu;
const EMOJI_CHAR = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}⃣]/u;

/** True when the text holds an actual emoji, e.g. typed or pasted from another app. */
export function hasEmoji(text: string): boolean {
  return EMOJI_CHAR.test(text);
}

function normalize(text: string, keepTone: boolean): string {
  const noVariation = text.replace(VARIATION, '');
  return keepTone ? noVariation : noVariation.replace(SKIN_TONE, '');
}

type Item = EmojisByCategory['data'][number];

function matchEmoji(item: Item, query: string): boolean {
  const tokens = query.split(/\s+/).filter(Boolean);
  const exact = (keepTone: boolean) => {
    const target = normalize(item.emoji, keepTone);
    return tokens.some(token => normalize(token, keepTone) === target);
  };
  return exact(true) || exact(false);
}

function matchText(item: Item, words: string[]): boolean {
  const haystack = `${item.name} ${(item as { keywords?: string[] }).keywords?.join(' ') ?? ''}`.toLowerCase();
  return words.every(word => haystack.includes(word));
}

/**
 * Filters emoji categories by a search query. A query containing an emoji matches that exact emoji
 * (ignoring variation selectors and, failing an exact hit, skin tones); anything else is a name/keyword search.
 */
export function searchEmojiCategories(categories: EmojisByCategory[], rawQuery: string): EmojisByCategory[] {
  const query = rawQuery.trim();
  if (!query) return categories;

  let predicate: (item: Item) => boolean;
  if (hasEmoji(query)) {
    predicate = item => matchEmoji(item, query);
    const exactHits = categories.some(category => category.data.some(predicate));
    if (!exactHits) {
      // Pasted sequences such as "🍕🍔": fall back to any emoji contained in the query.
      const flat = normalize(query, false);
      predicate = item => flat.includes(normalize(item.emoji, false));
    }
  } else {
    const words = query.toLowerCase().split(/\s+/);
    predicate = item => matchText(item, words);
  }

  return categories
    .map(category => ({ ...category, data: category.data.filter(predicate) }))
    .filter(category => category.data.length > 0);
}
