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
 * @param isNightChecklist - If true, handles night shift time logic (22:00-06:00 spans two days)
 * @returns true if unlocked (no lock or past unlock time)
 */
export function isItemUnlocked(
  unlockTime: string | null | undefined,
  currentTime: Date = getCurrentTimeWITA(),
  isNightChecklist: boolean = false
): boolean {
  if (!unlockTime) return true; // No lock time = always unlocked

  const [hours, minutes] = unlockTime.split(':').map(Number);

  if (isNaN(hours) || isNaN(minutes)) {
    console.warn(`Invalid unlockTime format: ${unlockTime}`);
    return true; // Invalid format = treat as unlocked
  }

  // Get current time in WITA if not already converted
  const witaTime = currentTime;
  const currentHour = witaTime.getHours();

  // Create unlock time
  const unlockDate = new Date(witaTime);
  unlockDate.setHours(hours, minutes, 0, 0);

  // For night checklists, handle midnight crossover
  // Night shift: 20:00 - 08:00 (spans two calendar days)
  if (isNightChecklist) {
    const isEveningSlot = hours >= 20; // 20:00, 22:00
    const isEarlyMorningNow = currentHour >= 0 && currentHour < 8; // 00:00-07:59

    // If we're in early morning (00:00-07:59) and the slot is evening (20:00+),
    // that slot was from YESTERDAY and should already be unlocked
    if (isEarlyMorningNow && isEveningSlot) {
      // The 22:00 slot was unlocked yesterday at 22:00, so it's definitely unlocked now
      return true;
    }
  }

  return witaTime >= unlockDate;
}

/**
 * Get time remaining until unlock
 * @param unlockTime - Time string in "HH:mm" format in WITA
 * @param currentTime - Current time to check against (defaults to WITA)
 * @param isNightChecklist - If true, handles night shift time logic
 * @returns Object with hours, minutes remaining, or null if already unlocked
 */
export function getTimeUntilUnlock(
  unlockTime: string | null | undefined,
  currentTime: Date = getCurrentTimeWITA(),
  isNightChecklist: boolean = false
): { hours: number; minutes: number } | null {
  if (!unlockTime || isItemUnlocked(unlockTime, currentTime, isNightChecklist)) {
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
 * @param isNightChecklist - If true, handles night shift time logic
 * @returns Display message or null if unlocked
 */
export function getLockStatusMessage(
  unlockTime: string | null | undefined,
  currentTime: Date = getCurrentTimeWITA(),
  isNightChecklist: boolean = false
): string | null {
  if (!unlockTime || isItemUnlocked(unlockTime, currentTime, isNightChecklist)) {
    return null;
  }

  const remaining = getTimeUntilUnlock(unlockTime, currentTime, isNightChecklist);
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
