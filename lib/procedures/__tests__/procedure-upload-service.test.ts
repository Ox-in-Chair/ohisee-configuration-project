/**
 * Unit Tests - Procedure Upload Service
 * Tests for uploading BRCGS procedures to knowledge base
 * Target: >95% coverage
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { ProcedureUploadService } from '../procedure-upload-service';
import type { ISupabaseClient, ILogger, ProcedureMetadata } from '../types';

describe('ProcedureUploadService', () => {
  let mockSupabaseClient: jest.Mocked<ISupabaseClient>;
  let mockLogger: jest.Mocked<ILogger>;
  let service: ProcedureUploadService;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockInsert: jest.Mock;

  beforeEach(() => {
    // Create mock chain for Supabase queries
    mockSingle = jest.fn();
    mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
    });

    mockSupabaseClient = {
      from: mockFrom,
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    service = new ProcedureUploadService(mockSupabaseClient, mockLogger);
  });

  describe('constructor', () => {
    test('should initialize and log', () => {
      expect(mockLogger.info).toHaveBeenCalledWith('ProcedureUploadService initialized');
    });
  });

  describe('uploadProcedure', () => {
    const validMetadata: ProcedureMetadata = {
      document_number: '5.7',
      document_name: 'Control of Non-Conforming Product',
      document_type: 'procedure',
      revision: 9,
      effective_date: '2025-01-15',
      summary: 'Procedure for handling non-conformances',
      key_requirements: ['Segregation', 'Investigation'],
      integration_points: ['NCAs', 'Quality Control'],
      form_sections: ['Section 1', 'Section 2'],
    };

    const validContent = 'Full procedure content goes here...';

    describe('first upload (no existing version)', () => {
      test('should successfully upload new procedure', async () => {
        // Mock: No existing version found
        mockEq.mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }, // No rows found
          }),
        });

        // Mock: Successful insert
        mockSingle.mockResolvedValueOnce({
          data: { id: 'new-doc-id-123' },
          error: null,
        });

        const result = await service.uploadProcedure(validMetadata, validContent);

        expect(result.success).toBe(true);
        expect(result.documentId).toBe('new-doc-id-123');
        expect(result.documentNumber).toBe('5.7');
        expect(result.supersededId).toBeUndefined();
        expect(mockLogger.info).toHaveBeenCalledWith('No existing version found (first upload)');
        expect(mockLogger.info).toHaveBeenCalledWith('✅ Uploaded 5.7 successfully (ID: new-doc-id-123)');
      });

      test('should insert with all metadata fields', async () => {
        mockEq.mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        });

        mockSingle.mockResolvedValueOnce({
          data: { id: 'new-id' },
          error: null,
        });

        await service.uploadProcedure(validMetadata, validContent);

        expect(mockInsert).toHaveBeenCalledWith({
          document_number: '5.7',
          document_name: 'Control of Non-Conforming Product',
          document_type: 'procedure',
          revision: 9,
          revised_date: '2025-01-15',
          effective_date: '2025-01-15',
          summary: 'Procedure for handling non-conformances',
          full_text: validContent,
          key_requirements: ['Segregation', 'Investigation'],
          integration_points: ['NCAs', 'Quality Control'],
          form_sections: ['Section 1', 'Section 2'],
          status: 'current',
        });
      });
    });

    describe('update existing version', () => {
      test('should supersede old version and upload new version', async () => {
        // Mock: Existing version found
        mockEq.mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: { id: 'old-doc-id-456', document_number: '5.7', revision: 8 },
            error: null,
          }),
        });

        // Mock: Successful supersede
        mockEq.mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        });

        // Mock: Successful new insert
        mockSingle.mockResolvedValueOnce({
          data: { id: 'new-doc-id-789' },
          error: null,
        });

        const result = await service.uploadProcedure(validMetadata, validContent);

        expect(result.success).toBe(true);
        expect(result.documentId).toBe('new-doc-id-789');
        expect(result.supersededId).toBe('old-doc-id-456');
        expect(mockUpdate).toHaveBeenCalledWith({ status: 'superseded' });
        expect(mockLogger.info).toHaveBeenCalledWith('Found existing 5.7 (ID: old-doc-id-456, Rev 8)');
        expect(mockLogger.info).toHaveBeenCalledWith('✓ Superseded old version (ID: old-doc-id-456)');
      });

      test('should handle supersede update failure', async () => {
        // Mock: Existing version found
        mockEq.mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: { id: 'old-id', document_number: '5.7', revision: 8 },
            error: null,
          }),
        });

        // Mock: Supersede update fails
        mockEq.mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Update permission denied' },
          }),
        });

        const result = await service.uploadProcedure(validMetadata, validContent);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to supersede');
        expect(mockLogger.error).toHaveBeenCalledWith(
          '❌ Failed to upload 5.7:',
          expect.stringContaining('Failed to supersede')
        );
      });
    });

    describe('error handling', () => {
      test('should handle select query error', async () => {
        mockEq.mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'SOME_ERROR', message: 'Database connection failed' },
          }),
        });

        const result = await service.uploadProcedure(validMetadata, validContent);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Query error');
        expect(result.documentNumber).toBe('5.7');
      });

      test('should handle insert error', async () => {
        mockEq.mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        });

        mockSingle.mockResolvedValueOnce({
          data: null,
          error: { message: 'Unique constraint violation' },
        });

        const result = await service.uploadProcedure(validMetadata, validContent);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Insert failed');
      });

      test('should handle unexpected errors', async () => {
        mockFrom.mockImplementation(() => {
          throw new Error('Unexpected database error');
        });

        const result = await service.uploadProcedure(validMetadata, validContent);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unexpected database error');
        expect(mockLogger.error).toHaveBeenCalledWith(
          '❌ Failed to upload 5.7:',
          'Unexpected database error'
        );
      });

      test('should handle non-Error thrown objects', async () => {
        mockFrom.mockImplementation(() => {
          throw 'String error';
        });

        const result = await service.uploadProcedure(validMetadata, validContent);

        expect(result.success).toBe(false);
        expect(result.error).toBe('String error');
      });
    });

    describe('various document types', () => {
      test('should upload procedure with minimal metadata', async () => {
        const minimalMetadata: ProcedureMetadata = {
          document_number: '3.10',
          document_name: 'Complaint Handling',
          document_type: 'procedure',
          revision: 1,
          effective_date: '2025-02-01',
          summary: 'Basic summary',
          key_requirements: [],
          integration_points: [],
          form_sections: [],
        };

        mockEq.mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        });

        mockSingle.mockResolvedValueOnce({
          data: { id: 'minimal-id' },
          error: null,
        });

        const result = await service.uploadProcedure(minimalMetadata, 'Content');

        expect(result.success).toBe(true);
        expect(result.documentNumber).toBe('3.10');
      });

      test('should upload work instruction document type', async () => {
        const wiMetadata: ProcedureMetadata = {
          ...validMetadata,
          document_number: 'WI-001',
          document_type: 'work_instruction',
        };

        mockEq.mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        });

        mockSingle.mockResolvedValueOnce({
          data: { id: 'wi-id' },
          error: null,
        });

        const result = await service.uploadProcedure(wiMetadata, 'WI content');

        expect(result.success).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({ document_type: 'work_instruction' })
        );
      });

      test('should handle long content', async () => {
        const longContent = 'x'.repeat(50000);

        mockEq.mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        });

        mockSingle.mockResolvedValueOnce({
          data: { id: 'long-id' },
          error: null,
        });

        const result = await service.uploadProcedure(validMetadata, longContent);

        expect(result.success).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({ full_text: longContent })
        );
      });
    });

    describe('logging behavior', () => {
      test('should log all steps of successful upload', async () => {
        mockEq.mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        });

        mockSingle.mockResolvedValueOnce({
          data: { id: 'test-id' },
          error: null,
        });

        await service.uploadProcedure(validMetadata, validContent);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Uploading procedure 5.7: Control of Non-Conforming Product'
        );
        expect(mockLogger.info).toHaveBeenCalledWith('No existing version found (first upload)');
        expect(mockLogger.info).toHaveBeenCalledWith('✅ Uploaded 5.7 successfully (ID: test-id)');
      });

      test('should log supersede steps', async () => {
        mockEq.mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: { id: 'old-id', document_number: '5.7', revision: 5 },
            error: null,
          }),
        });

        mockEq.mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        });

        mockSingle.mockResolvedValueOnce({
          data: { id: 'new-id' },
          error: null,
        });

        await service.uploadProcedure(validMetadata, validContent);

        expect(mockLogger.info).toHaveBeenCalledWith('Found existing 5.7 (ID: old-id, Rev 5)');
        expect(mockLogger.info).toHaveBeenCalledWith('Superseding old version...');
        expect(mockLogger.info).toHaveBeenCalledWith('✓ Superseded old version (ID: old-id)');
      });
    });
  });

  describe('uploadBatch', () => {
    const procedure1: ProcedureMetadata = {
      document_number: '5.7',
      document_name: 'Procedure 1',
      document_type: 'procedure',
      revision: 1,
      effective_date: '2025-01-01',
      summary: 'Summary 1',
      key_requirements: [],
      integration_points: [],
      form_sections: [],
    };

    const procedure2: ProcedureMetadata = {
      document_number: '3.10',
      document_name: 'Procedure 2',
      document_type: 'procedure',
      revision: 1,
      effective_date: '2025-01-02',
      summary: 'Summary 2',
      key_requirements: [],
      integration_points: [],
      form_sections: [],
    };

    test('should upload multiple procedures successfully', async () => {
      // Mock successful uploads for both procedures
      mockEq
        .mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        })
        .mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        });

      mockSingle
        .mockResolvedValueOnce({
          data: { id: 'id-1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'id-2' },
          error: null,
        });

      const procedures = [
        { metadata: procedure1, content: 'Content 1' },
        { metadata: procedure2, content: 'Content 2' },
      ];

      const results = await service.uploadBatch(procedures);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].documentId).toBe('id-1');
      expect(results[1].success).toBe(true);
      expect(results[1].documentId).toBe('id-2');
      expect(mockLogger.info).toHaveBeenCalledWith('Starting batch upload of 2 procedures');
      expect(mockLogger.info).toHaveBeenCalledWith('Batch upload complete: 2 succeeded, 0 failed');
    });

    test('should handle partial failures in batch', async () => {
      // First succeeds, second fails
      mockEq
        .mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        })
        .mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'ERROR', message: 'Database error' },
          }),
        });

      mockSingle.mockResolvedValueOnce({
        data: { id: 'id-1' },
        error: null,
      });

      const procedures = [
        { metadata: procedure1, content: 'Content 1' },
        { metadata: procedure2, content: 'Content 2' },
      ];

      const results = await service.uploadBatch(procedures);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Query error');
      expect(mockLogger.info).toHaveBeenCalledWith('Batch upload complete: 1 succeeded, 1 failed');
    });

    test('should handle empty batch', async () => {
      const results = await service.uploadBatch([]);

      expect(results).toHaveLength(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Starting batch upload of 0 procedures');
      expect(mockLogger.info).toHaveBeenCalledWith('Batch upload complete: 0 succeeded, 0 failed');
    });

    test('should process procedures sequentially', async () => {
      const callOrder: string[] = [];

      mockEq.mockImplementation(() => ({
        single: jest.fn().mockImplementation(() => {
          callOrder.push('query');
          return Promise.resolve({
            data: null,
            error: { code: 'PGRST116' },
          });
        }),
      }));

      mockSingle.mockImplementation(() => {
        callOrder.push('insert');
        return Promise.resolve({
          data: { id: 'test-id' },
          error: null,
        });
      });

      const procedures = [
        { metadata: procedure1, content: 'Content 1' },
        { metadata: procedure2, content: 'Content 2' },
      ];

      await service.uploadBatch(procedures);

      // Should alternate query-insert for each procedure sequentially
      expect(callOrder).toEqual(['query', 'insert', 'query', 'insert']);
    });

    test('should upload large batch', async () => {
      const largeBatch = Array.from({ length: 10 }, (_, i) => ({
        metadata: {
          ...procedure1,
          document_number: `5.${i}`,
          document_name: `Procedure ${i}`,
        },
        content: `Content ${i}`,
      }));

      mockEq.mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      });

      mockSingle.mockResolvedValue({
        data: { id: 'batch-id' },
        error: null,
      });

      const results = await service.uploadBatch(largeBatch);

      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Starting batch upload of 10 procedures');
      expect(mockLogger.info).toHaveBeenCalledWith('Batch upload complete: 10 succeeded, 0 failed');
    });

    test('should continue processing after individual failure', async () => {
      // First fails, second succeeds, third fails
      mockEq
        .mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'ERROR', message: 'Error 1' },
          }),
        })
        .mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        })
        .mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'ERROR', message: 'Error 3' },
          }),
        });

      mockSingle.mockResolvedValueOnce({
        data: { id: 'success-id' },
        error: null,
      });

      const procedures = [
        { metadata: { ...procedure1, document_number: '1' }, content: 'C1' },
        { metadata: { ...procedure1, document_number: '2' }, content: 'C2' },
        { metadata: { ...procedure1, document_number: '3' }, content: 'C3' },
      ];

      const results = await service.uploadBatch(procedures);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('Batch upload complete: 1 succeeded, 2 failed');
    });
  });
});
