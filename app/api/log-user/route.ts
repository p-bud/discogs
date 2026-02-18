import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient, missingSupabaseVars } from '@/app/utils/supabase';
import { headers } from 'next/headers';

const LogUserSchema = z.object({
  username: z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/, 'Invalid username'),
  collectionSize: z.number().int().min(0).max(1_000_000).nullable().optional(),
});

export async function POST(request: Request) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const missing = missingSupabaseVars();
    return NextResponse.json(
      { error: 'Supabase is not configured — user logging is disabled.', missing },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = LogUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { username, collectionSize } = parsed.data;

  try {
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || '';
    const ip = headersList.get('x-forwarded-for') || '';

    const { error } = await supabase.from('user_logs').insert([
      { username, collection_size: collectionSize ?? null, ip, user_agent: userAgent },
    ]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging user:', error);
    return NextResponse.json({ success: false, error: 'Failed to log user' }, { status: 500 });
  }
}
