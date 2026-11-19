import { PATCH_NOTES } from '../src/data/patch-notes';
import { formatPatchNotesDate, patchNotesItemText } from '../src/utils/patch-notes-utils';

describe('patch notes', () => {
  it('lists days newest first with valid unique dates and no empty days', () => {
    const dates = PATCH_NOTES.map(day => day.date);
    dates.forEach(date => expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/));
    expect(new Set(dates).size).toBe(dates.length);
    expect([...dates].sort().reverse()).toEqual(dates);
    PATCH_NOTES.forEach(day => expect(day.items.length).toBeGreaterThan(0));
    const texts = PATCH_NOTES.flatMap(day => day.items.map(patchNotesItemText));
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('formats dates in local calendar terms', () => {
    expect(formatPatchNotesDate('2026-11-15')).toBe('Sun, Nov 15, 2026');
  });
});
