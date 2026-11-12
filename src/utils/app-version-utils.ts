export type AppVersionInput = {
  appVersion: string | null;
  nativeBuildVersion: string | null;
  channel: string | null;
  runtimeVersion: string | null;
  updatesEnabled: boolean;
  isEmbeddedLaunch: boolean;
  updateId: string | null;
  updateCreatedAt: Date | null;
  apkInstalledAt: Date | null;
  gitCommit: string | null;
  bundleTime: string | null;
  isDev: boolean;
};

export type AppVersionRow = { label: string; value: string };

const SHORT_HASH = 7;

export function shortHash(hash: string | null | undefined, length = SHORT_HASH): string | null {
  const trimmed = hash?.trim();
  return trimmed ? trimmed.slice(0, length) : null;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function joinParts(parts: (string | null | undefined | false)[]): string {
  return parts.filter(Boolean).join(' · ');
}

/** Rows for the version footer in Settings: app version, native build, and the running JS bundle. */
export function buildAppVersionRows(input: AppVersionInput, formatDateTime: (date: Date) => string): AppVersionRow[] {
  const commit = shortHash(input.gitCommit);
  const fmt = (date: Date | null) => (date ? formatDateTime(date) : null);

  const version = joinParts([
    input.appVersion ?? '?',
    input.nativeBuildVersion && `build ${input.nativeBuildVersion}`,
    input.isDev ? 'dev' : input.channel,
  ]);

  const native = joinParts([
    `runtime ${shortHash(input.runtimeVersion) ?? '?'}`,
    input.apkInstalledAt && `installed ${fmt(input.apkInstalledAt)}`,
  ]);

  let bundle: string;
  if (input.isDev || !input.updatesEnabled) {
    bundle = joinParts(['Dev server', commit && `commit ${commit}`, fmt(parseDate(input.bundleTime))]);
  } else if (input.isEmbeddedLaunch) {
    bundle = joinParts([
      'Embedded',
      commit && `commit ${commit}`,
      fmt(input.updateCreatedAt ?? parseDate(input.bundleTime)),
    ]);
  } else {
    bundle = joinParts([
      `OTA ${shortHash(input.updateId, 8) ?? '?'}`,
      commit && `commit ${commit}`,
      fmt(input.updateCreatedAt) && `published ${fmt(input.updateCreatedAt)}`,
    ]);
  }

  return [
    { label: 'Version', value: version },
    { label: 'Native', value: native },
    { label: 'JS', value: bundle },
  ];
}
