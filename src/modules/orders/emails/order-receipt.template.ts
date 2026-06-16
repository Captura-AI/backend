/**
 * Captura order receipt email.
 *
 * Rendered as inline-styled, table-based HTML for broad email-client support.
 * The visual language follows Captura's design system (DESIGN.md): warm paper
 * base, deep charcoal ink, gallery-rust accent, a serif editorial headline, and
 * monospaced uppercase eyebrow labels. No plate data is ever included.
 */

export interface IOrderReceiptData {
  orderId: string;
  buyerName: string;
  paidAtUnix: number | null;
  currency: string;
  subtotal: number;
  serviceFee: number;
  tax: number;
  discount: number;
  total: number;
  momentTitle: string;
  licenseName: string;
  photographerName: string;
  libraryUrl: string;
}

export interface IRenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// ─── Captura palette (DESIGN.md), as email-safe hex ──────────────────────────
const COLOR = {
  paper: '#F5F2EC',
  card: '#FBFAF6',
  ink: '#141311',
  stone: '#6B6660',
  ash: '#A29D95',
  rule: '#E6E1D7',
  whisper: '#EEEAE0',
  rust: '#B0703F',
  emerald: '#3E7A5E',
  emeraldTint: '#E7EFE9',
} as const;

const FONT_SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const FONT_SANS = "'IBM Plex Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'SFMono-Regular', Menlo, Consolas, monospace";

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('id-ID', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function formatPaidAt(paidAtUnix: number | null): string {
  if (!paidAtUnix) {
    return '—';
  }

  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: 'short',
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
  }).format(new Date(paidAtUnix * 1000));

  return `${formatted} WIB`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function eyebrow(text: string): string {
  return `<div style="font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${COLOR.ash};">${text}</div>`;
}

function totalsRow(label: string, value: string, emphasized = false): string {
  const labelColor = emphasized ? COLOR.ink : COLOR.stone;
  const valueColor = emphasized ? COLOR.ink : COLOR.stone;
  const weight = emphasized ? '600' : '400';
  const size = emphasized ? '18px' : '14px';
  const labelFont = emphasized ? FONT_SERIF : FONT_SANS;
  const valueFont = emphasized ? FONT_SERIF : FONT_SANS;

  return `
    <tr>
      <td style="padding:6px 0;font-family:${labelFont};font-size:${size};font-weight:${weight};color:${labelColor};">${label}</td>
      <td align="right" style="padding:6px 0;font-family:${valueFont};font-size:${size};font-weight:${weight};color:${valueColor};">${value}</td>
    </tr>`;
}

function buildTotals(data: IOrderReceiptData): string {
  const rows = [
    totalsRow('Subtotal', formatMoney(data.subtotal, data.currency)),
    totalsRow('Service fee', formatMoney(data.serviceFee, data.currency)),
    totalsRow('PPN (11%)', formatMoney(data.tax, data.currency)),
  ];

  if (data.discount > 0) {
    rows.push(totalsRow('Discount', `- ${formatMoney(data.discount, data.currency)}`));
  }

  return rows.join('');
}

export function buildOrderReceiptEmail(data: IOrderReceiptData): IRenderedEmail {
  const buyerName = escapeHtml(data.buyerName);
  const momentTitle = escapeHtml(data.momentTitle);
  const licenseName = escapeHtml(data.licenseName);
  const photographerName = escapeHtml(data.photographerName);
  const orderId = escapeHtml(data.orderId);
  const paidAt = formatPaidAt(data.paidAtUnix);
  const total = formatMoney(data.total, data.currency);
  const subject = `Your Captura receipt — ${total}`;
  const preheader = `Payment confirmed. ${momentTitle} is ready in your library.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.paper};">
<span style="display:none!important;opacity:0;color:${COLOR.paper};max-height:0;overflow:hidden;">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.paper};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${COLOR.card};border:1px solid ${COLOR.rule};border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="padding:28px 36px 20px 36px;border-bottom:1px solid ${COLOR.whisper};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <span style="display:inline-block;width:9px;height:9px;border-radius:9px;background:${COLOR.rust};"></span>
                  <span style="font-family:${FONT_SERIF};font-size:24px;font-weight:600;color:${COLOR.ink};letter-spacing:0.01em;padding-left:8px;vertical-align:middle;">Captura</span>
                </td>
                <td align="right" style="vertical-align:middle;">
                  ${eyebrow('Receipt')}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="padding:36px 36px 8px 36px;">
            ${eyebrow('Payment confirmed')}
            <div style="font-family:${FONT_SERIF};font-size:34px;line-height:1.2;color:${COLOR.ink};margin-top:10px;">
              Your moment is <em style="font-style:italic;color:${COLOR.rust};">yours</em>.
            </div>
            <p style="font-family:${FONT_SANS};font-size:15px;line-height:1.6;color:${COLOR.stone};margin:14px 0 0 0;">
              Hi ${buyerName}, thank you for your purchase. Your full-resolution files are ready in your library — this email is your receipt.
            </p>
            <div style="margin-top:18px;">
              <span style="display:inline-block;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${COLOR.emerald};background:${COLOR.emeraldTint};border-radius:999px;padding:6px 14px;">Paid</span>
            </div>
          </td>
        </tr>

        <!-- Order meta -->
        <tr>
          <td style="padding:24px 36px 0 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${COLOR.whisper};">
              <tr>
                <td style="padding:18px 0 0 0;">
                  ${eyebrow('Order')}
                  <div style="font-family:${FONT_MONO};font-size:13px;color:${COLOR.ink};margin-top:6px;">${orderId}</div>
                </td>
                <td align="right" style="padding:18px 0 0 0;">
                  ${eyebrow('Paid on')}
                  <div style="font-family:${FONT_MONO};font-size:13px;color:${COLOR.ink};margin-top:6px;">${paidAt}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Purchased item -->
        <tr>
          <td style="padding:24px 36px 0 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.paper};border:1px solid ${COLOR.rule};border-radius:12px;">
              <tr>
                <td style="padding:18px 20px;">
                  ${eyebrow('Moment')}
                  <div style="font-family:${FONT_SERIF};font-size:20px;line-height:1.3;color:${COLOR.ink};margin-top:6px;">${momentTitle}</div>
                  <div style="font-family:${FONT_SANS};font-size:13px;color:${COLOR.stone};margin-top:8px;">by ${photographerName}</div>
                  <div style="font-family:${FONT_MONO};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${COLOR.ash};margin-top:10px;">${licenseName}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Totals -->
        <tr>
          <td style="padding:24px 36px 0 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${buildTotals(data)}
              <tr><td colspan="2" style="padding:10px 0 0 0;border-top:1px solid ${COLOR.rule};"></td></tr>
              ${totalsRow('Total paid', total, true)}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:28px 36px 8px 36px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:${COLOR.ink};border-radius:12px;">
                  <a href="${data.libraryUrl}" style="display:inline-block;font-family:${FONT_SANS};font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;padding:14px 28px;">Access your library</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Privacy note -->
        <tr>
          <td style="padding:16px 36px 28px 36px;">
            <p style="font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:${COLOR.ash};margin:0;border-top:1px solid ${COLOR.whisper};padding-top:18px;">
              Download links open from your library and stay private to your account. Captura masks vehicle plates in public listings — your purchased originals are never shared publicly.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:18px 36px 28px 36px;border-top:1px solid ${COLOR.whisper};">
            <div style="font-family:${FONT_MONO};font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${COLOR.ash};line-height:1.8;">
              Captura · Street photography, found.<br />
              You received this because you completed a purchase on Captura.
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    'CAPTURA — PAYMENT CONFIRMED',
    '',
    `Hi ${data.buyerName}, thank you for your purchase. Your files are ready in your library.`,
    '',
    `Order: ${data.orderId}`,
    `Paid on: ${paidAt}`,
    '',
    `Moment: ${data.momentTitle}`,
    `By: ${data.photographerName}`,
    `License: ${data.licenseName}`,
    '',
    `Subtotal: ${formatMoney(data.subtotal, data.currency)}`,
    `Service fee: ${formatMoney(data.serviceFee, data.currency)}`,
    `PPN (11%): ${formatMoney(data.tax, data.currency)}`,
    ...(data.discount > 0 ? [`Discount: - ${formatMoney(data.discount, data.currency)}`] : []),
    `Total paid: ${total}`,
    '',
    `Access your library: ${data.libraryUrl}`,
    '',
    'Download links open from your library and stay private to your account.',
  ].join('\n');

  return { html, subject, text };
}
