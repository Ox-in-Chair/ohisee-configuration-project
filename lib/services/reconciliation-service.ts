/**
 * Reconciliation Service
 * Validates NCA quantities against production logs and waste manifests
 * PRD Enhancement: Reconciliation validation before NCA closure
 */

import { createServerClient } from '@/lib/database/client';

export interface ReconciliationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    ncaQuantity: number | null;
    ncaUnit: string | null;
    productionLogQuantity: number | null;
    wasteManifestQuantity: number | null;
    reconciled: boolean;
  };
}

/**
 * Validate NCA quantities against production logs
 */
export async function validateNCAQuantities(ncaId: string): Promise<ReconciliationResult> {
  const supabase = createServerClient();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Fetch NCA
  const { data: nca, error: ncaError } = await (supabase
    .from('ncas') as any)
    .select('quantity, quantity_unit, wo_id, disposition_discard')
    .eq('id', ncaId)
    .single();

  if (ncaError || !nca) {
    return {
      isValid: false,
      errors: [`NCA not found: ${ncaError?.message || 'Unknown error'}`],
      warnings: [],
      details: {
        ncaQuantity: null,
        ncaUnit: null,
        productionLogQuantity: null,
        wasteManifestQuantity: null,
        reconciled: false,
      },
    };
  }

  const ncaData = nca as any;
  const ncaQuantity = ncaData.quantity;
  const ncaUnit = ncaData.quantity_unit;

  // Fetch work order to get production quantities
  let productionLogQuantity: number | null = null;
  if (ncaData.wo_id) {
    const { data: wo, error: woError } = await (supabase
      .from('work_orders') as any)
      .select('quantity_produced, quantity_unit')
      .eq('id', ncaData.wo_id)
      .single();

    if (!woError && wo) {
      const woData = wo as any;
      // TODO: Implement proper quantity conversion if units differ
      productionLogQuantity = woData.quantity_produced || null;
      
      if (productionLogQuantity && ncaQuantity) {
        if (ncaQuantity > productionLogQuantity) {
          errors.push(
            `NCA quantity (${ncaQuantity} ${ncaUnit}) exceeds production quantity (${productionLogQuantity}). This indicates a data entry error.`
          );
        } else if (ncaQuantity < productionLogQuantity * 0.1) {
          warnings.push(
            `NCA quantity (${ncaQuantity} ${ncaUnit}) is less than 10% of production quantity (${productionLogQuantity}). Please verify this is correct.`
          );
        }
      }
    }
  } else {
    warnings.push('No work order linked to NCA. Cannot validate against production logs.');
  }

    // Check waste manifest if disposition includes discard
    let wasteManifestQuantity: number | null = null;
    if (ncaData.disposition_discard) {
      const { data: wasteManifest, error: wasteError } = await (supabase
        .from('waste_manifests') as any)
        .select('physical_quantity, quantity_unit')
        .eq('nca_id', ncaId)
        .single();

    if (!wasteError && wasteManifest) {
      wasteManifestQuantity = wasteManifest.physical_quantity || null;
      
      if (wasteManifestQuantity && ncaQuantity) {
        // TODO: Implement proper quantity conversion if units differ
        const quantityDiff = Math.abs(wasteManifestQuantity - ncaQuantity);
        const tolerance = ncaQuantity * 0.05; // 5% tolerance
        
        if (quantityDiff > tolerance) {
          errors.push(
            `Waste manifest quantity (${wasteManifestQuantity}) does not match NCA quantity (${ncaQuantity} ${ncaUnit}). Difference: ${quantityDiff.toFixed(2)}.`
          );
        }
      } else if (ncaData.disposition_discard && !wasteManifest) {
        errors.push(
          'Disposition includes discard but no waste manifest found. Waste manifest must be created before closure.'
        );
      }
    } else if (ncaData.disposition_discard) {
      errors.push(
        'Disposition includes discard but no waste manifest found. Waste manifest must be created before closure.'
      );
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    details: {
      ncaQuantity,
      ncaUnit,
      productionLogQuantity,
      wasteManifestQuantity,
      reconciled: isValid,
    },
  };
}

/**
 * Validate waste reconciliation
 * Checks if discard quantities match waste manifest
 */
export async function validateWasteReconciliation(ncaId: string): Promise<ReconciliationResult> {
  const supabase = createServerClient();

  // Fetch NCA
  const { data: nca, error: ncaError } = await (supabase
    .from('ncas') as any)
    .select('quantity, quantity_unit, disposition_discard')
    .eq('id', ncaId)
    .single();

  if (ncaError || !nca) {
    return {
      isValid: false,
      errors: [`NCA not found: ${ncaError?.message || 'Unknown error'}`],
      warnings: [],
      details: {
        ncaQuantity: null,
        ncaUnit: null,
        productionLogQuantity: null,
        wasteManifestQuantity: null,
        reconciled: false,
      },
    };
  }

  const ncaData = nca as any;

  if (!ncaData.disposition_discard) {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      details: {
        ncaQuantity: nca.quantity,
        ncaUnit: nca.quantity_unit,
        productionLogQuantity: null,
        wasteManifestQuantity: null,
        reconciled: true,
      },
    };
  }

  // Fetch waste manifest
  const { data: wasteManifest, error: wasteError } = await (supabase
    .from('waste_manifests') as any)
    .select('physical_quantity, quantity_unit')
    .eq('nca_id', ncaId)
    .single();

  if (wasteError || !wasteManifest) {
    return {
      isValid: false,
      errors: [
        'Waste manifest not found. When disposition includes discard, a waste manifest (Form 4.10F1) must be created.',
      ],
      warnings: [],
      details: {
        ncaQuantity: nca.quantity,
        ncaUnit: nca.quantity_unit,
        productionLogQuantity: null,
        wasteManifestQuantity: null,
        reconciled: false,
      },
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Compare quantities (with unit conversion if needed)
  if (nca.quantity && wasteManifest.physical_quantity) {
    // TODO: Implement proper unit conversion
    const quantityDiff = Math.abs(wasteManifest.physical_quantity - nca.quantity);
    const tolerance = nca.quantity * 0.05; // 5% tolerance

    if (quantityDiff > tolerance) {
      errors.push(
        `Waste manifest quantity (${wasteManifest.physical_quantity} ${wasteManifest.quantity_unit}) does not match NCA quantity (${nca.quantity} ${nca.quantity_unit}).`
      );
    } else if (quantityDiff > 0) {
      warnings.push(
        `Small quantity difference detected: ${quantityDiff.toFixed(2)}. Please verify this is correct.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    details: {
      ncaQuantity: nca.quantity,
      ncaUnit: nca.quantity_unit,
      productionLogQuantity: null,
      wasteManifestQuantity: wasteManifest.physical_quantity,
      reconciled: errors.length === 0,
    },
  };
}

/**
 * Check production log reconciliation
 * Validates NCA quantities against work order production logs
 */
export async function checkProductionLogReconciliation(
  woId: string,
  ncaQuantities: Array<{ quantity: number; unit: string }>
): Promise<ReconciliationResult> {
  const supabase = createServerClient();

  // Fetch work order
  const { data: wo, error: woError } = await (supabase
    .from('work_orders') as any)
    .select('quantity_produced, quantity_unit')
    .eq('id', woId)
    .single();

  if (woError || !wo) {
    return {
      isValid: false,
      errors: [`Work order not found: ${woError?.message || 'Unknown error'}`],
      warnings: [],
      details: {
        ncaQuantity: null,
        ncaUnit: null,
        productionLogQuantity: null,
        wasteManifestQuantity: null,
        reconciled: false,
      },
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Sum all NCA quantities
  const totalNCAQuantity = ncaQuantities.reduce((sum, nca) => {
    // TODO: Implement proper unit conversion
    return sum + nca.quantity;
  }, 0);

  const woData = wo as any;
  const productionQuantity = woData.quantity_produced || 0;

  if (totalNCAQuantity > productionQuantity) {
    errors.push(
      `Total NCA quantities (${totalNCAQuantity}) exceed production quantity (${productionQuantity}). This indicates a data entry error.`
    );
  } else if (totalNCAQuantity > productionQuantity * 0.5) {
    warnings.push(
      `Total NCA quantities (${totalNCAQuantity}) represent more than 50% of production quantity (${productionQuantity}). Please verify this is correct.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    details: {
      ncaQuantity: totalNCAQuantity,
      ncaUnit: ncaQuantities[0]?.unit || null,
      productionLogQuantity: productionQuantity,
      wasteManifestQuantity: null,
      reconciled: errors.length === 0,
    },
  };
}

