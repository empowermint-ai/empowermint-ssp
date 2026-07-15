'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export function captureInstallPrompt(event: BeforeInstallPromptEvent) {
  deferredPrompt = event;
  listeners.forEach((fn) => fn());
}

export function clearInstallPrompt() {
  deferredPrompt = null;
  listeners.forEach((fn) => fn());
}

export function getInstallPrompt() {
  return deferredPrompt;
}

export function subscribeInstallPrompt(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export function useInstallPromptState() {
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    setCanInstall(getInstallPrompt() !== null);
    setIsIOS(isIOSDevice());
    setIsStandalone(isStandaloneDisplay());

    return subscribeInstallPrompt(() => {
      setCanInstall(getInstallPrompt() !== null);
    });
  }, []);

  async function promptInstall() {
    const prompt = getInstallPrompt();
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    clearInstallPrompt();
  }

  return { canInstall, isIOS, isStandalone, promptInstall };
}
