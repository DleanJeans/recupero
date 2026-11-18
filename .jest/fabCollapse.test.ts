import { nextFabCollapsed } from '../src/utils/fab-collapse-utils';

describe('nextFabCollapsed', () => {
  it('stays expanded near the top', () => {
    expect(nextFabCollapsed(true, 100, 10)).toBe(false);
  });
  it('collapses when scrolling down', () => {
    expect(nextFabCollapsed(false, 100, 140)).toBe(true);
  });
  it('expands when scrolling up', () => {
    expect(nextFabCollapsed(true, 300, 260)).toBe(false);
  });
  it('ignores small jitter', () => {
    expect(nextFabCollapsed(true, 300, 298)).toBe(true);
    expect(nextFabCollapsed(false, 300, 303)).toBe(false);
  });
});
