// NestJS Libraries
import { registerAs } from '@nestjs/config';

export default registerAs('fonnte', () => ({
  otpChannel: process.env.OTP_CHANNEL ?? 'whatsapp',
  token: process.env.FONNTE_TOKEN ?? 'MCDZZzvdXaZx9AdJvLdn',
}));
