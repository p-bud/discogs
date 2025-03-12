import { NextResponse } from 'next/server';
import { SearchFilters, Listing } from '../../models/types';
import { searchDiscogs, searchDatabaseWithRarity } from '../../utils/discogs';

// OFFLINE MODE: Using hardcoded data instead of API calls
// This ensures searches work even if the Discogs API is unavailable
const OFFLINE_MODE = false;

// Expanded record data for different genres - added more entries to ensure variety
const SAMPLE_RECORDS: Record<string, Listing[]> = {
  // Rock genre records
  "Rock": [
    {
      id: "rock1",
      title: "The Dark Side of the Moon",
      artist: "Pink Floyd",
      price: 0,
      condition: "VG+",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/cL6dqO8QLkGWEOm5YwmfbSXzn3x-35Q0Qu3mZPdDzAA/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTY2Mzk5/OS0xNjE2MTgxMDQ4/LTU2MzguanBlZw.jpeg",
      year: 1973,
      genre: "Rock",
      country: "UK",
      style: "Psychedelic Rock",
      format: "Vinyl",
      haveCount: 987654,
      wantCount: 876543,
      rarityScore: 0.89
    },
    {
      id: "rock2",
      title: "Nevermind",
      artist: "Nirvana",
      price: 0,
      condition: "NM",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/UJScUVfjtyeyZZp9I8qBJcQ3NJ2z2DlIoXhYVJJFhRc/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTUzNjg5/MC0xNjI3NjA3OTQ1/LTY3MTAuanBlZw.jpeg",
      year: 1991,
      genre: "Rock",
      country: "US",
      style: "Grunge",
      format: "Vinyl",
      haveCount: 765432,
      wantCount: 654321,
      rarityScore: 0.85
    },
    {
      id: "rock3",
      title: "Unknown Pleasures",
      artist: "Joy Division",
      price: 0,
      condition: "VG+",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/CkAz5X6YJyLWj3LOdvjf4nNZTD4ZxQV4iFaTJP-SMGM/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTEwNDAx/NDItMTQ5Nzk5MzA5/OS03MzQ5LmpwZWc.jpeg",
      year: 1979,
      genre: "Rock",
      country: "UK",
      style: "Post-Punk",
      format: "Vinyl",
      haveCount: 123456,
      wantCount: 78901,
      rarityScore: 0.64
    },
    {
      id: "rock4",
      title: "OK Computer",
      artist: "Radiohead",
      price: 0,
      condition: "M",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/tMXPj7hhbZ7iXw79c1L4n2bSvDQcnxQHGhjvvS4lVxs/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTE1MTUz/Ny0xMzI4MTExMTUw/LmpwZWc.jpeg",
      year: 1997,
      genre: "Rock",
      country: "UK",
      style: "Alternative Rock",
      format: "Vinyl",
      haveCount: 543210,
      wantCount: 432109,
      rarityScore: 0.8
    },
    {
      id: "rock5",
      title: "Loveless",
      artist: "My Bloody Valentine",
      price: 0,
      condition: "VG",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/nSwCfRzRD0cWxPMIrFbEpWf-X3SmAhBHw6mHxhiRLDI/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTU1MTgz/NjUtMTM5NjE3NzQ0/MC0yNDExLmpwZWc.jpeg",
      year: 1991,
      genre: "Rock",
      country: "UK",
      style: "Shoegaze",
      format: "Vinyl",
      haveCount: 321098,
      wantCount: 210987,
      rarityScore: 0.66
    }
  ],
  // Jazz genre records
  "Jazz": [
    {
      id: "jazz1",
      title: "A Love Supreme",
      artist: "John Coltrane",
      price: 0,
      condition: "VG+",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/rw5lSU5W0FE9lqviVH9mFGYgmyKLRdnzCrwYp9ZjHlg/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTExODk5/NDEtMTY1NTgyMzgz/Mi02MTg0LmpwZWc.jpeg",
      year: 1965,
      genre: "Jazz",
      country: "US",
      style: "Modal",
      format: "Vinyl",
      haveCount: 543210,
      wantCount: 432109,
      rarityScore: 0.8
    },
    {
      id: "jazz2",
      title: "Bitches Brew",
      artist: "Miles Davis",
      price: 0,
      condition: "NM",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/xLTHFpZPxlgc-UpW5k0A8Ku8JKGXkR5cWDQ6QXF1aAs/rs:fit/g:sm/q:90/h:600/w:597/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTE4ODQ1/NTctMTM5NzQ5MzEz/NC04NTI1LmpwZWc.jpeg",
      year: 1970,
      genre: "Jazz",
      country: "US",
      style: "Fusion",
      format: "Vinyl",
      haveCount: 432109,
      wantCount: 321098,
      rarityScore: 0.74
    },
    {
      id: "jazz3",
      title: "Kind of Blue",
      artist: "Miles Davis",
      price: 0,
      condition: "VG+",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/J0khtQ0QoRd-nGQbDFhxJnE5EyYQJILO31Jrn9tqXsI/rs:fit/g:sm/q:90/h:600/w:597/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTE0OTM4/NDUtMTIyMjMwNzM4/OS5qcGVn.jpeg",
      year: 1959,
      genre: "Jazz",
      country: "US",
      style: "Modal",
      format: "Vinyl",
      haveCount: 156789,
      wantCount: 98765,
      rarityScore: 0.63
    },
    {
      id: "jazz4",
      title: "Mingus Ah Um",
      artist: "Charles Mingus",
      price: 0,
      condition: "VG",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/IHzp89UW6_u7tmsjNMEWJZ4aBYrKYI9GXtTJT9g3XBI/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTEzNTk0/ODE1LTE1NTY4MDM0/NDEtMjg0MS5qcGVn.jpeg",
      year: 1959,
      genre: "Jazz",
      country: "US",
      style: "Post Bop",
      format: "Vinyl",
      haveCount: 109876,
      wantCount: 98765,
      rarityScore: 0.9
    },
    {
      id: "jazz5",
      title: "The Shape of Jazz to Come",
      artist: "Ornette Coleman",
      price: 0,
      condition: "M",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/rPKnNxOQ1l6jUfFRwA9S_oeYzHwZtFbN8UKnm3iYEFM/rs:fit/g:sm/q:90/h:591/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTEyNzIw/NjAtMTQ0MzY0MTI1/My0xMzEyLmpwZWc.jpeg",
      year: 1959,
      genre: "Jazz",
      country: "US",
      style: "Free Jazz",
      format: "Vinyl",
      haveCount: 98765,
      wantCount: 87654,
      rarityScore: 0.89
    }
  ],
  // Electronic genre records
  "Electronic": [
    {
      id: "electronic1",
      title: "Selected Ambient Works 85-92",
      artist: "Aphex Twin",
      price: 0,
      condition: "NM",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/t8NzIuELan_kHSCnT5lbI4f9F1qCfRW_S1-jLQlnYto/rs:fit/g:sm/q:90/h:596/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTMwMzAz/LTE1NjQwNzI5NTEt/ODc0Mi5qcGVn.jpeg",
      year: 1992,
      genre: "Electronic",
      country: "UK",
      style: "Ambient",
      format: "Vinyl",
      haveCount: 321098,
      wantCount: 210987,
      rarityScore: 0.66
    },
    {
      id: "electronic2",
      title: "Endtroducing.....",
      artist: "DJ Shadow",
      price: 0,
      condition: "VG+",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/yQTFE3FlKKDdRyTB70mQh70LKGc8FhMbdsIE29AqLsE/rs:fit/g:sm/q:90/h:600/w:594/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTEzNTg1/Ny0xMTk0OTgxMDQz/LmpwZw.jpeg",
      year: 1996,
      genre: "Electronic",
      country: "US",
      style: "Trip Hop",
      format: "Vinyl",
      haveCount: 210987,
      wantCount: 109876,
      rarityScore: 0.52
    },
    {
      id: "electronic3",
      title: "Cosmogramma",
      artist: "Flying Lotus",
      price: 0,
      condition: "M",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/ySCXJgHyzKCXJJO-NTLKe1y6Cdo5OliGmA-xvVBUH4c/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI0MTE3/MzMtMTQzNDU5MjEz/My03OTQzLmpwZWc.jpeg",
      year: 2010,
      genre: "Electronic",
      country: "US",
      style: "Experimental",
      format: "Vinyl",
      haveCount: 45678,
      wantCount: 34567,
      rarityScore: 0.76
    },
    {
      id: "electronic4",
      title: "Music Has the Right to Children",
      artist: "Boards of Canada",
      price: 0,
      condition: "VG",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/hnrkX0L8CYz7OhQ0PZd-3iqS87stclhOBMI0jO9kiwU/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTEyNTkx/OS0xNTgzNTk0Mzg2/LTc3MDAuanBlZw.jpeg",
      year: 1998,
      genre: "Electronic",
      country: "UK",
      style: "IDM",
      format: "Vinyl",
      haveCount: 98765,
      wantCount: 87654,
      rarityScore: 0.89
    },
    {
      id: "electronic5",
      title: "Untrue",
      artist: "Burial",
      price: 0,
      condition: "NM",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/c7_XgpBqM8VxpyC8-OdMQZA9sYzGFkCQxoROrpwJWv0/rs:fit/g:sm/q:90/h:598/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTExNzUw/MjctMTU0ODI3Nzcy/OS01NjczLmpwZWc.jpeg",
      year: 2007,
      genre: "Electronic",
      country: "UK",
      style: "Dubstep",
      format: "Vinyl",
      haveCount: 109876,
      wantCount: 98765,
      rarityScore: 0.9
    }
  ],
  // Classical genre records
  "Classical": [
    {
      id: "classical1",
      title: "Goldberg Variations",
      artist: "Glenn Gould",
      price: 0,
      condition: "VG+",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/S0T3kHETyajh8S5ht5IIcKLlW1h90edbx5VE304bWKU/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTEzNTMz/OC0xNDg0MDg1Nzg0/LTkwNzUuanBlZw.jpeg",
      year: 1955,
      genre: "Classical",
      country: "Canada",
      style: "Baroque",
      format: "Vinyl",
      haveCount: 109876,
      wantCount: 98765,
      rarityScore: 0.9
    },
    {
      id: "classical2",
      title: "The Planets",
      artist: "Gustav Holst",
      price: 0,
      condition: "M",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/LnpCn9E_VxHlTtaIr6XeA9LG1nCefTKrgf2-gShjL-g/rs:fit/g:sm/q:90/h:594/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTQyMzYx/NzEtMTUxMzQ3NTUw/My03MDk2LmpwZWc.jpeg",
      year: 1918,
      genre: "Classical",
      country: "UK",
      style: "Modern",
      format: "Vinyl",
      haveCount: 98765,
      wantCount: 87654,
      rarityScore: 0.89
    }
  ],
  // Hip Hop genre records
  "Hip Hop": [
    {
      id: "hiphop1",
      title: "Illmatic",
      artist: "Nas",
      price: 0,
      condition: "VG+",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/Y9D4jY2GrOQn_5iJq8UfLVZXM6aBxIbGb4tIPnXHQYk/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTE0NDUw/MzQtMTQzNTY3MzYw/Ni04NTI3LmpwZWc.jpeg",
      year: 1994,
      genre: "Hip Hop",
      country: "US",
      style: "East Coast",
      format: "Vinyl",
      haveCount: 543210,
      wantCount: 432109,
      rarityScore: 0.8
    },
    {
      id: "hiphop2",
      title: "Enter the Wu-Tang (36 Chambers)",
      artist: "Wu-Tang Clan",
      price: 0,
      condition: "NM",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/eQyNka7b__xF3Y82TcXtNEJcnlTV5wAXg6CSVUTfpKs/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTEwMDM0/NzQ1LTE0OTAzMDQy/MDEtNTYzOC5qcGVn.jpeg",
      year: 1993,
      genre: "Hip Hop",
      country: "US",
      style: "Hardcore Hip Hop",
      format: "Vinyl",
      haveCount: 432109,
      wantCount: 321098,
      rarityScore: 0.74
    }
  ],
  // Pop genre records
  "Pop": [
    {
      id: "pop1",
      title: "Thriller",
      artist: "Michael Jackson",
      price: 0,
      condition: "VG+",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/zg-K3HxcH-gg6t4k2QtXvTUTNf1UKkbJtI_dTCZABPs/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTU4NzQ1/OC0xNjQ1OTUzMDc1/LTMyODkuanBlZw.jpeg",
      year: 1982,
      genre: "Pop",
      country: "US",
      style: "Disco",
      format: "Vinyl",
      haveCount: 987654,
      wantCount: 876543,
      rarityScore: 0.89
    },
    {
      id: "pop2",
      title: "The Queen Is Dead",
      artist: "The Smiths",
      price: 0,
      condition: "NM",
      seller: "Discogs Database",
      sellerRating: 0,
      historicalLow: 0,
      historicalMedian: 0,
      coverImage: "https://i.discogs.com/BLWTFi6L7GCkfMi8J7_wvvIMvB-zdL3HEXf-O9A3hfc/rs:fit/g:sm/q:90/h:596/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTEwMzQy/OTctMTUxMzg2NjI3/Mi02NzE2LmpwZWc.jpeg",
      year: 1986,
      genre: "Pop",
      country: "UK",
      style: "Indie Pop",
      format: "Vinyl",
      haveCount: 765432,
      wantCount: 654321,
      rarityScore: 0.85
    }
  ]
};

// Default genres to fall back to if the requested genre isn't found
const DEFAULT_GENRES = ["Rock", "Jazz", "Electronic", "Classical", "Hip Hop", "Pop"];

export async function POST(request: Request) {
  try {
    const filters = await request.json();
    
    console.log('Search request received with filters:', filters);
    
    // If offline mode is disabled, use the actual Discogs API
    if (!OFFLINE_MODE) {
      console.log('SERVER: Using Discogs API for search');
      
      // Use existing API search code
      // Generate a random seed for this search to ensure different results for same query
      const randomSeed = Math.floor(Math.random() * 1000000);
      console.log(`SERVER: Using random seed ${randomSeed} for variation`);
      
      // Create a timeout promise to abort if search takes too long
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Search timed out after 60 seconds')), 60000);
      });
      
      try {
        // First try with all specified filters
        console.log('SERVER: Attempting search with full filters');
        const searchPromise = searchDiscogs(filters, randomSeed);
        const searchResults = await Promise.race([searchPromise, timeoutPromise]) as any[];
        
        // If we have results, fetch rarity data and return
        if (searchResults && searchResults.length > 0) {
          console.log(`SERVER: Found ${searchResults.length} results, fetching rarity data`);
          const resultsWithRarity = await searchDatabaseWithRarity(searchResults, true);
          return NextResponse.json({ 
            success: true, 
            results: resultsWithRarity,
            totalFound: searchResults.length,
            offlineMode: false
          });
        } else {
          // If no results, try a simplified search with just genre
          console.log('SERVER: No results with full filters, trying simplified search with genre only');
          const simplifiedFilters = { 
            genre: filters.genre,
            style: '',
            format: '',
            country: '',
            yearRange: [],
            sortByRarity: filters.sortByRarity
          };
          
          const simplifiedResults = await searchDiscogs(simplifiedFilters, randomSeed);
          
          if (simplifiedResults && simplifiedResults.length > 0) {
            console.log(`SERVER: Found ${simplifiedResults.length} results with simplified search`);
            const resultsWithRarity = await searchDatabaseWithRarity(simplifiedResults, true);
            return NextResponse.json({ 
              success: true, 
              results: resultsWithRarity,
              totalFound: simplifiedResults.length,
              simplified: true,
              offlineMode: false,
              message: 'Showing simplified results. Try different search criteria for more specific matches.'
            });
          } else {
            // Last resort - try with a popular genre
            console.log('SERVER: No results with simplified search, trying "Rock" genre as last resort');
            const lastResortFilters = { 
              genre: 'Rock',
              style: '',
              format: '',
              country: '',
              yearRange: [],
              sortByRarity: filters.sortByRarity
            };
            
            const lastResortResults = await searchDiscogs(lastResortFilters, randomSeed);
            
            if (lastResortResults && lastResortResults.length > 0) {
              console.log(`SERVER: Found ${lastResortResults.length} results with last resort search`);
              const resultsWithRarity = await searchDatabaseWithRarity(lastResortResults, true);
              return NextResponse.json({ 
                success: true, 
                results: resultsWithRarity,
                totalFound: lastResortResults.length,
                lastResort: true,
                offlineMode: false,
                message: 'No matches found for your criteria. Showing some Rock records instead.'
              });
            } else {
              return NextResponse.json({ 
                success: false, 
                error: 'No results found after multiple search attempts',
                results: [],
                totalFound: 0
              });
            }
          }
        }
      } catch (error: any) {
        // If the main search times out, try an emergency fallback
        if (error.message && error.message.includes('timed out')) {
          console.log('SERVER: Search timed out, attempting emergency fallback');
          try {
            // Try one more quick search with a shorter timeout and simplified criteria
            const emergencyFilters = { 
              genre: 'Rock',
              style: '',
              format: '',
              country: '',
              yearRange: [],
              sortByRarity: true
            };
            
            const emergencyTimeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Emergency search timed out')), 30000);
            });
            
            const emergencySearchPromise = searchDiscogs(emergencyFilters, randomSeed);
            const emergencyResults = await Promise.race([emergencySearchPromise, emergencyTimeoutPromise]) as any[];
            
            if (emergencyResults && emergencyResults.length > 0) {
              console.log(`SERVER: Found ${emergencyResults.length} results with emergency search`);
              // Process just a few results to be fast
              const limitedResults = emergencyResults.slice(0, 10);
              const resultsWithRarity = await searchDatabaseWithRarity(limitedResults, true);
              
              return NextResponse.json({ 
                success: true, 
                results: resultsWithRarity,
                totalFound: emergencyResults.length,
                emergency: true,
                offlineMode: false,
                message: 'Search timed out, but we found some records for you anyway.'
              });
            }
          } catch (emergencyError) {
            console.error('SERVER: Emergency search also failed:', emergencyError);
            return NextResponse.json({ 
              success: false, 
              error: 'Search timed out. Please try a simpler search or try again later.',
              results: [],
              totalFound: 0
            });
          }
        }
        
        console.error('SERVER: Search error:', error);
        return NextResponse.json({ 
          success: false, 
          error: `Search failed: ${error.message || 'Unknown error'}`,
          results: [],
          totalFound: 0
        });
      }
    } else {
      // Offline mode code would be here but we're not using it
      return NextResponse.json({ 
        success: false, 
        error: 'Offline mode is disabled',
        results: [],
        totalFound: 0
      });
    }
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Search failed: ${error.message || 'Unknown error'}`,
      results: [],
      totalFound: 0
    });
  }
} 