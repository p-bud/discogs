# Discogs API Integration Utils

This directory contains utility functions for integrating with the Discogs API.

## Current Implementation

The current implementation is a mock/simulation that uses hardcoded data instead of real API calls. This is intentional for the following reasons:

1. To avoid requiring Discogs API credentials during development
2. To provide a consistent demo experience without API rate limits
3. To showcase the UI and functionality without external dependencies

## Moving to Real API Integration

To implement real Discogs API integration:

1. Register for a Discogs API account at https://www.discogs.com/settings/developers
2. Update your `.env.local` file with your API credentials:
   ```
   DISCOGS_API_KEY=your_api_key_here
   DISCOGS_API_SECRET=your_api_secret_here
   ```

3. Update `discogs.ts` to remove the mock implementations and use real API calls
4. Implement proper error handling and rate limiting management
5. Consider implementing caching for common data like genres, styles, and formats

## Key Discogs API Considerations

- **Rate Limits**: The Discogs API has a limit of 60 requests per minute for authenticated users
- **Format**: Results are returned as JSON
- **Authentication**: Use OAuth 1.0a for authenticated requests
- **User-Agent**: A custom User-Agent header is required for all requests

## Sample API Response Structures

### Marketplace Search

```json
{
  "pagination": {
    "items": 6253,
    "page": 1,
    "pages": 63,
    "per_page": 100
  },
  "listings": [
    {
      "id": 1234567,
      "status": "For Sale",
      "price": { "value": 24.99, "currency": "USD" },
      "seller": {
        "id": 87654,
        "username": "vinylshop123",
        "rating": 99.8,
        "location": "US"
      },
      "release": {
        "id": 9876543,
        "title": "Kind of Blue",
        "artist": "Miles Davis",
        "year": 1959,
        "format": ["Vinyl", "LP"],
        "genre": ["Jazz"],
        "style": ["Modal", "Hard Bop"],
        "thumbnail": "https://img.discogs.com/example.jpg"
      },
      "condition": "VG+",
      "posted": "2023-04-01T12:00:00"
    }
  ]
}
```

### Price Suggestions

```json
{
  "9876543": {
    "Good (G)": { "value": 12.99, "currency": "USD" },
    "Good Plus (G+)": { "value": 15.99, "currency": "USD" },
    "Very Good (VG)": { "value": 18.99, "currency": "USD" },
    "Very Good Plus (VG+)": { "value": 24.99, "currency": "USD" },
    "Near Mint (NM or M-)": { "value": 29.99, "currency": "USD" },
    "Mint (M)": { "value": 34.99, "currency": "USD" }
  }
}
```

## References

See the `README-DISCOGS-API.md` file in the root directory for more detailed information on integrating with the Discogs API. 