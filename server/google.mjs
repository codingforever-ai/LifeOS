/**
 * Google OAuth — server-side authorization-code flow.
 * Client ID and secret stay server-side; the frontend never sees them.
 * The redirect_uri is supplied by the frontend (its own public origin) so it
 * always matches the URL the browser is actually using.
 */

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const SCOPES = ['openid', 'email', 'profile'];

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Build the Google consent-screen URL. `redirectUri` is the public callback URL. */
export function googleAuthUrl(redirectUri, state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/** Exchange the authorization code for tokens. */
export async function exchangeCode(code, redirectUri) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    let detail = 'Token exchange failed';
    try { const e = await res.json(); detail = e.error_description || e.error || detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

/** Fetch the authenticated user's profile from Google. */
export async function getGoogleUserInfo(accessToken) {
  const res = await fetch(USERINFO_URL, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error('Failed to retrieve Google profile');
  return res.json(); // { sub, email, email_verified, name, picture, ... }
}
