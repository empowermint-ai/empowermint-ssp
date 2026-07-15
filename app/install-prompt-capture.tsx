'use client';

import { useEffect } from 'react';
import { captureInstallPrompt, clearInstallPrompt } from '@/lib/installPrompt';

export default function InstallPromptCapture() {
  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      captureInstallPrompt(
        e as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
      );
    }
    function handleAppInstalled() {
      clearInstallPrompt();
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return null;
}
