/**
 * OHiSee Notification Service Factory
 * Creates notification service with real Resend email client for production
 * Falls back to no-op client if credentials not configured
 */

import { createNotificationService } from './notification-service';
import type { INotificationService } from '@/lib/types/notification';

/**
 * Create notification service with real email client (production)
 * Returns service with Resend Email client if configured
 * Returns no-op service if credentials not available (graceful degradation)
 */
export function createProductionNotificationService(): INotificationService {
  const hasResend = !!process.env.RESEND_API_KEY;

  // If Resend configured, use real client
  if (hasResend) {
    try {
      const { createResendClient } = require('./clients/resend-client');

      return createNotificationService(createResendClient());
    } catch (error) {
      console.error('Failed to initialize real email client:', error);
      // Fall through to no-op client
    }
  }

  // Graceful degradation: return no-op client if credentials not configured
  // This allows the app to run without notification services (useful for development)
  const noOpEmailClient = {
    async sendEmail() {
      console.warn('Email not sent - Resend credentials not configured');
    },
  };

  return createNotificationService(noOpEmailClient);
}

