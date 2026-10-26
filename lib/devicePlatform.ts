export type DevicePlatform = 'android' | 'ios' | 'desktop' | 'other';

/** Pure so it can be tested: the platform a browser reports itself as. */
export function detectPlatform(userAgent: string, maxTouchPoints = 0): DevicePlatform {
  if (/Android/i.test(userAgent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  // iPadOS reports itself as a Mac but has a touch screen.
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios';
  if (/Windows|Macintosh|Linux|CrOS/i.test(userAgent)) return 'desktop';
  return 'other';
}
