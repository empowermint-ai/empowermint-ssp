import { NextResponse } from 'next/server';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { createSupabaseAdminClient } from '@/lib/supabaseAdminClient';

export async function POST(request: Request) {
  const { id, username, mobile_number, parent_email, institution } = await request.json();

  if (!id || !username || !mobile_number || !parent_email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const country = parsePhoneNumberFromString(mobile_number)?.country ?? null;

  const { error } = await supabase
    .from('users')
    .upsert(
      { id, username, mobile_number, parent_email, institution: institution || null, country },
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

  return NextResponse.json({ ok: true });
}
