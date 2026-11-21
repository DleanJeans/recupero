import type { BehaviorEntry } from '../src/types/behavior';
import { getNeedAppOverlayWatches } from '../src/utils/need-app-overlay-utils';
import { DEFAULT_NEED_CONFIGS } from '../src/utils/need-utils';

const app = (id: string, packageName: string, extra: Partial<BehaviorEntry> = {}) =>
  ({
    id,
    name: id,
    icon: '💬',
    autoTrackApp: { packageName, label: id, syncedUntil: 0 },
    ...extra,
  }) as unknown as BehaviorEntry;

const social = (refills: Record<string, never | object>, level: number) => ({
  id: 'social' as const,
  config: { ...DEFAULT_NEED_CONFIGS.social, enabled: true, refills: refills as never },
  level,
});

describe('getNeedAppOverlayWatches', () => {
  it('lists app behaviors that refill an enabled need, with the duration rate', () => {
    const result = getNeedAppOverlayWatches(
      [social({ wa: { mode: 'duration', fullMinutes: 60 } }, 40)],
      [app('wa', 'com.whatsapp'), app('yt', 'com.youtube')],
      1000,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ packageName: 'com.whatsapp', name: 'wa' });
    expect(result[0].need).toMatchObject({ level: 40, at: 1000, fullMinutes: 60 });
  });

  it('skips archived behaviors and non-duration refills get no rate', () => {
    const result = getNeedAppOverlayWatches(
      [social({ a: { mode: 'add', amount: 10 }, b: { mode: 'set' } }, 40)],
      [app('a', 'p.a'), app('b', 'p.b', { archivedAt: 5 })],
      1,
    );
    expect(result.map(r => r.packageName)).toEqual(['p.a']);
    expect(result[0].need.fullMinutes).toBeUndefined();
  });

  it('prefers the lowest need when an app fills several', () => {
    const result = getNeedAppOverlayWatches(
      [{ ...social({ a: { mode: 'set' } }, 70) }, { ...social({ a: { mode: 'set' } }, 20), id: 'fun' as never }],
      [app('a', 'p.a')],
      1,
    );
    expect(result[0].need.level).toBe(20);
  });
});
