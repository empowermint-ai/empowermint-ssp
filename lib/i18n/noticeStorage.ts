// Shared by the two one-time cards on Today's Plan (language + calculator), so the
// calculator card waits until the language card has been dealt with instead of
// stacking two tall cards and pushing the plan off the screen.
import { LANGUAGE_ANNOUNCEMENT, isEnabledLocale } from '@/config/locales';

export const NOTICE_CHANGE_EVENT = 'ssp-notice-change';

export const languageNoticeKey = (codes: string[], kind: 'dismissed' | 'done') =>
  `ssp_lang_notice_${kind}_${codes.join('-')}`;

/** True while the language card is (or will be) showing for this learner. */
export function languageNoticePending(locale: string): boolean {
  const codes = LANGUAGE_ANNOUNCEMENT.codes.filter((c) => isEnabledLocale(c));
  if (codes.filter((c) => c !== locale).length === 0) return false;
  if (Date.now() > new Date(`${LANGUAGE_ANNOUNCEMENT.announcedUntil}T23:59:59`).getTime()) return false;
  try {
    return !(
      localStorage.getItem(languageNoticeKey(codes, 'dismissed')) === '1' ||
      localStorage.getItem(languageNoticeKey(codes, 'done')) === '1'
    );
  } catch {
    return true;
  }
}

export function announceNoticeChange() {
  try {
    window.dispatchEvent(new Event(NOTICE_CHANGE_EVENT));
  } catch {
    // ignore
  }
}
