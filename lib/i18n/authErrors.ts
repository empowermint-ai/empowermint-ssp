'use client';

import { useTranslations } from 'next-intl';

// The auth provider returns English error text. We never change that backend
// response - we only recognise known messages and show our own translated
// wording, falling back to the original text for anything unrecognised.
const RULES: [RegExp, string][] = [
  [/invalid login credentials/i, 'invalidCredentials'],
  [/already (been )?registered|already exists/i, 'alreadyRegistered'],
  [/rate limit|too many requests|only request this after/i, 'rateLimited'],
  [/password should be at least/i, 'passwordShort'],
  [/different from the old password/i, 'samePassword'],
  [/unable to validate email|invalid format|valid email/i, 'invalidEmail'],
  [/email not confirmed/i, 'emailNotConfirmed'],
  [/failed to fetch|network|load failed/i, 'network'],
];

export function useAuthError(): (message: string | null | undefined) => string | null {
  const t = useTranslations('errors.auth');
  return (message) => {
    if (!message) return null;
    const rule = RULES.find(([pattern]) => pattern.test(message));
    return rule ? t(rule[1]) : message;
  };
}
