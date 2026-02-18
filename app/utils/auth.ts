import { createHmac, randomBytes } from 'crypto';

const DISCOGS_REQUEST_TOKEN_URL = 'https://api.discogs.com/oauth/request_token';
const DISCOGS_AUTHORIZE_URL = 'https://www.discogs.com/oauth/authorize';
const DISCOGS_ACCESS_TOKEN_URL = 'https://api.discogs.com/oauth/access_token';

interface OAuthConsumer {
  key: string;
  secret: string;
}

interface OAuthToken {
  key: string;
  secret: string;
}

interface OAuthRequestOptions {
  url: string;
  method: string;
  data?: Record<string, string>;
}

/**
 * OAuth 1.0a implementation for Discogs.
 * Uses Node.js native crypto (no CryptoJS dependency).
 */
export class DiscogsOAuth {
  private consumer: OAuthConsumer;
  private signatureMethod: string;

  constructor(consumerKey?: string, consumerSecret?: string) {
    const key = consumerKey ?? process.env.DISCOGS_CONSUMER_KEY ?? '';
    const secret = consumerSecret ?? process.env.DISCOGS_CONSUMER_SECRET ?? '';
    this.consumer = { key, secret };
    this.signatureMethod = 'HMAC-SHA1';
  }

  private createSignature(
    baseString: string,
    consumerSecret: string,
    tokenSecret: string = ''
  ): string {
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
    return createHmac('sha1', signingKey).update(baseString).digest('base64');
  }

  private extractQueryParams(url: string): Record<string, string> {
    const params: Record<string, string> = {};
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
    } catch {
      // Ignore invalid URLs
    }
    return params;
  }

  private createSignatureBaseString(
    method: string,
    url: string,
    params: Record<string, string>
  ): string {
    let baseUrl = url;
    try {
      const urlObj = new URL(url);
      baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      // Ignore invalid URLs
    }

    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    return `${method.toUpperCase()}&${encodeURIComponent(baseUrl)}&${encodeURIComponent(sortedParams)}`;
  }

  authorize(
    request: OAuthRequestOptions,
    token: OAuthToken | null = null,
    consumer: OAuthConsumer | null = null
  ): Record<string, string> {
    const activeConsumer = consumer || this.consumer;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(16).toString('hex');

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: activeConsumer.key,
      oauth_nonce: nonce,
      oauth_signature_method: this.signatureMethod,
      oauth_timestamp: timestamp,
      oauth_version: '1.0',
    };

    if (token?.key) {
      oauthParams.oauth_token = token.key;
    }

    const urlParams = this.extractQueryParams(request.url);
    const allParams = { ...oauthParams, ...urlParams };
    if (request.data) {
      Object.assign(allParams, request.data);
    }

    let baseUrl = request.url;
    try {
      const urlObj = new URL(request.url);
      baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      // Ignore invalid URLs
    }

    const baseString = this.createSignatureBaseString(request.method, baseUrl, allParams);

    if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_OAUTH === 'true') {
      console.log('OAuth base string:', baseString);
    }

    oauthParams.oauth_signature = this.createSignature(
      baseString,
      activeConsumer.secret,
      token?.secret ?? ''
    );

    return oauthParams;
  }

  toHeader(oauthParams: Record<string, string>): Record<string, string> {
    const header = Object.keys(oauthParams)
      .filter(key => key.startsWith('oauth_'))
      .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ');

    return { Authorization: `OAuth ${header}` };
  }
}

export const apiConfig = {
  get DISCOGS_CONSUMER_KEY() { return process.env.DISCOGS_CONSUMER_KEY ?? ''; },
  get DISCOGS_CONSUMER_SECRET() { return process.env.DISCOGS_CONSUMER_SECRET ?? ''; },
  DISCOGS_REQUEST_TOKEN_URL,
  DISCOGS_AUTHORIZE_URL,
  DISCOGS_ACCESS_TOKEN_URL,
};
