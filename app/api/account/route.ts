import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient } from '@/app/utils/supabase';
import { createSupabaseServerClient } from '@/app/utils/supabase-server';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUser() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

// --- GET /api/account ---
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const { data, error } = await adminClient
    .from('user_profiles')
    .select('discogs_username, display_name, leaderboard_opt_in, show_discogs_link, created_at')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Account GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }

  return NextResponse.json({
    email: user.email,
    discogs_username: data?.discogs_username ?? null,
    display_name: data?.display_name ?? null,
    leaderboard_opt_in: data?.leaderboard_opt_in ?? false,
    show_discogs_link: data?.show_discogs_link ?? true,
    created_at: data?.created_at ?? user.created_at,
  });
}

// --- PATCH /api/account ---
const PatchSchema = z.object({
  display_name: z
    .string()
    .min(3, 'Display name must be at least 3 characters')
    .max(30, 'Display name must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Display name may only contain letters, numbers, underscores, and hyphens')
    .nullable()
    .optional(),
  leaderboard_opt_in: z.boolean().optional(),
  show_discogs_link: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const updates: Record<string, unknown> = {};
  if ('display_name' in parsed.data) updates.display_name = parsed.data.display_name;
  if ('leaderboard_opt_in' in parsed.data) updates.leaderboard_opt_in = parsed.data.leaderboard_opt_in;
  if ('show_discogs_link' in parsed.data) updates.show_discogs_link = parsed.data.show_discogs_link;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { error } = await adminClient
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Display name already taken' }, { status: 409 });
    }
    if (error.code === '23514') {
      return NextResponse.json({ error: 'Invalid display name format' }, { status: 422 });
    }
    console.error('Account PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  // Sync leaderboard_opt_in and show_discogs_link into leaderboard_entries if changed.
  const leaderboardUpdates: Record<string, unknown> = {};
  if ('leaderboard_opt_in' in updates) leaderboardUpdates.leaderboard_opt_in = updates.leaderboard_opt_in;
  if ('show_discogs_link' in updates) leaderboardUpdates.show_discogs_link = updates.show_discogs_link;
  if ('display_name' in updates) leaderboardUpdates.display_name = updates.display_name;

  if (Object.keys(leaderboardUpdates).length > 0) {
    await adminClient
      .from('leaderboard_entries')
      .update(leaderboardUpdates)
      .eq('user_id', user.id);
  }

  return NextResponse.json({ success: true });
}

// --- DELETE /api/account ---
const DeleteSchema = z.object({
  confirm: z.literal('delete my account'),
});

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Confirmation text must be exactly: delete my account' },
      { status: 400 }
    );
  }

  const adminClient = getSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  // 1. Read discogs_username (needed for cache delete — no FK to auth.users).
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('discogs_username')
    .eq('id', user.id)
    .single();

  const discogsUsername = profile?.discogs_username ?? null;

  // 2. Delete leaderboard entry.
  await adminClient
    .from('leaderboard_entries')
    .delete()
    .eq('user_id', user.id);

  // 3. Delete collection cache (keyed on discogs_username, not user_id).
  if (discogsUsername) {
    await adminClient
      .from('user_collection_cache')
      .delete()
      .eq('discogs_username', discogsUsername);
  }

  // 4. Delete auth user (cascades to user_profiles via FK).
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('Account DELETE auth error:', deleteError);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
