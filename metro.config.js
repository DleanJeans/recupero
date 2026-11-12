const { execSync } = require('node:child_process');
const { getDefaultConfig } = require('expo/metro-config');

// Stamp the bundle with the commit it was built from (shown at the bottom of Settings).
// EXPO_PUBLIC_* vars are inlined into the JS bundle, so this never touches the native fingerprint.
function resolveGitCommit() {
  const fromEnv = process.env.GITHUB_SHA || process.env.EAS_BUILD_GIT_COMMIT_HASH;
  if (fromEnv) return fromEnv;
  try {
    return execSync('git rev-parse HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

process.env.EXPO_PUBLIC_GIT_COMMIT ??= resolveGitCommit();
process.env.EXPO_PUBLIC_BUNDLE_TIME ??= new Date().toISOString();

const config = getDefaultConfig(__dirname);

module.exports = config;
