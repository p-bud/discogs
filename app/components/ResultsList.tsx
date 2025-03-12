'use client';

import React from 'react';
import { Listing } from '../models/types';

interface ResultsListProps {
  results: Listing[];
  isLoading: boolean;
  error?: string | null;
  details?: string | null;
  totalFound?: number | null;
  searchInfo?: any;
}

const ResultsList: React.FC<ResultsListProps> = ({ 
  results, 
  isLoading, 
  error, 
  details, 
  totalFound,
  searchInfo 
}) => {
  if (results.length === 0 && !isLoading && !error) {
    return null; // No need to render anything if no results and not loading or error
  }

  return (
    <section className="bg-minimal-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-2xl font-bold text-minimal-gray-900 mb-4">Discovered Records</h2>
      {error ? (
        <div className="p-4 text-sm rounded-md bg-red-50 text-red-700 mb-4 border border-red-200">
          <p className="font-medium">Search Failed: {error}</p>
          {details && <p className="mt-1">{details}</p>}
          
          {/* Add guidance for timeout errors */}
          {error.includes('timed out') && (
            <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-1">Tips to improve search performance:</h4>
              <ul className="list-disc ml-4 text-yellow-700 space-y-1">
                <li>Try searching with fewer filters</li>
                <li>Choose a more specific genre or style</li>
                <li>Wait a few minutes before trying again (Discogs has rate limits)</li>
                <li>Try at a different time of day when Discogs API may be less busy</li>
              </ul>
              <div className="mt-3">
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-minimal-accent text-white px-3 py-1 rounded text-xs hover:bg-minimal-accent-dark transition-colors"
                >
                  Retry Search
                </button>
              </div>
            </div>
          )}
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin h-12 w-12 border-4 border-minimal-accent border-t-transparent rounded-full mb-4"></div>
          <p className="text-minimal-gray-500">Searching records...</p>
          <p className="text-xs text-minimal-gray-400 mt-2 max-w-md text-center">
            This may take up to 40 seconds as we search for interesting records. 
            Discogs API has rate limits that can sometimes slow down our search.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="p-4 text-sm rounded-md bg-blue-50 text-blue-700 mb-4 border border-blue-200">
          <p>No results found matching your criteria. Try adjusting your search filters.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-minimal-gray-500">
            Showing {results.length} of {totalFound?.toLocaleString() || 'many'} matching records. <span className="italic">Each search explores different gems from the catalog.</span>
          </div>
          
          {/* Debug info for troubleshooting */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 border border-gray-200 rounded-md mb-4 text-xs font-mono bg-gray-50 text-gray-600">
              <div className="font-bold mb-1">Search Debug Info:</div>
              <div>Total matches: {totalFound || 0}</div>
              <div>Selection strategy: {searchInfo?.selectionStrategy || 'N/A'}</div>
              <div>Raw result count: {results.length}</div>
              <div className="mt-2 font-bold">First 3 results:</div>
              <ul className="ml-2">
                {results.slice(0, 3).map((listing, idx) => (
                  <li key={idx} className="truncate">
                    {idx+1}. {listing.artist} - {listing.title} (Have: {listing.haveCount})
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((listing, index) => (
              <div key={listing.id} className="border border-minimal-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="relative">
                  {/* Record number badge */}
                  <div className="absolute top-2 left-2 bg-minimal-accent text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                    #{index + 1}
                  </div>
                  
                  <div className="h-48 bg-minimal-gray-100 flex items-center justify-center overflow-hidden">
                    {listing.coverImage ? (
                      <img 
                        src={listing.coverImage} 
                        alt={`${listing.artist} - ${listing.title}`} 
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-minimal-gray-400 flex flex-col items-center justify-center h-full w-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                        <span className="mt-2 text-sm">No Image</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-medium text-minimal-gray-900 mb-1 truncate">{listing.title}</h3>
                  <p className="text-minimal-gray-600 text-sm mb-3 truncate">{listing.artist}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {listing.genre && (
                      <span className="text-xs bg-minimal-gray-100 text-minimal-gray-700 px-2 py-1 rounded">
                        {listing.genre}
                      </span>
                    )}
                    {listing.style && (
                      <span className="text-xs bg-minimal-gray-100 text-minimal-gray-700 px-2 py-1 rounded">
                        {listing.style}
                      </span>
                    )}
                    {listing.format && (
                      <span className="text-xs bg-minimal-gray-100 text-minimal-gray-700 px-2 py-1 rounded">
                        {listing.format}
                      </span>
                    )}
                    {listing.year > 0 && (
                      <span className="text-xs bg-minimal-gray-100 text-minimal-gray-700 px-2 py-1 rounded">
                        {listing.year}
                      </span>
                    )}
                  </div>
                  
                  <div className="border-t border-minimal-gray-100 pt-3">
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-minimal-gray-500">
                        <span className="font-medium text-minimal-gray-700">Collectors:</span>
                        <div className="mt-1">
                          {listing.haveCount === 0 ? (
                            <span className="text-purple-600 font-medium">No collectors yet!</span>
                          ) : listing.haveCount && listing.haveCount < 10 ? (
                            <span className="text-blue-600 font-medium">Only {listing.haveCount} collectors</span>
                          ) : (
                            <span>
                              {(listing.haveCount || 0).toLocaleString()} have / {(listing.wantCount || 0).toLocaleString()} want
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <a 
                        href={`https://www.discogs.com/release/${listing.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-minimal-accent hover:text-minimal-accent-dark"
                      >
                        View on Discogs →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default ResultsList; 