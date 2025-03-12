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
   # Required for Discogs API OAuth
   DISCOGS_CONSUMER_KEY=your_discogs_api_key
   DISCOGS_CONSUMER_SECRET=your_discogs_api_secret
   
   # Other application settings
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   ```
   
   > **Note**: The variable names must be exactly `DISCOGS_CONSUMER_KEY` and `DISCOGS_CONSUMER_SECRET` for OAuth to work properly.

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

### Deploying to Vercel

When deploying to Vercel, make sure to:

1. Add the required environment variables in your Vercel project settings:
   - `DISCOGS_CONSUMER_KEY`
   - `DISCOGS_CONSUMER_SECRET`

2. Set up your Discogs API application settings:
   - Go to [Discogs Developer Settings](https://www.discogs.com/settings/developers)
   - For your application, set the OAuth callback URL to:
     `https://your-vercel-domain.vercel.app/api/auth/callback`
   - Make sure the callback URL matches exactly to avoid authentication errors 