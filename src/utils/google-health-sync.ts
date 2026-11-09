import { useBehaviorStore } from '../store/behavior-store';
import { useHealthStore } from '../store/health-store';
import { toDateString } from './date-utils';
import { checkGoogleHealthIdentity, fetchAzmDays, fetchSleeps, GoogleHealthError } from './google-health-api';
import { getFreshTokens, revokeGoogleHealth, signInToGoogleHealth } from './google-health-auth';
import { getHealthSyncStart, HEALTH_AUTO_SYNC_GAP_MS, mergeAzmDays } from './google-health-utils';

let syncInFlight: Promise<void> | null = null;

function describeError(error: unknown): string {
  if (error instanceof GoogleHealthError) {
    if (error.code === 'ACCOUNT_NOT_LINKED') {
      return 'This Google account isn’t linked to Fitbit yet. Open the Fitbit / Google Health app once, then sync again.';
    }
    if (error.status === 401) return 'Google Health signed you out. Connect again.';
    if (error.status === 403)
      return 'Google Health refused access. Check the permissions you allowed and connect again.';
  }
  return error instanceof Error ? error.message : String(error);
}

/** Signs in, checks the account is linked, then syncs. Returns an error message, or undefined on success/cancel. */
export async function connectGoogleHealth(): Promise<string | undefined> {
  try {
    const tokens = await signInToGoogleHealth();
    if (!tokens) return undefined;
    await checkGoogleHealthIdentity(tokens.accessToken);
    useHealthStore.getState().setTokens(tokens);
  } catch (error) {
    return describeError(error);
  }
  await syncGoogleHealth({ force: true });
  return useHealthStore.getState().lastError;
}

export async function disconnectGoogleHealth(): Promise<void> {
  const { tokens, disconnect } = useHealthStore.getState();
  disconnect();
  if (tokens) await revokeGoogleHealth(tokens);
}

/** Pulls sleep into the chosen behaviour and daily Active Zone Minutes. Skips when synced recently unless forced. */
export function syncGoogleHealth(options: { force?: boolean } = {}): Promise<void> {
  if (syncInFlight) return syncInFlight;
  const { tokens, lastSyncAt } = useHealthStore.getState();
  if (!tokens) return Promise.resolve();
  if (!options.force && lastSyncAt != null && Date.now() - lastSyncAt < HEALTH_AUTO_SYNC_GAP_MS) {
    return Promise.resolve();
  }
  syncInFlight = runSync().finally(() => {
    syncInFlight = null;
    useHealthStore.getState().setSyncing(false);
  });
  return syncInFlight;
}

async function runSync(): Promise<void> {
  const health = useHealthStore.getState();
  if (!health.tokens) return;
  health.setSyncing(true);
  const now = Date.now();

  let accessToken: string;
  try {
    const tokens = await getFreshTokens(health.tokens);
    if (tokens !== health.tokens) health.setTokens(tokens);
    accessToken = tokens.accessToken;
  } catch (error) {
    // A refresh token that stopped working (revoked, or 7 days old while the Cloud app is in Testing).
    health.disconnect();
    health.recordSync({ at: now, error: `Google Health signed you out. Connect again. (${describeError(error)})` });
    return;
  }

  const since = getHealthSyncStart(health.lastSyncAt, now);
  const errors: string[] = [];
  let importedSleepIds: string[] | undefined;
  let azmByDay: Record<string, number> | undefined;

  const { sleepBehaviorId } = health;
  const sleepBehavior = sleepBehaviorId
    ? useBehaviorStore.getState().behaviors.find(b => b.id === sleepBehaviorId)
    : undefined;
  if (sleepBehavior) {
    try {
      const sleeps = await fetchSleeps(accessToken, since);
      importedSleepIds = useBehaviorStore
        .getState()
        .applyHealthSleeps(sleepBehavior.id, sleeps, useHealthStore.getState().importedSleepIds);
    } catch (error) {
      errors.push(`Sleep: ${describeError(error)}`);
    }
  }

  try {
    const firstDay = toDateString(new Date(since));
    const days = await fetchAzmDays(accessToken, firstDay, toDateString(new Date(now)));
    azmByDay = mergeAzmDays(useHealthStore.getState().azmByDay, days, firstDay, now);
  } catch (error) {
    errors.push(`Active Zone Minutes: ${describeError(error)}`);
  }

  useHealthStore.getState().recordSync({
    at: now,
    azmByDay,
    importedSleepIds,
    error: errors.length > 0 ? errors.join('\n') : undefined,
  });
}
