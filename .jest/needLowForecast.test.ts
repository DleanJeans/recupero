import { getNeedLowForecasts } from '../src/utils/need-utils';

const HOUR = 3_600_000;
const config = { emptyHours: 10, cravingLine: 30 };

describe('getNeedLowForecasts', () => {
  it('forecasts when a need reaches its craving line, soonest first', () => {
    const forecasts = getNeedLowForecasts(
      [
        { id: 'thirst', level: 50, config },
        { id: 'hunger', level: 40, config },
      ],
      0,
      24 * HOUR,
    );
    expect(forecasts.map(f => f.needId)).toEqual(['hunger', 'thirst']);
    expect(forecasts[0].ts).toBeCloseTo(1 * HOUR);
    expect(forecasts[1].ts).toBeCloseTo(2 * HOUR);
  });

  it('leaves out needs already low, unknown, or too far away', () => {
    const forecasts = getNeedLowForecasts(
      [
        { id: 'hunger', level: 25, config },
        { id: 'thirst', level: undefined, config },
        { id: 'energy', level: 90, config },
      ],
      0,
      3 * HOUR,
    );
    expect(forecasts).toEqual([]);
  });
});
