/**
 * Knowledge Base Actions Unit Tests
 * Test admin functions for procedure management
 *
 * Test Strategy:
 * - Verify version control (only ONE current version)
 * - Test BRCGS Section 3.6 compliance
 * - Validate search functionality
 * - Test error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/database/client', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: table === 'knowledge_base_documents'
              ? {
                  id: 'test-doc-id',
                  document_number: '5.7',
                  revision: 8,
                  status: 'current'
                }
              : null,
            error: null
          })),
          textSearch: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [
                {
                  document_number: '5.7',
                  document_name: 'Control of Non-Conforming Product',
                  full_text: 'Test procedure content...',
                  revision: 9,
                  effective_date: '2025-09-02',
                  search_keywords: ['non-conforming', 'product', 'control']
                }
              ],
              error: null
            }))
          })),
          range: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [],
                count: 0,
                error: null
              }))
            }))
          }))
        })),
        or: vi.fn(() => ({
          range: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [],
                count: 0,
                error: null
              }))
            }))
          }))
        })),
        order: vi.fn(() => ({
          data: [],
          error: null
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'new-doc-id' },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: { id: 'test-doc-id' },
          error: null
        }))
      }))
    }))
  }))
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

// Import actions after mocks
import {
  uploadProcedure,
  updateProcedureMetadata,
  obsoleteProcedure,
  searchKnowledgeBase,
  getProcedureByNumber,
  listProcedures,
  getProcedureHistory
} from '@/app/actions/knowledge-base-actions';

// ============================================================================
// Test Data
// ============================================================================

const testProcedureContent = `
# BRCGS Procedure 5.7: Control of Non-Conforming Product

## Purpose
Ensures out-of-specification product is clearly identified, labeled, and quarantined
to prevent customer delivery through NCA system.

## Scope
All non-conforming materials, work-in-progress, and finished goods.

## Responsibilities
- Operators: Identify and report non-conformances
- Team Leaders: Immediate correction and segregation
- QA Supervisor: Disposition decision and verification

## Procedure
1. Identification: Any product outside specification must be immediately identified
2. Labeling: Apply HOLD labels (red) to segregated product
3. Documentation: Complete NCA form in digital system
4. Segregation: Move to designated quarantine area
5. Investigation: Root cause analysis within 24 hours
6. Disposition: Reject, rework, or concession (with authorization)
7. Verification: QA verification before release
8. Close-out: Document corrective actions and preventive measures

## References
- BRCGS Section 5.7
- Related: 3.9 Traceability, 3.11 Corrective Action
`;

const testProcedureMetadata = {
  document_number: '5.7',
  document_name: 'Control of Non-Conforming Product',
  document_type: 'procedure' as const,
  revision: 9,
  brcgs_section: '5.7',
  effective_date: '2025-09-02',
  review_due_date: '2026-09-02',
  summary: 'Ensures out-of-specification product is clearly identified, labeled, and quarantined',
  key_requirements: {
    identification: 'Immediate identification of non-conformances',
    labeling: 'HOLD labels applied',
    segregation: 'Quarantine area separation',
    documentation: 'NCA form completion'
  },
  integration_points: ['3.9', '3.11'],
  form_sections: ['Section 4', 'Section 8', 'Section 10']
};

// ============================================================================
// Upload & Version Control Tests
// ============================================================================

describe('uploadProcedure', () => {
  it('should upload new procedure successfully', async () => {
    const result = await uploadProcedure(testProcedureContent, testProcedureMetadata);

    expect(result.success).toBe(true);
    expect(result.data?.document_id).toBeDefined();
  });

  it('should reject if content too short', async () => {
    const result = await uploadProcedure('Short content', testProcedureMetadata);

    expect(result.success).toBe(false);
    expect(result.error).toContain('too short');
  });

  it('should reject if document number missing', async () => {
    const invalidMetadata = { ...testProcedureMetadata, document_number: '' };
    const result = await uploadProcedure(testProcedureContent, invalidMetadata);

    expect(result.success).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should supersede existing current version', async () => {
    const mockUpdate = vi.fn(() => ({ data: { id: 'old-doc-id' }, error: null }));
    const mockInsert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { id: 'new-doc-id' },
          error: null
        }))
      }))
    }));

    const { createServerClient } = await import('@/lib/database/client');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'existing-doc-id',
                document_number: '5.7',
                revision: 8,
                status: 'current'
              },
              error: null
            }))
          }))
        })),
        update: mockUpdate,
        insert: mockInsert
      }))
    } as any);

    const result = await uploadProcedure(testProcedureContent, testProcedureMetadata);

    expect(result.success).toBe(true);
    // Should have called update to supersede old version
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should reject lower revision number', async () => {
    const { createServerClient } = await import('@/lib/database/client');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'existing-doc-id',
                document_number: '5.7',
                revision: 10, // Higher than test metadata revision 9
                status: 'current'
              },
              error: null
            }))
          }))
        }))
      }))
    } as any);

    const result = await uploadProcedure(testProcedureContent, testProcedureMetadata);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not newer');
  });

  it('should extract keywords from content', async () => {
    const mockInsert = vi.fn((data: any) => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { id: 'new-doc-id' },
          error: null
        }))
      }))
    }));

    const { createServerClient } = await import('@/lib/database/client');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null, // No existing document
              error: null
            }))
          }))
        })),
        insert: mockInsert
      }))
    } as any);

    await uploadProcedure(testProcedureContent, testProcedureMetadata);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        search_keywords: expect.arrayContaining([
          expect.any(String)
        ])
      })
    );
  });
});

describe('updateProcedureMetadata', () => {
  it('should update metadata fields', async () => {
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        data: { id: 'test-doc-id' },
        error: null
      }))
    }));

    const { createServerClient } = await import('@/lib/database/client');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        update: mockUpdate
      }))
    } as any);

    const result = await updateProcedureMetadata('test-doc-id', {
      summary: 'Updated summary',
      review_due_date: '2027-01-01'
    });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      summary: 'Updated summary',
      review_due_date: '2027-01-01'
    });
  });
});

describe('obsoleteProcedure', () => {
  it('should mark procedure as obsolete', async () => {
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        data: { id: 'test-doc-id' },
        error: null
      }))
    }));

    const { createServerClient } = await import('@/lib/database/client');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        update: mockUpdate
      }))
    } as any);

    const result = await obsoleteProcedure('test-doc-id');

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'obsolete' });
  });

  it('should not delete document (maintain audit trail)', async () => {
    const mockDelete = vi.fn();

    const { createServerClient } = await import('@/lib/database/client');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: { id: 'test-doc-id' },
            error: null
          }))
        })),
        delete: mockDelete
      }))
    } as any);

    await obsoleteProcedure('test-doc-id');

    expect(mockDelete).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Search & Retrieval Tests
// ============================================================================

describe('searchKnowledgeBase', () => {
  it('should search by query text', async () => {
    const result = await searchKnowledgeBase('non-conforming product', 5);

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('should return only current versions', async () => {
    const mockTextSearch = vi.fn(() => ({
      limit: vi.fn(() => ({
        data: [
          {
            document_number: '5.7',
            document_name: 'Test Procedure',
            full_text: 'Content...',
            revision: 9,
            effective_date: '2025-09-02',
            status: 'current'
          }
        ],
        error: null
      }))
    }));

    const { createServerClient } = await import('@/lib/database/client');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            textSearch: mockTextSearch
          }))
        }))
      }))
    } as any);

    const result = await searchKnowledgeBase('test query');

    expect(result.success).toBe(true);
    // Should have filtered to status='current'
    expect(mockTextSearch).toHaveBeenCalled();
  });

  it('should return results with relevance scores', async () => {
    const result = await searchKnowledgeBase('non-conformance');

    expect(result.success).toBe(true);
    if (result.data) {
      expect(result.data.every(r => r.relevance_score >= 0 && r.relevance_score <= 1)).toBe(true);
    }
  });

  it('should respect limit parameter', async () => {
    const mockLimit = vi.fn(() => ({
      data: [],
      error: null
    }));

    const { createServerClient } = await import('@/lib/database/client');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            textSearch: vi.fn(() => ({
              limit: mockLimit
            }))
          }))
        }))
      }))
    } as any);

    await searchKnowledgeBase('test', 3);

    expect(mockLimit).toHaveBeenCalledWith(3);
  });
});

describe('getProcedureByNumber', () => {
  it('should retrieve procedure by document number', async () => {
    const { createServerClient } = await import('@/lib/database/client');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'test-doc-id',
                document_number: '5.7',
                document_name: 'Control of Non-Conforming Product',
                document_type: 'procedure',
                revision: 9,
                status: 'current',
                revised_date: '2025-09-02',
                effective_date: '2025-09-02',
                review_due_date: '2026-09-02',
                brcgs_section: '5.7',
                full_text: testProcedureContent,
                summary: 'Test summary',
                key_requirements: {},
                integration_points: ['3.9'],
                form_sections: ['Section 4'],
                search_keywords: ['test'],
                uploaded_at: '2025-09-02',
                reference_count: 5
              },
              error: null
            }))
          }))
        }))
      }))
    } as any);

    const result = await getProcedureByNumber('5.7');

    expect(result.success).toBe(true);
    expect(result.data?.document_number).toBe('5.7');
    expect(result.data?.status).toBe('current');
  });

  it('should return error if procedure not found', async () => {
    const { createServerClient } = await import('@/lib/database/client');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: { message: 'Not found' }
            }))
          }))
        }))
      }))
    } as any);

    const result = await getProcedureByNumber('99.99');

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});

// ============================================================================
// List & Management Tests
// ============================================================================

describe('listProcedures', () => {
  it('should list all procedures', async () => {
    const result = await listProcedures();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data?.procedures)).toBe(true);
  });

  it('should filter by status', async () => {
    const mockEq = vi.fn(() => ({
      range: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            count: 0,
            error: null
          }))
        }))
      }))
    }));

    const { createServerClient } = await import('@/lib/database/client');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: mockEq
        }))
      }))
    } as any);

    await listProcedures({ status: 'current' });

    expect(mockEq).toHaveBeenCalledWith('status', 'current');
  });

  it('should support pagination', async () => {
    const mockRange = vi.fn(() => ({
      order: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          count: 0,
          error: null
        }))
      }))
    }));

    const { createServerClient } = await import('@/lib/database/client');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          range: mockRange
        }))
      }))
    } as any);

    await listProcedures({ limit: 10, offset: 20 });

    expect(mockRange).toHaveBeenCalledWith(20, 29);
  });
});

describe('getProcedureHistory', () => {
  it('should return all versions of a procedure', async () => {
    const { createServerClient } = await import('@/lib/database/client');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [
                {
                  id: 'v9-id',
                  document_number: '5.7',
                  revision: 9,
                  status: 'current',
                  document_name: 'Test',
                  document_type: 'procedure',
                  revised_date: '2025-09-02',
                  effective_date: '2025-09-02',
                  full_text: 'content',
                  uploaded_at: '2025-09-02',
                  reference_count: 10
                },
                {
                  id: 'v8-id',
                  document_number: '5.7',
                  revision: 8,
                  status: 'superseded',
                  document_name: 'Test',
                  document_type: 'procedure',
                  revised_date: '2024-01-15',
                  effective_date: '2024-01-15',
                  full_text: 'old content',
                  uploaded_at: '2024-01-15',
                  reference_count: 5
                }
              ],
              error: null
            }))
          }))
        }))
      }))
    } as any);

    const result = await getProcedureHistory('5.7');

    expect(result.success).toBe(true);
    expect(result.data?.length).toBe(2);
    expect(result.data?.[0].revision).toBe(9);
    expect(result.data?.[0].status).toBe('current');
    expect(result.data?.[1].revision).toBe(8);
    expect(result.data?.[1].status).toBe('superseded');
  });
});

// ============================================================================
// BRCGS Compliance Tests
// ============================================================================

describe('BRCGS Section 3.6 Compliance', () => {
  it('should ensure only ONE current version per document', async () => {
    // This is enforced by database unique constraint
    // Test verifies upload logic supersedes old version

    const mockUpdate = vi.fn(() => ({ data: { id: 'old' }, error: null }));
    const mockInsert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { id: 'new' },
          error: null
        }))
      }))
    }));

    const { createServerClient } = await import('@/lib/database/client');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'existing-id',
                document_number: '5.7',
                revision: 8,
                status: 'current'
              },
              error: null
            }))
          }))
        })),
        update: mockUpdate,
        insert: mockInsert
      }))
    } as any);

    await uploadProcedure(testProcedureContent, testProcedureMetadata);

    // Should have superseded old version before inserting new
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
  });

  it('should maintain audit trail (no deletion)', async () => {
    // Obsolete should update status, not delete
    const mockDelete = vi.fn();
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        data: { id: 'test' },
        error: null
      }))
    }));

    const { createServerClient } = await import('@/lib/database/client');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        update: mockUpdate,
        delete: mockDelete
      }))
    } as any);

    await obsoleteProcedure('test-doc-id');

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
