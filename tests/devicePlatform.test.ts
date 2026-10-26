import { describe, expect, it } from 'vitest';
import { detectPlatform } from '@/lib/devicePlatform';

describe('detectPlatform', () => {
  it('recognises Android phones', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36')).toBe('android');
  });
  it('recognises iPhones', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148')).toBe('ios');
  });
  it('recognises iPads that pose as Macs', () => {
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 5)).toBe('ios');
  });
  it('treats laptops as desktop', () => {
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 0)).toBe('desktop');
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126')).toBe('desktop');
  });
  it('falls back to other', () => {
    expect(detectPlatform('SomeBot/1.0')).toBe('other');
  });
});
