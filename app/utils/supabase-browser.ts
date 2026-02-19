import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client using the public anon key.
 * Safe to use in Client Components — never leaks service-role credentials.
 * A singleton is created once per browser tab (module-level cache).
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
