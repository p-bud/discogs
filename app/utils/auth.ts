import crypto from 'crypto';

// Discogs API credentials provided by the user
const DISCOGS_CONSUMER_KEY = 'gNzKxthQDOyjiCBynacq';
const DISCOGS_CONSUMER_SECRET = 'afUtCRzXvHfdaJGapoQgpocinQjMXPnp';
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
 * A simplified OAuth 1.0a implementation specifically for Discogs
 * 
 * This is a partial implementation that handles what we need for Discogs API
 * In a production app, you would use a full OAuth library
 */
export class DiscogsOAuth {
  private consumer: OAuthConsumer;
  private signatureMethod: string;

  constructor(consumerKey: string = DISCOGS_CONSUMER_KEY, consumerSecret: string = DISCOGS_CONSUMER_SECRET) {
    this.consumer = {
      key: consumerKey,
      secret: consumerSecret
    };
    this.signatureMethod = 'HMAC-SHA1';
  }

  /**
   * Create an OAuth 1.0a signature
   */
  private createSignature(
    baseString: string, 
    consumerSecret: string, 
    tokenSecret: string = ''
  ): string {
    const key = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
    return crypto
      .createHmac('sha1', key)
      .update(baseString)
      .digest('base64');
  }

  /**
   * Extract query parameters from URL
   */
  private extractQueryParams(url: string): Record<string, string> {
    const params: Record<string, string> = {};
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
    } catch (error) {
      console.error('Invalid URL format for extracting params:', url);
    }
    return params;
  }

  /**
   * Create the signature base string
   */
  private createSignatureBaseString(
    method: string,
    url: string,
    params: Record<string, string>
  ): string {
    // Remove query parameters from the URL
    let baseUrl = url;
    try {
      const urlObj = new URL(url);
      baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch (error) {
      console.error('Invalid URL format:', url);
    }

    // Sort parameters alphabetically
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    // Properly format and encode components exactly as specified by OAuth 1.0a
    const encodedUrl = encodeURIComponent(baseUrl);
    const encodedParams = encodeURIComponent(sortedParams);
    
    return `${method.toUpperCase()}&${encodedUrl}&${encodedParams}`;
  }

  /**
   * Generate OAuth parameters
   */
  authorize(
    request: OAuthRequestOptions,
    token: OAuthToken | null = null,
    consumer: OAuthConsumer | null = null
  ): Record<string, string> {
    // Use provided consumer or default
    const activeConsumer = consumer || this.consumer;
    
    // Create timestamp and nonce
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    // Create OAuth parameters
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: activeConsumer.key,
      oauth_nonce: nonce,
      oauth_signature_method: this.signatureMethod,
      oauth_timestamp: timestamp,
      oauth_version: '1.0'
    };

    // Add token if provided
    if (token && token.key) {
      oauthParams.oauth_token = token.key;
    }

    // Extract query parameters from URL
    const urlParams = this.extractQueryParams(request.url);
    
    // Combine all parameters: OAuth + URL query params + request data
    const allParams = { ...oauthParams, ...urlParams };
    if (request.data) {
      Object.keys(request.data).forEach(key => {
        allParams[key] = request.data![key];
      });
    }

    // Create signature base string, using the URL without query parameters
    let baseUrl = request.url;
    try {
      const urlObj = new URL(request.url);
      baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch (error) {
      console.error('Invalid URL in authorize:', request.url);
    }
    
    const baseString = this.createSignatureBaseString(
      request.method,
      baseUrl,
      allParams
    );
    
    // Debug logging - only log in development and only when there's an issue
    if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_OAUTH === 'true') {
      console.log('Base string for signature:', baseString);
    }

    // Add signature
    oauthParams.oauth_signature = this.createSignature(
      baseString,
      activeConsumer.secret,
      token ? token.secret : ''
    );
    
    // Only log in development and when debugging is enabled
    if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_OAUTH === 'true') {
      console.log('Generated signature:', oauthParams.oauth_signature);
    }

    return oauthParams;
  }

  /**
   * Generate OAuth header
   */
  toHeader(oauthParams: Record<string, string>): Record<string, string> {
    const header = Object.keys(oauthParams)
      .filter(key => key.startsWith('oauth_'))
      .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ');

    return { Authorization: `OAuth ${header}` };
  }
}

// Export API URLs and credentials
export const apiConfig = {
  DISCOGS_CONSUMER_KEY,
  DISCOGS_CONSUMER_SECRET,
  DISCOGS_REQUEST_TOKEN_URL,
  DISCOGS_AUTHORIZE_URL,
  DISCOGS_ACCESS_TOKEN_URL
}; 