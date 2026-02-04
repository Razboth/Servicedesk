/**
 * Time-lock utilities for checklist items
 * Times are in Indonesia WITA timezone (UTC+8)
 */

// WITA timezone offset in milliseconds (UTC+8)
const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Get current time in WITA (UTC+8)
 * @returns Date object representing current time in WITA
 */
export function getCurrentTimeWITA(): Date {
  const now = new Date();
  // Get UTC time and add WITA offset
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  return new Date(utcTime + WITA_OFFSET_MS);
}

/**
 * Check if a time-locked item is unlocked
 * @param unlockTime - Time string in "HH:mm" format (e.g., "22:00") in WITA
 * @param currentTime - Current time to check against (defaults to now in WITA)
 * @returns true if unlocked (no lock or past unlock time)
 */
export function isItemUnlocked(
  unlockTime: string | null | undefined,
  currentTime: Date = getCurrentTimeWITA()
): boolean {
  if (!unlockTime) return true; // No lock time = always unlocked

  const [hours, minutes] = unlockTime.split(':').map(Number);

  if (isNaN(hours) || isNaN(minutes)) {
    console.warn(`Invalid unlockTime format: ${unlockTime}`);
    return true; // Invalid format = treat as unlocked
  }

  // Get current time in WITA if not already converted
  const witaTime = currentTime;

  // Create unlock time for today in WITA
  const unlockDate = new Date(witaTime);
  unlockDate.setHours(hours, minutes, 0, 0);

  return witaTime >= unlockDate;
}

/**
 * Get time remaining until unlock
 * @param unlockTime - Time string in "HH:mm" format in WITA
 * @param currentTime - Current time to check against (defaults to WITA)
 * @returns Object with hours, minutes remaining, or null if already unlocked
 */
export function getTimeUntilUnlock(
  unlockTime: string | null | undefined,
  currentTime: Date = getCurrentTimeWITA()
): { hours: number; minutes: number } | null {
  if (!unlockTime || isItemUnlocked(unlockTime, currentTime)) {
    return null;
  }

  const [hours, minutes] = unlockTime.split(':').map(Number);
  const unlockDate = new Date(currentTime);
  unlockDate.setHours(hours, minutes, 0, 0);

  const diffMs = unlockDate.getTime() - currentTime.getTime();
  const diffMinutes = Math.ceil(diffMs / 60000);

  return {
    hours: Math.floor(diffMinutes / 60),
    minutes: diffMinutes % 60,
  };
}

/**
 * Get display message for lock status (Indonesian)
 * @param unlockTime - Time string in "HH:mm" format in WITA
 * @param currentTime - Current time to check against (defaults to WITA)
 * @returns Display message or null if unlocked
 */
export function getLockStatusMessage(
  unlockTime: string | null | undefined,
  currentTime: Date = getCurrentTimeWITA()
): string | null {
  if (!unlockTime || isItemUnlocked(unlockTime, currentTime)) {
    return null;
  }

  const remaining = getTimeUntilUnlock(unlockTime, currentTime);
  if (!remaining) return null;

  if (remaining.hours > 0) {
    return `Tersedia dalam ${remaining.hours} jam ${remaining.minutes} menit (pukul ${unlockTime})`;
  }
  return `Tersedia dalam ${remaining.minutes} menit (pukul ${unlockTime})`;
}

/**
 * Validate unlock time format
 * @param unlockTime - Time string to validate
 * @returns true if valid "HH:mm" format
 */
export function isValidUnlockTime(unlockTime: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(unlockTime)) return false;

  const [hours, minutes] = unlockTime.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/**
 * Format time for display
 * @param unlockTime - Time string in "HH:mm" format
 * @returns Formatted display string
 */
export function formatUnlockTime(unlockTime: string | null | undefined): string {
  if (!unlockTime) return '-';
  return `Pukul ${unlockTime} WITA`;
}
