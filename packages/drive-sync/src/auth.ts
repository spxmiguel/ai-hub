// Google OAuth2 helpers — token dance lives in app layer (Next.js / Tauri).
// This module only builds URLs and exchanges codes.

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file', // only files we create
];

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function buildAuthUrl(cfg: OAuthConfig, state?: string): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    ...(state ? { state } : {}),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(cfg: OAuthConfig, code: string): Promise<OAuthTokens> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) throw new Error(`OAuth token exchange failed: ${res.status}`);

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshAccessToken(cfg: OAuthConfig, refreshToken: string): Promise<OAuthTokens> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) throw new Error(`OAuth refresh failed: ${res.status}`);

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export function isExpired(tokens: OAuthTokens, bufferMs = 60_000): boolean {
  return Date.now() + bufferMs >= tokens.expiresAt;
}
