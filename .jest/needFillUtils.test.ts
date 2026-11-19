import { getNeedFills, mergeNeedFills } from '../src/utils/need-fill-utils';

describe('getNeedFills', () => {
  it('reports needs that rose, biggest first, and ignores small rises and timers', () => {
    const previous = new Map([
      ['hunger', 20],
      ['thirst', 50],
      ['hygiene', 40],
      ['energy', 10],
    ] as const);
    const fills = getNeedFills(previous, [
      { id: 'hunger', level: 60 },
      { id: 'thirst', level: 51 },
      { id: 'hygiene', level: 100 },
      { id: 'energy', level: 90, timerFullInMs: 1000 },
    ]);
    expect(fills).toEqual([
      { needId: 'hygiene', from: 40, to: 100 },
      { needId: 'hunger', from: 20, to: 60 },
    ]);
  });
});

describe('mergeNeedFills', () => {
  it('keeps the earliest start and latest end per need', () => {
    expect(mergeNeedFills([{ needId: 'hunger', from: 20, to: 40 }], [{ needId: 'hunger', from: 40, to: 70 }])).toEqual([
      { needId: 'hunger', from: 20, to: 70 },
    ]);
  });
});
