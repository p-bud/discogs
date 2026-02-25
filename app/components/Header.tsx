'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LoginButton from './LoginButton';

const Header: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();

  // This useEffect ensures the component knows it's being rendered client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  const linkClass = (href: string) =>
    'block py-2 px-3 rounded transition-colors duration-200 ' +
    (pathname === href || (href !== '/' && pathname.startsWith(href))
      ? 'text-minimal-accent font-medium bg-minimal-gray-50'
      : 'text-minimal-gray-700 hover:text-minimal-accent hover:bg-minimal-gray-50');

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-minimal-gray-100 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 flex flex-col items-center sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-picnic text-minimal-black m-0">
              <Link href="/" className="hover:text-minimal-accent transition-colors duration-200">
                Raerz
              </Link>
            </h1>
          </div>

          {isClient && (
            <div className="mt-4 sm:mt-0">
              <LoginButton className="w-full sm:w-auto" />
            </div>
          )}
        </div>

        <nav className="pb-3">
          <ul className="flex space-x-1 md:space-x-6 justify-center sm:justify-start overflow-x-auto">
            <li>
              <Link href="/collection" className={linkClass('/collection')}>
                Collection Analyzer
              </Link>
            </li>
            <li>
              <Link href="/leaderboard" className={linkClass('/leaderboard')}>
                Leaderboard
              </Link>
            </li>
            <li>
              <Link href="/wrapped" className={linkClass('/wrapped')}>
                Wrapped
              </Link>
            </li>
            <li>
              <Link href="/about" className={linkClass('/about')}>
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