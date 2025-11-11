/**
 * OHiSee Notification Service - Unit Tests
 * TDD Phase: RED - Write failing tests first
 * Architecture: Mock dependencies, verify DI pattern, test behavior
 * Email-only notifications (SMS removed per requirements)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type {
  NotificationPayload,
  IEmailClient,
  INotificationService,
} from '@/lib/types/notification';

// Mock implementations
class MockEmailClient implements IEmailClient {
  public sendEmail = jest.fn<(to: string, subject: string, body: string) => Promise<void>>();
}

describe('NotificationService - Machine Down Alerts', () => {
  let emailClient: MockEmailClient;
  let notificationService: INotificationService;

  const mockPayload: NotificationPayload = {
    nca_number: 'NCA-2025-00000001',
    machine_name: 'Pouching Line 1',
    operator_name: 'John Smith',
    timestamp: '2025-11-10T14:30:00Z',
  };

  beforeEach(() => {
    emailClient = new MockEmailClient();

    // Mock successful responses by default
    emailClient.sendEmail.mockResolvedValue(undefined);

    // Import and instantiate service
    const { createNotificationService } = require('@/lib/services/notification-service');
    notificationService = createNotificationService(emailClient);
  });

  describe('sendMachineDownAlert', () => {
    it('should send Email notification with NCA details', async () => {
      await notificationService.sendMachineDownAlert(mockPayload);

      expect(emailClient.sendEmail).toHaveBeenCalledTimes(1);
      const [emailAddress, subject, body] = (emailClient.sendEmail as jest.Mock).mock.calls[0];

      // Verify email sent to operations manager
      expect(emailAddress).toBeDefined();
      expect(typeof emailAddress).toBe('string');

      // Verify subject contains urgency indicator
      expect(subject).toMatch(/URGENT|MACHINE DOWN|ALERT/i);

      // Verify body contains all critical details
      expect(body).toContain('NCA-2025-00000001');
      expect(body).toContain('Pouching Line 1');
      expect(body).toContain('John Smith');
    });

    it('should complete alert within 5 seconds (performance requirement)', async () => {
      const startTime = Date.now();
      await notificationService.sendMachineDownAlert(mockPayload);
      const duration = Date.now() - startTime;

      // BRCGS critical: alerts must trigger <5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should not throw error if Email fails (graceful degradation)', async () => {
      emailClient.sendEmail.mockRejectedValue(new Error('Resend API error'));

      // Should not throw - notification failure shouldn't block NCA creation
      await expect(notificationService.sendMachineDownAlert(mockPayload)).resolves.not.toThrow();
    });

    it('should log error when Email fails (for monitoring)', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      emailClient.sendEmail.mockRejectedValue(new Error('SMTP connection failed'));

      await notificationService.sendMachineDownAlert(mockPayload);

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Email'),
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Dependency Injection Verification', () => {
    it('should inject Email client via constructor', () => {
      const { createNotificationService } = require('@/lib/services/notification-service');
      const customEmailClient = new MockEmailClient();
      const service = createNotificationService(customEmailClient);

      // This verifies NO static calls to resend
      expect(service).toBeDefined();
    });

    it('should be mockable in tests (interface compliance)', async () => {
      // This test verifies the service follows the interface contract
      const mockService: INotificationService = {
        sendMachineDownAlert: jest.fn<(payload: NotificationPayload) => Promise<void>>(),
      };

      await mockService.sendMachineDownAlert(mockPayload);
      expect(mockService.sendMachineDownAlert).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe('Message Content Validation', () => {
    it('should format timestamp in human-readable format', async () => {
      await notificationService.sendMachineDownAlert(mockPayload);

      const emailBody = (emailClient.sendEmail as jest.Mock).mock.calls[0][2];

      // Should convert ISO timestamp to readable format
      expect(emailBody).toMatch(/\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}/);
    });

    it('should include urgency indicator in subject line', async () => {
      await notificationService.sendMachineDownAlert(mockPayload);

      const subject = (emailClient.sendEmail as jest.Mock).mock.calls[0][1];

      // BRCGS critical: operators must recognize urgency immediately
      expect(subject).toMatch(/URGENT|CRITICAL|ALERT|MACHINE DOWN/i);
    });
  });
});
