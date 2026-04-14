export const SESSION_COOKIE_NAME = 'edats_session';

const DEFAULT_USERNAME = 'pmd_admin';
const DEFAULT_PASSWORD = 'pmd_admin';
const DEFAULT_SESSION_TOKEN = 'edats-internal-session';

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
  return getAuthConfig().sessionToken;
}
