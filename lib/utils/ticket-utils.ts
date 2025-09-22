/**
 * Utility functions for ticket operations
 */

/**
 * Extract the numeric part from a ticket number for URL usage
 * @param ticketNumber - The ticket number (e.g., "TKT-2025-000050", "50", or CUID)
 * @returns The numeric part (e.g., "50") or the original value if not a formatted ticket number
 */
export function getTicketUrlId(ticketNumber: string | undefined | null): string {
  if (!ticketNumber) return '';

  // If it's already just a number, return it
  if (/^\d+$/.test(ticketNumber)) {
    return ticketNumber;
  }

  // If it's a formatted ticket number like "TKT-2025-000050"
  if (ticketNumber.includes('-')) {
    const parts = ticketNumber.split('-');
    const numericPart = parseInt(parts[parts.length - 1]);
    if (!isNaN(numericPart)) {
      return numericPart.toString();
    }
  }

  // Otherwise return as is (might be a CUID)
  return ticketNumber;
}

/**
 * Check if a string is a CUID (used for ticket IDs)
 * @param id - The string to check
 * @returns true if it's likely a CUID
 */
export function isCuid(id: string): boolean {
  // CUIDs typically start with 'c' and are 25 characters long
  return id.startsWith('c') && id.length >= 20 && id.length <= 30;
}

/**
 * Get the ticket display number (for UI display)
 * @param ticketNumber - The ticket number from database
 * @returns A formatted display number
 */
export function getTicketDisplayNumber(ticketNumber: string | undefined | null): string {
  if (!ticketNumber) return '';

  // If it's just a number, prepend with #
  if (/^\d+$/.test(ticketNumber)) {
    return `#${ticketNumber}`;
  }

  // If it's already formatted, return as is
  if (ticketNumber.includes('-')) {
    return ticketNumber;
  }

  // Otherwise return with #
  return `#${ticketNumber}`;
}