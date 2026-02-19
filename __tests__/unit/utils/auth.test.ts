import { describe, it, expect, beforeEach } from 'vitest';
import { DiscogsOAuth } from '@/app/utils/auth';

const CONSUMER_KEY = 'test_consumer_key';
const CONSUMER_SECRET = 'test_consumer_secret';

describe('DiscogsOAuth', () => {
  let oauth: DiscogsOAuth;

  beforeEach(() => {
    oauth = new DiscogsOAuth(CONSUMER_KEY, CONSUMER_SECRET);
  });

  describe('authorize()', () => {
    it('returns all required oauth params', () => {
      const params = oauth.authorize({ url: 'https://api.discogs.com/oauth/request_token', method: 'GET' });
      expect(params).toHaveProperty('oauth_consumer_key', CONSUMER_KEY);
      expect(params).toHaveProperty('oauth_nonce');
      expect(params).toHaveProperty('oauth_signature');
      expect(params).toHaveProperty('oauth_signature_method', 'HMAC-SHA1');
      expect(params).toHaveProperty('oauth_timestamp');
      expect(params).toHaveProperty('oauth_version', '1.0');
    });

    it('oauth_nonce is 32-char hex string', () => {
      const params = oauth.authorize({ url: 'https://api.discogs.com/test', method: 'GET' });
      expect(params.oauth_nonce).toMatch(/^[0-9a-f]{32}$/);
    });

    it('oauth_timestamp is current Unix time within ±5s', () => {
      const before = Math.floor(Date.now() / 1000) - 5;
      const params = oauth.authorize({ url: 'https://api.discogs.com/test', method: 'GET' });
      const after = Math.floor(Date.now() / 1000) + 5;
      const ts = parseInt(params.oauth_timestamp, 10);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('oauth_signature_method is HMAC-SHA1', () => {
      const params = oauth.authorize({ url: 'https://api.discogs.com/test', method: 'GET' });
      expect(params.oauth_signature_method).toBe('HMAC-SHA1');
    });

    it('includes oauth_token when access token is provided', () => {
      const params = oauth.authorize(
        { url: 'https://api.discogs.com/test', method: 'GET' },
        { key: 'access_token_key', secret: 'access_token_secret' },
      );
      expect(params).toHaveProperty('oauth_token', 'access_token_key');
    });

    it('omits oauth_token when no access token is provided', () => {
      const params = oauth.authorize({ url: 'https://api.discogs.com/test', method: 'GET' });
      expect(params).not.toHaveProperty('oauth_token');
    });

    it('two consecutive calls produce different nonces', () => {
      const params1 = oauth.authorize({ url: 'https://api.discogs.com/test', method: 'GET' });
      const params2 = oauth.authorize({ url: 'https://api.discogs.com/test', method: 'GET' });
      expect(params1.oauth_nonce).not.toBe(params2.oauth_nonce);
    });

    it('includes URL query params in signature computation (different sig from clean URL)', () => {
      const paramsClean = oauth.authorize({ url: 'https://api.discogs.com/test', method: 'GET' });
      const paramsWithQuery = oauth.authorize({ url: 'https://api.discogs.com/test?foo=bar', method: 'GET' });
      // Signatures will be different because the base string differs
      expect(paramsClean.oauth_signature).not.toBe(paramsWithQuery.oauth_signature);
    });

    it('includes POST body data in signature base string', () => {
      const paramsNoData = oauth.authorize({ url: 'https://api.discogs.com/test', method: 'POST' });
      const paramsWithData = oauth.authorize(
        { url: 'https://api.discogs.com/test', method: 'POST', data: { oauth_callback: 'http://localhost' } },
      );
      expect(paramsNoData.oauth_signature).not.toBe(paramsWithData.oauth_signature);
    });

    it('uses env vars as fallback when no key/secret passed to constructor', () => {
      process.env.DISCOGS_CONSUMER_KEY = 'env_key';
      process.env.DISCOGS_CONSUMER_SECRET = 'env_secret';
      const oauthFromEnv = new DiscogsOAuth();
      const params = oauthFromEnv.authorize({ url: 'https://api.discogs.com/test', method: 'GET' });
      expect(params.oauth_consumer_key).toBe('env_key');
      delete process.env.DISCOGS_CONSUMER_KEY;
      delete process.env.DISCOGS_CONSUMER_SECRET;
    });
  });

  describe('toHeader()', () => {
    it('returns object with Authorization key starting with "OAuth "', () => {
      const params = oauth.authorize({ url: 'https://api.discogs.com/test', method: 'GET' });
      const header = oauth.toHeader(params);
      expect(header).toHaveProperty('Authorization');
      expect(header.Authorization).toMatch(/^OAuth /);
    });

    it('includes all oauth_* params', () => {
      const params = oauth.authorize({ url: 'https://api.discogs.com/test', method: 'GET' });
      const header = oauth.toHeader(params);
      expect(header.Authorization).toContain('oauth_consumer_key=');
      expect(header.Authorization).toContain('oauth_nonce=');
      expect(header.Authorization).toContain('oauth_signature=');
      expect(header.Authorization).toContain('oauth_signature_method=');
      expect(header.Authorization).toContain('oauth_timestamp=');
      expect(header.Authorization).toContain('oauth_version=');
    });

    it('excludes non-oauth_ params', () => {
      const params = {
        ...oauth.authorize({ url: 'https://api.discogs.com/test', method: 'GET' }),
        extra_field: 'should_be_excluded',
      };
      const header = oauth.toHeader(params);
      expect(header.Authorization).not.toContain('extra_field');
    });
  });
});
