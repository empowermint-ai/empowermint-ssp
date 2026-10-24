'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getLocaleConfig } from '@/config/locales';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import LanguageSheet from '@/components/i18n/LanguageSheet';
import { supabase } from '@/lib/supabaseClient';
import { useInstallPromptState } from '@/lib/installPrompt';
import InstallInstructionsModal from '@/components/InstallInstructionsModal';
import ReminderSheet from '@/components/push/ReminderSheet';

// Same line style as the bottom-nav icons (24px grid, 1.8 stroke, round joins).
function GearIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(1.2 1.2) scale(0.9)"
      />
    </svg>
  );
}

export default function SettingsMenu() {
  const router = useRouter();
  const t = useTranslations('settings');
  const { locale, enabled } = useLanguage();
  const [open, setOpen] = useState(false);
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showReminderSheet, setShowReminderSheet] = useState(false);
  const tPush = useTranslations('push');
  const { canInstall, isIOS, isStandalone, promptInstall } = useInstallPromptState();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  async function handleInstallClick() {
    setOpen(false);
    if (canInstall) {
      await promptInstall();
    } else {
      setShowInstallModal(true);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t('aria')}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="-m-[7px] flex h-[44px] w-[44px] items-center justify-center text-text-primary"
      >
        <GearIcon />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className={`neu-raised absolute end-0 top-full mt-2 z-20 rounded-neu-sm overflow-hidden ${enabled.length > 1 ? 'min-w-[200px]' : 'min-w-[160px]'}`}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push('/subjects/manage');
              }}
              className="w-full text-start font-body text-[13px] text-text-primary px-4 py-3 border-b border-card-border"
            >
              {t('manage')}
            </button>
            {enabled.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setShowLanguageSheet(true);
                }}
                className="w-full flex items-center justify-between gap-3 text-start font-body text-[13px] text-text-primary px-4 py-3 border-b border-card-border"
              >
                <span>{t('language')}</span>
                <span lang={locale} className="font-bold text-text-muted">
                  {getLocaleConfig(locale).nativeName}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setShowReminderSheet(true);
              }}
              className="w-full text-start font-body text-[13px] text-text-primary px-4 py-3 border-b border-card-border"
            >
              {tPush('menuLabel')}
            </button>
            {!isStandalone && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full text-start font-body text-[13px] text-text-primary px-4 py-3 border-b border-card-border"
              >
                {t('addToHome')}
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-start font-body text-[13px] text-text-primary px-4 py-3"
            >
              {t('logout')}
            </button>
          </div>
        </>
      )}

      {showLanguageSheet && (
        <LanguageSheet source="settings" onClose={() => setShowLanguageSheet(false)} />
      )}

      {showReminderSheet && <ReminderSheet onClose={() => setShowReminderSheet(false)} />}

      {showInstallModal && (
        <InstallInstructionsModal isIOS={isIOS} onClose={() => setShowInstallModal(false)} />
      )}
    </div>
  );
}
