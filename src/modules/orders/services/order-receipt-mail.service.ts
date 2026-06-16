// Emails
import { buildOrderReceiptEmail, type IOrderReceiptData } from '../emails/order-receipt.template';

// NestJS Libraries
import { Injectable, Logger } from '@nestjs/common';

// Nodemailer
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Services
import { MailConfigService } from '../../../configurations/mail/mail-configuration.service';

@Injectable()
export class OrderReceiptMailService {
  private readonly _logger = new Logger(OrderReceiptMailService.name);
  private readonly _transporter: Transporter;

  private get _isConfigured(): boolean {
    return !!(this._mailConfigService.mailUser && this._mailConfigService.mailPassword);
  }

  constructor(private readonly _mailConfigService: MailConfigService) {
    const hasCredentials = _mailConfigService.mailUser && _mailConfigService.mailPassword;

    this._transporter = nodemailer.createTransport({
      host: _mailConfigService.mailHost,
      port: _mailConfigService.mailPort,
      secure: _mailConfigService.mailPort === 465,
      ...(hasCredentials
        ? { auth: { pass: _mailConfigService.mailPassword, user: _mailConfigService.mailUser } }
        : {}),
    });
  }

  /**
   * @description Send the order receipt to the buyer. Resilient by design — a
   * mail failure must never break the payment webhook, so this method logs and
   * swallows errors instead of throwing.
   */
  public async sendReceipt(to: string, data: IOrderReceiptData): Promise<void> {
    const { html, subject, text } = buildOrderReceiptEmail(data);

    if (!this._isConfigured) {
      this._logger.warn(`[DEV] SMTP not configured — receipt for order ${data.orderId} → ${to}`);

      return;
    }

    try {
      await this._transporter.sendMail({
        from: this._mailConfigService.mailFrom,
        html,
        subject,
        text,
        to,
      });

      this._logger.log(`[INFO] Receipt sent for order ${data.orderId} to ${to}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this._logger.error(`[ERROR] Failed to send receipt for order ${data.orderId}: ${message}`);
    }
  }
}
