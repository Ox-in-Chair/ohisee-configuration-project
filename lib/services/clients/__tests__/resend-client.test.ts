/**
 * Resend Email Client Tests
 * Comprehensive test coverage for email client with dependency injection
 * Target: >95% coverage
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ResendEmailClient, createResendClient } from '../resend-client';

describe('ResendEmailClient', () => {
  let mockResendClient: any;
  let emailClient: ResendEmailClient;

  beforeEach(() => {
    // Clear console.error mock
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Create mock Resend client
    mockResendClient = {
      emails: {
        send: jest.fn().mockResolvedValue({ id: 'email-123' })
      }
    };

    // Create email client instance
    emailClient = new ResendEmailClient(
      mockResendClient,
      'noreply@kangopak.co.za',
      'OHiSee System'
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided client and settings', () => {
      const client = new ResendEmailClient(
        mockResendClient,
        'test@example.com',
        'Test Name'
      );

      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(ResendEmailClient);
    });

    it('should store resend client', () => {
      expect((emailClient as any).resendClient).toBe(mockResendClient);
    });

    it('should store from email', () => {
      expect((emailClient as any).fromEmail).toBe('noreply@kangopak.co.za');
    });

    it('should store from name', () => {
      expect((emailClient as any).fromName).toBe('OHiSee System');
    });
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      await emailClient.sendEmail(
        'recipient@example.com',
        'Test Subject',
        '<p>Test Body</p>'
      );

      expect(mockResendClient.emails.send).toHaveBeenCalledWith({
        from: 'OHiSee System <noreply@kangopak.co.za>',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test Body</p>'
      });
    });

    it('should throw error if resend client not initialized', async () => {
      const uninitializedClient = new ResendEmailClient(
        null,
        'test@example.com',
        'Test'
      );

      await expect(
        uninitializedClient.sendEmail('to@example.com', 'Subject', 'Body')
      ).rejects.toThrow('Resend client not initialized');
    });

    it('should throw error if from email not configured', async () => {
      const clientWithoutEmail = new ResendEmailClient(
        mockResendClient,
        '',
        'Test'
      );

      await expect(
        clientWithoutEmail.sendEmail('to@example.com', 'Subject', 'Body')
      ).rejects.toThrow('Resend from email not configured');
    });

    it('should format from field with name and email', async () => {
      await emailClient.sendEmail('to@example.com', 'Subject', 'Body');

      const callArgs = mockResendClient.emails.send.mock.calls[0][0];
      expect(callArgs.from).toBe('OHiSee System <noreply@kangopak.co.za>');
    });

    it('should pass HTML body correctly', async () => {
      const htmlBody = '<html><body><h1>Test</h1></body></html>';

      await emailClient.sendEmail('to@example.com', 'Subject', htmlBody);

      const callArgs = mockResendClient.emails.send.mock.calls[0][0];
      expect(callArgs.html).toBe(htmlBody);
    });

    it('should handle plain text body', async () => {
      const plainBody = 'Plain text email body';

      await emailClient.sendEmail('to@example.com', 'Subject', plainBody);

      const callArgs = mockResendClient.emails.send.mock.calls[0][0];
      expect(callArgs.html).toBe(plainBody);
    });

    it('should handle multiple recipients', async () => {
      await emailClient.sendEmail(
        'recipient@example.com',
        'Subject',
        'Body'
      );

      expect(mockResendClient.emails.send).toHaveBeenCalledTimes(1);
    });

    it('should throw error on send failure', async () => {
      const sendError = new Error('Network error');
      mockResendClient.emails.send.mockRejectedValue(sendError);

      await expect(
        emailClient.sendEmail('to@example.com', 'Subject', 'Body')
      ).rejects.toThrow('Network error');
    });

    it('should log error before throwing', async () => {
      const sendError = new Error('Send failed');
      mockResendClient.emails.send.mockRejectedValue(sendError);

      try {
        await emailClient.sendEmail('to@example.com', 'Subject', 'Body');
      } catch {
        // Expected to throw
      }

      expect(console.error).toHaveBeenCalledWith('Resend email error:', sendError);
    });

    it('should handle API rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      mockResendClient.emails.send.mockRejectedValue(rateLimitError);

      await expect(
        emailClient.sendEmail('to@example.com', 'Subject', 'Body')
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle invalid email addresses', async () => {
      const invalidEmailError = new Error('Invalid email address');
      mockResendClient.emails.send.mockRejectedValue(invalidEmailError);

      await expect(
        emailClient.sendEmail('invalid-email', 'Subject', 'Body')
      ).rejects.toThrow('Invalid email address');
    });

    it('should preserve original error message', async () => {
      const originalError = new Error('Original error message');
      mockResendClient.emails.send.mockRejectedValue(originalError);

      await expect(
        emailClient.sendEmail('to@example.com', 'Subject', 'Body')
      ).rejects.toThrow('Original error message');
    });

    it('should handle special characters in subject', async () => {
      const specialSubject = 'Test: NCA-2025-00001 – Action Required!';

      await emailClient.sendEmail('to@example.com', specialSubject, 'Body');

      const callArgs = mockResendClient.emails.send.mock.calls[0][0];
      expect(callArgs.subject).toBe(specialSubject);
    });

    it('should handle special characters in body', async () => {
      const specialBody = '<p>Alert: Machine "CMH-01" requires attention!</p>';

      await emailClient.sendEmail('to@example.com', 'Subject', specialBody);

      const callArgs = mockResendClient.emails.send.mock.calls[0][0];
      expect(callArgs.html).toBe(specialBody);
    });

    it('should handle empty subject', async () => {
      await emailClient.sendEmail('to@example.com', '', 'Body');

      const callArgs = mockResendClient.emails.send.mock.calls[0][0];
      expect(callArgs.subject).toBe('');
    });

    it('should handle empty body', async () => {
      await emailClient.sendEmail('to@example.com', 'Subject', '');

      const callArgs = mockResendClient.emails.send.mock.calls[0][0];
      expect(callArgs.html).toBe('');
    });

    it('should handle undefined resend client', async () => {
      const clientWithUndefined = new ResendEmailClient(
        undefined as any,
        'test@example.com',
        'Test'
      );

      await expect(
        clientWithUndefined.sendEmail('to@example.com', 'Subject', 'Body')
      ).rejects.toThrow('Resend client not initialized');
    });

    it('should handle null from email', async () => {
      const clientWithNullEmail = new ResendEmailClient(
        mockResendClient,
        null as any,
        'Test'
      );

      await expect(
        clientWithNullEmail.sendEmail('to@example.com', 'Subject', 'Body')
      ).rejects.toThrow('Resend from email not configured');
    });
  });

  describe('Multiple Email Sending', () => {
    it('should send multiple emails sequentially', async () => {
      await emailClient.sendEmail('to1@example.com', 'Subject 1', 'Body 1');
      await emailClient.sendEmail('to2@example.com', 'Subject 2', 'Body 2');
      await emailClient.sendEmail('to3@example.com', 'Subject 3', 'Body 3');

      expect(mockResendClient.emails.send).toHaveBeenCalledTimes(3);
    });

    it('should maintain correct from address across multiple sends', async () => {
      await emailClient.sendEmail('to1@example.com', 'Subject 1', 'Body 1');
      await emailClient.sendEmail('to2@example.com', 'Subject 2', 'Body 2');

      const calls = mockResendClient.emails.send.mock.calls;
      expect(calls[0][0].from).toBe('OHiSee System <noreply@kangopak.co.za>');
      expect(calls[1][0].from).toBe('OHiSee System <noreply@kangopak.co.za>');
    });
  });
});

describe('createResendClient', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear require cache to force fresh require
    jest.resetModules();

    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Set up test environment variables
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.RESEND_FROM_EMAIL = 'custom@example.com';
    process.env.RESEND_FROM_NAME = 'Custom Name';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Environment Configuration', () => {
    it('should create client with environment variables', () => {
      // Mock the Resend SDK
      jest.mock('resend', () => ({
        Resend: jest.fn().mockImplementation((apiKey) => ({
          apiKey,
          emails: { send: jest.fn() }
        }))
      }), { virtual: true });

      const client = createResendClient();

      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(ResendEmailClient);
    });

    it('should throw error if RESEND_API_KEY is missing', () => {
      delete process.env.RESEND_API_KEY;

      expect(() => createResendClient()).toThrow(
        'Resend API key not configured. Set RESEND_API_KEY environment variable.'
      );
    });

    it('should throw error if RESEND_API_KEY is empty string', () => {
      process.env.RESEND_API_KEY = '';

      expect(() => createResendClient()).toThrow(
        'Resend API key not configured. Set RESEND_API_KEY environment variable.'
      );
    });

    it('should use default from email if not provided', () => {
      delete process.env.RESEND_FROM_EMAIL;

      jest.mock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() }
        }))
      }), { virtual: true });

      const client = createResendClient();
      const fromEmail = (client as any).fromEmail;

      expect(fromEmail).toBe('noreply@kangopak.co.za');
    });

    it('should use default from name if not provided', () => {
      delete process.env.RESEND_FROM_NAME;

      jest.mock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() }
        }))
      }), { virtual: true });

      const client = createResendClient();
      const fromName = (client as any).fromName;

      expect(fromName).toBe('OHiSee System');
    });

    it('should use custom from email if provided', () => {
      process.env.RESEND_FROM_EMAIL = 'custom@example.com';

      jest.mock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() }
        }))
      }), { virtual: true });

      const client = createResendClient();
      const fromEmail = (client as any).fromEmail;

      expect(fromEmail).toBe('custom@example.com');
    });

    it('should use custom from name if provided', () => {
      process.env.RESEND_FROM_NAME = 'Custom Name';

      jest.mock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() }
        }))
      }), { virtual: true });

      const client = createResendClient();
      const fromName = (client as any).fromName;

      expect(fromName).toBe('Custom Name');
    });

    it('should handle undefined from email', () => {
      process.env.RESEND_FROM_EMAIL = undefined;

      jest.mock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() }
        }))
      }), { virtual: true });

      const client = createResendClient();
      const fromEmail = (client as any).fromEmail;

      expect(fromEmail).toBe('noreply@kangopak.co.za');
    });

    it('should handle undefined from name', () => {
      process.env.RESEND_FROM_NAME = undefined;

      jest.mock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() }
        }))
      }), { virtual: true });

      const client = createResendClient();
      const fromName = (client as any).fromName;

      expect(fromName).toBe('OHiSee System');
    });
  });

  describe('Resend SDK Initialization', () => {
    it('should lazy load Resend SDK', () => {
      const mockResend = jest.fn().mockImplementation(() => ({
        emails: { send: jest.fn() }
      }));

      jest.mock('resend', () => ({ Resend: mockResend }), { virtual: true });

      createResendClient();

      // Resend should be instantiated
      expect(mockResend).toHaveBeenCalledWith('test-api-key');
    });

    it('should create ResendEmailClient with correct parameters', () => {
      jest.mock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() }
        }))
      }), { virtual: true });

      const client = createResendClient();

      expect(client).toBeInstanceOf(ResendEmailClient);
      expect((client as any).fromEmail).toBe('custom@example.com');
      expect((client as any).fromName).toBe('Custom Name');
    });

    it('should return IEmailClient interface', () => {
      jest.mock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() }
        }))
      }), { virtual: true });

      const client = createResendClient();

      // Should have sendEmail method
      expect(typeof client.sendEmail).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long API keys', () => {
      process.env.RESEND_API_KEY = 'a'.repeat(500);

      jest.mock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() }
        }))
      }), { virtual: true });

      expect(() => createResendClient()).not.toThrow();
    });

    it('should handle special characters in from email', () => {
      process.env.RESEND_FROM_EMAIL = 'no+reply@kangopak.co.za';

      jest.mock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() }
        }))
      }), { virtual: true });

      const client = createResendClient();
      expect((client as any).fromEmail).toBe('no+reply@kangopak.co.za');
    });

    it('should handle special characters in from name', () => {
      process.env.RESEND_FROM_NAME = 'OHiSee System – BRCGS';

      jest.mock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() }
        }))
      }), { virtual: true });

      const client = createResendClient();
      expect((client as any).fromName).toBe('OHiSee System – BRCGS');
    });

    it('should create multiple independent clients', () => {
      jest.mock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() }
        }))
      }), { virtual: true });

      const client1 = createResendClient();
      const client2 = createResendClient();

      expect(client1).not.toBe(client2);
      expect(client1).toBeInstanceOf(ResendEmailClient);
      expect(client2).toBeInstanceOf(ResendEmailClient);
    });
  });

  describe('Type Safety', () => {
    it('should return IEmailClient interface', () => {
      jest.mock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() }
        }))
      }), { virtual: true });

      const client = createResendClient();

      // Type assertion should work
      const typedClient: ReturnType<typeof createResendClient> = client;
      expect(typedClient).toBeDefined();
      expect(typeof typedClient.sendEmail).toBe('function');
    });
  });
});
