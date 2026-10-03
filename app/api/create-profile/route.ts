import { NextResponse } from 'next/server';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { createSupabaseAdminClient } from '@/lib/supabaseAdminClient';
import { isEnabledLocale } from '@/config/locales';

export async function POST(request: Request) {
  const {
    id,
    username,
    mobile_number,
    parent_email,
    institution,
    grade,
    student_type,
    preferred_language,
  } = await request.json();

  if (!id || !username || !mobile_number || !parent_email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const country = parsePhoneNumberFromString(mobile_number)?.country ?? null;

  const { error } = await supabase
    .from('users')
    .upsert(
      {
        id,
        username,
        mobile_number,
        parent_email,
        institution: institution || null,
        grade: grade || null,
        student_type: student_type || null,
        country,
      },
      { onConflict: 'id' }
    );

  if (error) {
    // Roll back the orphaned auth account so the same details can be retried cleanly
    await supabase.auth.admin.deleteUser(id);
    return NextResponse.json(
      { error: 'That mobile number is already registered to another account.' },
      { status: 409 }
    );
  }

  // Best-effort: remember the language chosen during sign-up. This is a
  // separate call (not part of the upsert above) so that if the
  // preferred_language column has not been added yet, sign-up still succeeds.
  if (isEnabledLocale(preferred_language)) {
    await supabase.from('users').update({ preferred_language }).eq('id', id);
  }

  return NextResponse.json({ ok: true });
}
