import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdminClient';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${origin}/parent-unsubscribed?status=invalid`);
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('users')
    .update({
      parent_notify_email: null,
      parent_notify_confirmed_at: null,
      parent_notify_token: null,
    })
    .eq('parent_notify_token', token)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.redirect(`${origin}/parent-unsubscribed?status=invalid`);
  }

  return NextResponse.redirect(`${origin}/parent-unsubscribed?status=ok`);
}
