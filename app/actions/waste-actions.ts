/**
 * Waste Manifest Actions
 * Server actions for waste manifest creation and management
 * PRD Enhancement: Waste Manifest (4.10F1) integration with NCAs
 */

'use server';

import { createServerClient } from '@/lib/database/client';
import type { ActionResponse } from './types';

export interface WasteManifestData {
  nca_id: string;
  waste_description: string;
  risk_level?: 'low' | 'medium' | 'high';
  waste_type: 'hazardous' | 'non-hazardous' | 'recyclable' | 'organic' | 'trademarked';
  specialized_storage?: string;
  document_reference?: string;
  physical_quantity: number;
  quantity_unit?: 'kg' | 'units' | 'meters' | 'boxes' | 'pallets';
  service_provider?: string;
  disposal_certificate?: string;
  disposal_date?: string;
}

export interface WasteManifest {
  id: string;
  manifest_number: string;
  nca_id: string | null;
  waste_description: string;
  risk_level: 'low' | 'medium' | 'high' | null;
  waste_type: 'hazardous' | 'non-hazardous' | 'recyclable' | 'organic' | 'trademarked';
  specialized_storage: string | null;
  document_reference: string | null;
  physical_quantity: number;
  quantity_unit: 'kg' | 'units' | 'meters' | 'boxes' | 'pallets' | null;
  service_provider: string | null;
  disposal_certificate: string | null;
  disposal_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create waste manifest from NCA
 * Automatically called when NCA disposition includes discard
 */
export async function createWasteManifestFromNCA(
  ncaId: string,
  wasteData: Partial<WasteManifestData>,
  userId: string
): Promise<ActionResponse<WasteManifest>> {
  try {
    const supabase = createServerClient();

    // Fetch NCA to get quantity and description
    const { data: nca, error: ncaError } = await (supabase
      .from('ncas') as any)
      .select('quantity, quantity_unit, nc_product_description, nc_description')
      .eq('id', ncaId)
      .single();

    if (ncaError || !nca) {
      return {
        success: false,
        error: `NCA not found: ${ncaError?.message || 'Unknown error'}`,
      };
    }

    const ncaData = nca as any;

    // Create waste manifest
    const manifestData = {
      nca_id: ncaId,
      waste_description: wasteData.waste_description || ncaData.nc_product_description || 'Non-conforming product',
      risk_level: wasteData.risk_level || 'medium',
      waste_type: wasteData.waste_type || 'non-hazardous',
      specialized_storage: wasteData.specialized_storage || null,
      document_reference: wasteData.document_reference || '4.10F1',
      physical_quantity: wasteData.physical_quantity || ncaData.quantity || 0,
      quantity_unit: wasteData.quantity_unit || (ncaData.quantity_unit as any) || 'kg',
      service_provider: wasteData.service_provider || null,
      disposal_certificate: wasteData.disposal_certificate || null,
      disposal_date: wasteData.disposal_date || null,
      created_by: userId,
    };

    const { data: manifest, error } = await (supabase
      .from('waste_manifests') as any)
      .insert(manifestData)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Failed to create waste manifest: ${error.message}`,
      };
    }

    // Link waste manifest to NCA
    const { error: linkError } = await (supabase
      .from('ncas') as any)
      .update({ waste_manifest_id: manifest.id })
      .eq('id', ncaId);

    if (linkError) {
      return {
        success: false,
        error: `Failed to link waste manifest to NCA: ${linkError.message}`,
      };
    }

    return {
      success: true,
      data: manifest as WasteManifest,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating waste manifest',
    };
  }
}

/**
 * Link existing waste manifest to NCA
 */
export async function linkWasteManifestToNCA(
  ncaId: string,
  manifestId: string
): Promise<ActionResponse<WasteManifest>> {
  try {
    const supabase = createServerClient();

    // Update NCA with waste manifest link
    const { error: ncaError } = await (supabase
      .from('ncas') as any)
      .update({ waste_manifest_id: manifestId })
      .eq('id', ncaId);

    if (ncaError) {
      return {
        success: false,
        error: `Failed to link waste manifest: ${ncaError.message}`,
      };
    }

    // Update waste manifest with NCA link
    const { error: manifestError } = await (supabase
      .from('waste_manifests') as any)
      .update({ nca_id: ncaId })
      .eq('id', manifestId);

    if (manifestError) {
      return {
        success: false,
        error: `Failed to update waste manifest: ${manifestError.message}`,
      };
    }

    // Fetch updated manifest
    const { data: manifest, error: fetchError } = await (supabase
      .from('waste_manifests') as any)
      .select()
      .eq('id', manifestId)
      .single();

    if (fetchError || !manifest) {
      return {
        success: false,
        error: `Failed to fetch waste manifest: ${fetchError?.message || 'Unknown error'}`,
      };
    }

    return {
      success: true,
      data: manifest as WasteManifest,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error linking waste manifest',
    };
  }
}

/**
 * Get waste manifest by NCA ID
 */
export async function getWasteManifestByNCA(
  ncaId: string
): Promise<ActionResponse<WasteManifest | null>> {
  try {
    const supabase = createServerClient();

    const { data: manifest, error } = await (supabase
      .from('waste_manifests') as any)
      .select()
      .eq('nca_id', ncaId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - that's okay, return null
      return {
        success: false,
        error: `Failed to fetch waste manifest: ${error.message}`,
      };
    }

    return {
      success: true,
      data: manifest as WasteManifest | null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching waste manifest',
    };
  }
}

