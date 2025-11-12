/**
 * Upload Procedures Script Tests
 * Tests for procedure upload functionality with dependency injection
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';

// Types for testing
interface ProcedureMetadata {
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

interface UploadResult {
  success: boolean;
  error?: string;
  documentId?: string;
}

// Mock implementations
type MockSupabaseClient = {
  from: jest.Mock<any>;
};

type MockFileSystem = {
  existsSync: jest.Mock<boolean>;
  readFileSync: jest.Mock<string>;
};

describe('Upload Procedures - Core Functions', () => {
  let mockSupabase: MockSupabaseClient;
  let mockFileSystem: MockFileSystem;

  beforeEach(() => {
    // Reset mocks before each test
    mockSupabase = {
      from: jest.fn(),
    };

    mockFileSystem = {
      existsSync: jest.fn<boolean>(),
      readFileSync: jest.fn<string>(),
    };
  });

  describe('uploadProcedure', () => {
    test('should upload new procedure successfully', async () => {
      // Arrange
      const metadata: ProcedureMetadata = {
        document_number: '5.7',
        document_name: 'Control of Non-Conforming Product',
        document_type: 'procedure',
        revision: 1,
        effective_date: '2025-01-10',
        summary: 'Test summary',
        key_requirements: ['Req1'],
        integration_points: ['Section 5.7'],
        form_sections: ['Description'],
      };
      const content = 'Test content';

      // Mock: No existing document (PGRST116 = not found)
      const selectChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' }
              }),
            }),
          }),
        }),
      };

      // Mock: Successful insert
      const insertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'new-doc-id' },
              error: null,
            }),
          }),
        }),
      };

      // Chain the mocks
      mockSupabase.from
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(insertChain);

      // Act
      const uploadProcedure = createUploadProcedure(mockSupabase as any);
      const result = await uploadProcedure(metadata, content);

      // Assert
      expect(result.success).toBe(true);
      expect(result.documentId).toBe('new-doc-id');
      expect(result.error).toBeUndefined();
    });

    test('should supersede existing procedure with same document number', async () => {
      // Arrange
      const metadata: ProcedureMetadata = {
        document_number: '5.7',
        document_name: 'Control of Non-Conforming Product',
        document_type: 'procedure',
        revision: 2,
        effective_date: '2025-01-10',
        summary: 'Updated summary',
        key_requirements: ['Req1'],
        integration_points: ['Section 5.7'],
        form_sections: ['Description'],
      };
      const content = 'Updated content';

      // Mock: Existing document found
      const existingDoc = {
        id: 'old-doc-id',
        revision: 1,
        document_number: '5.7',
      };

      const selectChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: existingDoc, error: null }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(selectChain);

      // Mock: Successful update
      const updateChain = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      };
      mockSupabase.from.mockReturnValueOnce(updateChain);

      // Mock: Successful insert
      const insertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'new-doc-id' },
              error: null,
            }),
          }),
        }),
      };
      mockSupabase.from.mockReturnValueOnce(insertChain);

      // Act
      const uploadProcedure = createUploadProcedure(mockSupabase as any);
      const result = await uploadProcedure(metadata, content);

      // Assert
      expect(result.success).toBe(true);
      expect(updateChain.update).toHaveBeenCalledWith({ status: 'superseded' });
    });

    test('should skip upload if existing revision is higher', async () => {
      // Arrange
      const metadata: ProcedureMetadata = {
        document_number: '5.7',
        document_name: 'Control of Non-Conforming Product',
        document_type: 'procedure',
        revision: 1,
        effective_date: '2025-01-10',
        summary: 'Test summary',
        key_requirements: [],
        integration_points: [],
        form_sections: [],
      };

      // Mock: Existing document with higher revision
      const existingDoc = {
        id: 'existing-doc-id',
        revision: 2,
        document_number: '5.7',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: existingDoc, error: null }),
            }),
          }),
        }),
      });

      // Act
      const uploadProcedure = createUploadProcedure(mockSupabase as any);
      const result = await uploadProcedure(metadata, 'content');

      // Assert
      expect(result.success).toBe(true);
      expect(result.documentId).toBe('existing-doc-id');
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      const metadata: ProcedureMetadata = {
        document_number: '5.7',
        document_name: 'Control of Non-Conforming Product',
        document_type: 'procedure',
        revision: 1,
        effective_date: '2025-01-10',
        summary: 'Test',
        key_requirements: [],
        integration_points: [],
        form_sections: [],
      };

      // Mock: Database error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Connection timeout', code: 'TIMEOUT' },
              }),
            }),
          }),
        }),
      });

      // Act
      const uploadProcedure = createUploadProcedure(mockSupabase as any);
      const result = await uploadProcedure(metadata, 'content');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Connection timeout');
    });
  });

  describe('loadProcedureFile', () => {
    test('should load file from disk successfully', () => {
      // Arrange
      const filePath = '/test/procedure.md';
      const content = '# Test Procedure\nContent here';
      mockFileSystem.existsSync.mockReturnValue(true);
      mockFileSystem.readFileSync.mockReturnValue(content);

      // Act
      const loadProcedureFile = createLoadProcedureFile(mockFileSystem);
      const result = loadProcedureFile(filePath);

      // Assert
      expect(result).toBe(content);
      expect(mockFileSystem.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining(filePath),
        'utf-8'
      );
    });

    test('should throw error when file does not exist', () => {
      // Arrange
      mockFileSystem.existsSync.mockReturnValue(false);

      // Act & Assert
      const loadProcedureFile = createLoadProcedureFile(mockFileSystem);
      expect(() => loadProcedureFile('/nonexistent.md')).toThrow('File not found');
    });

    test('should handle file read errors', () => {
      // Arrange
      mockFileSystem.existsSync.mockReturnValue(true);
      mockFileSystem.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Act & Assert
      const loadProcedureFile = createLoadProcedureFile(mockFileSystem);
      expect(() => loadProcedureFile('/test.md')).toThrow('Permission denied');
    });
  });

  describe('Environment Validation', () => {
    test('should validate all required environment variables', () => {
      // Arrange
      const env = {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-key',
      };

      // Act
      const result = validateEnvironment(env);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    test('should detect missing SUPABASE_URL', () => {
      // Arrange
      const env = {
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        SUPABASE_SERVICE_ROLE_KEY: 'test-key',
      };

      // Act
      const result = validateEnvironment(env);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('NEXT_PUBLIC_SUPABASE_URL');
    });

    test('should detect missing SERVICE_ROLE_KEY', () => {
      // Arrange
      const env = {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      };

      // Act
      const result = validateEnvironment(env);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('SUPABASE_SERVICE_ROLE_KEY');
    });

    test('should detect all missing variables', () => {
      // Arrange
      const env = {};

      // Act
      const result = validateEnvironment(env);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(2);
    });
  });
});

// ============================================================================
// Helper Functions (to be extracted to production code)
// ============================================================================

/**
 * Factory function to create uploadProcedure with injected dependencies
 */
function createUploadProcedure(supabase: SupabaseClient) {
  return async (
    metadata: ProcedureMetadata,
    content: string
  ): Promise<UploadResult> => {
    try {
      // Check for existing current version
      const { data: existing, error: selectError } = await supabase
        .from('knowledge_base_documents')
        .select('id, revision, document_number')
        .eq('document_number', metadata.document_number)
        .eq('status', 'current')
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 = not found (acceptable)
        return { success: false, error: selectError.message };
      }

      // If exists and same/higher revision, skip
      if (existing && existing.revision >= metadata.revision) {
        return { success: true, documentId: existing.id };
      }

      // Supersede old version if exists
      if (existing) {
        const { error: updateError } = await supabase
          .from('knowledge_base_documents')
          .update({ status: 'superseded' })
          .eq('id', existing.id);

        if (updateError) {
          return { success: false, error: updateError.message };
        }
      }

      // Insert new document
      const { data: newDoc, error: insertError } = await supabase
        .from('knowledge_base_documents')
        .insert({
          document_number: metadata.document_number,
          document_name: metadata.document_name,
          document_type: metadata.document_type,
          revision: metadata.revision,
          effective_date: metadata.effective_date,
          summary: metadata.summary,
          content: content,
          key_requirements: metadata.key_requirements,
          integration_points: metadata.integration_points,
          form_sections: metadata.form_sections,
          status: 'current',
        })
        .select('id')
        .single();

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      return { success: true, documentId: newDoc.id };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMsg };
    }
  };
}

/**
 * Factory function to create loadProcedureFile with injected file system
 */
function createLoadProcedureFile(fs: MockFileSystem) {
  return (filePath: string): string => {
    const fullPath = filePath; // In production: path.resolve(filePath)
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    return fs.readFileSync(fullPath, 'utf-8');
  };
}

/**
 * Validate environment variables
 */
function validateEnvironment(env: Record<string, string | undefined>): {
  valid: boolean;
  missing: string[];
} {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter((key) => !env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}
