'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import Header from './components/Header';
import SearchFilters from './components/SearchFilters';
import ResultsList from './components/ResultsList';
import { Listing, SearchFilters as SearchFiltersType } from './models/types';
import Link from 'next/link';

// Component that uses useSearchParams wrapped in Suspense
function SearchParamsHandler({ 
  onAuthError, 
  onAuthSuccess,
  onQueryChange 
}: { 
  onAuthError: (error: string) => void;
  onAuthSuccess: () => void;
  onQueryChange: (query: string) => void;
}) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const authError = searchParams.get('auth_error');
    if (authError) {
      onAuthError(authError);
    }
    
    const authSuccess = searchParams.get('auth_success');
    if (authSuccess) {
      onAuthSuccess();
    }
    
    const query = searchParams.get('q');
    if (query) {
      onQueryChange(query);
    }
  }, [searchParams, onAuthError, onAuthSuccess, onQueryChange]);
  
  return null;
}

export default function Home() {
  const [results, setResults] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchStage, setSearchStage] = useState<string>('');
  const [totalResults, setTotalResults] = useState<number>(0);
  const [poolSize, setPoolSize] = useState<number>(0);
  const [initialQuery, setInitialQuery] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Reference to search form for programmatic access
  const searchFormRef = useRef<any>(null);
  
  // Handle auth errors
  const handleAuthError = (error: string) => {
    console.error('Authentication error:', error);
    setAuthError(error);
  };
  
  // Handle auth success
  const handleAuthSuccess = () => {
    // Set a cookie to prevent showing the success message on refresh
    if (!document.cookie.includes('discogs_auth_completed=true')) {
      document.cookie = 'discogs_auth_completed=true; max-age=3600; path=/';
      // Show a success message or update UI here
    }
  };
  
  // Handle URL query parameter
  const handleQueryChange = (query: string) => {
    setInitialQuery(query);
    // If we have a search form ref and a query, trigger search
    if (searchFormRef.current && query) {
      // Set the input value and trigger search
      searchFormRef.current.initiateSearch(query);
    }
  };

  // Keep track of the last search filters for retry functionality
  const lastSearchFilters = useRef<SearchFiltersType | null>(null);
  
  const handleSearch = async (filters: SearchFiltersType) => {
    // Save the filters for retry functionality
    lastSearchFilters.current = filters;
    
    setIsLoading(true);
    setSearchError(null);
    setResults([]);
    setSearchStage('Searching Discogs database...');
    
    // Create an AbortController for the search timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Client-side search timeout triggered after 30 seconds');
      controller.abort();
    }, 30000); // Reduce timeout to 30 seconds for faster feedback
    
    try {
      // Call our search API endpoint
      console.log('Searching Discogs with filters:', filters);
      
      // Create a timeout to update the search stage message after 5 seconds
      const stageUpdateTimeout = setTimeout(() => {
        setSearchStage('Analyzing record rarity data... (this may take up to a minute)');
        
        // Add another update after 15 seconds to show the search is still processing
        setTimeout(() => {
          setSearchStage('Still processing... Discogs API may be slow right now. Will timeout in 15 seconds if no response.');
        }, 15000);
      }, 5000);
      
      const response = await axios.post('/api/search', filters, {
        signal: controller.signal
      });
      
      // Clear the timeouts when the response is received
      clearTimeout(stageUpdateTimeout);
      clearTimeout(timeoutId);
      
      if (response.data.success) {
        if (response.data.results.length > 0) {
          setResults(response.data.results);
          setTotalResults(response.data.totalFound || 0);
          setPoolSize(response.data.poolSize || 0);
        }
        
        // Show message if no results found or if there's an API error
        if (response.data.error) {
          setSearchError(response.data.error);
        } else if (response.data.results.length === 0) {
          setSearchError('No results found matching your criteria. Try adjusting your search filters.');
        }
      } else {
        setSearchError('Search failed: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Error searching records:', error);
      
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        setSearchError('Search timed out after 60 seconds. The Discogs API may be slow or rate limited right now.');
      } else if (error.response?.status === 429) {
        setSearchError('Discogs API rate limit exceeded. Please wait a minute before trying again.');
      } else {
        setSearchError(`An error occurred while searching: ${error.message || 'Unknown error'}. Please try again.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    // This is just a simple way to let users retry their last search
    if (searchError && lastSearchFilters.current) {
      handleSearch(lastSearchFilters.current);
    }
  };

  const handleRefresh = () => {
    // Get different random records with the same search parameters
    if (lastSearchFilters.current) {
      handleSearch(lastSearchFilters.current);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <SearchParamsHandler 
          onAuthError={handleAuthError}
          onAuthSuccess={handleAuthSuccess}
          onQueryChange={handleQueryChange}
        />
      </Suspense>
      
      <Header />
      
      <div className="py-4">
        <div className="max-w-4xl mx-auto">
          {authError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p>Authentication error: {authError}</p>
            </div>
          )}
          
          <div className="border border-minimal-gray-200 rounded-lg shadow-sm mb-6 overflow-hidden">
            <div className="bg-minimal-white py-3 px-4 border-b border-minimal-gray-200">
              <h2 className="text-2xl font-picnic text-minimal-black">Record Discovery Engine</h2>
            </div>
            <div className="bg-minimal-white p-6">
              <p className="text-sm text-minimal-gray-700 mb-4">
                Search for vinyl releases in the Discogs database. We'll show you a diverse selection of interesting records matching your criteria, with something different each time you search.
              </p>
              <SearchFilters 
                onSearch={handleSearch} 
                ref={searchFormRef}
                initialQuery={initialQuery}
              />
            </div>
          </div>
          
          {isLoading && (
            <div className="text-center py-8">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-minimal-blue-600"></div>
                <div>
                  <p className="text-minimal-gray-600 font-medium">{searchStage}</p>
                  <p className="text-xs text-minimal-gray-500 mt-1">This process uses the Discogs API which has rate limits, so it may take a moment.</p>
                </div>
              </div>
            </div>
          )}
          
          {!isLoading && searchError && (
            <div className="mb-6 border border-minimal-gray-200 rounded-lg shadow-sm p-6 bg-minimal-white">
              <h3 className="font-medium text-minimal-black mb-2">Search Results:</h3>
              <p className="text-minimal-red-600">{searchError}</p>
              <button 
                onClick={handleRetry}
                className="mt-4 px-4 py-2 bg-minimal-blue-600 text-white rounded-md hover:bg-minimal-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
          
          {!searchError && results.length > 0 && (
            <div className="mb-4 text-center bg-minimal-accent-50 p-3 rounded border border-minimal-accent-200">
              <p className="text-minimal-gray-700 font-medium">
                <span className="text-minimal-accent-800">✨</span> Showing {results.length} records from a catalog of {totalResults.toLocaleString()} matching releases
                <span className="block text-sm mt-1">Each search explores different parts of the Discogs catalog to help you discover new music.</span>
              </p>
              <div className="mt-2 bg-minimal-white p-2 rounded text-xs text-minimal-gray-600">
                <p>This curated selection includes a diverse mix of records from the Discogs database.</p>
              </div>
              <button
                onClick={handleRefresh}
                className="mt-3 px-4 py-2 bg-minimal-accent-100 text-minimal-accent-800 rounded-md hover:bg-minimal-accent-200 transition-colors flex items-center mx-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Explore More Records
              </button>
            </div>
          )}
          
          <ResultsList 
            results={results} 
            isLoading={isLoading} 
            error={searchError || undefined}
            totalFound={totalResults || undefined}
            searchInfo={{
              selectionStrategy: 'Record Discovery Engine'
            }}
          />
        </div>
      </div>
    </main>
  );
} 