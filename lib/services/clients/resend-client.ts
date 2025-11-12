/**
 * OHiSee Resend Email Client
 * Implements IEmailClient interface for sending emails via Resend
 * Architecture: Dependency injection - NO static calls
 */

import type { IEmailClient } from '@/lib/types/notification';

/**
 * ResendEmailClient Implementation
 * Uses Resend SDK to send emails
 */
export class ResendEmailClient implements IEmailClient {
  private resendClient: any; // Resend type from resend
  private fromEmail: string;
  private fromName: string;

  constructor(resendClient: any, fromEmail: string, fromName: string) {
    this.resendClient = resendClient;
    this.fromEmail = fromEmail;
    this.fromName = fromName;
  }

  /**
   * Send email via Resend
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param body - Email body (HTML supported)
   */
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    if (!this.resendClient) {
      throw new Error('Resend client not initialized');
    }

    if (!this.fromEmail) {
      throw new Error('Resend from email not configured');
    }

    try {
      await this.resendClient.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject,
        html: body,
      });
    } catch (error) {
      console.error('Resend email error:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create ResendEmailClient
 * Use this in production code for clean dependency injection
 */
export function createResendClient(): IEmailClient {
  // Lazy load Resend SDK to avoid bundling in client-side code
  const { Resend } = require('resend');

  const apiKey = process.env['RESEND_API_KEY'];
  const fromEmail = process.env['RESEND_FROM_EMAIL'] || 'noreply@kangopak.co.za';
  const fromName = process.env['RESEND_FROM_NAME'] || 'OHiSee System';

  if (!apiKey) {
    throw new Error(
      'Resend API key not configured. Set RESEND_API_KEY environment variable.'
    );
  }

  const resendClient = new Resend(apiKey);

  return new ResendEmailClient(resendClient, fromEmail, fromName);
}

