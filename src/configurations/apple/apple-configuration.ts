// NestJS Libraries
import { registerAs } from '@nestjs/config';

export default registerAs('apple', () => ({
  callbackUrl: process.env.APPLE_CALLBACK_URL,
  clientId: process.env.APPLE_CLIENT_ID,
  keyId: process.env.APPLE_KEY_ID,
  privateKey: process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  teamId: process.env.APPLE_TEAM_ID,
}));
