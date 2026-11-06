import type { MetadataField } from '../src/types/behavior';
import {
  buildLogMetadataDisplay,
  formatMetadataDisplayNumber,
  setMetadataFieldListDisplay,
} from '../src/utils/metadata-list-display-utils';

const fields: MetadataField[] = [
  { key: 'weight', label: 'Weight', unit: 'g', calculation: 'amount' },
  { key: 'kcal', label: 'Calorie', unit: 'kcal', listDisplay: 'big' },
  { key: 'protein', label: 'Protein', unit: 'g', listDisplay: 'bar' },
  { key: 'fat', label: 'Fat', unit: 'g', listDisplay: 'bar' },
  { key: 'carb', label: 'Carb', unit: 'g', listDisplay: 'bar' },
  { key: 'vitc', label: 'Vitamin C', unit: 'mg' },
  { key: 'secret', label: 'Secret', listDisplay: 'hidden' },
];

describe('buildLogMetadataDisplay', () => {
  it('splits fields by role in saved order and skips zero/empty values', () => {
    const display = buildLogMetadataDisplay(fields, {
      weight: 98,
      kcal: 95.94,
      protein: 2.94,
      fat: 0,
      carb: '15.09',
      vitc: 0,
      secret: 5,
    });
    expect(display.big?.field.key).toBe('kcal');
    expect(display.big?.text).toBe('95.9');
    expect(display.bars.map(b => [b.field.key, b.text])).toEqual([
      ['protein', '2.9'],
      ['carb', '15.1'],
    ]);
    expect(display.texts.map(t => t.field.key)).toEqual(['weight']);
  });

  it('treats fields without listDisplay as text (old categories)', () => {
    const display = buildLogMetadataDisplay([{ key: 'a', label: 'A' }], { a: 3 });
    expect(display.big).toBeUndefined();
    expect(display.texts.map(t => t.text)).toEqual(['3']);
  });

  it('returns empty display without metadata', () => {
    expect(buildLogMetadataDisplay(fields, undefined)).toEqual({ bars: [], texts: [] });
  });
});

describe('formatMetadataDisplayNumber', () => {
  it('rounds to one decimal', () => {
    expect(formatMetadataDisplayNumber(9)).toBe('9');
    expect(formatMetadataDisplayNumber(46.25)).toBe('46.3');
  });
});

describe('setMetadataFieldListDisplay', () => {
  it('keeps a single big field', () => {
    const next = setMetadataFieldListDisplay(fields, 0, 'big');
    expect(next[0].listDisplay).toBe('big');
    expect(next[1].listDisplay).toBeUndefined();
  });

  it('stores text as undefined', () => {
    expect(setMetadataFieldListDisplay(fields, 2, 'text')[2].listDisplay).toBeUndefined();
  });
});
