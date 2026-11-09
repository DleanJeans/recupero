import { AuthRequest, exchangeCodeAsync, ResponseType, refreshAsync, revokeAsync } from 'expo-auth-session';
import Constants from 'expo-constants';
import type { HealthTokens } from '../types/health';
import { GOOGLE_AUTH_DISCOVERY, GOOGLE_HEALTH_SCOPES, getGoogleRedirectScheme } from './google-health-utils';

/** Refresh this long before the access token expires so a request doesn't race the expiry. */
const EXPIRY_MARGIN_MS = 60_000;

/** OAuth client id (iOS type) from GOOGLE_HEALTH_CLIENT_ID at build time. Undefined = not set up. */
export function getGoogleHealthClientId(): string | undefined {
  const id = Constants.expoConfig?.extra?.googleHealthClientId;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
}

function getRedirectUri(clientId: string): string {
  const scheme = getGoogleRedirectScheme(clientId);
  if (!scheme) throw new Error('GOOGLE_HEALTH_CLIENT_ID must end in .apps.googleusercontent.com');
  return `${scheme}:/oauthredirect`;
}

function toTokens(response: { accessToken: string; refreshToken?: string; expiresIn?: number }, previous?: string) {
  const tokens: HealthTokens = {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken ?? previous,
    expiresAt: Date.now() + (response.expiresIn ?? 3600) * 1000,
  };
  return tokens;
}

/** Opens Google sign-in in a Custom Tab (PKCE, no client secret). Undefined when the user cancels. */
export async function signInToGoogleHealth(): Promise<HealthTokens | undefined> {
  const clientId = getGoogleHealthClientId();
  if (!clientId) throw new Error('Google Health is not set up in this build.');
  const redirectUri = getRedirectUri(clientId);
  const request = new AuthRequest({
    clientId,
    redirectUri,
    scopes: GOOGLE_HEALTH_SCOPES,
    responseType: ResponseType.Code,
    usePKCE: true,
    // Offline access + consent so Google returns a refresh token every time.
    extraParams: { access_type: 'offline', prompt: 'consent' },
  });
  const result = await request.promptAsync(GOOGLE_AUTH_DISCOVERY);
  if (result.type !== 'success') {
    if (result.type === 'error') throw new Error(result.error?.message ?? 'Google sign-in failed.');
    return undefined;
  }
  const response = await exchangeCodeAsync(
    {
      clientId,
      redirectUri,
      code: result.params.code,
      extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
    },
    GOOGLE_AUTH_DISCOVERY,
  );
  return toTokens(response);
}

/** The saved tokens if still fresh, else refreshed ones. Throws when the refresh token no longer works. */
export async function getFreshTokens(tokens: HealthTokens): Promise<HealthTokens> {
  if (tokens.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return tokens;
  const clientId = getGoogleHealthClientId();
  if (!clientId || !tokens.refreshToken) throw new Error('Signed out of Google Health. Connect again.');
  const response = await refreshAsync({ clientId, refreshToken: tokens.refreshToken }, GOOGLE_AUTH_DISCOVERY);
  return toTokens(response, tokens.refreshToken);
}

export async function revokeGoogleHealth(tokens: HealthTokens): Promise<void> {
  const clientId = getGoogleHealthClientId();
  if (!clientId) return;
  try {
    await revokeAsync({ clientId, token: tokens.refreshToken ?? tokens.accessToken }, GOOGLE_AUTH_DISCOVERY);
  } catch (error) {
    console.warn('Google Health revoke failed', error);
  }
}
