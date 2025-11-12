/**
 * Shared utility functions for server actions
 * Architecture: Dependency injection pattern - no static calls
 *
 * This module provides reusable utilities for action handlers to:
 * - Generate unique record numbers with timestamps
 * - Transform form signatures to database format
 * - Format dates and times consistently
 *
 * @module lib/actions/utils
 */

import type { Signature } from '@/types/database';

/**
 * Generate a timestamped record number with random 8-digit suffix
 *
 * Used for creating unique identifiers for NCAs, MJCs, and other records.
 * Format: {PREFIX}-{YEAR}-{RANDOM_8_DIGITS}
 *
 * @param prefix - The record type prefix (e.g., 'NCA', 'MJC', 'MRN')
 * @returns Formatted record number
 *
 * @example
 * ```typescript
 * generateRecordNumber('NCA')  // Returns: 'NCA-2025-12345678'
 * generateRecordNumber('MJC')  // Returns: 'MJC-2025-87654321'
 * generateRecordNumber('MRN')  // Returns: 'MRN-2025-00000042'
 * ```
 */
export function generateRecordNumber(prefix: string): string {
  const year = new Date().getFullYear();
  const random = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  return `${prefix}-${year}-${random}`;
}

/**
 * Get current date as ISO date string (YYYY-MM-DD format)
 *
 * Provides consistent date formatting across all action handlers.
 * Uses UTC to avoid timezone inconsistencies.
 *
 * @returns Current date in ISO format (YYYY-MM-DD)
 *
 * @example
 * ```typescript
 * getCurrentDateString()  // Returns: '2025-11-12'
 * ```
 */
export function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current time as 24-hour time string (HH:MM:SS format)
 *
 * Provides consistent time formatting across all action handlers.
 * Uses 'en-GB' locale for 24-hour format without AM/PM.
 *
 * @returns Current time in 24-hour format (HH:MM:SS)
 *
 * @example
 * ```typescript
 * getCurrentTimeString()  // Returns: '14:30:45'
 * ```
 */
export function getCurrentTimeString(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

/**
 * Transform form signature to database signature format
 *
 * Converts client-side signature data to the database Signature type.
 * Used by NCA, MJC, and End-of-Day action handlers.
 *
 * Maps 'manual' signatures to 'drawn' type and 'digital' signatures to 'uploaded' type.
 *
 * @param formSignature - Signature data from form submission
 * @returns Signature object formatted for database storage, or null if no signature provided
 *
 * @example
 * ```typescript
 * const formSig = {
 *   type: 'manual' as const,
 *   data: 'data:image/png;base64,...',
 *   name: 'John Doe',
 *   timestamp: '2025-11-12T14:30:00Z'
 * };
 * const dbSig = transformSignature(formSig);
 * // Returns: { type: 'drawn', name: 'John Doe', timestamp: '...', ip: '0.0.0.0', data: '...' }
 *
 * transformSignature(null)  // Returns: null
 * ```
 */
export function transformSignature(formSignature: {
  type: 'manual' | 'digital';
  data: string;
  name: string;
  timestamp: string;
} | null | undefined): Signature | null {
  if (!formSignature) return null;

  return {
    type: formSignature.type === 'manual' ? 'drawn' : 'uploaded',
    name: formSignature.name,
    timestamp: formSignature.timestamp,
    ip: '0.0.0.0', // TODO: Get real IP from request headers
    data: formSignature.data,
  };
}
