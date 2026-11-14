import { shouldRecordPreciseSample } from '../src/utils/sunlight-utils';

describe('shouldRecordPreciseSample', () => {
  it('records the first sample', () => {
    expect(shouldRecordPreciseSample(undefined, null, 1000)).toBe(true);
  });
  it('skips repeats in the same place within 5 minutes', () => {
    expect(shouldRecordPreciseSample({ ts: 0, placeId: 'a' }, 'a', 60_000)).toBe(false);
  });
  it('records when the place changes', () => {
    expect(shouldRecordPreciseSample({ ts: 0, placeId: 'a' }, null, 1000)).toBe(true);
  });
  it('records again after 5 minutes', () => {
    expect(shouldRecordPreciseSample({ ts: 0, placeId: null }, null, 5 * 60_000)).toBe(true);
  });
});

describe('eye-level share history', () => {
  const { getEyeLevelFactorAt } = jest.requireActual('../src/utils/sunlight-utils');
  it('defaults to 50% and applies only from the step onwards', () => {
    const steps = [{ from: 100, factor: 0.8 }];
    expect(getEyeLevelFactorAt(steps, 50)).toBe(0.5);
    expect(getEyeLevelFactorAt(steps, 100)).toBe(0.8);
    expect(getEyeLevelFactorAt(undefined, 100)).toBe(0.5);
  });
});
