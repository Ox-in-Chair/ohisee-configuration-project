/**
 * Procedure Upload Types
 * Core type definitions for procedure processing and upload system
 */

/**
 * Procedure metadata extracted from markdown files
 */
export interface ProcedureMetadata {
  document_number: string;
  document_name: string;
  document_type: 'procedure' | 'form' | 'work_instruction' | 'specification';
  revision: number;
  effective_date: string;
  summary: string;
  key_requirements: string[];
  integration_points: string[];
  form_sections: string[];
}

/**
 * Parsed procedure with metadata and content
 */
export interface ParsedProcedure {
  metadata: ProcedureMetadata;
  content: string;
  filePath: string;
}

/**
 * Result of upload operation
 */
export interface UploadResult {
  success: boolean;
  documentId?: string;
  documentNumber: string;
  error?: string;
  supersededId?: string;
}

/**
 * Upload summary across multiple procedures
 */
export interface UploadSummary {
  total: number;
  successful: number;
  failed: number;
  superseded: number;
  results: UploadResult[];
}

/**
 * Supabase client interface (for dependency injection)
 */
export interface ISupabaseClient {
  from(table: string): any;
}

/**
 * File reader interface (for dependency injection)
 */
export interface IFileReader {
  readFile(filePath: string, encoding: string): Promise<string>;
  fileExists(filePath: string): Promise<boolean>;
}

/**
 * Logger interface (for dependency injection)
 */
export interface ILogger {
  info(message: string, context?: any): void;
  error(message: string, error?: any): void;
  warn(message: string, context?: any): void;
}
