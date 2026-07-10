import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdminClient';
import { normalizeMobileNumber } from '@/lib/normalizeMobileNumber';

export async function POST(request: Request) {
  const { mobile_number } = await request.json();

  if (!mobile_number || typeof mobile_number !== 'string') {
    return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('users')
    .select('parent_email')
    .eq('mobile_number', normalizeMobileNumber(mobile_number))
    .maybeSingle();

  if (error || !data || !data.parent_email) {
    return NextResponse.json(
      { error: 'No account found with that mobile number' },
      { status: 404 }
    );
  }

  return NextResponse.json({ email: data.parent_email });
}
