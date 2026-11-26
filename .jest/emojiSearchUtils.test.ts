import { hasEmoji, searchEmojiCategories } from '../src/utils/emoji-search-utils';

const cats = [
  {
    title: 'food_drink' as const,
    data: [
      { emoji: '🍕', name: 'pizza', v: '1', toneEnabled: false, keywords: ['slice'] },
      { emoji: '☕', name: 'hot beverage', v: '1', toneEnabled: false, keywords: ['coffee'] },
    ],
  },
  {
    title: 'people_body' as const,
    data: [{ emoji: '👍', name: 'thumbs up', v: '1', toneEnabled: true }],
  },
];

const emojis = (q: string) => searchEmojiCategories(cats, q).flatMap(c => c.data.map(d => d.emoji));

describe('searchEmojiCategories', () => {
  it('returns everything for an empty query', () => expect(searchEmojiCategories(cats, '  ')).toBe(cats));
  it('matches names and keywords', () => {
    expect(emojis('piz')).toEqual(['🍕']);
    expect(emojis('coffee')).toEqual(['☕']);
  });
  it('matches an exact emoji', () => {
    expect(emojis('🍕')).toEqual(['🍕']);
    expect(emojis(' ☕️ ')).toEqual(['☕']);
  });
  it('matches ignoring skin tone and finds any pasted emoji', () => {
    expect(emojis('👍🏽')).toEqual(['👍']);
    expect(emojis('🍕☕')).toEqual(['🍕', '☕']);
  });
  it('detects emoji', () => {
    expect(hasEmoji('🍕')).toBe(true);
    expect(hasEmoji('pizza')).toBe(false);
  });

  it('ranks exact name matches first and merges categories into one list', () => {
    const data = [
      {
        title: 'smileys_emotion' as const,
        data: [{ emoji: '😴', name: 'sleeping face', v: '1', toneEnabled: false, keywords: ['bed', 'bedtime'] }],
      },
      {
        title: 'people_body' as const,
        data: [{ emoji: '🛌', name: 'person in bed', v: '1', toneEnabled: false, keywords: ['bed'] }],
      },
      {
        title: 'objects' as const,
        data: [{ emoji: '🛏️', name: 'bed', v: '1', toneEnabled: false, keywords: ['hotel'] }],
      },
    ];
    const result = searchEmojiCategories(data, 'bed');
    expect(result).toHaveLength(1);
    expect(result[0].data.map(d => d.emoji)).toEqual(['🛏️', '🛌', '😴']);
  });
});

describe('findEmojisForWords', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { findEmojisForWords } = require('../src/utils/emoji-data');
  it('gives each word of a name its own emoji, skipping filler and repeats', () => {
    const found = findEmojisForWords('Drink the water water') as { word: string; emoji: string }[];
    expect(found.map(f => f.word)).toContain('water');
    expect(found.map(f => f.word)).not.toContain('the');
    expect(new Set(found.map(f => f.emoji)).size).toBe(found.length);
  });
  it('returns nothing for an empty name', () => expect(findEmojisForWords('  ')).toEqual([]));
});
