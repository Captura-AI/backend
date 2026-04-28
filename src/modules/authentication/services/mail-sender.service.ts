// Nodemailer
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// NestJS Libraries
import { Injectable, Logger } from '@nestjs/common';

// Services
import { MailConfigService } from '../../../configurations/mail/mail-configuration.service';

@Injectable()
export class MailSenderService {
  private readonly _logger = new Logger(MailSenderService.name);
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

  public async sendMagicLink(to: string, magicLink: string): Promise<void> {
    if (!this._isConfigured) {
      this._logger.warn(`[DEV] SMTP not configured — magic link for ${to}: ${magicLink}`);
      return;
    }

    await this._transporter.sendMail({
      from: this._mailConfigService.mailFrom,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Login ke Captura</h2>
          <p>Klik tombol di bawah untuk masuk. Link ini berlaku selama <strong>15 menit</strong>.</p>
          <a href="${magicLink}"
             style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
            Login ke Captura
          </a>
          <p style="margin-top:16px;color:#6B7280;font-size:13px">
            Jika Anda tidak meminta link ini, abaikan email ini.
          </p>
        </div>
      `,
      subject: 'Login ke Captura — Magic Link',
      to,
    });

    this._logger.log(`[INFO] Magic link sent to ${to}`);
  }
}
