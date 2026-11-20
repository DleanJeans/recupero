import { AppUsage } from '../../modules/app-usage';
import { buildAppSessions, sumAppUsage } from './app-usage-utils';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_MS = 5 * 60 * 1000;
let cache: { at: number; totals: Map<string, number> } | undefined;

/** Screen time per app over the last 7 days. Empty without usage access. Cached for a few minutes. */
export async function getAppUsageTotals(now = Date.now()): Promise<Map<string, number>> {
  if (cache && now - cache.at < CACHE_MS) return cache.totals;
  if (!AppUsage?.hasPermission()) return new Map();
  const events = await AppUsage.queryEvents(now - WEEK_MS, now);
  const totals = sumAppUsage(buildAppSessions(events));
  cache = { at: now, totals };
  return totals;
}
