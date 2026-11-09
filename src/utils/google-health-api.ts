import type { HealthAzmDay, HealthSleep } from '../types/health';
import {
  GOOGLE_HEALTH_API_BASE,
  getAzmRollUpBody,
  getSleepFilter,
  parseAzmRollupPoint,
  parseSleepDataPoint,
} from './google-health-utils';

const MAX_PAGES = 20;

export class GoogleHealthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function request(
  accessToken: string,
  path: string,
  params: Record<string, string> = {},
  body?: unknown,
): Promise<unknown> {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${GOOGLE_HEALTH_API_BASE}/${path}${query ? `?${query}` : ''}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = (json as { error?: { message?: string; status?: string; details?: { reason?: string }[] } })?.error;
    const code = error?.details?.find(detail => detail.reason)?.reason ?? error?.status;
    throw new GoogleHealthError(
      error?.message ?? `Google Health request failed (${response.status})`,
      response.status,
      code,
    );
  }
  return json;
}

async function listDataPoints(accessToken: string, dataType: string, filter: string, pageSize: number) {
  const points: unknown[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const params: Record<string, string> = { filter, pageSize: String(pageSize) };
    if (pageToken) params.pageToken = pageToken;
    const body = (await request(accessToken, `dataTypes/${dataType}/dataPoints`, params)) as {
      dataPoints?: unknown[];
      nextPageToken?: string;
    };
    points.push(...(body?.dataPoints ?? []));
    pageToken = body?.nextPageToken;
    if (!pageToken) break;
  }
  return points;
}

/** Fails with ACCOUNT_NOT_LINKED when the Google account was never opened in the Google Health / Fitbit app. */
export async function checkGoogleHealthIdentity(accessToken: string): Promise<void> {
  await request(accessToken, 'identity');
}

export async function fetchSleeps(accessToken: string, since: number): Promise<HealthSleep[]> {
  const points = await listDataPoints(accessToken, 'sleep', getSleepFilter(since), 25);
  return points.map(parseSleepDataPoint).filter((sleep): sleep is HealthSleep => sleep != null);
}

/** Daily Active Zone Minutes totals from `firstDay` through `lastDay` ("YYYY-MM-DD", at most 90 days). */
export async function fetchAzmDays(accessToken: string, firstDay: string, lastDay: string): Promise<HealthAzmDay[]> {
  const body = (await request(
    accessToken,
    'dataTypes/active-zone-minutes/dataPoints:dailyRollUp',
    {},
    getAzmRollUpBody(firstDay, lastDay),
  )) as { rollupDataPoints?: unknown[] };
  return (body?.rollupDataPoints ?? []).map(parseAzmRollupPoint).filter((day): day is HealthAzmDay => day != null);
}
