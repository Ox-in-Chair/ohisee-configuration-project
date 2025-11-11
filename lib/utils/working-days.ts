/**
 * Working Days Calculation Utility
 * Procedure 5.7: NCAs must be closed out within 20 working days
 * Working days exclude weekends (Saturday and Sunday)
 */

/**
 * Calculate the date that is N working days from a start date
 * Excludes weekends (Saturday = 6, Sunday = 0)
 * 
 * @param startDate - The starting date
 * @param workingDays - Number of working days to add
 * @returns The date that is N working days from startDate
 */
export function addWorkingDays(startDate: Date, workingDays: number): Date {
  const result = new Date(startDate);
  let daysAdded = 0;
  let daysToAdd = workingDays;

  while (daysToAdd > 0) {
    const dayOfWeek = result.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysToAdd--;
      daysAdded++;
    }
    
    // Move to next day if we still need to add more days
    if (daysToAdd > 0) {
      result.setDate(result.getDate() + 1);
    }
  }

  return result;
}

/**
 * Calculate the number of working days between two dates
 * Excludes weekends
 * 
 * @param startDate - The starting date
 * @param endDate - The ending date
 * @returns Number of working days between the dates
 */
export function getWorkingDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Ensure start is before end
  if (start > end) {
    return 0;
  }

  let workingDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    
    // Count only weekdays
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    
    current.setDate(current.getDate() + 1);
  }

  return workingDays;
}

/**
 * Check if a date is a working day (not weekend)
 * 
 * @param date - The date to check
 * @returns True if the date is a working day
 */
export function isWorkingDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6; // Not Sunday (0) or Saturday (6)
}

/**
 * Get the next working day from a given date
 * 
 * @param date - The starting date
 * @returns The next working day
 */
export function getNextWorkingDay(date: Date): Date {
  const result = new Date(date);
  
  do {
    result.setDate(result.getDate() + 1);
  } while (!isWorkingDay(result));
  
  return result;
}

