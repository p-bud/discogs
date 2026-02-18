/**
 * discogs-metadata.ts
 * Fetches and caches genres, styles, formats, and genre→style mappings from Discogs.
 * Server-side only — never import in client components.
 */
import { LRUCache } from 'lru-cache';
import { createDiscogsClient } from './discogs-http-client';

const ONE_HOUR_MS = 60 * 60 * 1000;

const metadataCache = new LRUCache<string, string[]>({
  max: 10,
  ttl: ONE_HOUR_MS,
});

const genreStyleMapCache = new LRUCache<string, Record<string, string[]>>({
  max: 5,
  ttl: ONE_HOUR_MS,
});

// ─── Genres ─────────────────────────────────────────────────────────────────

export async function getGenres(): Promise<string[]> {
  const cached = metadataCache.get('genres');
  if (cached) return cached;

  try {
    const client = createDiscogsClient();
    const responses = await Promise.allSettled([
      client.get('/database/search', { params: { type: 'release', per_page: 100 } }),
      client.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Electronic' } }),
      client.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Rock' } }),
      client.get('/database/search', { params: { type: 'release', per_page: 100, genre: 'Jazz' } }),
    ]);

    const genres = new Set<string>([
      'Rock', 'Jazz', 'Pop', 'Electronic', 'Hip Hop', 'Classical',
      'Funk / Soul', 'Reggae', 'Folk, World, & Country', 'Blues',
      'Latin', 'Stage & Screen', 'Brass & Military', "Children's", 'Non-Music',
    ]);

    responses.forEach(r => {
      if (r.status === 'fulfilled') {
        (r.value.data.results ?? []).forEach((release: any) => {
          (release.genre ?? []).forEach((g: string) => genres.add(g));
        });
      }
    });

    const result = Array.from(genres).sort();
    metadataCache.set('genres', result);
    return result;
  } catch {
    return [
      'Rock', 'Jazz', 'Pop', 'Electronic', 'Hip Hop', 'Classical',
      'Funk / Soul', 'Reggae', 'Folk, World, & Country', 'Blues',
      'Latin', 'Stage & Screen', 'Brass & Military',
    ];
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

export async function getStyles(): Promise<string[]> {
  const cached = metadataCache.get('styles');
  if (cached) return cached;

  try {
    const client = createDiscogsClient();

    const genreQueries = [
      'Electronic', 'Rock', 'Jazz', 'Hip Hop', 'Pop',
      'Funk / Soul', 'Classical', 'Folk, World, & Country', 'Reggae', 'Blues', 'Latin',
    ];
    const styleQueries = [
      'Tech House', 'Ambient', 'Deep House', 'IDM', 'Techno', 'House',
      'Drum & Bass', 'Jazz-Funk', 'Hard Bop', 'Alternative Rock', 'Indie Rock',
      'Heavy Metal', 'Punk', 'Disco', 'Soul', 'R&B', 'Trip Hop', 'Acid Jazz', 'Progressive Rock',
    ];

    const promises = [
      client.get('/database/search', { params: { type: 'release', per_page: 100 } }),
      ...genreQueries.map(genre =>
        client.get('/database/search', { params: { type: 'release', per_page: 100, genre } })
      ),
      ...styleQueries.map(style =>
        client.get('/database/search', { params: { type: 'release', per_page: 50, style } })
      ),
    ];

    const styles = new Set<string>();
    const genreStyleMapping: Record<string, Set<string>> = {};

    // Pre-populate main genres
    [
      'Rock', 'Jazz', 'Pop', 'Electronic', 'Hip Hop', 'Classical',
      'Funk / Soul', 'Reggae', 'Folk, World, & Country', 'Blues',
      'Latin', 'Stage & Screen', 'Brass & Military', "Children's", 'Non-Music',
    ].forEach(g => { genreStyleMapping[g] = new Set(); });

    const results = await Promise.allSettled(promises);
    results.forEach(r => {
      if (r.status !== 'fulfilled') return;
      (r.value.data.results ?? []).forEach((release: any) => {
        (release.style ?? []).forEach((s: string) => styles.add(s));
        if (Array.isArray(release.genre) && Array.isArray(release.style)) {
          release.genre.forEach((genre: string) => {
            if (!genreStyleMapping[genre]) genreStyleMapping[genre] = new Set();
            release.style.forEach((s: string) => genreStyleMapping[genre].add(s));
          });
        }
      });
    });

    // Seed well-known styles so they're always present
    const seeds: Record<string, string[]> = {
      Electronic: ['Tech House', 'Deep House', 'House', 'Techno', 'Ambient', 'Drum & Bass',
        'Dubstep', 'Breakbeat', 'Jungle', 'Trance', 'Acid', 'IDM', 'Electro',
        'Detroit Techno', 'Chicago House', 'Minimal', 'Hardcore', 'Downtempo', 'Trip Hop'],
      Jazz: ['Hard Bop', 'Bebop', 'Cool Jazz', 'Fusion', 'Free Jazz', 'Modal',
        'Swing', 'Bossa Nova', 'Acid Jazz', 'Contemporary Jazz', 'Smooth Jazz'],
      Rock: ['Alternative Rock', 'Indie Rock', 'Progressive Rock', 'Psychedelic Rock',
        'Hard Rock', 'Heavy Metal', 'Punk', 'Post-Punk', 'Grunge', 'Shoegaze', 'Dream Pop'],
    };

    Object.entries(seeds).forEach(([genre, seedStyles]) => {
      seedStyles.forEach(s => {
        styles.add(s);
        genreStyleMapping[genre]?.add(s);
      });
    });

    // Persist genre→style map
    const genreStyleResult: Record<string, string[]> = {};
    Object.keys(genreStyleMapping).forEach(genre => {
      genreStyleResult[genre] = Array.from(genreStyleMapping[genre]).sort();
    });
    genreStyleMapCache.set('genreStyleMap', genreStyleResult);

    const stylesResult = Array.from(styles).sort();
    metadataCache.set('styles', stylesResult);
    return stylesResult;
  } catch {
    return getFallbackStyles();
  }
}

// ─── Genre → Style map ───────────────────────────────────────────────────────

export async function getGenreStyleMap(): Promise<Record<string, string[]>> {
  const cached = genreStyleMapCache.get('genreStyleMap');
  if (cached) return cached;

  try {
    await getStyles(); // populates genreStyleMapCache as a side effect
    return genreStyleMapCache.get('genreStyleMap') ?? getFallbackGenreStyleMap();
  } catch {
    return getFallbackGenreStyleMap();
  }
}

// ─── Formats ─────────────────────────────────────────────────────────────────

export async function getFormats(): Promise<string[]> {
  const cached = metadataCache.get('formats');
  if (cached) return cached;

  const fallback = [
    'Vinyl', 'LP', '7"', '10"', '12"', 'CD', 'Cassette', 'Box Set',
    'Digital', 'DVD', 'Blu-ray', 'Double LP', 'Limited Edition', 'Picture Disc', 'Colored Vinyl',
  ];

  try {
    const client = createDiscogsClient();
    const response = await client.get('/database/search', { params: { type: 'release', per_page: 100 } });

    const formats = new Set<string>();
    (response.data.results ?? []).forEach((r: any) => {
      (r.format ?? []).forEach((f: string) => formats.add(f));
    });

    const result = formats.size > 0 ? Array.from(formats) : fallback;
    metadataCache.set('formats', result);
    return result;
  } catch {
    return fallback;
  }
}

// ─── Fallbacks ───────────────────────────────────────────────────────────────

function getFallbackStyles(): string[] {
  return [
    'Tech House', 'Deep House', 'House', 'Techno', 'Ambient', 'Drum & Bass', 'Dubstep',
    'Breakbeat', 'Jungle', 'Trance', 'Acid', 'IDM', 'Electro', 'Industrial', 'EBM',
    'Detroit Techno', 'Chicago House', 'Minimal', 'Hardcore', 'Gabber', 'Downtempo',
    'Experimental', 'Synthwave',
    'Hard Bop', 'Acid Jazz', 'Fusion', 'Bebop', 'Free Jazz', 'Modal', 'Cool Jazz',
    'Swing', 'Big Band', 'Bossa Nova', 'Contemporary Jazz', 'Smooth Jazz',
    'Punk', 'Indie Rock', 'Alternative Rock', 'Progressive Rock', 'Psychedelic Rock',
    'Hard Rock', 'Heavy Metal', 'Death Metal', 'Black Metal', 'Thrash', 'Doom Metal',
    'Pop Rock', 'Glam', 'New Wave', 'Post-Punk', 'Grunge', 'Shoegaze', 'Dream Pop',
    'Disco', 'Funk', 'Soul', 'R&B', 'Hip Hop', 'Trap', 'Trip Hop', 'Abstract',
    'Conscious', 'Gangsta', 'Old School', 'UK Garage', 'Boom Bap', 'Indie Pop',
    'Afrobeat', 'Ballad', 'Blues Rock', 'Boogie', 'Breaks', 'Chillwave', 'Country Rock',
    'Darkwave', 'Dub', 'Europop', 'Folk Rock', 'Garage Rock', 'Gothic Rock', 'Krautrock',
    'Lo-Fi', 'New Age', 'Noise', 'Power Pop', 'Reggaeton', 'Ska', 'Synth-pop',
    'Vaporwave', 'Yacht Rock', 'Nu Jazz', 'Post-Rock', 'Math Rock', 'Emo',
  ];
}

function getFallbackGenreStyleMap(): Record<string, string[]> {
  return {
    Rock: [
      'Alternative Rock', 'Classic Rock', 'Indie Rock', 'Progressive Rock',
      'Punk', 'Hard Rock', 'Psychedelic Rock', 'Heavy Metal', 'Glam',
      'New Wave', 'Post-Punk', 'Grunge', 'Shoegaze', 'Dream Pop',
      'Garage Rock', 'Folk Rock', 'Blues Rock', 'Art Rock', 'Math Rock',
      'Post-Rock', 'Emo', 'Pop Punk', 'Gothic Rock', 'Krautrock',
    ],
    Jazz: [
      'Acid Jazz', 'Bebop', 'Bossa Nova', 'Cool Jazz', 'Fusion',
      'Hard Bop', 'Smooth Jazz', 'Free Jazz', 'Modal', 'Swing', 'Big Band',
      'Contemporary Jazz', 'Jazz-Funk', 'Nu Jazz', 'Avant-garde Jazz',
      'Spiritual Jazz', 'Mainstream Jazz', 'Soul Jazz', 'Latin Jazz',
    ],
    Electronic: [
      'Ambient', 'Deep House', 'Tech House', 'Techno', 'Drum & Bass',
      'Dubstep', 'IDM', 'Trance', 'House', 'Detroit Techno', 'Chicago House',
      'Minimal', 'Hardcore', 'Gabber', 'Downtempo', 'Breakbeat', 'Jungle',
      'Acid', 'Electro', 'Industrial', 'EBM', 'Synthwave', 'Electroclash',
      'Glitch', 'UK Garage', 'Future Bass', 'Chillwave', 'Vaporwave',
      'Lo-Fi', 'Footwork', 'Hardstyle', 'Experimental',
    ],
    'Hip Hop': [
      'Boom Bap', 'Trap', 'Conscious', 'Gangsta', 'Abstract',
      'Old School', 'Instrumental', 'Turntablism', 'Trip Hop',
      'G-Funk', 'Horrorcore', 'Crunk', 'Drill', 'Mumble Rap',
      'Underground Hip Hop', 'Southern Hip Hop', 'East Coast Hip Hop',
      'West Coast Hip Hop', 'Alternative Hip Hop', 'Christian Hip Hop',
    ],
    Classical: [
      'Baroque', 'Chamber Music', 'Choral', 'Contemporary',
      'Opera', 'Romantic', 'Symphony', 'Modern', 'Medieval',
      'Renaissance', 'Minimalism', 'Neo-Classical', 'Ballet',
      'Concerto', 'Sonata', 'String Quartet', 'Piano',
    ],
    'Funk / Soul': [
      'Disco', 'Funk', 'Neo Soul', 'Psychedelic', 'R&B', 'Soul',
      'Boogie', 'Gospel', 'Rhythm & Blues', 'New Jack Swing',
      'P-Funk', 'Soul-Jazz', 'Funk Rock', 'Go-Go', 'Contemporary R&B',
    ],
    Reggae: [
      'Dancehall', 'Dub', 'Ragga', 'Reggae-Pop', 'Roots Reggae', 'Ska',
      'Rocksteady', 'Lovers Rock', 'Reggae Fusion', 'Reggaeton',
      'Dub Poetry', 'Nyahbinghi', 'Calypso',
    ],
    'Folk, World, & Country': [
      'Bluegrass', 'Country', 'Folk', 'Folk Rock', 'Traditional',
      'Celtic', 'African', 'Latin', 'Brazilian', 'Hawaiian', 'Aboriginal',
      'Andean', 'Appalachian', 'Klezmer', 'Zydeco', 'Samba', 'Flamenco',
    ],
    Blues: [
      'Chicago Blues', 'Delta Blues', 'Electric Blues', 'Jump Blues',
      'Country Blues', 'Acoustic Blues', 'Piedmont Blues', 'Texas Blues',
      'British Blues', 'Modern Electric Blues', 'Piano Blues', 'Blues Rock',
    ],
    Pop: [
      'Synth-pop', 'Teen Pop', 'Europop', 'Indie Pop', 'Dance-Pop', 'Electropop',
      'Soft Rock', 'Baroque Pop', 'Bubblegum', 'Power Pop', 'Jangle Pop',
      'Dream Pop', 'Chamber Pop', 'Sophisti-Pop', 'City Pop', 'K-Pop', 'J-Pop',
    ],
    Latin: [
      'Salsa', 'Bossa Nova', 'Latin Jazz', 'Samba', 'Cumbia', 'Tango',
      'Reggaeton', 'Merengue', 'Bolero', 'Boogaloo', 'Mambo', 'Mariachi',
    ],
    'Stage & Screen': [
      'Soundtrack', 'Score', 'Theme', 'Musical', 'Opera', 'Ballet',
      'Video Game Music', 'Film Score', 'Television Music',
    ],
    'Brass & Military': ['Marching Band', 'Military', 'Brass Band', 'Fanfare', 'Pipe & Drum', 'Big Band'],
    "Children's": ['Educational', 'Story', 'Nursery Rhymes', 'Lullaby', "Children's Music", 'Sing-Along'],
    'Non-Music': ['Field Recording', 'Spoken Word', 'Interview', 'Poetry', 'Dialogue', 'Sound Art', 'Sound Effects', 'ASMR', 'Audiobook'],
  };
}
