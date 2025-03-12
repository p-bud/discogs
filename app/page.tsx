'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import Header from './components/Header';
import SearchFilters from './components/SearchFilters';
import ResultsList from './components/ResultsList';
import { Listing, SearchFilters as SearchFiltersType } from './models/types';
import Link from 'next/link';

export default function Home() {
  const [results, setResults] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchStage, setSearchStage] = useState<string>('');
  const [totalResults, setTotalResults] = useState<number>(0);
  const [poolSize, setPoolSize] = useState<number>(0);
  const searchParams = useSearchParams();

  // Check for auth success/failure messages
  useEffect(() => {
    const authSuccess = searchParams.get('auth_success');
    const authError = searchParams.get('auth_error');

    if (authSuccess && !document.cookie.includes('discogs_auth_completed=true')) {
      // Show success message only if we don't have the auth completed cookie yet
      alert('Successfully connected to Discogs!');
      
      // Force refresh the page to ensure the authentication status is updated
      // This helps in case the cookies were set but not reflected in the UI yet
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } else if (authError) {
      // Show error message
      let errorMessage = 'Failed to connect to Discogs.';
      
      switch (authError) {
        case 'missing_params':
          errorMessage = 'OAuth error: Missing required parameters.';
          break;
        case 'missing_token_secret':
          errorMessage = 'OAuth error: Missing token secret. Please try again.';
          break;
        case 'invalid_access_token':
          errorMessage = 'OAuth error: Invalid access token response from Discogs.';
          break;
        default:
          if (authError.startsWith('api_error_')) {
            const errorCode = authError.replace('api_error_', '');
            errorMessage = `Discogs API error (${errorCode}). Please try again later.`;
          }
      }
      
      alert(errorMessage);
    }
  }, [searchParams]);

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
    <div className="py-4">
      <Header />
      <div className="max-w-4xl mx-auto">
        <div className="border border-minimal-gray-200 rounded-lg shadow-sm mb-6 overflow-hidden">
          <div className="bg-minimal-white py-3 px-4 border-b border-minimal-gray-200">
            <h2 className="text-2xl font-picnic text-minimal-black">Record Discovery Engine</h2>
          </div>
          <div className="bg-minimal-white p-6">
            <p className="text-sm text-minimal-gray-700 mb-4">
              Search for vinyl releases in the Discogs database. We'll show you a diverse selection of interesting records matching your criteria, with something different each time you search.
            </p>
            <SearchFilters onSearch={handleSearch} />
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
  );
} 