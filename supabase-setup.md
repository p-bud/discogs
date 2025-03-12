# Supabase Logging Setup Instructions

## 1. Environment Variables

Add these details to your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
```

Replace the placeholder values with your actual Supabase credentials from your project dashboard:
- Go to https://app.supabase.com/ and select your project
- Go to Project Settings → API
- Copy the "Project URL" for NEXT_PUBLIC_SUPABASE_URL
- Copy the "service_role" key (not the anon key) for SUPABASE_SERVICE_ROLE_KEY

## 2. Database Table Setup

Create a 'user_logs' table in your Supabase database:

1. Go to the SQL editor in your Supabase dashboard
2. Create a new query and paste the following SQL:

```sql
CREATE TABLE user_logs (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  collection_size INTEGER,
  ip TEXT,
  user_agent TEXT
);
```

3. Run the query to create the table

## 3. Test the Setup

After setting up:

1. Restart your Next.js development server:
   ```
   npm run dev
   ```

2. Test logging by submitting a username in the collection analyzer
3. Check the Supabase dashboard → Table editor → user_logs to verify data is being logged 