/**
 * discogs-http-client.ts
 * Creates authenticated axios instances for the Discogs API.
 * Server-side only — never import in client components.
 */
import axios from 'axios';
import { cookies } from 'next/headers';
import { DiscogsOAuth, apiConfig } from './auth';

const BASE_URL = 'https://api.discogs.com';
const USER_AGENT = 'DiscogsBarginHunter/0.1.0';
const TIMEOUT_MS = 15000;
const MAX_CONSECUTIVE_RATE_LIMIT_ERRORS = 3;

/** Shared response interceptor factory — handles rate limiting and 401 errors. */
function addResponseInterceptor(client: ReturnType<typeof axios.create>) {
  let consecutiveRateLimitErrors = 0;

  client.interceptors.response.use(
    response => {
      consecutiveRateLimitErrors = 0;
      return response;
    },
    async error => {
      if (error.response?.status === 401) throw error;

      if (error.response?.status === 429) {
        consecutiveRateLimitErrors++;
        if (consecutiveRateLimitErrors >= MAX_CONSECUTIVE_RATE_LIMIT_ERRORS) {
          error.isRateLimitFatal = true;
          throw error;
        }
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
        const waitMs = Math.min(60, Math.max(10, retryAfter)) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitMs));
        return client(error.config);
      }

      throw error;
    }
  );
}

/**
 * Returns an axios client authenticated with the user's OAuth tokens (read from
 * cookies), falling back to API-key auth when tokens are absent or cookies are
 * unavailable (e.g. during build).
 */
export function createDiscogsClient() {
  try {
    const cookieStore = cookies();
    const oauthToken = cookieStore.get('discogs_oauth_token')?.value;
    const oauthTokenSecret = cookieStore.get('discogs_oauth_token_secret')?.value;

    if (oauthToken && oauthTokenSecret) {
      const oauth = new DiscogsOAuth();

      const client = axios.create({
        baseURL: BASE_URL,
        headers: { 'User-Agent': USER_AGENT },
        timeout: TIMEOUT_MS,
      });

      client.interceptors.request.use(config => {
        const baseUrl = config.baseURL || '';
        const endpoint = config.url || '';
        const urlObj = new URL(`${baseUrl}${endpoint}`);

        const params = config.params || {};
        Object.keys(params).forEach(key => {
          if (params[key] != null) urlObj.searchParams.append(key, params[key]);
        });

        const fullUrl = urlObj.toString();
        const method = config.method?.toUpperCase() || 'GET';

        const oauthParams = oauth.authorize(
          { url: fullUrl, method, data: config.data },
          { key: oauthToken, secret: oauthTokenSecret },
          { key: apiConfig.DISCOGS_CONSUMER_KEY, secret: apiConfig.DISCOGS_CONSUMER_SECRET }
        );

        const header = oauth.toHeader(oauthParams);
        if (header.Authorization) {
          config.headers.Authorization = String(header.Authorization);
        }

        return config;
      });

      addResponseInterceptor(client);
      return client;
    }
  } catch {
    // cookies() may throw during build — fall through to API-key client.
  }

  return createDiscogsClientWithApiKey();
}

/**
 * Returns an axios client authenticated with the Discogs API key only (no OAuth).
 * Used as a fallback when OAuth tokens are unavailable.
 */
export function createDiscogsClientWithApiKey() {
  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Discogs token=${apiConfig.DISCOGS_CONSUMER_KEY}`,
      'User-Agent': USER_AGENT,
    },
    timeout: TIMEOUT_MS,
  });

  addResponseInterceptor(client);
  return client;
}

/** Returns true if OAuth token cookies are present. */
export function isAuthenticated(): boolean {
  try {
    const cookieStore = cookies();
    return cookieStore.has('discogs_oauth_token') && cookieStore.has('discogs_oauth_token_secret');
  } catch {
    return false;
  }
}
