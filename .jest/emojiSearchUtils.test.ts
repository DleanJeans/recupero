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
});
