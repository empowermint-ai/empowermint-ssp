import { NextResponse } from 'next/server';
import { isEnabledLocale } from '@/config/locales';
import { loadMessages } from '@/lib/i18n/loadMessages';

// Serves the message bundle for ONE enabled language so the picker can switch
// client-rendered text in place (no server refresh, so a half-filled form or a
// running timer is never remounted). Public text only - nothing user specific.
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('l');
  if (!isEnabledLocale(code)) return NextResponse.json({ error: 'unknown language' }, { status: 400 });
  return NextResponse.json(await loadMessages(code), {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
