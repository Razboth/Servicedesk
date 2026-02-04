/**
 * Time-lock utilities for checklist items
 * Times are in Indonesia WIB timezone (UTC+7)
 */

/**
 * Check if a time-locked item is unlocked
 * @param unlockTime - Time string in "HH:mm" format (e.g., "22:00")
 * @param currentTime - Current time to check against (defaults to now)
 * @returns true if unlocked (no lock or past unlock time)
 */
export function isItemUnlocked(
  unlockTime: string | null | undefined,
  currentTime: Date = new Date()
): boolean {
  if (!unlockTime) return true; // No lock time = always unlocked

  const [hours, minutes] = unlockTime.split(':').map(Number);

  if (isNaN(hours) || isNaN(minutes)) {
    console.warn(`Invalid unlockTime format: ${unlockTime}`);
    return true; // Invalid format = treat as unlocked
  }

  // Create unlock time for today
  const unlockDate = new Date(currentTime);
  unlockDate.setHours(hours, minutes, 0, 0);

  return currentTime >= unlockDate;
}

/**
 * Get time remaining until unlock
 * @param unlockTime - Time string in "HH:mm" format
 * @param currentTime - Current time to check against
 * @returns Object with hours, minutes remaining, or null if already unlocked
 */
export function getTimeUntilUnlock(
  unlockTime: string | null | undefined,
  currentTime: Date = new Date()
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
 * @param unlockTime - Time string in "HH:mm" format
 * @param currentTime - Current time to check against
 * @returns Display message or null if unlocked
 */
export function getLockStatusMessage(
  unlockTime: string | null | undefined,
  currentTime: Date = new Date()
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
  return `Pukul ${unlockTime} WIB`;
}
