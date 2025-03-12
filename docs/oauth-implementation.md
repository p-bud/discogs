# Discogs OAuth Implementation Guide

This document explains the simplified OAuth 1.0a implementation used in the Discogs Bargain Finder application.

## Overview

The authentication system uses OAuth 1.0a to connect with Discogs API. The implementation is designed to be:

- **Robust**: Handles various edge cases and errors gracefully
- **Simple**: Minimizes state management complexity
- **Secure**: Uses HTTP-only cookies for storing sensitive tokens
- **User-friendly**: Provides clear feedback about authentication state

## Authentication Flow

1. **Initiate Authentication**: User clicks "Connect with Discogs" button
2. **Request Token**: Backend requests a temporary OAuth token from Discogs
3. **User Authorization**: User is redirected to Discogs to authorize the application
4. **Callback Processing**: Discogs redirects back with a verifier token
5. **Access Token**: Backend exchanges the verifier for permanent access tokens
6. **Token Storage**: Tokens are securely stored in HTTP-only cookies
7. **Authentication Status**: Frontend periodically checks authentication status

## Implementation Details

### Backend Components

1. **auth/route.ts**: Initiates the OAuth flow by requesting a token from Discogs
2. **auth/callback/route.ts**: Processes the callback from Discogs and stores tokens
3. **auth/status/route.ts**: Checks if the user is authenticated based on cookie presence
4. **auth/logout/route.ts**: Removes authentication cookies to log the user out
5. **utils/auth.ts**: Contains the OAuth signature generation implementation

### Frontend Components

1. **LoginButton.tsx**: Button component that handles login/logout actions
2. **discogs-client.ts**: Client-side utilities for interacting with authentication APIs

### Cookie Management

The application uses three key cookies:

- `discogs_oauth_token`: The OAuth access token (HTTP-only)
- `discogs_oauth_token_secret`: The OAuth token secret (HTTP-only)

These are stored as HTTP-only cookies for security reasons. The frontend cannot directly read these cookies but can check authentication status through the API.

### API Endpoints

1. **GET /api/auth**: Initiates the OAuth flow
2. **GET /api/auth/callback**: Processes the callback from Discogs
3. **GET /api/auth/status**: Checks if the user is authenticated
4. **POST /api/auth/logout**: Logs the user out

## Authentication State Management

The frontend LoginButton component:

1. Checks authentication status on load and periodically
2. Updates its state based on the server response
3. Handles login/logout actions appropriately

## Security Considerations

1. OAuth tokens are stored in HTTP-only cookies to prevent XSS attacks
2. API credentials (consumer key and secret) are only used server-side
3. Proper OAuth signature generation for all Discogs API requests

## Troubleshooting

If you encounter authentication issues:

1. Clear cookies in the browser
2. Restart the development server
3. Check the server logs for any error messages
4. Verify that the Discogs API is operational

## API Credentials

The application uses the following Discogs API credentials:

- Consumer Key: `gNzKxthQDOyjiCBynacq`
- Consumer Secret: [Stored securely in the code]

These credentials are used to authenticate with the Discogs API.

---

*Note: This OAuth implementation is customized for the Discogs Bargain Finder application and should not be used as a general-purpose OAuth library.* 