/**
 * OHiSee Twilio SMS Client
 * Implements ISMSClient interface for sending SMS via Twilio
 * Architecture: Dependency injection - NO static calls
 */

import type { ISMSClient } from '@/lib/types/notification';

/**
 * TwilioSMSClient Implementation
 * Uses Twilio SDK to send SMS messages
 */
export class TwilioSMSClient implements ISMSClient {
  private twilioClient: any; // Twilio type from @twilio/conversations
  private fromNumber: string;

  constructor(twilioClient: any, fromNumber: string) {
    this.twilioClient = twilioClient;
    this.fromNumber = fromNumber;
  }

  /**
   * Send SMS message via Twilio
   * @param to - Recipient phone number (E.164 format, e.g., +27821234567)
   * @param message - SMS message body (max 1600 chars for single SMS)
   */
  async sendSMS(to: string, message: string): Promise<void> {
    if (!this.twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    if (!this.fromNumber) {
      throw new Error('Twilio from number not configured');
    }

    try {
      await this.twilioClient.messages.create({
        to,
        from: this.fromNumber,
        body: message,
      });
    } catch (error) {
      console.error('Twilio SMS error:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create TwilioSMSClient
 * Use this in production code for clean dependency injection
 */
export function createTwilioClient(): ISMSClient {
  // Lazy load Twilio SDK to avoid bundling in client-side code
  const Twilio = require('twilio');

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      'Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.'
    );
  }

  const twilioClient = Twilio(accountSid, authToken);

  return new TwilioSMSClient(twilioClient, fromNumber);
}

