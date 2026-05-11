export const SESSION_COOKIE_NAME = 'edats_session';

const DEFAULT_USERNAME = 'pmd_admin';
const DEFAULT_PASSWORD = 'pmd_admin';
const DEFAULT_SESSION_TOKEN = 'edats-internal-session';

let memoSessionToken: string | null = null;

export function getAuthConfig() {
  return {
    username: process.env.EDATS_USERNAME || DEFAULT_USERNAME,
    password: process.env.EDATS_PASSWORD || DEFAULT_PASSWORD,
    sessionToken: process.env.EDATS_SESSION_TOKEN || DEFAULT_SESSION_TOKEN,
  };
}

export function isValidLogin(username: string, password: string) {
  const config = getAuthConfig();
  return username === config.username && password === config.password;
}

export function getSessionToken() {
  if (memoSessionToken) return memoSessionToken;
  const configured = (process.env.EDATS_SESSION_TOKEN || '').trim();
  if (configured) {
    memoSessionToken = configured;
    return memoSessionToken;
  }
  if (process.env.NODE_ENV === 'production') {
    const token = globalThis.crypto?.randomUUID?.();
    if (token) {
      memoSessionToken = token;
      return memoSessionToken;
    }
    const fallback = `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
    memoSessionToken = fallback;
    return memoSessionToken;
  }
  memoSessionToken = DEFAULT_SESSION_TOKEN;
  return memoSessionToken;
}
