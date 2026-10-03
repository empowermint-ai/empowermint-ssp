import { NextResponse } from 'next/server';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_SRC_COOKIE,
  isEnabledLocale,
  pickFromAcceptLanguage,
} from '@/config/locales';

// Handles the ?lang=xx deep link (e.g. https://plan.empowermint.co.za/?lang=af).
// The welcome page forwards here; we set the cookie, leave a short-lived marker
// so the client can save the choice to the profile and show a toast once, then
// redirect to the same page WITHOUT the parameter. Only same-site paths are
// allowed as the redirect target.
export function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get('lang');
  const nextParam = url.searchParams.get('next') ?? '/';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  const response = NextResponse.redirect(new URL(next, url.origin));

  if (isEnabledLocale(requested)) {
    const cookieHeader = request.headers.get('cookie') ?? '';
    const previousCookie = cookieHeader
      .split('; ')
      .find((c) => c.startsWith(`${LOCALE_COOKIE}=`))
      ?.split('=')[1];
    const previous = isEnabledLocale(previousCookie)
      ? previousCookie
      : (pickFromAcceptLanguage(request.headers.get('accept-language')) ?? DEFAULT_LOCALE);

    response.cookies.set(LOCALE_COOKIE, requested, {
      path: '/',
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
    response.cookies.set(LOCALE_SRC_COOKIE, `link.${previous}`, {
      path: '/',
      maxAge: 120,
      sameSite: 'lax',
    });
  }

  return response;
}
