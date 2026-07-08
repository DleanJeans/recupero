import emojibase from 'emojibase-data/en/data.json';
import type { EmojisByCategory } from 'rn-emoji-keyboard';

interface EmojibaseEntry {
  label: string;
  hexcode: string;
  tags?: string[];
  emoji: string;
  type: number;
  order?: number;
  group: number;
  subgroup?: number;
  version: number;
}

interface EmojiItem {
  emoji: string;
  name: string;
  v: string;
  toneEnabled: boolean;
}

/**
 * Map emojibase's numeric `group` to the rn-emoji-keyboard category title.
 * The numbers are stable across emojibase versions:
 *   0 Smileys & Emotion
 *   1 People & Body
 *   2 Component (skin tones etc., filtered out)
 *   3 Animals & Nature
 *   4 Food & Drink
 *   5 Travel & Places
 *   6 Activities
 *   7 Objects
 *   8 Symbols
 *   9 Flags
 */
const GROUP_TO_CATEGORY: Record<number, EmojisByCategory['title']> = {
  0: 'smileys_emotion',
  1: 'people_body',
  3: 'animals_nature',
  4: 'food_drink',
  5: 'travel_places',
  6: 'activities',
  7: 'objects',
  8: 'symbols',
  9: 'flags',
};

function buildEmojiData(): EmojisByCategory[] {
  const groups = new Map<EmojisByCategory['title'], EmojiItem[]>();

  for (const entry of emojibase as EmojibaseEntry[]) {
    const category = GROUP_TO_CATEGORY[entry.group];
    if (!category) continue;

    if (!groups.has(category)) {
      groups.set(category, []);
    }

    groups.get(category)!.push({
      emoji: entry.emoji,
      name: entry.label,
      v: String(entry.version),
      // Skin-tone modifier support is implied for people/body entries that
      // have a `skins` field in data.json. rn-emoji-keyboard uses toneEnabled
      // to show the long-press skin-tone picker.
      toneEnabled: entry.group === 1 && entry.version >= 1,
    });
  }

  const categoryOrder: EmojisByCategory['title'][] = [
    'smileys_emotion',
    'people_body',
    'animals_nature',
    'food_drink',
    'travel_places',
    'activities',
    'objects',
    'symbols',
    'flags',
  ];

  return categoryOrder
    .filter(cat => groups.has(cat))
    .map(title => ({
      title,
      data: groups.get(title)!,
    }));
}

export const emojiData = buildEmojiData();

/**
 * Map common behavior-naming terms to a specific emoji, used by
 * findEmojiByKeyword before falling back to the emojibase data. These are
 * the cases where emojibase's flat tag list gives a non-obvious result for
 * a behavior/category context — e.g. "pumpkin" matches both 🥧 (pie) and
 * 🎃 (jack-o-lantern) as tags, and the more useful suggestion in this app
 * is the seasonal/activity one.
 */
const BEHAVIOR_CONTEXT: Record<string, string> = {
  pumpkin: '🎃',
  halloween: '🎃',
  spooky: '🎃',
};

/**
 * Find the first emoji whose label or tags contain any word from the given
 * keyword string. Uses the emojibase dataset (built from Unicode CLDR
 * annotations — the same source Gboard / iOS use for emoji search).
 *
 * @example findEmojiByKeyword('Pumpkin') // returns '🎃'
 * @example findEmojiByKeyword('Run')     // returns '🏃'
 * @example findEmojiByKeyword('water')   // returns '💧'
 */
export function findEmojiByKeyword(keyword: string): string | null {
  const query = keyword.toLowerCase().trim();
  if (!query) return null;

  // 0. Behavior-context aliases — overrides the emojibase tag match for a
  //    small set of terms where the data's natural match is the wrong one
  //    for this app's behavior/category naming context.
  const ctx = BEHAVIOR_CONTEXT[query];
  if (ctx) return ctx;

  // 1. Exact-label match — most common case (e.g. "pizza" → 🍕).
  for (const entry of emojibase as EmojibaseEntry[]) {
    if (entry.label.toLowerCase() === query) {
      return entry.emoji;
    }
  }

  // 2. Tag match — covers Gboard-style synonyms (e.g. "halloween" → 🎃,
  //    "spooky" → 👻, "pumpkin" → 🥧 in raw emojibase, overridden above).
  for (const entry of emojibase as EmojibaseEntry[]) {
    if (entry.tags?.some(tag => tag.toLowerCase() === query)) {
      return entry.emoji;
    }
  }

  // 3. Substring fallback on label — covers cases where the user types a
  //    word that's part of the label but not a tag (e.g. "running" → 🏃
  //    via label "person running").
  for (const entry of emojibase as EmojibaseEntry[]) {
    if (entry.label.toLowerCase().includes(query)) {
      return entry.emoji;
    }
  }

  return null;
}
