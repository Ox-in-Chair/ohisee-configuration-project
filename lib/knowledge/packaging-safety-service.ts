/**
 * Packaging Safety Service
 * Provides packaging material-specific safety data, specifications, and BRCGS compliance information
 */

import { createServerClient } from '@/lib/database/client';
import type { SupabaseClient } from '@/lib/database/client';

export interface PackagingMaterial {
  id: string;
  material_code: string;
  material_name: string;
  material_type: 'film' | 'laminate' | 'pouch' | 'reel' | 'other';
  specifications?: {
    thickness?: string;
    width?: string;
    barrier_properties?: string;
    [key: string]: any;
  };
  safety_data?: {
    migration_limits?: Array<{
      substance: string;
      limit_ppm: number;
      test_method: string;
    }>;
    food_contact_approved?: boolean;
    [key: string]: any;
  };
  supplier_certifications?: string[];
  migration_limits?: Array<{
    substance: string;
    limit_ppm: number;
    test_method: string;
  }>;
  compatibility_matrix?: {
    compatible_with?: string[];
    incompatible_with?: string[];
  };
  brcgs_section?: string;
  active: boolean;
}

export interface PackagingSafetySuggestion {
  material: PackagingMaterial;
  safetyWarnings: string[];
  complianceNotes: string[];
  correctiveActions: string[];
}

export class PackagingSafetyService {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createServerClient();
  }

  /**
   * Search for packaging materials by code or name
   */
  async searchMaterials(query: string): Promise<PackagingMaterial[]> {
    const { data, error } = await (this.supabase
      .from('packaging_materials') as any)
      .select('*')
      .or(`material_code.ilike.%${query}%,material_name.ilike.%${query}%`)
      .eq('active', true)
      .limit(10);

    if (error) {
      console.error('Error searching packaging materials:', error);
      return [];
    }

    return (data || []).map((item: any) => this.mapToPackagingMaterial(item));
  }

  /**
   * Get packaging material by code
   */
  async getMaterialByCode(materialCode: string): Promise<PackagingMaterial | null> {
    const { data, error } = await (this.supabase
      .from('packaging_materials') as any)
      .select('*')
      .eq('material_code', materialCode)
      .eq('active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToPackagingMaterial(data);
  }

  /**
   * Get safety suggestions for a packaging material in context of an NCA
   */
  async getSafetySuggestions(
    materialCode: string,
    _ncDescription: string
  ): Promise<PackagingSafetySuggestion | null> {
    const material = await this.getMaterialByCode(materialCode);
    if (!material) {
      return null;
    }

    const safetyWarnings: string[] = [];
    const complianceNotes: string[] = [];
    const correctiveActions: string[] = [];

    // Check migration limits
    if (material.migration_limits && material.migration_limits.length > 0) {
      complianceNotes.push(
        `Material has ${material.migration_limits.length} migration limit(s) that must be verified per BRCGS 5.8`
      );
    }

    // Check food contact approval
    if (material.safety_data?.food_contact_approved === false) {
      safetyWarnings.push(
        'Material is not approved for direct food contact. Review BRCGS Section 5.8 requirements.'
      );
    }

    // Check compatibility
    if (material.compatibility_matrix?.incompatible_with) {
      safetyWarnings.push(
        `Material has known incompatibilities. Review compatibility matrix before use.`
      );
    }

    // Generate corrective actions based on BRCGS section
    if (material.brcgs_section) {
      correctiveActions.push(
        `Follow BRCGS ${material.brcgs_section} requirements for packaging material non-conformance`
      );
    }

    return {
      material,
      safetyWarnings,
      complianceNotes,
      correctiveActions,
    };
  }

  /**
   * Get BRCGS section reference for packaging materials
   */
  getBRCGSSection(): string {
    return '5.8'; // Foreign Body Contamination Control
  }

  /**
   * Map database record to PackagingMaterial
   */
  private mapToPackagingMaterial(data: any): PackagingMaterial {
    return {
      id: data.id,
      material_code: data.material_code,
      material_name: data.material_name,
      material_type: data.material_type,
      specifications: data.specifications || {},
      safety_data: data.safety_data || {},
      supplier_certifications: data.supplier_certifications || [],
      migration_limits: data.migration_limits || [],
      compatibility_matrix: data.compatibility_matrix || {},
      brcgs_section: data.brcgs_section || '5.8',
      active: data.active ?? true,
    };
  }
}

/**
 * Factory function for dependency injection
 */
export function createPackagingSafetyService(supabase?: SupabaseClient): PackagingSafetyService {
  return new PackagingSafetyService(supabase);
}

