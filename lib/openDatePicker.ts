import type { MouseEvent } from 'react';

/**
 * The "+ Add date" buttons are a transparent date input laid over a label. On phones a
 * tap opens the native picker by itself, but desktop browsers only open it from the
 * tiny calendar icon, so a click on the label did nothing. Opening it explicitly makes
 * a click work everywhere; where showPicker() is missing or refused, the default
 * behaviour is untouched.
 */
export function openDatePicker(event: MouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker?.();
  } catch {
    // Not allowed right now (for example the picker is already open): ignore.
  }
}
