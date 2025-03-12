/**
 * Hardcoded genres, styles, and genre-style mappings
 * Used to avoid Discogs API rate limiting during builds
 */

// Common Discogs genres
export const GENRES = [
  "Electronic",
  "Rock",
  "Jazz",
  "Funk / Soul",
  "Hip Hop",
  "Classical",
  "Pop",
  "Folk, World, & Country",
  "Reggae",
  "Blues",
  "Latin",
  "Non-Music",
  "Children's",
  "Stage & Screen",
  "Brass & Military"
];

// Common Discogs styles
export const STYLES = [
  "House", "Techno", "Ambient", "Disco", "Synth-pop", "Experimental",
  "Alternative Rock", "Indie Rock", "Hard Rock", "Punk", "Heavy Metal",
  "Progressive Rock", "Psychedelic Rock", "Folk Rock", "Rock & Roll",
  "Jazz-Funk", "Soul-Jazz", "Fusion", "Bebop", "Free Jazz", "Swing",
  "Disco", "Soul", "Funk", "R&B", "Gospel",
  "Conscious", "Gangsta", "Instrumental", "Trap", "Boom Bap",
  "Baroque", "Romantic", "Modern", "Contemporary", "Opera",
  "Ballad", "Chanson", "New Wave", "Europop", "Dance-pop",
  "Country", "Folk", "Bluegrass", "Celtic", "Traditional",
  "Roots Reggae", "Dub", "Dancehall", "Ska", "Rocksteady",
  "Delta Blues", "Chicago Blues", "Electric Blues", "Jump Blues",
  "Salsa", "Bossa Nova", "Samba", "Tango", "Cumbia",
  "Spoken Word", "Field Recording", "Sound Art", "Sound Poetry",
  "Educational", "Nursery Rhymes", "Story", "Musical",
  "Soundtrack", "Score", "Theme", "Musical",
  "Marching Band", "Military", "Brass Band", "Pipe & Drum"
];

// Genre to style mapping
export const GENRE_STYLE_MAP: Record<string, string[]> = {
  "Electronic": [
    "House", "Techno", "Ambient", "Drum n Bass", "Dubstep", "Electro",
    "IDM", "Trance", "UK Garage", "Breakbeat", "Synth-pop", "Experimental"
  ],
  "Rock": [
    "Alternative Rock", "Indie Rock", "Hard Rock", "Punk", "Heavy Metal", 
    "Progressive Rock", "Psychedelic Rock", "Folk Rock", "Rock & Roll", "Grunge"
  ],
  "Jazz": [
    "Jazz-Funk", "Soul-Jazz", "Fusion", "Bebop", "Free Jazz", "Swing",
    "Big Band", "Contemporary Jazz", "Modal", "Avant-garde Jazz", "Smooth Jazz"
  ],
  "Funk / Soul": [
    "Disco", "Soul", "Funk", "R&B", "Gospel", "Neo Soul", "P.Funk", "Rhythm & Blues"
  ],
  "Hip Hop": [
    "Conscious", "Gangsta", "Instrumental", "Trap", "Boom Bap", "East Coast", 
    "West Coast", "Southern", "Abstract", "Turntablism", "Golden Age"
  ],
  "Classical": [
    "Baroque", "Romantic", "Modern", "Contemporary", "Opera", 
    "Chamber Music", "Orchestral", "Choral", "Symphony", "Concerto"
  ],
  "Pop": [
    "Ballad", "Chanson", "New Wave", "Europop", "Dance-pop", 
    "Teen Pop", "Synthpop", "Power Pop", "Indie Pop", "J-pop", "K-pop"
  ],
  "Folk, World, & Country": [
    "Country", "Folk", "Bluegrass", "Celtic", "Traditional", 
    "Cajun", "Nordic", "African", "Asian", "Middle Eastern", "European"
  ],
  "Reggae": [
    "Roots Reggae", "Dub", "Dancehall", "Ska", "Rocksteady", 
    "Lovers Rock", "Ragga", "Reggae-Pop", "Calypso", "Soca"
  ],
  "Blues": [
    "Delta Blues", "Chicago Blues", "Electric Blues", "Jump Blues", 
    "Country Blues", "Piano Blues", "Rhythm & Blues", "Texas Blues"
  ],
  "Latin": [
    "Salsa", "Bossa Nova", "Samba", "Tango", "Cumbia", 
    "Bachata", "Merengue", "MPB", "Bolero", "Latin Jazz"
  ],
  "Non-Music": [
    "Spoken Word", "Field Recording", "Sound Art", "Sound Poetry", 
    "Interview", "Radioplay", "Comedy", "Dialogue", "ASMR"
  ],
  "Children's": [
    "Educational", "Nursery Rhymes", "Story", "Musical", 
    "Sing-Along", "Lullaby", "Action", "Game", "Religious"
  ],
  "Stage & Screen": [
    "Soundtrack", "Score", "Theme", "Musical", 
    "Opera", "TV", "Video Game Music", "Audio Drama"
  ],
  "Brass & Military": [
    "Marching Band", "Military", "Brass Band", "Pipe & Drum", 
    "Fanfare", "Ceremonial", "Patriotic"
  ]
}; 