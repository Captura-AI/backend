import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  apiExternalBaseUrl: process.env.API_EXTERNAL_BASE_URL,
  appCorsOrigins: process.env.APP_CORS_ORIGINS,
  appEnv: process.env.APP_ENV,
  appHost: process.env.APP_HOST,
  appName: process.env.APP_NAME,
  appPort: process.env.APP_PORT,
  appTrustProxy: process.env.APP_TRUST_PROXY,
  midtransClientKey: process.env.MIDTRANS_CLIENT_KEY,
  midtransIsProduction: process.env.MIDTRANS_IS_PRODUCTION,
  midtransServerKey: process.env.MIDTRANS_SERVER_KEY,
  otelEnabled: process.env.OTEL_ENABLED,
  otelExportInterval: process.env.OTEL_EXPORT_INTERVAL,
  otelMetricsEnabled: process.env.OTEL_METRICS_ENABLED,
  aiServiceUrl: process.env.AI_SERVICE_URL,
  paymentExpiryMinutes: process.env.PAYMENT_EXPIRY_MINUTES,
  serviceFeeRate: process.env.SERVICE_FEE_RATE,
  taxRate: process.env.TAX_RATE,
  throttleLimit: process.env.THROTTLE_LIMIT,
  throttleTtl: process.env.THROTTLE_TTL,
}));
