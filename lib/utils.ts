import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a timestamped record number with random 8-digit suffix
 *
 * @param prefix - The record type prefix (e.g., 'NCA', 'MJC', 'MRN')
 * @returns Formatted record number: {PREFIX}-{YEAR}-{RANDOM_8_DIGITS}
 *
 * @example
 * generateRecordNumber('NCA')  // Returns: 'NCA-2025-12345678'
 * generateRecordNumber('MJC')  // Returns: 'MJC-2025-87654321'
 * generateRecordNumber('MRN')  // Returns: 'MRN-2025-00000042'
 */
export function generateRecordNumber(prefix: string): string {
  const year = new Date().getFullYear();
  const random = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  return `${prefix}-${year}-${random}`;
}
