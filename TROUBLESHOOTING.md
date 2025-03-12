# Troubleshooting Discogs Authentication and Search Issues

If you're experiencing authentication or search issues with your Discogs Bargain Finder application on Vercel, follow these steps to resolve them.

## Common Issues and Solutions

### 1. "Failed to start login process" Error

This occurs when the OAuth authentication process can't start due to missing or incorrect API credentials.

**Solution:**

1. Go to your [Vercel Project Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add or update these environment variables:
   ```
   DISCOGS_CONSUMER_KEY=your_discogs_api_key
   DISCOGS_CONSUMER_SECRET=your_discogs_api_secret
   ```
5. Make sure to use exact variable names: `DISCOGS_CONSUMER_KEY` and `DISCOGS_CONSUMER_SECRET` (not API_KEY or API_SECRET)
6. Deploy your application again to apply the changes

### 2. "Authentication failed (401)" Error During Search 

This occurs when search requests to Discogs API fail due to invalid authentication credentials.

**Solution:**

1. Verify your Discogs API credentials are correct:
   - Log in to your [Discogs Developer Settings](https://www.discogs.com/settings/developers)
   - Check that your Consumer Key and Consumer Secret match the values in your Vercel environment variables
   
2. Update your Discogs Application settings:
   - Ensure your Callback URL is set to: `https://your-vercel-domain.vercel.app/api/auth/callback`
   - Replace "your-vercel-domain" with your actual Vercel domain

3. If using a personal token instead of OAuth:
   - Go to [Discogs Developer Settings](https://www.discogs.com/settings/developers)
   - Generate a new personal access token
   - Add it as `DISCOGS_CONSUMER_KEY` in your Vercel environment variables

### 3. "Invalid character in header content" Error

This error occurs when there are special characters in the Authorization header that aren't properly encoded.

**Solution:**
- This issue should be fixed in the current codebase
- If it persists, verify that your API key and secret don't contain unusual characters
- You can try generating new API credentials in Discogs Developer Settings

## Verifying Your Setup

After making any changes, verify your setup:

1. **Test Authentication:** Try logging in with the "Connect with Discogs" button
2. **Test Basic Search:** Try a simple search with just a genre (e.g., "Rock")
3. **Check Browser Console:** Open your browser's developer tools (F12) and look for errors in the Console tab
4. **Check Vercel Logs:** Go to your Vercel project dashboard and check the Function Logs for any error messages

## Still Having Issues?

If you continue to experience issues:

1. **Enable Debug Logging:**
   - Add `DEBUG_OAUTH=true` to your Vercel environment variables
   - This will provide more detailed logging of the OAuth process

2. **Try Alternative Authentication Method:**
   - The application will automatically fall back to personal token authentication if OAuth fails
   - Make sure your `DISCOGS_CONSUMER_KEY` is set correctly

3. **Contact Discogs API Support:**
   - If you believe there's an issue with the Discogs API itself, contact their support
   - Check [Discogs API Status](https://status.discogs.com/) for any ongoing issues 