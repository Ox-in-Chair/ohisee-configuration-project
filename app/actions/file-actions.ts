'use server';

/**
 * OHiSee File Upload System - Server Actions
 * Handles file upload/download for NCA and MJC attachments
 * Architecture: Dependency injection pattern - no static calls
 */

import { createServerClient } from '@/lib/database/client';
import { revalidatePath } from 'next/cache';
import type { ActionResponse } from './types';

/**
 * Allowed file types for NCA attachments
 */
const NCA_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

/**
 * Allowed file types for MJC attachments
 */
const MJC_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

/**
 * Maximum file size: 10MB
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/**
 * Upload file to NCA attachments
 * Server Action - called from client components
 */
export async function uploadNCAFile(
  ncaId: string,
  formData: FormData
): Promise<ActionResponse<{ path: string; url: string }>> {
  try {
    const file = formData.get('file') as File;

    if (!file) {
      return {
        success: false,
        error: 'No file provided',
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      };
    }

    // Validate file type
    if (!NCA_ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: `File type not allowed: ${file.type}`,
      };
    }

    // Create server-side Supabase client (dependency injection)
    const supabase = createServerClient();

    // Verify NCA exists and user has access
    const { data: nca, error: ncaError } = await supabase
      .from('ncas')
      .select('id, created_by')
      .eq('id', ncaId)
      .single();

    if (ncaError || !nca) {
      return {
        success: false,
        error: 'NCA not found or access denied',
      };
    }

    // Generate safe filename with timestamp
    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${ncaId}/${timestamp}_${safeFilename}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('nca-attachments')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`,
      };
    }

    // Get public URL (will be signed URL for private buckets)
    const { data: urlData } = supabase.storage
      .from('nca-attachments')
      .getPublicUrl(filePath);

    // Revalidate NCA page
    revalidatePath(`/nca/${ncaId}`);

    return {
      success: true,
      data: {
        path: uploadData.path,
        url: urlData.publicUrl,
      },
    };
  } catch (error) {
    console.error('Unexpected error uploading NCA file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Upload file to MJC attachments
 * Server Action - called from client components
 */
export async function uploadMJCFile(
  mjcId: string,
  formData: FormData
): Promise<ActionResponse<{ path: string; url: string }>> {
  try {
    const file = formData.get('file') as File;

    if (!file) {
      return {
        success: false,
        error: 'No file provided',
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      };
    }

    // Validate file type
    if (!MJC_ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: `File type not allowed: ${file.type}`,
      };
    }

    // Create server-side Supabase client (dependency injection)
    const supabase = createServerClient();

    // Verify MJC exists and user has access
    const { data: mjc, error: mjcError } = await supabase
      .from('mjcs')
      .select('id, created_by')
      .eq('id', mjcId)
      .single();

    if (mjcError || !mjc) {
      return {
        success: false,
        error: 'MJC not found or access denied',
      };
    }

    // Generate safe filename with timestamp
    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${mjcId}/${timestamp}_${safeFilename}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('mjc-attachments')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`,
      };
    }

    // Get public URL (will be signed URL for private buckets)
    const { data: urlData } = supabase.storage
      .from('mjc-attachments')
      .getPublicUrl(filePath);

    // Revalidate MJC page
    revalidatePath(`/mjc/${mjcId}`);

    return {
      success: true,
      data: {
        path: uploadData.path,
        url: urlData.publicUrl,
      },
    };
  } catch (error) {
    console.error('Unexpected error uploading MJC file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * List files for a specific NCA
 */
export async function listNCAFiles(
  ncaId: string
): Promise<ActionResponse<Array<{ name: string; size: number; created_at: string }>>> {
  try {
    const supabase = createServerClient();

    // Verify NCA exists
    const { data: nca, error: ncaError } = await supabase
      .from('ncas')
      .select('id')
      .eq('id', ncaId)
      .single();

    if (ncaError || !nca) {
      return {
        success: false,
        error: 'NCA not found',
      };
    }

    // List files in NCA folder
    const { data: files, error: listError } = await supabase.storage
      .from('nca-attachments')
      .list(ncaId, {
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (listError) {
      console.error('Storage list error:', listError);
      return {
        success: false,
        error: `Failed to list files: ${listError.message}`,
      };
    }

    return {
      success: true,
      data: files.map(file => ({
        name: file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at,
      })),
    };
  } catch (error) {
    console.error('Unexpected error listing NCA files:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * List files for a specific MJC
 */
export async function listMJCFiles(
  mjcId: string
): Promise<ActionResponse<Array<{ name: string; size: number; created_at: string }>>> {
  try {
    const supabase = createServerClient();

    // Verify MJC exists
    const { data: mjc, error: mjcError } = await supabase
      .from('mjcs')
      .select('id')
      .eq('id', mjcId)
      .single();

    if (mjcError || !mjc) {
      return {
        success: false,
        error: 'MJC not found',
      };
    }

    // List files in MJC folder
    const { data: files, error: listError } = await supabase.storage
      .from('mjc-attachments')
      .list(mjcId, {
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (listError) {
      console.error('Storage list error:', listError);
      return {
        success: false,
        error: `Failed to list files: ${listError.message}`,
      };
    }

    return {
      success: true,
      data: files.map(file => ({
        name: file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at,
      })),
    };
  } catch (error) {
    console.error('Unexpected error listing MJC files:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Delete file from NCA attachments
 */
export async function deleteNCAFile(
  ncaId: string,
  filename: string
): Promise<ActionResponse> {
  try {
    const supabase = createServerClient();

    // Verify NCA exists and user has access
    const { data: nca, error: ncaError } = await supabase
      .from('ncas')
      .select('id')
      .eq('id', ncaId)
      .single();

    if (ncaError || !nca) {
      return {
        success: false,
        error: 'NCA not found or access denied',
      };
    }

    const filePath = `${ncaId}/${filename}`;

    // Delete file
    const { error: deleteError } = await supabase.storage
      .from('nca-attachments')
      .remove([filePath]);

    if (deleteError) {
      console.error('Storage delete error:', deleteError);
      return {
        success: false,
        error: `Delete failed: ${deleteError.message}`,
      };
    }

    // Revalidate NCA page
    revalidatePath(`/nca/${ncaId}`);

    return {
      success: true,
      data: { message: 'File deleted successfully' },
    };
  } catch (error) {
    console.error('Unexpected error deleting NCA file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Delete file from MJC attachments
 */
export async function deleteMJCFile(
  mjcId: string,
  filename: string
): Promise<ActionResponse> {
  try {
    const supabase = createServerClient();

    // Verify MJC exists and user has access
    const { data: mjc, error: mjcError } = await supabase
      .from('mjcs')
      .select('id')
      .eq('id', mjcId)
      .single();

    if (mjcError || !mjc) {
      return {
        success: false,
        error: 'MJC not found or access denied',
      };
    }

    const filePath = `${mjcId}/${filename}`;

    // Delete file
    const { error: deleteError } = await supabase.storage
      .from('mjc-attachments')
      .remove([filePath]);

    if (deleteError) {
      console.error('Storage delete error:', deleteError);
      return {
        success: false,
        error: `Delete failed: ${deleteError.message}`,
      };
    }

    // Revalidate MJC page
    revalidatePath(`/mjc/${mjcId}`);

    return {
      success: true,
      data: { message: 'File deleted successfully' },
    };
  } catch (error) {
    console.error('Unexpected error deleting MJC file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
