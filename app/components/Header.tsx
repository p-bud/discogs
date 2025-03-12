'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import LoginButton from './LoginButton';

const Header: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  // This useEffect ensures the component knows it's being rendered client-side
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return (
    <header className="mb-6 bg-minimal-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 flex flex-col items-center sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-picnic text-minimal-black m-0">
              Rares
            </h1>
            <p className="text-minimal-gray-500 text-sm">
              Discover rare vinyl records
            </p>
          </div>
          
          {isClient && (
            <div className="mt-4 sm:mt-0">
              <LoginButton className="w-full sm:w-auto" />
            </div>
          )}
        </div>
        
        <nav className="pb-3 border-b border-minimal-gray-200">
          <ul className="flex space-x-1 md:space-x-6 justify-center sm:justify-start overflow-x-auto">
            <li>
              <Link href="/" className="block py-2 px-3 text-minimal-gray-700 hover:text-minimal-accent hover:bg-minimal-gray-50 rounded transition-colors duration-200">
                Rare Record Finder
              </Link>
            </li>
            <li>
              <Link href="/collection" className="block py-2 px-3 text-minimal-gray-700 hover:text-minimal-accent hover:bg-minimal-gray-50 rounded transition-colors duration-200">
                Collection Analyzer
              </Link>
            </li>
            <li>
              <Link href="/about" className="block py-2 px-3 text-minimal-gray-700 hover:text-minimal-accent hover:bg-minimal-gray-50 rounded transition-colors duration-200">
                About
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header; 