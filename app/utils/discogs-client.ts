import axios from 'axios';

// Types
export interface DiscogsResponse<T> {
  data: T;
}

// Cache for genres and styles to avoid repeated API calls
let cachedGenres: string[] = [];
let cachedStyles: string[] = [];
let cachedFormats: string[] = [];
let cachedGenreStyleMap: Record<string, string[]> = {};

/**
 * Get all available genres (client-side mock version)
 */
export async function getGenres(): Promise<string[]> {
  if (cachedGenres.length > 0) return cachedGenres;
  
  try {
    // Try to get from API
    const response = await axios.get('/api/genres');
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      cachedGenres = response.data;
      return cachedGenres;
    }
  } catch (error) {
    console.error('Error fetching genres:', error);
    // Fallback to predefined list
  }
  
  // For client-side fallback, we'll use a comprehensive predefined list
  cachedGenres = [
    'Rock', 'Jazz', 'Pop', 'Electronic', 'Hip Hop', 'Classical', 
    'Funk / Soul', 'Reggae', 'Folk, World, & Country', 'Blues',
    'Latin', 'Stage & Screen', 'Brass & Military', 'Children\'s', 'Non-Music'
  ];
  
  return cachedGenres;
}

/**
 * Get all available styles (client-side mock version)
 */
export async function getStyles(): Promise<string[]> {
  if (cachedStyles.length > 0) return cachedStyles;
  
  try {
    // Try to get from API
    const response = await axios.get('/api/styles');
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      cachedStyles = response.data;
      return cachedStyles;
    }
  } catch (error) {
    console.error('Error fetching styles:', error);
    // Fallback to predefined list
  }
  
  // For client-side fallback, we'll use a comprehensive predefined list
  cachedStyles = [
    // Electronic Styles (including Tech House)
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
    'Conscious', 'Gangsta', 'Old School', 'UK Garage', 'Boom Bap', 'Indie Pop'
  ];
  
  return cachedStyles;
}

/**
 * Get all available formats (client-side mock version)
 */
export async function getFormats(): Promise<string[]> {
  if (cachedFormats.length > 0) return cachedFormats;
  
  try {
    // Try to get from API
    const response = await axios.get('/api/formats');
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      cachedFormats = response.data;
      return cachedFormats;
    }
  } catch (error) {
    console.error('Error fetching formats:', error);
    // Fallback to predefined list
  }
  
  // For client-side fallback, we'll use a predefined list
  cachedFormats = [
    'Vinyl', 'LP', '7"', '10"', '12"', 'CD', 'Cassette', 'Box Set',
    'Digital', 'DVD', 'Blu-ray', 'Double LP', 'Limited Edition', 'Picture Disc', 'Colored Vinyl'
  ];
  
  return cachedFormats;
}

/**
 * Get genre to style mapping (client-side mock version)
 */
export async function getGenreStyleMap(): Promise<Record<string, string[]>> {
  if (Object.keys(cachedGenreStyleMap).length > 0) return cachedGenreStyleMap;
  
  try {
    // Try to get from API
    const response = await axios.get('/api/genre-style-map');
    if (response.data && typeof response.data === 'object') {
      cachedGenreStyleMap = response.data;
      return cachedGenreStyleMap;
    }
  } catch (error) {
    console.error('Error fetching genre-style map:', error);
    // Fallback to predefined map
  }
  
  // For client-side fallback, we'll use a comprehensive predefined map
  cachedGenreStyleMap = {
    'Rock': [
      'Alternative Rock', 'Classic Rock', 'Indie Rock', 'Progressive Rock', 
      'Punk', 'Hard Rock', 'Psychedelic Rock', 'Heavy Metal', 'Glam',
      'New Wave', 'Post-Punk', 'Grunge', 'Shoegaze', 'Dream Pop'
    ],
    'Jazz': [
      'Acid Jazz', 'Bebop', 'Bossa Nova', 'Cool Jazz', 'Fusion', 
      'Hard Bop', 'Smooth Jazz', 'Free Jazz', 'Modal', 'Swing', 'Big Band'
    ],
    'Electronic': [
      'Ambient', 'Deep House', 'Tech House', 'Techno', 'Drum & Bass', 
      'Dubstep', 'IDM', 'Trance', 'House', 'Detroit Techno', 'Chicago House',
      'Minimal', 'Hardcore', 'Gabber', 'Downtempo', 'Breakbeat', 'Jungle',
      'Acid', 'Electro', 'Industrial', 'EBM', 'Synthwave'
    ],
    'Hip Hop': [
      'Boom Bap', 'Trap', 'Conscious', 'Gangsta', 'Abstract', 
      'Old School', 'Instrumental', 'Turntablism', 'Trip Hop'
    ],
    'Classical': [
      'Baroque', 'Chamber Music', 'Choral', 'Contemporary', 
      'Opera', 'Romantic', 'Symphony', 'Modern'
    ],
    'Funk / Soul': [
      'Disco', 'Funk', 'Neo Soul', 'Psychedelic', 'R&B', 'Soul'
    ],
    'Reggae': [
      'Dancehall', 'Dub', 'Ragga', 'Reggae-Pop', 'Roots Reggae', 'Ska'
    ],
    'Folk, World, & Country': [
      'Bluegrass', 'Country', 'Folk', 'Folk Rock', 'Traditional'
    ],
    'Blues': [
      'Chicago Blues', 'Delta Blues', 'Electric Blues', 'Jump Blues'
    ],
    'Pop': [
      'Synth-pop', 'Teen Pop', 'Europop', 'Indie Pop', 'Dance-Pop', 'Electropop'
    ]
  };
  
  return cachedGenreStyleMap;
}

/**
 * Make a search request to the backend API which will communicate with Discogs
 */
export async function searchRecords(filters: any) {
  try {
    const response = await axios.post('/api/search', filters);
    return response.data;
  } catch (error) {
    console.error('Error searching records:', error);
    throw error;
  }
}

/**
 * Check if the user is authenticated
 */
export const checkAuthStatus = async (): Promise<boolean> => {
  try {
    // Add cache-busting query parameter to avoid stale responses
    const timestamp = new Date().getTime();
    const response = await axios.get(`/api/auth/status?_t=${timestamp}`, {
      // Shorter timeout to avoid UI hanging
      timeout: 5000
    });
    return response.data?.authenticated || false;
  } catch (error) {
    console.error('Error checking auth status:', error);
    // Return false on error rather than throwing
    return false;
  }
};

// Start the Discogs OAuth flow
export const handleDiscogsAuth = async (): Promise<void> => {
  try {
    // Request the OAuth authorization URL with a timeout
    const response = await axios.get('/api/auth', {
      timeout: 10000
    });
    
    if (response.data?.url) {
      // Redirect to Discogs for authorization
      window.location.href = response.data.url;
    } else {
      throw new Error('Invalid response from authentication endpoint');
    }
  } catch (error) {
    console.error('Error starting OAuth flow:', error);
    throw error;
  }
};

// Log out the user
export const handleLogout = async (): Promise<void> => {
  try {
    await axios.post('/api/auth/logout', {}, {
      timeout: 5000
    });
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
}; 