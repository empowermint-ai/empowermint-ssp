import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
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

    const { data } = await supabase.auth.exchangeCodeForSession(code);
    const user = data.user;

    if (user) {
      const { username, mobile_number } = user.user_metadata as {
        username?: string;
        mobile_number?: string;
      };

      if (username && mobile_number) {
        const { error: profileError } = await supabase.from('users').upsert(
          {
            id: user.id,
            username,
            mobile_number,
            parent_email: user.email,
          },
          { onConflict: 'id' }
        );

        if (profileError) {
          return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent('That mobile number is already in use on another account.')}`
          );
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
