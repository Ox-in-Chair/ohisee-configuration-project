/**
 * Shared Validation Schemas
 * Common Zod schemas used across NCA and MJC forms
 * Eliminates code duplication and ensures consistency
 */

import { z } from 'zod';
import {
  SIGNATURE_TYPE,
  MACHINE_STATUS,
  QUANTITY_UNIT,
  SEGREGATION_AREA,
  getConstValues
} from '@/lib/config';

/**
 * Signature validation schema
 * Enforces complete signature data structure
 * Used in: NCA (sections 6, 7, 8, 11), MJC (sections 7, 10)
 */
export const signatureSchema = z.object({
  type: z.enum(getConstValues(SIGNATURE_TYPE) as [string, ...string[]]),
  data: z.string().min(1, 'Signature data is required'),
  name: z.string().min(1, 'Signer name is required'),
  timestamp: z.string().min(1, 'Timestamp is required'),
});

/**
 * Machine status enum
 * Used in both NCA and MJC forms to track equipment state
 */
export const machineStatusEnum = z.enum([MACHINE_STATUS.DOWN, MACHINE_STATUS.OPERATIONAL] as [string, ...string[]]);

/**
 * Quantity unit enum
 * Standard units for measuring affected quantities
 * Used in: NCA Section 3
 */
export const quantityUnitEnum = z.enum(getConstValues(QUANTITY_UNIT) as [string, ...string[]]);

/**
 * Segregation area enum
 * Standard areas for relocating non-conforming products
 * Used in: NCA Section 7
 */
export const segregationAreaEnum = z.enum(getConstValues(SEGREGATION_AREA) as [string, ...string[]]);

/**
 * Type inference exports for use in components
 */
export type SignatureData = z.infer<typeof signatureSchema>;
export type MachineStatus = z.infer<typeof machineStatusEnum>;
export type QuantityUnit = z.infer<typeof quantityUnitEnum>;
export type SegregationArea = z.infer<typeof segregationAreaEnum>;
