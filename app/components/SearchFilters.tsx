'use client';

import React, { useState, useEffect } from 'react';
import { SearchFilters as SearchFiltersType, RecordCondition } from '../models/types';
import { getGenres, getStyles, getFormats, getGenreStyleMap } from '../utils/discogs-client';

interface SearchFiltersProps {
  onSearch: (filters: SearchFiltersType) => void;
}

const conditionOptions: RecordCondition[] = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'];
// Initial fallback options - will be replaced when API data loads
const initialGenreOptions = ['Rock', 'Jazz', 'Electronic', 'Hip Hop', 'Classical'];
const initialStyleOptions = ['Tech House', 'Ambient', 'Deep House', 'Techno', 'Hard Bop'];
const initialFormatOptions = ['LP', '7"', '10"', '12"', 'Box Set', 'Cassette', 'CD'];
const countryOptions = ['US', 'UK', 'Germany', 'Japan', 'France', 'Canada', 'Australia', 'Italy', 'Spain', 'Netherlands'];

const SearchFilters: React.FC<SearchFiltersProps> = ({ onSearch }) => {
  const [filters, setFilters] = useState<SearchFiltersType>({
    genre: '',
    artist: '',
    album: '',
    yearMin: undefined,
    yearMax: undefined,
    condition: [],
    country: '',
    style: '',
    format: '',
    sortByRarity: true,
  });

  // State for options that would come from the API
  const [genreOptions, setGenreOptions] = useState<string[]>(initialGenreOptions);
  const [allStyleOptions, setAllStyleOptions] = useState<string[]>(initialStyleOptions);
  const [filteredStyleOptions, setFilteredStyleOptions] = useState<string[]>([]);
  const [formatOptions, setFormatOptions] = useState<string[]>(initialFormatOptions);
  const [isLoading, setIsLoading] = useState(false);
  const [genreStyleMap, setGenreStyleMap] = useState<Record<string, string[]>>({});
  const [styleSearch, setStyleSearch] = useState('');

  // Debug info for development
  const [debugInfo, setDebugInfo] = useState({
    totalStyles: 0,
    filteredCount: 0,
    selectedGenre: '',
  });

  // Fetch options from the API when component mounts
  useEffect(() => {
    async function fetchOptions() {
      setIsLoading(true);
      try {
        // Fetch all options in parallel
        const [genres, styles, formats, styleMap] = await Promise.all([
          getGenres(),
          getStyles(),
          getFormats(),
          getGenreStyleMap()
        ]);
        
        setGenreOptions(genres);
        setAllStyleOptions(styles);
        setFormatOptions(formats);
        setGenreStyleMap(styleMap);
        
        setDebugInfo(prev => ({
          ...prev,
          totalStyles: styles.length
        }));
        
        console.log(`Loaded ${genres.length} genres, ${styles.length} styles, and ${formats.length} formats`);
        console.log('Genre-Style Map:', styleMap);
      } catch (error) {
        console.error('Error fetching filter options:', error);
        // Fallback options are already set
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchOptions();
  }, []);
  
  // Update style options when genre changes
  useEffect(() => {
    if (filters.genre) {
      // Reset style search when genre changes
      setStyleSearch('');
      setDebugInfo(prev => ({
        ...prev,
        selectedGenre: filters.genre || ''
      }));
      
      // If we have styles for this genre in our map, use them
      const relevantStyles = genreStyleMap[filters.genre] || [];
      
      if (relevantStyles.length > 0) {
        setFilteredStyleOptions(relevantStyles);
        setDebugInfo(prev => ({
          ...prev,
          filteredCount: relevantStyles.length
        }));
      } else {
        // Fall back to all styles if we don't have a mapping
        setFilteredStyleOptions(allStyleOptions);
        setDebugInfo(prev => ({
          ...prev,
          filteredCount: allStyleOptions.length
        }));
      }
      
      // Clear style selection when genre changes
      setFilters(prev => ({ ...prev, style: '' }));
    } else {
      // If no genre is selected, show all styles but clear style selection
      setFilteredStyleOptions([]);
      setFilters(prev => ({ ...prev, style: '' }));
      setDebugInfo(prev => ({
        ...prev,
        selectedGenre: '',
        filteredCount: 0
      }));
    }
  }, [filters.genre, allStyleOptions, genreStyleMap]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value ? Number(value) : undefined
    }));
  };

  const handleConditionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFilters(prev => {
      if (checked) {
        return {
          ...prev,
          condition: [...(prev.condition || []), value]
        };
      } else {
        return {
          ...prev,
          condition: (prev.condition || []).filter(c => c !== value)
        };
      }
    });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  // Filter styles based on search term
  const displayedStyles = styleSearch 
    ? filteredStyleOptions.filter(style => 
        style.toLowerCase().includes(styleSearch.toLowerCase()))
    : filteredStyleOptions;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-minimal-white rounded-lg shadow p-6">
      <h2 className="text-xl font-medium text-minimal-gray-900 mb-4">Filter Records</h2>

      {/* Genre */}
      <div>
        <label htmlFor="genre" className="label">
          Genre <span className="text-minimal-accent">*</span>
        </label>
        <div className="mt-1 relative">
          <select
            id="genre"
            name="genre"
            value={filters.genre || ''}
            onChange={handleChange}
            disabled={isLoading}
            className="select"
            required
          >
            <option value="">Select a genre</option>
            {genreOptions.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
          {isLoading && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-8">
              <div className="animate-spin h-4 w-4 border-2 border-minimal-accent border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      </div>

      {/* Style */}
      <div>
        <label htmlFor="style" className="label">Style</label>
        <div className="mt-1 relative">
          <select
            id="style"
            name="style"
            value={filters.style || ''}
            onChange={handleChange}
            disabled={isLoading || !filters.genre}
            className="select"
          >
            <option value="">Any style</option>
            {displayedStyles.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
          {isLoading && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-8">
              <div className="animate-spin h-4 w-4 border-2 border-minimal-accent border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>

        {/* Style search */}
        {allStyleOptions.length > 10 && (
          <div className="mt-2">
            <input
              type="text"
              placeholder="Search styles..."
              value={styleSearch}
              onChange={(e) => setStyleSearch(e.target.value)}
              className="input py-1 text-sm"
            />
          </div>
        )}
      </div>

      {/* Format */}
      <div>
        <label htmlFor="format" className="label">Format</label>
        <select
          id="format"
          name="format"
          value={filters.format || ''}
          onChange={handleChange}
          className="select"
        >
          <option value="">Any format</option>
          {formatOptions.map(format => (
            <option key={format} value={format}>
              {format.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Country */}
      <div>
        <label htmlFor="country" className="label">Country</label>
        <select
          id="country"
          name="country"
          value={filters.country || ''}
          onChange={handleChange}
          className="select"
        >
          <option value="">Any country</option>
          {countryOptions.map(country => (
            <option key={country} value={country}>
              {country.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Year Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="yearMin" className="label">Year (From)</label>
          <input
            type="number"
            id="yearMin"
            name="yearMin"
            value={filters.yearMin || ''}
            onChange={handleNumberChange}
            placeholder="From"
            min="1900"
            max={new Date().getFullYear()}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="yearMax" className="label">Year (To)</label>
          <input
            type="number"
            id="yearMax"
            name="yearMax"
            value={filters.yearMax || ''}
            onChange={handleNumberChange}
            placeholder="To"
            min="1900"
            max={new Date().getFullYear()}
            className="input"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <button 
          type="submit" 
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm font-medium text-white bg-minimal-accent hover:bg-minimal-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-minimal-accent"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Searching...
            </span>
          ) : (
            <span>Discover Records</span>
          )}
        </button>
        <div className="mt-3 text-center text-xs text-minimal-gray-500">
          Each search explores different parts of the Discogs catalog for true discovery
        </div>
      </div>

      {/* Debug info (if in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 border border-minimal-gray-200 rounded text-sm text-minimal-gray-500">
          <div>Total styles: {allStyleOptions.length}</div>
          <div>Filtered styles: {filteredStyleOptions.length}</div>
          <div>Selected genre: {filters.genre || 'None'}</div>
        </div>
      )}
    </form>
  );
};

export default SearchFilters; 