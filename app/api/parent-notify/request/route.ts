import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  const token = crypto.randomUUID();
  const trimmedEmail = email.trim();

  const { error: updateError } = await supabase
    .from('users')
    .update({
      parent_notify_email: trimmedEmail,
      parent_notify_token: token,
      parent_notify_confirmed_at: null,
    })
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json({ error: 'Could not save that email. Try again.' }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const confirmUrl = `${origin}/api/parent-notify/confirm?token=${token}`;
  const studentName = profile?.username ?? 'Your child';

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'empowermint <no-reply@empowermint.co.za>',
      to: trimmedEmail,
      subject: `${studentName} added you as their study contact on empowermint`,
      html: `
        <p>Hi there,</p>
        <p>${studentName} has added you as their parent contact on empowermint, the Smart Study Planner.</p>
        <p>If you confirm, you'll get a short weekly summary of how their studying is going — a quick overview, not a play-by-play.</p>
        <p><a href="${confirmUrl}">Confirm and start receiving weekly updates</a></p>
        <p>If you weren't expecting this, you can just ignore this email — nothing will be sent unless you confirm.</p>
      `,
    }),
  });

  return NextResponse.json({ ok: true });
}
