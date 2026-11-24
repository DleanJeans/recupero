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

/** Lower is better: exact name, whole-word in name, exact keyword, then prefix, then loose substring. Null = no match. */
function scoreWord(item: Item, word: string): number | null {
  const name = item.name.toLowerCase();
  const keywords = ((item as { keywords?: string[] }).keywords ?? []).map(keyword => keyword.toLowerCase());
  if (name === word) return 0;
  if (name.split(/[\s-]+/).includes(word)) return 1;
  if (keywords.includes(word)) return 2;
  if (name.startsWith(word) || keywords.some(keyword => keyword.startsWith(word))) return 3;
  if (name.includes(word) || keywords.some(keyword => keyword.includes(word))) return 4;
  return null;
}

function scoreText(item: Item, words: string[]): number | null {
  let total = 0;
  for (const word of words) {
    const score = scoreWord(item, word);
    if (score === null) return null;
    total += score;
  }
  return total;
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
    return categories
      .map(category => ({ ...category, data: category.data.filter(predicate) }))
      .filter(category => category.data.length > 0);
  }

  // The keyboard shows one category per page and has no tab header here, so return a single ranked list.
  const words = query.toLowerCase().split(/\s+/);
  const ranked: { item: Item; score: number }[] = [];
  for (const category of categories) {
    for (const item of category.data) {
      const score = scoreText(item, words);
      if (score !== null) ranked.push({ item, score });
    }
  }
  if (ranked.length === 0) return [];
  ranked.sort((a, b) => a.score - b.score);
  return [{ title: categories[0].title, data: ranked.map(entry => entry.item) }];
}
