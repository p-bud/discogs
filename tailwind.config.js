/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Clean, minimal color palette
        minimal: {
          black: '#121212',      // Near black for text
          white: '#ffffff',      // Pure white
          gray: {
            50: '#f9fafb',       // Lightest gray
            100: '#f3f4f6',      // Very light gray
            200: '#e5e7eb',      // Light gray
            300: '#d1d5db',      // Medium light gray
            400: '#9ca3af',      // Medium gray
            500: '#6b7280',      // Medium dark gray
            600: '#4b5563',      // Dark gray
            700: '#374151',      // Very dark gray
            800: '#1f2937',      // Near black
            900: '#111827',      // Darkest gray
          },
          accent: '#4f46e5',     // Indigo accent
          'accent-light': '#818cf8', // Light accent
          'accent-dark': '#3730a3', // Dark accent
          error: '#ef4444',      // Error red
          success: '#10b981',    // Success green
          warning: '#f59e0b',    // Warning yellow
        },
        // Keep existing colors for backward compatibility
        retro: {
          blue: '#9a98e8',       
          'blue-dark': '#6f6ccc', 
          'blue-light': '#b5b3ff', 
          black: '#000000',      
          white: '#f8f8f8',      
          green: '#4ade80',      
          'green-dark': '#22c55e',
          yellow: '#f5d76e',     
          orange: '#f7a35c',     
        },
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
      },
      fontFamily: {
        'sans': ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'mono': ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        'pixel': ['VT323', 'Courier New', 'monospace'],
        // Add your custom font here when ready, using the variable name
        'picnic': ['var(--font-picnic)', 'sans-serif'],
      },
      borderRadius: {
        'sm': '0.125rem',
        DEFAULT: '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
} 