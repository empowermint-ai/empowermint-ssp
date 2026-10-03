'use client';

import { supabase } from '@/lib/supabaseClient';
import { logActivity } from '@/lib/logActivity';
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_SRC_COOKIE,
  isEnabledLocale,
} from '@/config/locales';

export type LanguageSource = 'welcome' | 'login' | 'settings' | 'link' | 'notice';

const EXPLICIT_KEY = 'ssp_lang_explicit';
const PENDING_KEY = 'ssp_lang_pending';
const SYNCED_KEY = 'ssp_lang_synced';
const NO_COLUMN_KEY = 'ssp_lang_nocolumn';

function safeStorage(kind: 'session' | 'local'): Storage | null {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function setLocaleCookie(code: string) {
  document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

export function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/** An explicit choice made in this browser session always beats the saved profile language. */
export function markExplicitChoice() {
  safeStorage('session')?.setItem(EXPLICIT_KEY, '1');
}

export function hasExplicitChoice(): boolean {
  return safeStorage('session')?.getItem(EXPLICIT_KEY) === '1';
}

// PostgREST reports a column that does not exist yet (migration not applied) as
// 42703 or PGRST204. That is not a failure worth retrying - the cookie carries
// the choice until the column exists.
function isMissingColumn(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /preferred_language/i.test(error.message ?? '')
  );
}

// Once the database has told us the column does not exist, stop asking for the
// rest of this browser session (keeps the console quiet until the migration runs).
function columnKnownMissing(): boolean {
  return safeStorage('session')?.getItem(NO_COLUMN_KEY) === '1';
}

async function currentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * Save the language to the learner's profile in the background. Never throws,
 * never blocks the UI. Network failures are remembered and retried next load.
 */
export async function persistPreferredLanguage(
  code: string,
  log?: { from: string; source: LanguageSource }
): Promise<void> {
  const local = safeStorage('local');
  try {
    const userId = await currentUserId();
    if (!userId) return;

    if (!columnKnownMissing()) {
      const { error } = await supabase
        .from('users')
        .update({ preferred_language: code })
        .eq('id', userId);

      if (error && isMissingColumn(error)) {
        safeStorage('session')?.setItem(NO_COLUMN_KEY, '1');
        local?.removeItem(PENDING_KEY);
      } else if (error) {
        local?.setItem(PENDING_KEY, code);
      } else {
        local?.removeItem(PENDING_KEY);
      }
    }

    if (log) {
      void logActivity(userId, 'language_changed', {
        from: log.from,
        to: code,
        source: log.source,
      });
    }
  } catch {
    local?.setItem(PENDING_KEY, code);
  }
}

export async function readSavedLanguage(): Promise<string | null> {
  try {
    if (columnKnownMissing()) return null;
    const userId = await currentUserId();
    if (!userId) return null;
    const { data, error } = await supabase
      .from('users')
      .select('preferred_language')
      .eq('id', userId)
      .maybeSingle();
    if (error && isMissingColumn(error)) safeStorage('session')?.setItem(NO_COLUMN_KEY, '1');
    if (error || !data) return null;
    const value = (data as { preferred_language?: string }).preferred_language;
    return isEnabledLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export function takePendingLanguage(): string | null {
  const local = safeStorage('local');
  const pending = local?.getItem(PENDING_KEY) ?? null;
  return isEnabledLocale(pending) ? pending : null;
}

/** The language the learner was on before following a ?lang= link, or null. Does not consume the marker. */
export function peekLinkMarker(): string | null {
  const marker = readCookie(LOCALE_SRC_COOKIE);
  return marker && marker.startsWith('link.') ? marker.slice(5) : null;
}

export function clearLinkMarker() {
  clearCookie(LOCALE_SRC_COOKIE);
}

export function wasSyncedThisSession(): boolean {
  return safeStorage('session')?.getItem(SYNCED_KEY) === '1';
}

export function markSyncedThisSession() {
  safeStorage('session')?.setItem(SYNCED_KEY, '1');
}

/**
 * Called right after a successful login, before navigating. The saved profile
 * language wins (so a learner's choice follows them to a new phone) unless they
 * made an explicit choice in this session, in which case that choice is saved
 * instead. Returns true when the cookie changed and a refresh is needed.
 */
export async function syncLanguageAfterLogin(currentLocale: string): Promise<boolean> {
  markSyncedThisSession();
  if (hasExplicitChoice()) {
    await persistPreferredLanguage(currentLocale);
    return false;
  }
  const saved = await readSavedLanguage();
  if (saved && saved !== currentLocale) {
    setLocaleCookie(saved);
    return true;
  }
  return false;
}
