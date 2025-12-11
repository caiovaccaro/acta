/**
 * Monthly Period Utilities
 * Helper functions for working with monthly periods in the analysis pipeline
 * 
 * Key concept: Stances are always recorded per month (YYYY-MM-01 format)
 * The system uses data from the last month as the current month
 */

/**
 * Gets the first day of the month for a given date
 * Always returns YYYY-MM-01 format
 * @param date - Date to get month period for (defaults to now)
 * @returns Date object set to first day of month at midnight
 */
export function getMonthPeriod(date: Date = new Date()): Date {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  return new Date(year, month, 1, 0, 0, 0, 0);
}

/**
 * Gets the month period for the previous month
 * Uses last month's data as the current month
 * @param date - Reference date (defaults to now)
 * @returns Date object for first day of previous month
 */
export function getPreviousMonthPeriod(date: Date = new Date()): Date {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  
  // If current month is January (0), previous month is December of previous year
  if (month === 0) {
    return new Date(year - 1, 11, 1, 0, 0, 0, 0);
  }
  
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

/**
 * Gets the current month period (which uses last month's data)
 * This is the month period that should be used for current analysis
 * @param date - Reference date (defaults to now)
 * @returns Date object for current month period
 */
export function getCurrentMonthPeriod(date: Date = new Date()): Date {
  // Current month period uses last month's data
  return getPreviousMonthPeriod(date);
}

/**
 * Formats a month period as YYYY-MM string
 * @param date - Month period date
 * @returns Formatted string (e.g., "2025-01")
 */
export function formatMonthPeriod(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Parses a YYYY-MM string into a month period Date
 * @param periodString - String in YYYY-MM format
 * @returns Date object for first day of that month
 */
export function parseMonthPeriod(periodString: string): Date {
  const [year, month] = periodString.split('-').map(Number);
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

/**
 * Gets the month period for N months ago
 * @param monthsAgo - Number of months to go back (default: 0 = current)
 * @param date - Reference date (defaults to now)
 * @returns Date object for first day of that month
 */
export function getMonthPeriodAgo(monthsAgo: number = 0, date: Date = new Date()): Date {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  
  let targetYear = year;
  let targetMonth = month - monthsAgo;
  
  // Handle year rollover
  while (targetMonth < 0) {
    targetMonth += 12;
    targetYear -= 1;
  }
  
  return new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
}

/**
 * Checks if two dates are in the same month period
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are in the same month
 */
export function isSameMonthPeriod(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
}

/**
 * Gets all month periods between two dates (inclusive)
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of month period dates
 */
export function getMonthPeriodsBetween(startDate: Date, endDate: Date): Date[] {
  const periods: Date[] = [];
  const start = getMonthPeriod(startDate);
  const end = getMonthPeriod(endDate);
  
  let current = new Date(start);
  
  while (current <= end) {
    periods.push(new Date(current));
    
    // Move to next month
    const year = current.getFullYear();
    const month = current.getMonth();
    current = new Date(year, month + 1, 1, 0, 0, 0, 0);
  }
  
  return periods;
}

