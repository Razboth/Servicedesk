import { ShiftType, ShiftCategory } from '@prisma/client';

/**
 * Map ShiftType to ShiftCategory
 * - MONITORING: Night shifts + weekend day (monitoring mode)
 * - OPERATIONAL: Daytime operational shifts
 */
export function getShiftCategory(shiftType: ShiftType): ShiftCategory | null {
  switch (shiftType) {
    case 'NIGHT_WEEKDAY':
    case 'DAY_WEEKEND':
    case 'NIGHT_WEEKEND':
      return 'MONITORING';
    case 'STANDBY_ONCALL':
    case 'STANDBY_BRANCH':
      return 'OPERATIONAL';
    default:
      return null; // OFF, LEAVE, HOLIDAY don't have a category
  }
}

/**
 * Get all ShiftTypes for a given category
 */
export function getShiftTypesForCategory(category: ShiftCategory): ShiftType[] {
  if (category === 'MONITORING') {
    return ['NIGHT_WEEKDAY', 'DAY_WEEKEND', 'NIGHT_WEEKEND'];
  }
  return ['STANDBY_ONCALL', 'STANDBY_BRANCH'];
}

/**
 * Check if a ShiftType belongs to a category
 */
export function isShiftTypeInCategory(shiftType: ShiftType, category: ShiftCategory): boolean {
  const shiftCategory = getShiftCategory(shiftType);
  return shiftCategory === category;
}

/**
 * Get display name for ShiftCategory (Indonesian)
 */
export function getShiftCategoryDisplayName(category: ShiftCategory): string {
  switch (category) {
    case 'MONITORING':
      return 'Monitoring';
    case 'OPERATIONAL':
      return 'Operasional';
    default:
      return category;
  }
}

/**
 * Get description for ShiftCategory (Indonesian)
 */
export function getShiftCategoryDescription(category: ShiftCategory): string {
  switch (category) {
    case 'MONITORING':
      return 'Shift malam dan akhir pekan (20:00-07:59, 08:00-19:00 weekend)';
    case 'OPERATIONAL':
      return 'Shift operasional harian (08:00 sampai tutup cabang)';
    default:
      return '';
  }
}
