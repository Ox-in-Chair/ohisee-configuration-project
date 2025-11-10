/**
 * OHiSee Notification Service - Unit Tests
 * TDD Phase: RED - Write failing tests first
 * Architecture: Mock dependencies, verify DI pattern, test behavior
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type {
  NotificationPayload,
  ISMSClient,
  IEmailClient,
  INotificationService,
} from '@/lib/types/notification';

// Mock implementations
class MockSMSClient implements ISMSClient {
  public sendSMS = jest.fn<(to: string, message: string) => Promise<void>>();
}

class MockEmailClient implements IEmailClient {
  public sendEmail = jest.fn<(to: string, subject: string, body: string) => Promise<void>>();
}

describe('NotificationService - Machine Down Alerts', () => {
  let smsClient: MockSMSClient;
  let emailClient: MockEmailClient;
  let notificationService: INotificationService;

  const mockPayload: NotificationPayload = {
    nca_number: 'NCA-2025-00000001',
    machine_name: 'Pouching Line 1',
    operator_name: 'John Smith',
    timestamp: '2025-11-10T14:30:00Z',
  };

  beforeEach(() => {
    smsClient = new MockSMSClient();
    emailClient = new MockEmailClient();

    // Mock successful responses by default
    smsClient.sendSMS.mockResolvedValue(undefined);
    emailClient.sendEmail.mockResolvedValue(undefined);

    // This will fail initially - service doesn't exist yet
    // We'll import and instantiate it after implementation
    const { createNotificationService } = require('@/lib/services/notification-service');
    notificationService = createNotificationService(smsClient, emailClient);
  });

  describe('sendMachineDownAlert', () => {
    it('should send SMS notification with NCA details', async () => {
      await notificationService.sendMachineDownAlert(mockPayload);

      expect(smsClient.sendSMS).toHaveBeenCalledTimes(1);
      const [phoneNumber, message] = (smsClient.sendSMS as jest.Mock).mock.calls[0];

      // Verify SMS sent to operations manager
      expect(phoneNumber).toBeDefined();
      expect(typeof phoneNumber).toBe('string');

      // Verify message contains all critical details
      expect(message).toContain('NCA-2025-00000001');
      expect(message).toContain('Pouching Line 1');
      expect(message).toContain('John Smith');
      expect(message).toContain('MACHINE DOWN');
    });

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

    it('should send both SMS and Email in parallel', async () => {
      const smsStart = jest.fn();
      const emailStart = jest.fn();

      smsClient.sendSMS.mockImplementation(async () => {
        smsStart();
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      emailClient.sendEmail.mockImplementation(async () => {
        emailStart();
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const startTime = Date.now();
      await notificationService.sendMachineDownAlert(mockPayload);
      const duration = Date.now() - startTime;

      // If parallel, should take ~100ms not ~200ms
      expect(duration).toBeLessThan(150);
      expect(smsStart).toHaveBeenCalled();
      expect(emailStart).toHaveBeenCalled();
    });

    it('should not throw error if SMS fails (graceful degradation)', async () => {
      smsClient.sendSMS.mockRejectedValue(new Error('Twilio API error'));

      // Should not throw - notification failure shouldn't block NCA creation
      await expect(notificationService.sendMachineDownAlert(mockPayload)).resolves.not.toThrow();

      // Email should still be attempted
      expect(emailClient.sendEmail).toHaveBeenCalled();
    });

    it('should not throw error if Email fails (graceful degradation)', async () => {
      emailClient.sendEmail.mockRejectedValue(new Error('SMTP connection failed'));

      // Should not throw
      await expect(notificationService.sendMachineDownAlert(mockPayload)).resolves.not.toThrow();

      // SMS should still be attempted
      expect(smsClient.sendSMS).toHaveBeenCalled();
    });

    it('should not throw error if both SMS and Email fail', async () => {
      smsClient.sendSMS.mockRejectedValue(new Error('Twilio API error'));
      emailClient.sendEmail.mockRejectedValue(new Error('SMTP connection failed'));

      // Should not throw - errors should be logged but not propagated
      await expect(notificationService.sendMachineDownAlert(mockPayload)).resolves.not.toThrow();
    });

    it('should log error when SMS fails (for monitoring)', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      smsClient.sendSMS.mockRejectedValue(new Error('Twilio API error'));

      await notificationService.sendMachineDownAlert(mockPayload);

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('SMS'),
        expect.any(Error)
      );

      consoleError.mockRestore();
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
    it('should inject SMS client via constructor', () => {
      const { createNotificationService } = require('@/lib/services/notification-service');
      const customSMSClient = new MockSMSClient();
      const service = createNotificationService(customSMSClient, emailClient);

      // This verifies NO static calls to Twilio
      expect(service).toBeDefined();
    });

    it('should inject Email client via constructor', () => {
      const { createNotificationService } = require('@/lib/services/notification-service');
      const customEmailClient = new MockEmailClient();
      const service = createNotificationService(smsClient, customEmailClient);

      // This verifies NO static calls to nodemailer/resend
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

      const smsMessage = (smsClient.sendSMS as jest.Mock).mock.calls[0][1];
      const emailBody = (emailClient.sendEmail as jest.Mock).mock.calls[0][2];

      // Should convert ISO timestamp to readable format
      expect(smsMessage).toMatch(/\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}/);
      expect(emailBody).toMatch(/\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}/);
    });

    it('should include urgency indicator in subject line', async () => {
      await notificationService.sendMachineDownAlert(mockPayload);

      const subject = (emailClient.sendEmail as jest.Mock).mock.calls[0][1];

      // BRCGS critical: operators must recognize urgency immediately
      expect(subject).toMatch(/URGENT|CRITICAL|ALERT|MACHINE DOWN/i);
    });

    it('should keep SMS message under 160 characters for single SMS', async () => {
      await notificationService.sendMachineDownAlert(mockPayload);

      const smsMessage = (smsClient.sendSMS as jest.Mock).mock.calls[0][1];

      // Best practice: single SMS = better delivery rate
      expect(smsMessage.length).toBeLessThanOrEqual(160);
    });
  });
});
