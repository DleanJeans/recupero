import { type AppVersionInput, buildAppVersionRows, shortHash } from '../src/utils/app-version-utils';

const fmt = (d: Date) => d.toISOString().slice(0, 16);

const base: AppVersionInput = {
  appVersion: '1.0.0',
  nativeBuildVersion: '1',
  channel: 'preview',
  runtimeVersion: 'ce35186aa7ffc28f3f359885910d98ca68272f36',
  updatesEnabled: true,
  isEmbeddedLaunch: false,
  updateId: '0b5a7f3e-1234-4c3d-9e8f-abcdefabcdef',
  updateCreatedAt: new Date('2026-11-12T16:00:00Z'),
  apkInstalledAt: new Date('2026-11-10T08:30:00Z'),
  gitCommit: 'c5831bc0123456789',
  bundleTime: '2026-11-12T15:58:00Z',
  isDev: false,
};

const value = (input: AppVersionInput, label: string) =>
  buildAppVersionRows(input, fmt).find(r => r.label === label)?.value;

describe('shortHash', () => {
  it('trims and shortens', () => {
    expect(shortHash('  abcdef1234 ')).toBe('abcdef1');
    expect(shortHash('')).toBeNull();
    expect(shortHash(null)).toBeNull();
  });
});

describe('buildAppVersionRows', () => {
  it('shows OTA id, commit and publish time', () => {
    expect(value(base, 'Version')).toBe('1.0.0 · build 1 · preview');
    expect(value(base, 'Native')).toBe('runtime ce35186 · installed 2026-11-10T08:30');
    expect(value(base, 'JS')).toBe('OTA 0b5a7f3e · commit c5831bc · published 2026-11-12T16:00');
  });

  it('shows embedded bundle with its build time', () => {
    const input = { ...base, isEmbeddedLaunch: true };
    expect(value(input, 'JS')).toBe('Embedded · commit c5831bc · 2026-11-12T16:00');
  });

  it('falls back to bundle time when the embedded manifest has no date', () => {
    const input = { ...base, isEmbeddedLaunch: true, updateCreatedAt: null };
    expect(value(input, 'JS')).toBe('Embedded · commit c5831bc · 2026-11-12T15:58');
  });

  it('labels the dev server and skips missing parts', () => {
    const input = {
      ...base,
      isDev: true,
      updatesEnabled: false,
      gitCommit: '',
      apkInstalledAt: null,
      bundleTime: 'bad',
    };
    expect(value(input, 'Version')).toBe('1.0.0 · build 1 · dev');
    expect(value(input, 'Native')).toBe('runtime ce35186');
    expect(value(input, 'JS')).toBe('Dev server');
  });
});
