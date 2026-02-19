import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase server client using the public anon key.
 * This client respects RLS and is safe to use in Server Components and Route Handlers.
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            (cookieStore as any).set({ name, value, ...options });
          } catch {
            // set() is not available in Server Components (read-only context).
            // The middleware handles token refresh, so this is safe to ignore.
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            (cookieStore as any).set({ name, value: '', ...options });
          } catch {
            // Same as set — safe to ignore in read-only server contexts.
          }
        },
      },
    }
  );
}
