import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { isValidHour, isValidTimezone } from '@/lib/push/schedule';

// GET: the learner's reminder settings. POST: change the time, or turn reminders off.
export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { data } = await supabase
    .from('users')
    .select('push_enabled, push_hour')
    .eq('id', user.id)
    .maybeSingle();
  return NextResponse.json({ enabled: data?.push_enabled ?? false, hour: data?.push_hour ?? 14 });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const update: Record<string, unknown> = {};

  if (body?.enabled === false) {
    update.push_enabled = false;
    await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
  }
  if (body?.hour !== undefined) {
    if (!isValidHour(body.hour) || !isValidTimezone(body.timezone)) {
      return NextResponse.json({ error: 'Invalid time.' }, { status: 400 });
    }
    update.push_hour = body.hour;
    update.push_timezone = body.timezone;
    // A changed time should take effect today if it is still ahead of us.
    update.push_last_sent_on = null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });
  }

  const { error } = await supabase.from('users').update(update).eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
