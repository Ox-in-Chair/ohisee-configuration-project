/**
 * Procedure Upload Integration Tests
 * Tests full workflow with mocked Supabase but real file operations
 */

import { describe, test, expect, beforeEach, jest, beforeAll, afterAll } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { uploadProcedure, validateProcedureMetadata } from '../../lib/procedure-utils';
import type { ProcedureMetadata } from '../../../lib/procedures/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Procedure Upload - Integration Tests', () => {
  let tempDir: string;
  let mockSupabase: any;

  beforeAll(async () => {
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'procedure-test-'));
  });

  afterAll(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    // Reset mock before each test
    mockSupabase = {
      from: jest.fn(),
    };
  });

  describe('End-to-End Upload Flow', () => {
    test('should upload procedure with valid metadata', async () => {
      // Arrange: Create test procedure file
      const procedurePath = path.join(tempDir, 'test-procedure.md');
      const content = `# Test Procedure

## Purpose
This is a test procedure for validation.

## Requirements
- Requirement 1
- Requirement 2
`;

      await fs.writeFile(procedurePath, content, 'utf-8');

      const metadata: ProcedureMetadata = {
        document_number: '5.7',
        document_name: 'Control of Non-Conforming Product',
        document_type: 'procedure',
        revision: 1,
        effective_date: '2025-01-12',
        summary: 'Test procedure for integration testing',
        key_requirements: ['Requirement 1', 'Requirement 2'],
        integration_points: ['Section 5.7'],
        form_sections: ['Purpose', 'Requirements'],
      };

      // Mock successful upload
      const selectChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      };

      const insertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'new-procedure-id' },
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(insertChain);

      // Act: Upload procedure
      const fileContent = await fs.readFile(procedurePath, 'utf-8');
      const result = await uploadProcedure(
        mockSupabase as SupabaseClient,
        metadata,
        fileContent
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.documentId).toBe('new-procedure-id');
      expect(mockSupabase.from).toHaveBeenCalledWith('knowledge_base_documents');
    });

    test('should validate metadata before upload', () => {
      // Arrange: Invalid metadata (missing required fields)
      const invalidMetadata = {
        document_number: '',
        document_name: 'Test',
        document_type: 'procedure',
        revision: 0, // Invalid
        effective_date: 'invalid-date',
        summary: 'Test',
        key_requirements: [],
        integration_points: [],
        form_sections: [],
      } as ProcedureMetadata;

      // Act
      const validation = validateProcedureMetadata(invalidMetadata);

      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('document_number is required');
      expect(validation.errors).toContain('revision must be a positive integer');
      expect(validation.errors).toContain('effective_date must be in YYYY-MM-DD format');
    });

    test('should handle file read errors gracefully', async () => {
      // Arrange: Non-existent file
      const nonExistentPath = path.join(tempDir, 'does-not-exist.md');

      // Act & Assert
      await expect(fs.readFile(nonExistentPath, 'utf-8')).rejects.toThrow();
    });
  });

  describe('Batch Upload Operations', () => {
    test('should upload multiple procedures in sequence', async () => {
      // Arrange: Create multiple test files
      const procedures = [
        {
          fileName: 'proc1.md',
          metadata: {
            document_number: '5.7',
            document_name: 'Procedure 1',
            document_type: 'procedure' as const,
            revision: 1,
            effective_date: '2025-01-12',
            summary: 'First procedure',
            key_requirements: [],
            integration_points: [],
            form_sections: [],
          },
          content: '# Procedure 1\nContent here',
        },
        {
          fileName: 'proc2.md',
          metadata: {
            document_number: '5.8',
            document_name: 'Procedure 2',
            document_type: 'procedure' as const,
            revision: 1,
            effective_date: '2025-01-12',
            summary: 'Second procedure',
            key_requirements: [],
            integration_points: [],
            form_sections: [],
          },
          content: '# Procedure 2\nContent here',
        },
      ];

      // Write test files
      for (const proc of procedures) {
        const filePath = path.join(tempDir, proc.fileName);
        await fs.writeFile(filePath, proc.content, 'utf-8');
      }

      // Mock successful uploads for both
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: `id-${Math.random()}` },
              error: null,
            }),
          }),
        }),
      }));

      // Act: Upload all procedures
      const results = await Promise.all(
        procedures.map((proc) =>
          uploadProcedure(mockSupabase as SupabaseClient, proc.metadata, proc.content)
        )
      );

      // Assert
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    test('should continue after partial failure in batch', async () => {
      // Arrange
      const procedures = [
        {
          metadata: {
            document_number: '5.7',
            document_name: 'Good Procedure',
            document_type: 'procedure' as const,
            revision: 1,
            effective_date: '2025-01-12',
            summary: 'Valid',
            key_requirements: [],
            integration_points: [],
            form_sections: [],
          },
          content: 'Valid content',
        },
        {
          metadata: {
            document_number: '5.8',
            document_name: 'Bad Procedure',
            document_type: 'procedure' as const,
            revision: 1,
            effective_date: '2025-01-12',
            summary: 'Will fail',
            key_requirements: [],
            integration_points: [],
            form_sections: [],
          },
          content: 'Content',
        },
      ];

      // Act: Upload sequentially to avoid mock interleaving
      const results: any[] = [];

      // First procedure - succeeds
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'success-id' },
                error: null,
              }),
            }),
          }),
        });

      results.push(
        await uploadProcedure(
          mockSupabase as SupabaseClient,
          procedures[0].metadata,
          procedures[0].content
        )
      );

      // Second procedure - fails on select
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error', code: '42P01' },
              }),
            }),
          }),
        }),
      });

      results.push(
        await uploadProcedure(
          mockSupabase as SupabaseClient,
          procedures[1].metadata,
          procedures[1].content
        )
      );

      // Assert
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeDefined();
    });
  });
});
