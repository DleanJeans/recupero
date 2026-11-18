import { splitSavedFabs } from '../src/utils/saved-fab-utils';

const logs = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, savedAt: i }));

describe('splitSavedFabs', () => {
  it('shows nothing for no saved logs', () => {
    expect(splitSavedFabs([])).toEqual({ shown: [], overflow: 0 });
  });

  it('shows up to 3 oldest-first with no overflow', () => {
    const { shown, overflow } = splitSavedFabs(logs(3));
    expect(shown.map(p => p.id)).toEqual(['p0', 'p1', 'p2']);
    expect(overflow).toBe(0);
  });

  it('shows the 2 newest plus overflow count when there are more than 3', () => {
    const { shown, overflow } = splitSavedFabs(logs(5));
    expect(shown.map(p => p.id)).toEqual(['p3', 'p4']);
    expect(overflow).toBe(3);
  });
});
