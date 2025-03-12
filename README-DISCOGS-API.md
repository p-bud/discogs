# Discogs API Integration

This document explains how the Discogs API should be properly integrated with this application in a real-world scenario.

## Discogs Data Structure

Discogs organizes music data in a hierarchical manner:

1. **Releases** - Individual albums/singles released on specific formats
2. **Masters** - The "canonical" version of a release (grouping all variants)
3. **Artists** - Musicians who created the music
4. **Labels** - Companies that publish music
5. **Marketplace Listings** - Items for sale by users

## Filtering Options

Discogs uses standardized taxonomies for many music metadata fields:

### Genres and Styles

Genres are broad categories (e.g., Rock, Jazz, Electronic) while Styles are more specific subgenres (e.g., Hard Bop, Ambient, Progressive Rock).

In the Discogs database:
- There are around 15-20 main genres
- There are 300+ styles spread across these genres
- Each release can have multiple genres and styles

### Formats

Formats represent the physical or digital medium:
- Vinyl (LP, 7", 10", 12")
- CD
- Cassette
- Digital
- And many more

## API Endpoints for Metadata

Discogs doesn't offer dedicated API endpoints for retrieving lists of all genres, styles, or formats. Instead, these are accessible through:

1. **Database Dumps** - Discogs provides regular XML dumps of their entire database
   - URL: https://data.discogs.com/
   - These XML files can be parsed to extract complete lists of genres, styles, and formats

2. **Search API** - The search endpoint can be used to fetch this data:
   ```
   GET https://api.discogs.com/database/search?type=release&format=Vinyl
   ```

## Implementing in Production

For a production application, the recommended approach would be:

1. **Scheduled Jobs**:
   - Set up a weekly job to parse the Discogs database dumps
   - Extract and store all genres, styles, and formats in your database
   - This avoids excessive API calls and rate limiting

2. **Caching**:
   - Cache these values in Redis or a similar caching system
   - Set reasonable TTL (Time To Live) values

3. **API Integration**:
   - Use the Discogs search API to find marketplace listings
   - Implement proper pagination (Discogs limits to 100 results per page)
   - Handle rate limiting (60 requests per minute for authenticated users)

4. **Authentication**:
   - Use OAuth for authenticating with the Discogs API
   - This increases your rate limits and enables more features

## Sample API Calls

### Search for marketplace listings:

```javascript
const response = await axios.get('https://api.discogs.com/marketplace/search', {
  params: {
    type: 'release',
    format: 'Vinyl',
    genre: 'Rock',
    style: 'Psychedelic',
    year: '1960-1975',
    price_min: 5,
    price_max: 50
  },
  headers: {
    'Authorization': `OAuth oauth_consumer_key="${process.env.DISCOGS_API_KEY}",oauth_token="${process.env.DISCOGS_OAUTH_TOKEN}"`,
    'User-Agent': 'DiscogsBarginHunter/1.0'
  }
});
```

### Get price suggestions for a release:

```javascript
const releaseId = '1234567';
const response = await axios.get(`https://api.discogs.com/marketplace/price_suggestions/${releaseId}`, {
  headers: {
    'Authorization': `OAuth oauth_consumer_key="${process.env.DISCOGS_API_KEY}",oauth_token="${process.env.DISCOGS_OAUTH_TOKEN}"`,
    'User-Agent': 'DiscogsBarginHunter/1.0'
  }
});
```

## Discogs API Resources

- [Discogs API Documentation](https://www.discogs.com/developers/)
- [Authentication](https://www.discogs.com/developers/#page:authentication)
- [Marketplace Endpoints](https://www.discogs.com/developers/#page:marketplace)
- [Database Endpoints](https://www.discogs.com/developers/#page:database)
- [Rate Limiting](https://www.discogs.com/developers/#page:home,header:home-rate-limiting) 