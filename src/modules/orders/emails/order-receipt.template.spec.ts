// Emails
import { buildOrderReceiptEmail, type IOrderReceiptData } from './order-receipt.template';

const baseData = (): IOrderReceiptData => ({
  buyerName: 'Rafi Khoirulloh',
  currency: 'IDR',
  discount: 0,
  libraryUrl: 'http://localhost:3000/account/library',
  licenseName: 'Personal license',
  momentTitle: 'A vintage Vespa in the gold light',
  orderId: 'order-uuid-1',
  paidAtUnix: 1700000000,
  photographerName: 'Reza Ardiansyah',
  serviceFee: 25000,
  subtotal: 500000,
  tax: 57750,
  total: 582750,
});

describe('buildOrderReceiptEmail', () => {
  it('renders subject, html, and a plain-text alternative', () => {
    const email = buildOrderReceiptEmail(baseData());

    expect(email.subject).toContain('Captura receipt');
    expect(email.html).toContain('<!DOCTYPE html>');
    expect(email.text).toContain('CAPTURA — PAYMENT CONFIRMED');
  });

  it('includes the order id, moment, photographer, and library CTA', () => {
    const email = buildOrderReceiptEmail(baseData());

    expect(email.html).toContain('order-uuid-1');
    expect(email.html).toContain('A vintage Vespa in the gold light');
    expect(email.html).toContain('Reza Ardiansyah');
    expect(email.html).toContain('http://localhost:3000/account/library');
  });

  it('formats every amount in the order currency', () => {
    const email = buildOrderReceiptEmail(baseData());

    // id-ID IDR formatting uses "Rp" and dot grouping.
    expect(email.html).toContain('Rp');
    expect(email.html).toContain('582.750');
    expect(email.subject).toContain('582.750');
  });

  it('omits the discount row when there is no discount', () => {
    const email = buildOrderReceiptEmail(baseData());

    expect(email.html).not.toContain('Discount');
    expect(email.text).not.toContain('Discount');
  });

  it('shows the discount row when a discount applies', () => {
    const email = buildOrderReceiptEmail({ ...baseData(), discount: 50000 });

    expect(email.html).toContain('Discount');
    expect(email.html).toContain('50.000');
  });

  it('escapes user-controlled fields to avoid HTML injection', () => {
    const email = buildOrderReceiptEmail({
      ...baseData(),
      momentTitle: '<script>alert(1)</script>',
    });

    expect(email.html).not.toContain('<script>alert(1)</script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('falls back to a dash when the order has no paid timestamp', () => {
    const email = buildOrderReceiptEmail({ ...baseData(), paidAtUnix: null });

    expect(email.html).toContain('—');
  });
});
