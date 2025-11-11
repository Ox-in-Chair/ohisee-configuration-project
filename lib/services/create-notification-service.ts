/**
 * OHiSee Notification Service Factory
 * Creates notification service with real clients (Twilio + Resend) for production
 * Falls back to no-op clients if credentials not configured
 */

import { createNotificationService } from './notification-service';
import type { INotificationService } from '@/lib/types/notification';

/**
 * Create notification service with real clients (production)
 * Returns service with Twilio SMS and Resend Email clients if configured
 * Returns no-op service if credentials not available (graceful degradation)
 */
export function createProductionNotificationService(): INotificationService {
  // Check if Twilio and Resend credentials are configured
  const hasTwilio = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );

  const hasResend = !!process.env.RESEND_API_KEY;

  // If both services configured, use real clients
  if (hasTwilio && hasResend) {
    try {
      const { createTwilioClient } = require('./clients/twilio-client');
      const { createResendClient } = require('./clients/resend-client');

      return createNotificationService(createTwilioClient(), createResendClient());
    } catch (error) {
      console.error('Failed to initialize real notification clients:', error);
      // Fall through to no-op clients
    }
  }

  // Graceful degradation: return no-op clients if credentials not configured
  // This allows the app to run without notification services (useful for development)
  const noOpSMSClient = {
    async sendSMS() {
      console.warn('SMS not sent - Twilio credentials not configured');
    },
  };

  const noOpEmailClient = {
    async sendEmail() {
      console.warn('Email not sent - Resend credentials not configured');
    },
  };

  return createNotificationService(noOpSMSClient, noOpEmailClient);
}

