/**
 * Shift Validation Logic
 *
 * Validates shift assignments against ITIL-compliant rules:
 * - Maximum night shifts per staff per month
 * - Minimum days between night shifts
 * - Sabbath restrictions
 * - Weekend coverage requirements
 * - Server access coverage
 */

interface StaffProfile {
  id: string;
  canWorkNightShift: boolean;
  canWorkWeekendDay: boolean;
  hasServerAccess: boolean;
  hasSabbathRestriction: boolean;
  maxNightShiftsPerMonth: number;
  minDaysBetweenNightShifts: number;
}

interface ShiftAssignment {
  id: string;
  date: string;
  shiftType: string;
  staffProfile: {
    id: string;
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ShiftValidator {
  private staff: Map<string, StaffProfile>;
  private assignments: ShiftAssignment[];

  constructor(staff: StaffProfile[], assignments: ShiftAssignment[]) {
    this.staff = new Map(staff.map(s => [s.id, s]));
    this.assignments = assignments;
  }

  /**
   * Validate all assignments in the schedule
   */
  validateSchedule(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check each assignment
    for (const assignment of this.assignments) {
      const result = this.validateAssignment(assignment);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    // Check coverage requirements
    const coverageResult = this.validateCoverage();
    errors.push(...coverageResult.errors);
    warnings.push(...coverageResult.warnings);

    return {
      isValid: errors.length === 0,
      errors: [...new Set(errors)], // Remove duplicates
      warnings: [...new Set(warnings)],
    };
  }

  /**
   * Validate a single assignment
   */
  validateAssignment(assignment: ShiftAssignment): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const staff = this.staff.get(assignment.staffProfile.id);

    if (!staff) {
      errors.push(`Staff profile not found for assignment ${assignment.id}`);
      return { isValid: false, errors, warnings };
    }

    const date = new Date(assignment.date);
    const dayOfWeek = date.getDay();

    // Validate night shift assignment
    if (assignment.shiftType === 'NIGHT') {
      if (!staff.canWorkNightShift) {
        errors.push(`${assignment.staffProfile.id} cannot work night shifts`);
      }

      // Check Sabbath restriction
      if (staff.hasSabbathRestriction && (dayOfWeek === 5 || dayOfWeek === 6)) {
        errors.push(`${assignment.staffProfile.id} has Sabbath restriction (Friday/Saturday)`);
      }

      // Check max night shifts
      const nightShifts = this.getStaffNightShifts(assignment.staffProfile.id);
      if (nightShifts.length >= staff.maxNightShiftsPerMonth) {
        warnings.push(`${assignment.staffProfile.id} has reached max night shifts (${staff.maxNightShiftsPerMonth})`);
      }

      // Check minimum gap between night shifts
      const lastNightShift = this.getLastNightShift(assignment.staffProfile.id, date);
      if (lastNightShift) {
        const daysSince = Math.floor((date.getTime() - new Date(lastNightShift.date).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < staff.minDaysBetweenNightShifts) {
          errors.push(`${assignment.staffProfile.id} needs ${staff.minDaysBetweenNightShifts} days between night shifts (only ${daysSince} days since last)`);
        }
      }

      // Check for mandatory OFF day after night shift
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayAssignment = this.assignments.find(a =>
        a.staffProfile.id === assignment.staffProfile.id &&
        new Date(a.date).toDateString() === nextDay.toDateString()
      );

      if (nextDayAssignment && nextDayAssignment.shiftType !== 'OFF') {
        warnings.push(`${assignment.staffProfile.id} should have OFF day after night shift`);
      }
    }

    // Validate weekend assignment
    if (['SATURDAY_DAY', 'SUNDAY_DAY'].includes(assignment.shiftType)) {
      if (!staff.canWorkWeekendDay) {
        errors.push(`${assignment.staffProfile.id} cannot work weekend day shifts`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate coverage requirements (weekend, server access, etc.)
   */
  private validateCoverage(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Group assignments by date
    const assignmentsByDate = new Map<string, ShiftAssignment[]>();
    for (const assignment of this.assignments) {
      const dateStr = new Date(assignment.date).toISOString().split('T')[0];
      if (!assignmentsByDate.has(dateStr)) {
        assignmentsByDate.set(dateStr, []);
      }
      assignmentsByDate.get(dateStr)!.push(assignment);
    }

    // Check weekend coverage
    for (const [dateStr, dayAssignments] of assignmentsByDate.entries()) {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();

      // Saturday
      if (dayOfWeek === 6) {
        const saturdayDayShifts = dayAssignments.filter(a => a.shiftType === 'SATURDAY_DAY');
        if (saturdayDayShifts.length < 2) {
          warnings.push(`Saturday ${dateStr} needs 2 day shift staff (has ${saturdayDayShifts.length})`);
        }

        // Check server access
        const hasServerAccess = saturdayDayShifts.some(a => {
          const staff = this.staff.get(a.staffProfile.id);
          return staff?.hasServerAccess;
        });

        if (!hasServerAccess && saturdayDayShifts.length > 0) {
          warnings.push(`Saturday ${dateStr} has no staff with server access`);
        }
      }

      // Sunday
      if (dayOfWeek === 0) {
        const sundayDayShifts = dayAssignments.filter(a => a.shiftType === 'SUNDAY_DAY');
        if (sundayDayShifts.length < 2) {
          warnings.push(`Sunday ${dateStr} needs 2 day shift staff (has ${sundayDayShifts.length})`);
        }

        // Check server access
        const hasServerAccess = sundayDayShifts.some(a => {
          const staff = this.staff.get(a.staffProfile.id);
          return staff?.hasServerAccess;
        });

        if (!hasServerAccess && sundayDayShifts.length > 0) {
          warnings.push(`Sunday ${dateStr} has no staff with server access`);
        }
      }

      // Weekday night shift (1 staff only)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const nightShifts = dayAssignments.filter(a => a.shiftType === 'NIGHT');
        if (nightShifts.length > 1) {
          warnings.push(`Weekday night ${dateStr} should have only 1 staff (has ${nightShifts.length})`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get all night shifts for a staff member
   */
  private getStaffNightShifts(staffId: string): ShiftAssignment[] {
    return this.assignments.filter(a =>
      a.staffProfile.id === staffId && a.shiftType === 'NIGHT'
    );
  }

  /**
   * Get the last night shift before a given date
   */
  private getLastNightShift(staffId: string, beforeDate: Date): ShiftAssignment | null {
    const nightShifts = this.getStaffNightShifts(staffId)
      .filter(a => new Date(a.date) < beforeDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return nightShifts[0] || null;
  }

  /**
   * Check if a specific assignment would be valid
   */
  canAssign(staffId: string, shiftType: string, date: Date): ValidationResult {
    const staff = this.staff.get(staffId);
    if (!staff) {
      return {
        isValid: false,
        errors: ['Staff profile not found'],
        warnings: [],
      };
    }

    // Create a temporary assignment
    const tempAssignment: ShiftAssignment = {
      id: `temp-${Date.now()}`,
      date: date.toISOString(),
      shiftType,
      staffProfile: { id: staffId },
    };

    // Validate it
    return this.validateAssignment(tempAssignment);
  }
}
