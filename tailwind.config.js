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
        // Tidal-inspired dark palette
        minimal: {
          black: '#ffffff',      // Pure white text
          white: '#000000',      // Pure black background
          gray: {
            50:  '#0a0a0a',
            100: '#111111',
            200: '#1c1c1c',
            300: '#333333',
            400: '#555555',
            500: '#888888',
            600: '#aaaaaa',
            700: '#cccccc',
            800: '#e0e0e0',
            900: '#f5f5f5',
          },
          accent: '#ffffff',
          'accent-light': '#f0f0f0',
          'accent-dark': '#e0e0e0',
          error: '#ef4444',
          success: '#10b981',
          warning: '#f59e0b',
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
        'picnic': ['var(--font-alliance)', 'sans-serif'],
        'syne': ['var(--font-alliance)', 'sans-serif'],
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
        'xl': '0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out both',
        'fade-in':    'fadeIn 0.3s ease-out both',
      },
    },
  },
  plugins: [],
} 