import { simplifyPolyline } from '../src/utils/chart-utils';

describe('simplifyPolyline', () => {
  it('keeps short lines as they are', () => {
    expect(simplifyPolyline([{ x: 0, y: 0 }])).toEqual([{ x: 0, y: 0 }]);
    expect(
      simplifyPolyline([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toHaveLength(2);
  });

  it('collapses a straight decay into one stroke', () => {
    const points = Array.from({ length: 50 }, (_, i) => ({ x: i * 2, y: 10 + i * 0.5 }));
    expect(simplifyPolyline(points)).toEqual([points[0], points[49]]);
  });

  it('keeps the corners of a refill jump', () => {
    const points = [
      { x: 0, y: 50 },
      { x: 10, y: 60 },
      { x: 20, y: 70 },
      { x: 20, y: 10 },
      { x: 30, y: 20 },
      { x: 40, y: 30 },
    ];
    expect(simplifyPolyline(points)).toEqual([points[0], points[2], points[3], points[5]]);
  });
});
