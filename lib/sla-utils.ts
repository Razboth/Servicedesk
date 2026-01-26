/**
 * SLA Business Hours Utility
 * Handles business hours calculations for Bank SulutGo ServiceDesk
 * Default timezone: Asia/Makassar (WITA/UTC+8)
 */

export interface BusinessHoursConfig {
  startHour: number;  // 8 (08:00 WITA)
  endHour: number;    // 17 (17:00 WITA)
  workDays: number[]; // [1,2,3,4,5] (Mon-Fri)
  timezone: string;   // 'Asia/Makassar' (WITA/UTC+8)
}

const DEFAULT_CONFIG: BusinessHoursConfig = {
  startHour: 8,
  endHour: 17,
  workDays: [1, 2, 3, 4, 5],
  timezone: 'Asia/Makassar'
};

/** Convert a Date to the configured timezone and return hour/day components */
function getLocalComponents(date: Date, timezone: string): { hour: number; minute: number; dayOfWeek: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false
  }).formatToParts(date);

  let hour = 0;
  let minute = 0;
  let dayStr = '';
  for (const part of parts) {
    if (part.type === 'hour') hour = parseInt(part.value, 10);
    if (part.type === 'minute') minute = parseInt(part.value, 10);
    if (part.type === 'weekday') dayStr = part.value;
  }

  // Map weekday string to JS day number (0=Sun, 1=Mon, etc.)
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = dayMap[dayStr] ?? 0;

  return { hour, minute, dayOfWeek };
}

/**
 * Check if a date falls within business hours
 */
export function isBusinessHours(
  date: Date,
  config: BusinessHoursConfig = DEFAULT_CONFIG
): boolean {
  const { hour, dayOfWeek } = getLocalComponents(date, config.timezone);
  if (!config.workDays.includes(dayOfWeek)) return false;
  return hour >= config.startHour && hour < config.endHour;
}

/**
 * Calculate business hours between two dates.
 * Returns hours as a floating-point number.
 */
export function calculateBusinessHours(
  start: Date,
  end: Date,
  config: BusinessHoursConfig = DEFAULT_CONFIG
): number {
  if (end <= start) return 0;

  const businessDayMs = (config.endHour - config.startHour) * 60 * 60 * 1000;
  let totalMs = 0;

  // Walk day-by-day from start to end
  const current = new Date(start);

  while (current < end) {
    const { hour, minute, dayOfWeek } = getLocalComponents(current, config.timezone);
    const isWorkDay = config.workDays.includes(dayOfWeek);

    if (isWorkDay) {
      // Calculate how much of this business day falls in [current, end]
      const currentMs = current.getTime();

      // Start of business today (in UTC, approximated from local offset)
      const dayStart = new Date(current);
      // Move to start of business day
      const hourDiffToStart = config.startHour - hour;
      const minuteDiff = -minute;
      const businessStartMs = currentMs + (hourDiffToStart * 60 * 60 * 1000) + (minuteDiff * 60 * 1000);
      const businessEndMs = businessStartMs + businessDayMs;

      const businessStart = new Date(Math.max(businessStartMs, currentMs));
      const businessEnd = new Date(Math.min(businessEndMs, end.getTime()));

      if (businessEnd > businessStart) {
        totalMs += businessEnd.getTime() - businessStart.getTime();
      }

      // Move to next day start
      current.setTime(businessEndMs);
    } else {
      // Skip to next day (advance ~24 hours, adjusted to start of business)
      current.setTime(current.getTime() + 24 * 60 * 60 * 1000);
      // Snap to beginning of the day
      const { hour: newHour, minute: newMin } = getLocalComponents(current, config.timezone);
      const rewindMs = (newHour * 60 + newMin) * 60 * 1000;
      current.setTime(current.getTime() - rewindMs + config.startHour * 60 * 60 * 1000);
    }
  }

  return totalMs / (1000 * 60 * 60);
}

/**
 * Calculate deadline date given business hours duration from a start date
 */
export function addBusinessHours(
  start: Date,
  hours: number,
  config: BusinessHoursConfig = DEFAULT_CONFIG
): Date {
  if (hours <= 0) return new Date(start);

  let remainingMs = hours * 60 * 60 * 1000;
  const businessDayMs = (config.endHour - config.startHour) * 60 * 60 * 1000;
  const current = new Date(start);

  while (remainingMs > 0) {
    const { hour, minute, dayOfWeek } = getLocalComponents(current, config.timezone);
    const isWorkDay = config.workDays.includes(dayOfWeek);

    if (isWorkDay && hour >= config.startHour && hour < config.endHour) {
      // We're in business hours - calculate remaining time today
      const minutesUntilEnd = (config.endHour - hour) * 60 - minute;
      const msUntilEnd = minutesUntilEnd * 60 * 1000;

      if (remainingMs <= msUntilEnd) {
        // Deadline falls within today
        current.setTime(current.getTime() + remainingMs);
        remainingMs = 0;
      } else {
        // Use rest of today and continue
        current.setTime(current.getTime() + msUntilEnd);
        remainingMs -= msUntilEnd;
      }
    } else {
      // Outside business hours - advance to next business day start
      if (isWorkDay && hour >= config.endHour) {
        // After hours today, skip to next day
        current.setTime(current.getTime() + 24 * 60 * 60 * 1000);
      } else if (!isWorkDay) {
        current.setTime(current.getTime() + 24 * 60 * 60 * 1000);
      }
      // Snap to start of business
      const { hour: newHour, minute: newMin, dayOfWeek: newDay } = getLocalComponents(current, config.timezone);
      if (!config.workDays.includes(newDay)) {
        continue; // Keep advancing
      }
      const snapMs = ((newHour - config.startHour) * 60 + newMin) * 60 * 1000;
      if (snapMs > 0) {
        current.setTime(current.getTime() - snapMs);
      } else if (snapMs < 0) {
        current.setTime(current.getTime() - snapMs);
      }
    }
  }

  return current;
}

/**
 * Get effective elapsed hours considering business hours and pause time.
 * This is the main function used in SLA calculations.
 *
 * @param slaStart - When SLA started (slaStartAt or createdAt)
 * @param now - Current time (or resolution time)
 * @param slaPausedTotal - Total paused milliseconds accumulated
 * @param slaPausedAt - If currently paused, when the pause started
 * @param businessHoursOnly - Whether to only count business hours
 * @param config - Business hours configuration
 * @returns Effective elapsed hours
 */
export function getEffectiveElapsedHours(
  slaStart: Date,
  now: Date,
  slaPausedTotal: number = 0,
  slaPausedAt: Date | null = null,
  businessHoursOnly: boolean = false,
  config: BusinessHoursConfig = DEFAULT_CONFIG
): number {
  if (businessHoursOnly) {
    // Calculate business hours between start and now
    let totalBusinessHours = calculateBusinessHours(slaStart, now, config);

    // Subtract paused time (also in business hours)
    if (slaPausedTotal > 0) {
      // Convert paused milliseconds to hours (already wall-clock; approximate by raw hours)
      // For more accuracy, we'd need pause start/end pairs, but this is a good approximation
      totalBusinessHours -= slaPausedTotal / (1000 * 60 * 60);
    }

    // If currently paused, subtract time since pause started
    if (slaPausedAt) {
      const pauseBusinessHours = calculateBusinessHours(slaPausedAt, now, config);
      totalBusinessHours -= pauseBusinessHours;
    }

    return Math.max(0, totalBusinessHours);
  } else {
    // Calendar hours calculation
    let totalMs = now.getTime() - slaStart.getTime();

    // Subtract accumulated pause time
    totalMs -= slaPausedTotal;

    // If currently paused, subtract time since pause started
    if (slaPausedAt) {
      totalMs -= (now.getTime() - slaPausedAt.getTime());
    }

    return Math.max(0, totalMs / (1000 * 60 * 60));
  }
}

/**
 * Get the SLA start time for a ticket.
 * Uses slaStartAt if available, falls back to createdAt.
 */
export function getSlaStartTime(ticket: { slaStartAt?: Date | null; createdAt: Date }): Date {
  return ticket.slaStartAt ? new Date(ticket.slaStartAt) : new Date(ticket.createdAt);
}
