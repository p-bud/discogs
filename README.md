# Discogs Explorer

A web application that helps vinyl collectors explore the Discogs database, analyze their collections, and discover rare records.

## Features

- **Search & Filter**: Find records by genre, artist, album, year range, condition, and more
- **Rarity Analysis**: Discover how rare records are based on want/have ratios
- **Collection Analysis**: Analyze your Discogs collection to find your rarest items
- **Watchlist**: Save search criteria to track specific records or artists
- **Genre & Style Explorer**: Browse through Discogs' extensive genre and style hierarchies

## Tech Stack

- **Frontend**: React.js, Next.js, Tailwind CSS
- **Backend**: Next.js API routes
- **API**: Discogs API integration

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```
3. Configure environment variables:
   Create a `.env.local` file with the following variables:
   ```
   DISCOGS_API_KEY=your_api_key
   DISCOGS_API_SECRET=your_api_secret
   ```
4. Run the development server:
   ```
   npm run dev
   ```
   or
   ```
   yarn dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) to view the application

## License

MIT 