'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { detectPlatform } from '@/lib/devicePlatform';
import { isStandaloneDisplay } from '@/lib/installPrompt';

const STORAGE_KEY = 'ssp_device_recorded';

/** Quietly notes the learner's phone type (Android / iPhone) at most once a day per device. */
export default function DeviceRecorder({ userId }: { userId: string }) {
  useEffect(() => {
    const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
    const installed = isStandaloneDisplay();
    const today = new Date().toISOString().slice(0, 10);
    const signature = `${userId}:${platform}:${installed}:${today}`;
    try {
      if (localStorage.getItem(STORAGE_KEY) === signature) return;
    } catch {
      // storage blocked: just record it
    }
    supabase
      .from('users')
      .update({ device_platform: platform, device_installed: installed, device_seen_at: new Date().toISOString() })
      .eq('id', userId)
      .then(({ error }) => {
        if (error) return; // column not there yet, or offline: try again next visit
        try {
          localStorage.setItem(STORAGE_KEY, signature);
        } catch {
          // ignore
        }
      });
  }, [userId]);

  return null;
}
