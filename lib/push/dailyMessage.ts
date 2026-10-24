import { createTranslator } from 'next-intl';
import { getDir } from '@/config/locales';
import { loadMessages } from '@/lib/i18n/loadMessages';
import { presetSubjectId } from '@/lib/i18n/subjects';

const TITLE_KEYS = ['title1', 'title2', 'title3'] as const;
const SESSION_MINUTES = 25;
const MAX_SUBJECTS_SHOWN = 3;

export interface DailyMessageInput {
  locale: string;
  /** Subject names in plan order, one entry per session. */
  subjectNames: string[];
  /** Days until the nearest upcoming exam, with its subject. */
  nextExam: { subjectName: string; daysUntil: number } | null;
  /** Rotates the headline day to day. */
  dayNumber: number;
}

export async function buildDailyMessage(input: DailyMessageInput) {
  const messages = await loadMessages(input.locale);
  type Translate = ((key: string, values?: Record<string, string | number>) => string) & {
    has: (key: string) => boolean;
  };
  const t = createTranslator({ locale: input.locale, messages, namespace: 'push' }) as unknown as Translate;
  const presets = createTranslator({ locale: input.locale, messages, namespace: 'presets' }) as unknown as Translate;

  const label = (stored: string) => {
    const id = presetSubjectId(stored);
    return id && presets.has(id) ? presets(id) : stored;
  };

  const unique = Array.from(new Set(input.subjectNames.map(label)));
  const shown = unique.slice(0, MAX_SUBJECTS_SHOWN);
  const separator = input.locale === 'ar' ? '، ' : ', ';
  const subjects = shown.join(separator) + (unique.length > shown.length ? ` +${unique.length - shown.length}` : '');

  const count = input.subjectNames.length;
  let body = t('bodyPlan', { count, minutes: count * SESSION_MINUTES, subjects });
  if (input.nextExam) {
    body += ` ${t('examLine', { subject: label(input.nextExam.subjectName), days: input.nextExam.daysUntil })}`;
  }

  return {
    title: t(TITLE_KEYS[input.dayNumber % TITLE_KEYS.length]),
    body,
    actionTitle: t('actionOpen'),
    lang: input.locale,
    dir: getDir(input.locale),
    url: '/dashboard',
  };
}
