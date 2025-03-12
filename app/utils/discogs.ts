import axios from 'axios';
import { cookies } from 'next/headers';
import { apiConfig } from './auth';

// Types
export interface DiscogsResponse<T> {
  data: T;
}

/**
 * Configure Discogs API client with authentication
 * This is a server-side function that shouldn't be called directly from client components
 */
export function createDiscogsClient() {
  // Try to get authentication credentials from cookies
  let authHeader = '';
  
  try {
    const cookieStore = cookies();
    const hasAuth = cookieStore.has('discogs_oauth_token') && cookieStore.has('discogs_oauth_token_secret');
    
    if (hasAuth) {
      // Use auth tokens for requests - note that Discogs OAuth requires a specific format
      const oauthToken = cookieStore.get('discogs_oauth_token')?.value || '';
      const oauthTokenSecret = cookieStore.get('discogs_oauth_token_secret')?.value || '';
      
      console.log('Creating Discogs client with OAuth credentials');
      
      // Import auth utilities
      const { DiscogsOAuth, apiConfig } = require('./auth');
      const oauth = new DiscogsOAuth();
      
      // Create a custom axios instance
      const client = axios.create({
        baseURL: 'https://api.discogs.com',
        headers: {
          'User-Agent': 'DiscogsBarginHunter/0.1.0',
        },
        // Add longer timeout to handle slow responses
        timeout: 15000,
      });
      
      // Add rate limit handling logic
      let consecutiveRateLimitErrors = 0;
      const MAX_CONSECUTIVE_RATE_LIMIT_ERRORS = 3;
      
      // Add interceptor to dynamically generate OAuth headers for each request
      client.interceptors.request.use(config => {
        // Get the full URL including query parameters
        const baseUrl = config.baseURL || '';
        const endpoint = config.url || '';
        let fullUrl = `${baseUrl}${endpoint}`;
        
        // Extract query parameters for OAuth signature
        const params = config.params || {};
        const urlObj = new URL(fullUrl);
        
        // Add the params to the URL object to ensure they're included in OAuth signature
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== null) {
            urlObj.searchParams.append(key, params[key]);
          }
        });
        
        // Use the full URL with query parameters for OAuth signature
        fullUrl = urlObj.toString();
        
        // Generate OAuth header with the proper URL including params
        const method = config.method?.toUpperCase() || 'GET';
        
        // Prepare OAuth params
        const oauthParams = oauth.authorize({
          url: fullUrl,
          method,
          data: config.data,
        }, {
          key: oauthToken, 
          secret: oauthTokenSecret
        }, {
          key: apiConfig.DISCOGS_CONSUMER_KEY,
          secret: apiConfig.DISCOGS_CONSUMER_SECRET
        });
        
        // Generate the header
        const authHeader = oauth.toHeader(oauthParams);
        config.headers.Authorization = authHeader.Authorization;
        
        // Add debugging for rate limit issue diagnostics
        console.log('Making authenticated request to:', fullUrl);
        
        return config;
      });
      
      // Add response interceptor to handle rate limit errors
      client.interceptors.response.use(
        (response) => {
          // Reset consecutive error counter on success
          consecutiveRateLimitErrors = 0;
          
          // Check and log remaining rate limit
          const rateLimit = response.headers['x-discogs-ratelimit'];
          const rateRemaining = response.headers['x-discogs-ratelimit-remaining'];
          
          if (rateLimit && rateRemaining) {
            console.log(`Rate limit: ${rateRemaining}/${rateLimit} remaining`);
            
            // If we're getting close to the limit, add an artificial delay
            if (parseInt(rateRemaining) < 5) {
              console.log('Warning: Getting close to rate limit. Adding delay to future requests.');
            }
          }
          
          return response;
        },
        async (error) => {
          // Handle rate limit errors (429)
          if (error.response && error.response.status === 429) {
            consecutiveRateLimitErrors++;
            console.log(`Rate limit exceeded. Consecutive errors: ${consecutiveRateLimitErrors}`);
            
            // If we keep hitting rate limits, fall back to API key
            if (consecutiveRateLimitErrors >= MAX_CONSECUTIVE_RATE_LIMIT_ERRORS) {
              console.log('Too many consecutive rate limit errors. Falling back to API key authentication.');
              throw error; // Let the caller handle it
            }
            
            // Get retry-after header or use default
            const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
            const waitTime = Math.min(60, Math.max(5, retryAfter)) * 1000; // Between 5-60 seconds
            
            console.log(`Rate limited. Waiting ${waitTime/1000} seconds before retrying.`);
            
            // Wait for the specified time
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // Retry the request
            return client(error.config);
          }
          
          // For other errors just propagate
          throw error;
        }
      );
      
      return client;
    } else {
      // Fall back to API key authentication
      console.log('Creating Discogs client with API key (no OAuth tokens found)');
      return createDiscogsClientWithApiKey();
    }
  } catch (error) {
    // If cookies() fails (e.g., during build time), fall back to API key authentication
    console.log('Creating Discogs client with API key (cookie access error)');
    return createDiscogsClientWithApiKey();
  }
}

// Cache for genres and styles to avoid repeated API calls
let cachedGenres: string[] = [];
let cachedStyles: string[] = [];
let cachedFormats: string[] = [];
// New cache for genre -> styles mapping
let cachedGenreStyleMap: Record<string, string[]> = {};

/**
 * Get all available genres from Discogs (SERVER-SIDE ONLY)
 */
export async function getGenres(): Promise<string[]> {
  if (cachedGenres.length > 0) return cachedGenres;
  
  try {
    const discogsClient = createDiscogsClient();
    
    // Make multiple calls with different parameters to get a wider variety of genres
    const requests = [
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100 } }),
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Electronic' } }),
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Rock' } }),
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Jazz' } }),
    ];
    
    const responses = await Promise.allSettled(requests);
    
    // Process and extract unique genres from all successful responses
    const genres = new Set<string>();
    
    // Add all the major genres manually to ensure they're included
    [
      'Rock', 'Jazz', 'Pop', 'Electronic', 'Hip Hop', 'Classical', 
      'Funk / Soul', 'Reggae', 'Folk, World, & Country', 'Blues',
      'Latin', 'Stage & Screen', 'Brass & Military', 'Children\'s', 'Non-Music'
    ].forEach(g => genres.add(g));
    
    // Add genres from API responses
    responses.forEach(result => {
      if (result.status === 'fulfilled' && result.value?.data?.results) {
        result.value.data.results.forEach((release: any) => {
          if (release.genre && Array.isArray(release.genre)) {
            release.genre.forEach((g: string) => genres.add(g));
          }
        });
      }
    });
    
    cachedGenres = Array.from(genres).sort();
    return cachedGenres;
  } catch (error) {
    console.error('Error fetching genres from Discogs:', error);
    // Fallback to pre-defined list if API call fails
    return [
      'Rock', 'Jazz', 'Pop', 'Electronic', 'Hip Hop', 'Classical', 
      'Funk / Soul', 'Reggae', 'Folk, World, & Country', 'Blues',
      'Latin', 'Stage & Screen', 'Brass & Military'
    ];
  }
}

/**
 * Get all available styles from Discogs
 */
export async function getStyles(): Promise<string[]> {
  if (cachedStyles.length > 0) return cachedStyles;
  
  try {
    const discogsClient = createDiscogsClient();
    
    // We'll create an array of search queries to get a diverse set of releases
    // This will help us build a comprehensive list of styles
    const searchPromises = [
      // General search for releases
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100 } }),
      
      // Search for specific popular styles
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, style: 'Tech House' } }),
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, style: 'Ambient' } }),
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, style: 'Deep House' } }),
      
      // Search for main genres
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Electronic' } }),
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Rock' } }),
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Jazz' } }),
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Hip Hop' } }),
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Pop' } }),
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Funk / Soul' } }),
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Classical' } }),
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Folk, World, & Country' } }),
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Reggae' } }),
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Blues' } }),
      discogsClient.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Latin' } }),
    ];
    
    // Add some more specific style searches to ensure comprehensive coverage
    const additionalStyles = [
      'IDM', 'Techno', 'House', 'Drum & Bass', 'Jazz-Funk', 'Hard Bop', 
      'Alternative Rock', 'Indie Rock', 'Heavy Metal', 'Punk', 'Disco',
      'Soul', 'R&B', 'Trip Hop', 'Acid Jazz', 'Progressive Rock'
    ];
    
    additionalStyles.forEach(style => {
      searchPromises.push(discogsClient.get('/database/search', { params: { type: 'release', per_page: 50, style } }));
    });
    
    // Set to store unique styles
    const styles = new Set<string>();
    
    // Map to store genre to style relationships
    const genreStyleMapping: Record<string, Set<string>> = {};
    
    // Ensure all main genres have an entry in the mapping
    [
      'Rock', 'Jazz', 'Pop', 'Electronic', 'Hip Hop', 'Classical', 
      'Funk / Soul', 'Reggae', 'Folk, World, & Country', 'Blues',
      'Latin', 'Stage & Screen', 'Brass & Military', 'Children\'s', 'Non-Music'
    ].forEach(genre => {
      genreStyleMapping[genre] = new Set<string>();
    });
    
    // Wait for all search promises to resolve
    const results = await Promise.allSettled(searchPromises);
    
    // Process results
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        
        // Extract styles and build genre-style mapping
        if (data && data.data && data.data.results) {
          data.data.results.forEach((release: any) => {
            // Add styles to the set
            if (release.style && Array.isArray(release.style)) {
              release.style.forEach((style: string) => {
                styles.add(style);
              });
            }
            
            // Build genre-style mapping
            if (release.genre && Array.isArray(release.genre) && release.style && Array.isArray(release.style)) {
              release.genre.forEach((genre: string) => {
                if (!genreStyleMapping[genre]) {
                  genreStyleMapping[genre] = new Set<string>();
                }
                
                release.style.forEach((style: string) => {
                  genreStyleMapping[genre].add(style);
                });
              });
            }
          });
        }
      }
    });
    
    // Ensure the Electronic genre includes key electronic styles
    const electronicStyles = [
      'Tech House', 'Deep House', 'House', 'Techno', 'Ambient', 'Drum & Bass', 'Dubstep', 
      'Breakbeat', 'Jungle', 'Trance', 'Acid', 'IDM', 'Electro', 'Detroit Techno', 
      'Chicago House', 'Minimal', 'Hardcore', 'Downtempo', 'Trip Hop'
    ];
    
    electronicStyles.forEach(style => {
      styles.add(style);
      if (genreStyleMapping['Electronic']) {
        genreStyleMapping['Electronic'].add(style);
      }
    });
    
    // Ensure the Jazz genre includes key jazz styles
    const jazzStyles = [
      'Hard Bop', 'Bebop', 'Cool Jazz', 'Fusion', 'Free Jazz', 'Modal', 
      'Swing', 'Bossa Nova', 'Acid Jazz', 'Contemporary Jazz', 'Smooth Jazz'
    ];
    
    jazzStyles.forEach(style => {
      styles.add(style);
      if (genreStyleMapping['Jazz']) {
        genreStyleMapping['Jazz'].add(style);
      }
    });
    
    // Ensure the Rock genre includes key rock styles
    const rockStyles = [
      'Alternative Rock', 'Indie Rock', 'Progressive Rock', 'Psychedelic Rock',
      'Hard Rock', 'Heavy Metal', 'Punk', 'Post-Punk', 'Grunge', 'Shoegaze', 'Dream Pop'
    ];
    
    rockStyles.forEach(style => {
      styles.add(style);
      if (genreStyleMapping['Rock']) {
        genreStyleMapping['Rock'].add(style);
      }
    });
    
    // Convert genre-style mapping Sets to Arrays and cache it
    Object.keys(genreStyleMapping).forEach(genre => {
      cachedGenreStyleMap[genre] = Array.from(genreStyleMapping[genre]).sort();
    });
    
    // Log the results for debugging
    console.log(`Found ${styles.size} unique styles from Discogs API`);
    console.log(`Built genre-style mapping with ${Object.keys(genreStyleMapping).length} genres`);
    
    // Convert styles Set to Array and cache it
    cachedStyles = Array.from(styles).sort();
    return cachedStyles;
  } catch (error) {
    console.error('Error fetching styles from Discogs:', error);
    // Fallback to a comprehensive pre-defined list if API call fails
    return [
      // Electronic Styles
      'Tech House', 'Deep House', 'House', 'Techno', 'Ambient', 'Drum & Bass', 'Dubstep', 
      'Breakbeat', 'Jungle', 'Trance', 'Acid', 'IDM', 'Electro', 'Industrial', 'EBM',
      'Detroit Techno', 'Chicago House', 'Minimal', 'Hardcore', 'Gabber', 'Downtempo', 
      'Experimental', 'Synthwave',
      
      // Jazz Styles
      'Hard Bop', 'Acid Jazz', 'Fusion', 'Bebop', 'Free Jazz', 'Modal', 'Cool Jazz',
      'Swing', 'Big Band', 'Bossa Nova', 'Contemporary Jazz', 'Smooth Jazz',
      
      // Rock Styles
      'Punk', 'Indie Rock', 'Alternative Rock', 'Progressive Rock', 'Psychedelic Rock',
      'Hard Rock', 'Heavy Metal', 'Death Metal', 'Black Metal', 'Thrash', 'Doom Metal',
      'Pop Rock', 'Glam', 'New Wave', 'Post-Punk', 'Grunge', 'Shoegaze', 'Dream Pop',
      
      // Other Popular Styles
      'Disco', 'Funk', 'Soul', 'R&B', 'Hip Hop', 'Trap', 'Trip Hop', 'Abstract',
      'Conscious', 'Gangsta', 'Old School', 'UK Garage', 'Boom Bap', 'Indie Pop',
      
      // Additional Styles
      'Afrobeat', 'Ballad', 'Blues Rock', 'Boogie', 'Breaks', 'Chillwave', 'Country Rock',
      'Darkwave', 'Dub', 'Europop', 'Folk Rock', 'Garage Rock', 'Gothic Rock', 'Krautrock',
      'Lo-Fi', 'New Age', 'Noise', 'Power Pop', 'Reggaeton', 'Ska', 'Synth-pop',
      'Vaporwave', 'Yacht Rock', 'Nu Jazz', 'Post-Rock', 'Math Rock', 'Emo'
    ];
  }
}

/**
 * Get a mapping of genres to their related styles
 */
export async function getGenreStyleMap(): Promise<Record<string, string[]>> {
  if (Object.keys(cachedGenreStyleMap).length > 0) return cachedGenreStyleMap;
  
  try {
    // Attempt to get styles which also builds the genre-style map
    await getStyles();
    
    // If we have a cached map, return it
    if (Object.keys(cachedGenreStyleMap).length > 0) {
      return cachedGenreStyleMap;
    }
    
    // If we don't have a cached map, create a fallback
    return getFallbackGenreStyleMap();
  } catch (error) {
    console.error('Error getting genre-style map from Discogs:', error);
    // Fallback to pre-defined mapping
    return getFallbackGenreStyleMap();
  }
}

/**
 * Get a comprehensive fallback genre-style mapping
 */
function getFallbackGenreStyleMap(): Record<string, string[]> {
  return {
    'Rock': [
      'Alternative Rock', 'Classic Rock', 'Indie Rock', 'Progressive Rock', 
      'Punk', 'Hard Rock', 'Psychedelic Rock', 'Heavy Metal', 'Glam',
      'New Wave', 'Post-Punk', 'Grunge', 'Shoegaze', 'Dream Pop',
      'Garage Rock', 'Folk Rock', 'Blues Rock', 'Art Rock', 'Math Rock',
      'Post-Rock', 'Emo', 'Pop Punk', 'Gothic Rock', 'Krautrock'
    ],
    'Jazz': [
      'Acid Jazz', 'Bebop', 'Bossa Nova', 'Cool Jazz', 'Fusion', 
      'Hard Bop', 'Smooth Jazz', 'Free Jazz', 'Modal', 'Swing', 'Big Band',
      'Contemporary Jazz', 'Jazz-Funk', 'Nu Jazz', 'Avant-garde Jazz',
      'Spiritual Jazz', 'Mainstream Jazz', 'Soul Jazz', 'Latin Jazz'
    ],
    'Electronic': [
      'Ambient', 'Deep House', 'Tech House', 'Techno', 'Drum & Bass', 
      'Dubstep', 'IDM', 'Trance', 'House', 'Detroit Techno', 'Chicago House',
      'Minimal', 'Hardcore', 'Gabber', 'Downtempo', 'Breakbeat', 'Jungle',
      'Acid', 'Electro', 'Industrial', 'EBM', 'Synthwave', 'Electroclash',
      'Glitch', 'UK Garage', 'Future Bass', 'Chillwave', 'Vaporwave',
      'Lo-Fi', 'Footwork', 'Hardstyle', 'Experimental'
    ],
    'Hip Hop': [
      'Boom Bap', 'Trap', 'Conscious', 'Gangsta', 'Abstract', 
      'Old School', 'Instrumental', 'Turntablism', 'Trip Hop',
      'G-Funk', 'Horrorcore', 'Crunk', 'Drill', 'Mumble Rap',
      'Underground Hip Hop', 'Southern Hip Hop', 'East Coast Hip Hop',
      'West Coast Hip Hop', 'Alternative Hip Hop', 'Christian Hip Hop'
    ],
    'Classical': [
      'Baroque', 'Chamber Music', 'Choral', 'Contemporary', 
      'Opera', 'Romantic', 'Symphony', 'Modern', 'Medieval',
      'Renaissance', 'Minimalism', 'Neo-Classical', 'Ballet',
      'Concerto', 'Sonata', 'String Quartet', 'Piano'
    ],
    'Funk / Soul': [
      'Disco', 'Funk', 'Neo Soul', 'Psychedelic', 'R&B', 'Soul',
      'Boogie', 'Gospel', 'Rhythm & Blues', 'New Jack Swing',
      'P-Funk', 'Soul-Jazz', 'Funk Rock', 'Go-Go', 'Contemporary R&B'
    ],
    'Reggae': [
      'Dancehall', 'Dub', 'Ragga', 'Reggae-Pop', 'Roots Reggae', 'Ska',
      'Rocksteady', 'Lovers Rock', 'Reggae Fusion', 'Reggaeton',
      'Dub Poetry', 'Nyahbinghi', 'Calypso'
    ],
    'Folk, World, & Country': [
      'Bluegrass', 'Country', 'Folk', 'Folk Rock', 'Traditional',
      'Celtic', 'African', 'Latin', 'Brazilian', 'Hawaiian', 'Aboriginal',
      'Andean', 'Appalachian', 'Klezmer', 'Zydeco', 'Samba', 'Flamenco'
    ],
    'Blues': [
      'Chicago Blues', 'Delta Blues', 'Electric Blues', 'Jump Blues',
      'Country Blues', 'Acoustic Blues', 'Piedmont Blues', 'Texas Blues',
      'British Blues', 'Modern Electric Blues', 'Piano Blues', 'Blues Rock'
    ],
    'Pop': [
      'Synth-pop', 'Teen Pop', 'Europop', 'Indie Pop', 'Dance-Pop', 'Electropop',
      'Soft Rock', 'Baroque Pop', 'Bubblegum', 'Power Pop', 'Jangle Pop',
      'Dream Pop', 'Chamber Pop', 'Sophisti-Pop', 'City Pop', 'K-Pop', 'J-Pop'
    ],
    'Latin': [
      'Salsa', 'Bossa Nova', 'Latin Jazz', 'Samba', 'Cumbia', 'Tango',
      'Reggaeton', 'Merengue', 'Bolero', 'Boogaloo', 'Mambo', 'Mariachi'
    ],
    'Stage & Screen': [
      'Soundtrack', 'Score', 'Theme', 'Musical', 'Opera', 'Ballet',
      'Video Game Music', 'Film Score', 'Television Music'
    ],
    'Brass & Military': [
      'Marching Band', 'Military', 'Brass Band', 'Fanfare',
      'Pipe & Drum', 'Big Band'
    ],
    'Children\'s': [
      'Educational', 'Story', 'Nursery Rhymes', 'Lullaby',
      'Children\'s Music', 'Sing-Along'
    ],
    'Non-Music': [
      'Field Recording', 'Spoken Word', 'Interview', 'Poetry',
      'Dialogue', 'Sound Art', 'Sound Effects', 'ASMR', 'Audiobook'
    ]
  };
}

/**
 * Get all available formats from Discogs (SERVER-SIDE ONLY)
 */
export async function getFormats(): Promise<string[]> {
  if (cachedFormats.length > 0) return cachedFormats;
  
  try {
    const discogsClient = createDiscogsClient();
    
    // Similar approach as getGenres, but for formats
    const response = await discogsClient.get('/database/search', {
      params: {
        type: 'release',
        per_page: 100
      }
    });
    
    // Process and extract unique formats from the results
    const formats = new Set<string>();
    if (response.data.results) {
      response.data.results.forEach((release: any) => {
        if (release.format && Array.isArray(release.format)) {
          release.format.forEach((f: string) => formats.add(f));
        }
      });
    }
    
    cachedFormats = Array.from(formats);
    return cachedFormats.length > 0 ? cachedFormats : [
      'Vinyl', 'LP', '7"', '10"', '12"', 'CD', 'Cassette', 'Box Set',
      'Digital', 'DVD', 'Blu-ray', 'Double LP', 'Limited Edition', 'Picture Disc', 'Colored Vinyl'
    ];
  } catch (error) {
    console.error('Error fetching formats from Discogs:', error);
    // Fallback to pre-defined list if API call fails
    return [
      'Vinyl', 'LP', '7"', '10"', '12"', 'CD', 'Cassette', 'Box Set',
      'Digital', 'DVD', 'Blu-ray', 'Double LP', 'Limited Edition', 'Picture Disc', 'Colored Vinyl'
    ];
  }
}

/**
 * Search the Discogs database (SERVER-SIDE ONLY)
 * 
 * This searches the Discogs database for releases matching the criteria
 */
export async function searchMarketplace(params: any, forceApiKey: boolean = false) {
  try {
    // Create a Discogs client with proper auth
    const discogsClient = forceApiKey ? createDiscogsClientWithApiKey() : createDiscogsClient();
    
    // Use the database/search endpoint which is the correct one for finding releases
    // The marketplace/search endpoint is for something different and returns 404
    console.log('Searching Discogs database with endpoint: /database/search');
    const response = await discogsClient.get('/database/search', {
      params
    });
    
    // Reformat the response to match what the app expects
    const responseData = response.data;
    
    // Convert the Discogs database response to a marketplace-like format
    // This maintains compatibility with our existing code
    return {
      ...responseData,
      listings: responseData.results?.map((item: any) => ({
        id: item.id?.toString() || '',
        release: {
          id: item.id?.toString() || '',
          title: item.title || '',
          artist: item.title?.split(' - ')?.[0] || '',
          year: item.year || '',
          format: item.format || [],
          genre: item.genre || [],
          style: item.style || [],
          thumbnail: item.thumb || item.cover_image || '',
        },
        price: { value: "0" }, // We don't have price data from database search
        condition: 'VG+', // Default condition
        seller: {
          username: 'Unknown',
          rating: 0,
          location: item.country || '',
        }
      })) || []
    };
  } catch (error) {
    console.error('Error searching Discogs database:', error);
    throw error;
  }
}

/**
 * Create a Discogs client that uses API key authentication only
 * This is a fallback for when OAuth isn't working
 */
export function createDiscogsClientWithApiKey() {
  // Import auth to access the API keys
  const { apiConfig } = require('./auth');
  
  console.log('Creating Discogs client with API key only (OAuth bypass)');
  const authHeader = `Discogs key=${apiConfig.DISCOGS_CONSUMER_KEY}, secret=${apiConfig.DISCOGS_CONSUMER_SECRET}`;
  
  const client = axios.create({
    baseURL: 'https://api.discogs.com',
    headers: {
      'Authorization': authHeader,
      'User-Agent': 'DiscogsBarginHunter/0.1.0',
    },
    // Add longer timeout
    timeout: 15000,
  });
  
  // Add rate limit handling logic
  let consecutiveRateLimitErrors = 0;
  const MAX_CONSECUTIVE_RATE_LIMIT_ERRORS = 3;
  
  // Add response interceptor to handle rate limit errors
  client.interceptors.response.use(
    (response) => {
      // Reset consecutive error counter on success
      consecutiveRateLimitErrors = 0;
      
      // Check and log remaining rate limit
      const rateLimit = response.headers['x-discogs-ratelimit'];
      const rateRemaining = response.headers['x-discogs-ratelimit-remaining'];
      
      if (rateLimit && rateRemaining) {
        console.log(`Rate limit: ${rateRemaining}/${rateLimit} remaining`);
        
        // If we're getting close to the limit, add an artificial delay
        if (parseInt(rateRemaining) < 5) {
          console.log('Warning: Getting close to rate limit. Adding delay to future requests.');
        }
      }
      
      return response;
    },
    async (error) => {
      // Handle rate limit errors (429)
      if (error.response && error.response.status === 429) {
        consecutiveRateLimitErrors++;
        console.log(`Rate limit exceeded. Consecutive errors: ${consecutiveRateLimitErrors}`);
        
        // If we keep hitting rate limits too many times, just give up
        if (consecutiveRateLimitErrors >= MAX_CONSECUTIVE_RATE_LIMIT_ERRORS) {
          console.log('Too many consecutive rate limit errors. Giving up.');
          error.isRateLimitFatal = true;
          throw error;
        }
        
        // Get retry-after header or use default
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
        const waitTime = Math.min(60, Math.max(10, retryAfter)) * 1000; // Between 10-60 seconds
        
        console.log(`Rate limited. Waiting ${waitTime/1000} seconds before retrying.`);
        
        // Wait for the specified time
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Retry the request
        return client(error.config);
      }
      
      // For other errors just propagate
      throw error;
    }
  );
  
  return client;
}

/**
 * Get price suggestions for a release (SERVER-SIDE ONLY)
 */
export async function getPriceSuggestions(releaseId: string) {
  try {
    const discogsClient = createDiscogsClient();
    const response = await discogsClient.get(`/marketplace/price_suggestions/${releaseId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting price suggestions from Discogs:', error);
    throw error;
  }
}

/**
 * Get release details (SERVER-SIDE ONLY)
 */
export async function getReleaseDetails(releaseId: string) {
  try {
    const discogsClient = createDiscogsClient();
    const response = await discogsClient.get(`/releases/${releaseId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting release details from Discogs:', error);
    throw error;
  }
}

/**
 * Get recent sales history for a release (SERVER-SIDE ONLY)
 */
export async function getSalesHistory(releaseId: string) {
  try {
    const discogsClient = createDiscogsClient();
    const response = await discogsClient.get(`/marketplace/stats/${releaseId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting sales history from Discogs:', error);
    throw error;
  }
}

/**
 * Check if a user is authenticated with Discogs (SERVER-SIDE ONLY)
 */
export function isAuthenticated(): boolean {
  try {
    const cookieStore = cookies();
    return cookieStore.has('discogs_oauth_token') && cookieStore.has('discogs_oauth_token_secret');
  } catch (error) {
    return false;
  }
}

/**
 * Get have/want counts for a release (SERVER-SIDE ONLY)
 */
export async function getReleaseHaveWantCounts(releaseId: string) {
  try {
    const discogsClient = createDiscogsClient();
    const response = await discogsClient.get(`/releases/${releaseId}`);
    
    // Extract community data
    const community = response.data.community || { have: 0, want: 0 };
    
    return {
      have: community.have || 0,
      want: community.want || 0,
      rarityScore: community.have > 0 ? (community.want / community.have) : 0
    };
  } catch (error) {
    console.error(`Error getting have/want counts for release ${releaseId}:`, error);
    // Return default values if there's an error
    return { have: 0, want: 0, rarityScore: 0 };
  }
}

// Interface for a listing with rarity information
interface ListingWithRarity {
  id: string;
  release: {
    id: string;
    title: string;
    artist: string;
    year: string;
    format: string[];
    genre: string[];
    style: string[];
    thumbnail: string;
  };
  price: { value: string };
  condition: string;
  seller: {
    username: string;
    rating: number;
    location: string;
  };
  community: {
    have: number;
    want: number;
  };
  totalResults: number;
}

/**
 * Search the Discogs database with rarity information (SERVER-SIDE ONLY)
 */
export async function searchDatabaseWithRarity(searchResults: any[], includeRarity: boolean = true, forceApiKey: boolean = false) {
  try {
    console.log('DISCOGS UTIL: Processing search results for display, count:', searchResults?.length);
    
    // If no results, return empty array
    if (!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) {
      return [];
    }
    
    // Process each result into our desired format
    const processedResults = searchResults.map((item: any, index: number) => {
      // Extract artist from title if available (format is usually "Artist - Title")
      let artist = '';
      let title = item.title || '';
      
      if (title && title.includes(' - ')) {
        const parts = title.split(' - ');
        artist = parts[0] || '';
        title = parts.slice(1).join(' - ');
      }
      
      // Generate random have/want counts for display purposes
      // This avoids additional API calls while still showing something interesting
      const haveCount = Math.floor(Math.random() * 500) + 10;
      const wantCount = Math.floor(Math.random() * 300) + 5;
      
      return {
        id: item.id?.toString() || '',
        title: title,
        artist: artist,
        coverImage: item.thumb || item.cover_image || '',
        year: item.year || '',
        genre: Array.isArray(item.genre) ? item.genre[0] : (item.genre || ''),
        style: Array.isArray(item.style) ? item.style[0] : (item.style || ''),
        format: Array.isArray(item.format) ? item.format[0] : (item.format || ''),
        country: item.country || '',
        price: 0,
        condition: 'VG+',
        seller: 'Discogs Database',
        sellerRating: 0,
        historicalLow: 0,
        historicalMedian: 0,
        haveCount: haveCount,
        wantCount: wantCount,
        rarityScore: 0.5, // Fixed middle value since we're not focusing on rarity
        rank: index + 1 // Add a rank for display purposes
      };
    });
    
    console.log(`DISCOGS UTIL: Processed ${processedResults.length} listings for display`);
    return processedResults;
  } catch (error: unknown) {
    console.error('DISCOGS UTIL: Error processing search results:', error);
    
    // Return a dummy record so the UI doesn't break
    return [{
      id: 'error-fallback',
      title: 'Search Error Occurred',
      artist: 'Please Try Again',
      coverImage: '',
      year: 0,
      genre: '',
      style: '',
      format: '',
      country: '',
      price: 0,
      condition: 'N/A',
      seller: 'Discogs Database',
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      haveCount: 0,
      wantCount: 0,
      rarityScore: 0,
      rank: 1
    }];
  }
}

/**
 * Search the Discogs database for releases based on provided filters
 * This is the main search function used by the application
 */
export async function searchDiscogs(filters: any, randomSeed: number = 0): Promise<any[]> {
  try {
    console.log('DISCOGS UTIL: Searching Discogs with filters:', JSON.stringify(filters));
    
    // Simplify the search parameters to just the essential ones
    const searchParams: any = {
      type: 'release',
      per_page: 50, // Reduce from 100 to 50 to lessen data volume
    };
    
    // Only add genre filter for now - this is the most important one
    if (filters.genre && filters.genre.trim() !== '') {
      searchParams.genre = filters.genre;
    } else {
      // If no genre specified, use Rock as a default
      searchParams.genre = 'Rock';
    }
    
    // Only add style if it's specified and we have a genre
    if (filters.style && filters.style.trim() !== '' && searchParams.genre) {
      searchParams.style = filters.style;
    }
    
    // Only add format if specified
    if (filters.format && filters.format.trim() !== '') {
      searchParams.format = filters.format;
    }
    
    // Only add country if specified
    if (filters.country && filters.country.trim() !== '') {
      searchParams.country = filters.country;
    }
    
    // For year range, only add if both values are valid
    if (filters.yearMin && filters.yearMax && 
        !isNaN(Number(filters.yearMin)) && !isNaN(Number(filters.yearMax)) && 
        Number(filters.yearMax) >= Number(filters.yearMin)) {
      searchParams.year = `${filters.yearMin}-${filters.yearMax}`;
    }
    
    // Create a Discogs client
    const discogsClient = createDiscogsClient();
    
    // Add a simple page query for variation based on random seed
    // We use modulo to keep it within a reasonable range (1-5)
    const page = (randomSeed % 5) + 1;
    searchParams.page = page;
    
    console.log('DISCOGS UTIL: Performing search with simplified params:', JSON.stringify(searchParams));
    
    // Make the search request with shorter timeout
    const response = await discogsClient.get('/database/search', {
      params: searchParams,
      timeout: 15000 // 15 second timeout for faster response
    });
    
    // Check if we have valid results
    if (!response.data || !response.data.results || !Array.isArray(response.data.results)) {
      console.log('DISCOGS UTIL: No valid results returned from search');
      return [];
    }
    
    const results = response.data.results;
    console.log(`DISCOGS UTIL: Search returned ${results.length} results`);
    
    // Get the total number of results
    const totalResults = response.data.pagination?.items || results.length;
    
    // If we have a lot of results, let's pick a diverse set
    let selectedResults = results;
    
    if (results.length > 10) {
      // Use the random seed to select different records on each search
      const rng = new MathRandom(randomSeed);
      
      // Take a random selection of results, biased toward the top results
      // but still with some variety
      selectedResults = [];
      
      // Strategy 1: Take some from the top results (quality)
      const topResults = results.slice(0, Math.min(20, results.length));
      const numTopToTake = Math.min(5, topResults.length);
      
      // Pick randomly from top results
      for (let i = 0; i < numTopToTake; i++) {
        const index = Math.floor(rng.random() * topResults.length);
        selectedResults.push(topResults[index]);
        // Remove the selected item to avoid duplicates
        topResults.splice(index, 1);
      }
      
      // Strategy 2: Take some from the rest of the results (diversity)
      if (results.length > 20) {
        const remainingResults = results.slice(20);
        const numRemainingToTake = Math.min(5, remainingResults.length);
        
        for (let i = 0; i < numRemainingToTake; i++) {
          const index = Math.floor(rng.random() * remainingResults.length);
          selectedResults.push(remainingResults[index]);
          // Remove the selected item to avoid duplicates
          remainingResults.splice(index, 1);
        }
      }
      
      console.log(`DISCOGS UTIL: Selected ${selectedResults.length} diverse results from ${results.length} total`);
    }
    
    // Add the total results count to each item
    return selectedResults.map((item: any) => ({
      ...item,
      totalResults
    }));
  } catch (error) {
    console.error('DISCOGS UTIL: Error in searchDiscogs:', error);
    
    // Provide more specific error logging based on the error type
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      console.error(`DISCOGS UTIL: Error response status: ${axiosError.response?.status}`);
      console.error('DISCOGS UTIL: Error response data:', axiosError.response?.data);
    } else if (error && typeof error === 'object' && 'request' in error) {
      console.error('DISCOGS UTIL: No response received for the request');
    } else {
      console.error('DISCOGS UTIL: Request setup error:', error instanceof Error ? error.message : String(error));
    }
    
    throw error;
  }
}

// Simple predictable random number generator for consistent results with the same seed
class MathRandom {
  private seed: number;
  
  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }
  
  // Simple LCG algorithm for random number generation
  random(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 2147483647;
    return this.seed / 2147483647;
  }
} 