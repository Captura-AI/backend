export const OTP_SENDER = 'OTP_SENDER';

export interface IOtpSender {
  send(to: string, message: string): Promise<void>;
}
