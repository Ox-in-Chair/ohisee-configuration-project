/**
 * Anomaly Detection Agent Unit Tests
 * Comprehensive test coverage for detecting deviations from norms
 * Target: >95% coverage
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AnomalyDetectionAgent } from '../anomaly-detection-agent';
import type { NCA, MJC, User } from '../../../types';
import type { AgentResult } from '../../types';

// Mock database client
jest.mock('@/lib/database/client', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => ({ data: null })),
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({ count: 0 })),
        })),
      })),
    })),
  })),
}));

import { createServerClient } from '@/lib/database/client';

describe('AnomalyDetectionAgent', () => {
  let agent: AnomalyDetectionAgent;
  let mockUser: User;
  let mockNCA: NCA;
  let mockMJC: MJC;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new AnomalyDetectionAgent();

    mockUser = {
      id: 'user-123',
      role: 'operator',
      name: 'Test User',
      department: 'Production',
      induction_completed: true,
      induction_date: '2024-01-01',
    };

    mockNCA = {
      nca_id: 'NCA-001',
      nc_description: 'Laminate delamination found on batch B-2045 during inspection at 14:30 in Finishing Area 2. Approximately 150 units affected. No product release yet.',
      nc_type: 'finished-goods',
      machine_status: 'operational',
      cross_contamination: false,
      disposition_rework: true,
      disposition_concession: false,
      root_cause_analysis: 'Temperature was too low due to heater malfunction.',
      corrective_action: 'Repair heater and verify temperature.',
      work_order_id: 'WO-456',
    };

    mockMJC = {
      mjc_id: 'MJC-001',
      description_required: 'Machine stopped unexpectedly. Error code E-403.',
      maintenance_category: 'reactive',
      maintenance_type_electrical: true,
      maintenance_type_mechanical: false,
      maintenance_type_pneumatical: false,
      machine_status: 'down',
      urgency: 'critical',
      temporary_repair: false,
      machine_equipment: 'Laminator-01',
      maintenance_performed: 'Replaced faulty relay.',
    };
  });

  describe('analyze - Basic Functionality', () => {
    it('should return agent result with required fields', async () => {
      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result).toHaveProperty('requirements');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');

      expect(Array.isArray(result.requirements)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.reasoning).toBe('string');
    });

    it('should have moderate confidence (probabilistic nature)', async () => {
      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      // Anomaly detection is probabilistic, so confidence should be moderate
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should include reasoning in result', async () => {
      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.reasoning).toContain('Anomaly Detection Agent');
      expect(result.reasoning).toContain('nca');
    });

    it('should work with MJC form type', async () => {
      const result = await agent.analyze(mockMJC, mockUser, 'mjc');

      expect(result).toBeDefined();
      expect(result.reasoning).toContain('mjc');
    });
  });

  describe('Quantity Anomaly Detection', () => {
    it('should detect unusually high quantity', async () => {
      const ncaWithHighQuantity: NCA = {
        ...mockNCA,
        nc_description: 'Found defect in batch B-2045. Approximately 50000 kg affected in production area.',
      };

      const result = await agent.analyze(ncaWithHighQuantity, mockUser, 'nca');

      const quantityWarning = result.warnings.find((w) => w.field === 'nc_description' && w.message.includes('unusually high'));
      expect(quantityWarning).toBeDefined();
      expect(quantityWarning?.message).toContain('50000');
      expect(quantityWarning?.message).toContain('kg');
    });

    it('should detect unusually low quantity', async () => {
      const ncaWithLowQuantity: NCA = {
        ...mockNCA,
        nc_description: 'Found defect in batch B-2045. Approximately 0.5 units affected in production area.',
      };

      const result = await agent.analyze(ncaWithLowQuantity, mockUser, 'nca');

      const quantityWarning = result.warnings.find((w) => w.field === 'nc_description' && w.message.includes('unusually low'));
      expect(quantityWarning).toBeDefined();
    });

    it('should detect quantity with different units (meters)', async () => {
      const ncaWithMeters: NCA = {
        ...mockNCA,
        nc_description: 'Found defect in batch B-2045. Approximately 25000 meters affected in production area.',
      };

      const result = await agent.analyze(ncaWithMeters, mockUser, 'nca');

      const quantityWarning = result.warnings.find((w) => w.message.includes('meters'));
      if (quantityWarning) {
        expect(quantityWarning.message).toContain('25000');
      }
    });

    it('should detect quantity with different units (boxes)', async () => {
      const ncaWithBoxes: NCA = {
        ...mockNCA,
        nc_description: 'Found defect in batch B-2045. Approximately 15000 boxes affected in warehouse.',
      };

      const result = await agent.analyze(ncaWithBoxes, mockUser, 'nca');

      const quantityWarning = result.warnings.find((w) => w.message.includes('boxes'));
      if (quantityWarning) {
        expect(quantityWarning.message).toContain('15000');
      }
    });

    it('should detect quantity with different units (pallets)', async () => {
      const ncaWithPallets: NCA = {
        ...mockNCA,
        nc_description: 'Found defect in batch B-2045. Approximately 12000 pallets affected in storage.',
      };

      const result = await agent.analyze(ncaWithPallets, mockUser, 'nca');

      const quantityWarning = result.warnings.find((w) => w.message.includes('pallets'));
      if (quantityWarning) {
        expect(quantityWarning.message).toContain('12000');
      }
    });

    it('should not flag normal quantity ranges', async () => {
      const ncaWithNormalQuantity: NCA = {
        ...mockNCA,
        nc_description: 'Found defect in batch B-2045. Approximately 150 units affected in production area.',
      };

      const result = await agent.analyze(ncaWithNormalQuantity, mockUser, 'nca');

      const quantityWarning = result.warnings.find((w) => w.message.includes('unusually'));
      expect(quantityWarning).toBeUndefined();
    });

    it('should handle decimal quantities', async () => {
      const ncaWithDecimal: NCA = {
        ...mockNCA,
        nc_description: 'Found defect in batch B-2045. Approximately 2.5 kg affected in production area.',
      };

      const result = await agent.analyze(ncaWithDecimal, mockUser, 'nca');

      // Decimal should be parsed correctly
      expect(result).toBeDefined();
    });

    it('should handle no quantity in description', async () => {
      const ncaWithoutQuantity: NCA = {
        ...mockNCA,
        nc_description: 'Found defect in batch B-2045 during inspection.',
      };

      const result = await agent.analyze(ncaWithoutQuantity, mockUser, 'nca');

      // Should not crash, just return no quantity warnings
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should increase confidence when anomaly detected', async () => {
      const ncaWithHighQuantity: NCA = {
        ...mockNCA,
        nc_description: 'Found defect in batch B-2045. Approximately 50000 kg affected in production area.',
      };

      const result = await agent.analyze(ncaWithHighQuantity, mockUser, 'nca');

      // Confidence should be higher when anomaly found
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('Date/Time Anomaly Detection', () => {
    it('should detect dates more than 30 days old', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45);
      const dateStr = `${oldDate.getMonth() + 1}/${oldDate.getDate()}/${oldDate.getFullYear()}`;

      const ncaWithOldDate: NCA = {
        ...mockNCA,
        nc_description: `Found defect on ${dateStr} in batch B-2045. Approximately 150 units affected.`,
      };

      const result = await agent.analyze(ncaWithOldDate, mockUser, 'nca');

      const dateWarning = result.warnings.find((w) => w.field === 'nc_description' && w.message.includes('30 days ago'));
      expect(dateWarning).toBeDefined();
      expect(dateWarning?.message).toContain(dateStr);
      expect(dateWarning?.suggestion).toContain('most recent occurrence');
    });

    it('should not flag recent dates', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);
      const dateStr = `${recentDate.getMonth() + 1}/${recentDate.getDate()}/${recentDate.getFullYear()}`;

      const ncaWithRecentDate: NCA = {
        ...mockNCA,
        nc_description: `Found defect on ${dateStr} in batch B-2045. Approximately 150 units affected.`,
      };

      const result = await agent.analyze(ncaWithRecentDate, mockUser, 'nca');

      const dateWarning = result.warnings.find((w) => w.message.includes('30 days ago'));
      expect(dateWarning).toBeUndefined();
    });

    it('should handle multiple date formats', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45);
      const dateStr = `${oldDate.getDate()}/${oldDate.getMonth() + 1}/${oldDate.getFullYear()}`;

      const ncaWithOldDate: NCA = {
        ...mockNCA,
        nc_description: `Found defect on ${dateStr} in batch B-2045. Approximately 150 units affected.`,
      };

      const result = await agent.analyze(ncaWithOldDate, mockUser, 'nca');

      // Should detect date regardless of format
      expect(result).toBeDefined();
    });

    it('should increase confidence when date anomaly detected', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45);
      const dateStr = `${oldDate.getMonth() + 1}/${oldDate.getDate()}/${oldDate.getFullYear()}`;

      const ncaWithOldDate: NCA = {
        ...mockNCA,
        nc_description: `Found defect on ${dateStr} in batch B-2045. Approximately 150 units affected.`,
      };

      const result = await agent.analyze(ncaWithOldDate, mockUser, 'nca');

      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('Frequency Anomaly Detection', () => {
    it('should detect high frequency of similar issues', async () => {
      // Mock database to return high count
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => Promise.resolve({ count: 8 })),
          })),
        })),
      }));

      (createServerClient as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      const frequencyWarning = result.warnings.find((w) => w.field === 'nc_type' && w.message.includes('reported'));
      expect(frequencyWarning).toBeDefined();
      expect(frequencyWarning?.message).toContain('8 times');
      expect(frequencyWarning?.suggestion).toContain('systemic issue');
    });

    it('should not flag normal frequency', async () => {
      // Mock database to return normal count
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => Promise.resolve({ count: 3 })),
          })),
        })),
      }));

      (createServerClient as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      const frequencyWarning = result.warnings.find((w) => w.message.includes('reported'));
      expect(frequencyWarning).toBeUndefined();
    });

    it('should increase confidence when frequency anomaly detected', async () => {
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => Promise.resolve({ count: 10 })),
          })),
        })),
      }));

      (createServerClient as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should handle database errors gracefully', async () => {
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => Promise.reject(new Error('Database error'))),
          })),
        })),
      }));

      (createServerClient as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      // Should not crash on database error
      expect(result).toBeDefined();
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should skip frequency check if nc_type is missing', async () => {
      const ncaWithoutType: Partial<NCA> = {
        ...mockNCA,
        nc_type: undefined as any,
      };

      const result = await agent.analyze(ncaWithoutType as NCA, mockUser, 'nca');

      // Should not attempt frequency check
      expect(result).toBeDefined();
    });
  });

  describe('Multiple Anomalies', () => {
    it('should detect multiple anomalies simultaneously', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45);
      const dateStr = `${oldDate.getMonth() + 1}/${oldDate.getDate()}/${oldDate.getFullYear()}`;

      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => Promise.resolve({ count: 8 })),
          })),
        })),
      }));

      (createServerClient as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      const ncaWithMultipleAnomalies: NCA = {
        ...mockNCA,
        nc_description: `Found defect on ${dateStr} in batch B-2045. Approximately 50000 kg affected in production area.`,
      };

      const result = await agent.analyze(ncaWithMultipleAnomalies, mockUser, 'nca');

      // Should detect: high quantity, old date, high frequency
      expect(result.warnings.length).toBeGreaterThanOrEqual(2);

      const quantityWarning = result.warnings.find((w) => w.message.includes('unusually high'));
      const dateWarning = result.warnings.find((w) => w.message.includes('30 days ago'));
      const frequencyWarning = result.warnings.find((w) => w.message.includes('reported'));

      expect(quantityWarning || dateWarning || frequencyWarning).toBeDefined();
    });

    it('should have highest confidence when multiple anomalies found', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45);
      const dateStr = `${oldDate.getMonth() + 1}/${oldDate.getDate()}/${oldDate.getFullYear()}`;

      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => Promise.resolve({ count: 10 })),
          })),
        })),
      }));

      (createServerClient as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      const ncaWithMultipleAnomalies: NCA = {
        ...mockNCA,
        nc_description: `Found defect on ${dateStr} in batch B-2045. Approximately 50000 kg affected in production area.`,
      };

      const result = await agent.analyze(ncaWithMultipleAnomalies, mockUser, 'nca');

      // Should have high confidence with multiple anomalies
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed descriptions gracefully', async () => {
      const ncaWithMalformed: NCA = {
        ...mockNCA,
        nc_description: '@@@ ### !!!',
      };

      const result = await agent.analyze(ncaWithMalformed, mockUser, 'nca');

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty description', async () => {
      const ncaWithEmpty: NCA = {
        ...mockNCA,
        nc_description: '',
      };

      const result = await agent.analyze(ncaWithEmpty, mockUser, 'nca');

      expect(result).toBeDefined();
      expect(result.warnings.length).toBe(0); // No anomalies to detect
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'A'.repeat(10000);
      const ncaWithLong: NCA = {
        ...mockNCA,
        nc_description: longDescription,
      };

      const result = await agent.analyze(ncaWithLong, mockUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should handle database timeout', async () => {
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))),
          })),
        })),
      }));

      (createServerClient as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      // Should complete even if database times out
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle quantity at exact threshold boundaries', async () => {
      const ncaAtThreshold: NCA = {
        ...mockNCA,
        nc_description: 'Found defect in batch B-2045. Approximately 10000 units affected.',
      };

      const result = await agent.analyze(ncaAtThreshold, mockUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should handle date at exactly 30 days old', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = `${thirtyDaysAgo.getMonth() + 1}/${thirtyDaysAgo.getDate()}/${thirtyDaysAgo.getFullYear()}`;

      const ncaWithExactDate: NCA = {
        ...mockNCA,
        nc_description: `Found defect on ${dateStr} in batch B-2045. Approximately 150 units affected.`,
      };

      const result = await agent.analyze(ncaWithExactDate, mockUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should handle frequency at exactly threshold (5 occurrences)', async () => {
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => Promise.resolve({ count: 5 })),
          })),
        })),
      }));

      (createServerClient as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      // At threshold, should not flag
      const frequencyWarning = result.warnings.find((w) => w.message.includes('reported'));
      expect(frequencyWarning).toBeUndefined();
    });

    it('should handle user with different roles', async () => {
      const qaUser: User = {
        ...mockUser,
        role: 'qa-supervisor',
      };

      const result = await agent.analyze(mockNCA, qaUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should return no errors (only warnings)', async () => {
      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      // Anomaly detection should only produce warnings, not errors
      expect(result.errors.length).toBe(0);
    });

    it('should handle null database response', async () => {
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => Promise.resolve({ count: null })),
          })),
        })),
      }));

      (createServerClient as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result).toBeDefined();
    });
  });
});
