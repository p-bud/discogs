/**
 * Simple rate limiter for API requests
 * Ensures we don't exceed API rate limits by queuing requests and enforcing delays
 */

interface QueuedRequest {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  retries: number;
}

class RateLimiter {
  private requestQueue: QueuedRequest[] = [];
  private processing = false;
  private requestsPerMinute: number;
  private requestsThisMinute = 0;
  private resetTime: number = Date.now() + 60000; // Reset after a minute
  
  constructor(requestsPerMinute = 55) { // Leave some buffer from the actual 60/min limit
    this.requestsPerMinute = requestsPerMinute;
    
    // Reset the counter every minute
    setInterval(() => {
      this.requestsThisMinute = 0;
      this.resetTime = Date.now() + 60000;
    }, 60000);
  }
  
  /**
   * Enqueue a request to be executed within rate limits
   */
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        fn,
        resolve,
        reject,
        retries: 0
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  /**
   * Process the queue of requests
   */
  private async processQueue() {
    if (this.requestQueue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    
    // Check if we've hit the rate limit
    if (this.requestsThisMinute >= this.requestsPerMinute) {
      const now = Date.now();
      const timeToReset = Math.max(0, this.resetTime - now);
      
      console.log(`Rate limit reached. Waiting ${timeToReset}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, timeToReset));
      this.requestsThisMinute = 0;
    }
    
    const request = this.requestQueue.shift();
    if (!request) {
      this.processQueue();
      return;
    }
    
    try {
      this.requestsThisMinute++;
      const result = await request.fn();
      request.resolve(result);
    } catch (error: any) {
      // Handle rate limiting errors with exponential backoff
      if (error.response?.status === 429 && request.retries < 3) {
        console.log(`Rate limited by Discogs API. Retrying after backoff (retry ${request.retries + 1}/3)`);
        
        // Exponential backoff - wait longer with each retry
        const backoffTime = 2000 * Math.pow(2, request.retries);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        
        // Put the request back in the queue with an incremented retry count
        this.requestQueue.unshift({
          ...request,
          retries: request.retries + 1
        });
      } else {
        request.reject(error);
      }
    }
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Process the next request
    this.processQueue();
  }
}

// Create a singleton instance
export const rateLimiter = new RateLimiter();

// Helper function to wrap API calls with rate limiting
export async function rateLimit<T>(fn: () => Promise<T>): Promise<T> {
  return rateLimiter.enqueue(fn);
} 