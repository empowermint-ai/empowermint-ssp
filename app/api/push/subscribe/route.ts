import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { isValidHour, isValidTimezone } from '@/lib/push/schedule';

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const endpoint = body?.subscription?.endpoint;
  const p256dh = body?.subscription?.keys?.p256dh;
  const auth = body?.subscription?.keys?.auth;
  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 });
  }
  if (!isValidHour(body.hour) || !isValidTimezone(body.timezone)) {
    return NextResponse.json({ error: 'Invalid time.' }, { status: 400 });
  }

  const { error: subError } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: user.id, endpoint, p256dh, auth }, { onConflict: 'endpoint' });
  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 });

  const { error: userError } = await supabase
    .from('users')
    .update({ push_enabled: true, push_hour: body.hour, push_timezone: body.timezone, push_last_sent_on: null })
    .eq('id', user.id);
  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
