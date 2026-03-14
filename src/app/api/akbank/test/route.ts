/**
 * GELİŞTİRME ORTAMI TEST ENDPOINT'İ
 * Sadece development'ta çalışır, production'da 404 döner.
 *
 * Akbank form alanlarını ve hash'i oluşturup doğrudan tarayıcıya HTML form olarak döner.
 * Butona basınca Akbank test sayfasına gidilir.
 *
 * Kullanım: http://localhost:3000/api/akbank/test
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  buildPayHostingHashInput,
  formatAkbankDateTime,
  getPayHostingActionUrl,
  getRandomNumberBase16,
  hashToString,
} from '@/features/payments/akbankUtils';
import { Env } from '@/libs/Env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const errors: string[] = [];

  // Env kontrolü
  if (!Env.AKBANK_MERCHANT_SAFE_ID || Env.AKBANK_MERCHANT_SAFE_ID.includes('your_')) {
    errors.push('AKBANK_MERCHANT_SAFE_ID ayarlanmamış');
  }
  if (!Env.AKBANK_TERMINAL_SAFE_ID || Env.AKBANK_TERMINAL_SAFE_ID.includes('your_')) {
    errors.push('AKBANK_TERMINAL_SAFE_ID ayarlanmamış');
  }
  if (!Env.AKBANK_SECRET_KEY || Env.AKBANK_SECRET_KEY.includes('your_')) {
    errors.push('AKBANK_SECRET_KEY ayarlanmamış');
  }

  if (errors.length > 0) {
    return new NextResponse(
      `<h2>ENV HATALARI</h2><ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  // Form oluştur (okUrl/failUrl localhost - sadece sayfayı görmek için yeterli)
  const origin = request.nextUrl.origin;
  const merchantOid = `TEST${Date.now()}`;

  const plainFields = {
    paymentModel: 'PAY_HOSTING' as const,
    txnCode: '1000' as const,
    merchantSafeId: Env.AKBANK_MERCHANT_SAFE_ID,
    terminalSafeId: Env.AKBANK_TERMINAL_SAFE_ID,
    orderId: merchantOid,
    lang: 'TR' as const,
    amount: '1.00',
    ccbRewardAmount: '0.00',
    pcbRewardAmount: '0.00',
    xcbRewardAmount: '0.00',
    currencyCode: '949' as const,
    installCount: '1' as const,
    okUrl: `${origin}/api/akbank/return?flow=product&redirect=%2F`,
    failUrl: `${origin}/api/akbank/return?flow=product&redirect=%2F`,
    emailAddress: 'test@test.com',
    mobilePhoneNumber: '5321001010',
    homePhoneNumber: '',
    workPhoneNumber: '',
    randomNumber: getRandomNumberBase16(128),
    requestDateTime: formatAkbankDateTime(),
    b2bIdentityNumber: '',
    merchantData: '',
    merchantBranchNo: '',
    mobileEci: '',
    walletProgramData: '',
    mobileAssignedId: '',
    mobileDeviceType: '',
  };

  const hash = hashToString(buildPayHostingHashInput(plainFields), Env.AKBANK_SECRET_KEY);
  const allFields = { ...plainFields, hash };
  const gatewayUrl = getPayHostingActionUrl();

  const inputs = Object.entries(allFields)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`)
    .join('\n    ');

  const debugRows = Object.entries(allFields)
    .map(([k, v]) => {
      const display = v.length > 60 ? `${v.slice(0, 60)}...` : v;
      return `<tr><td style="padding:4px 12px;font-weight:bold;white-space:nowrap">${k}</td><td style="padding:4px 12px;word-break:break-all">${display}</td></tr>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Akbank Test</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #1a1a1a; }
    .badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold; }
    .test  { background:#fef3c7; color:#92400e; }
    .prod  { background:#fee2e2; color:#991b1b; }
    button { background:#1d4ed8; color:white; border:none; padding:14px 32px; font-size:16px; border-radius:8px; cursor:pointer; margin-top:16px; }
    button:hover { background:#1e40af; }
    table { border-collapse:collapse; width:100%; margin-top:16px; font-size:13px; }
    tr:nth-child(even) { background:#f9fafb; }
    th { text-align:left; padding:6px 12px; background:#e5e7eb; }
    .info { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:16px; margin:16px 0; }
  </style>
</head>
<body>
  <h1>Akbank PAY_HOSTING Test <span class="badge ${Env.AKBANK_ENV === 'prod' ? 'prod' : 'test'}">${Env.AKBANK_ENV?.toUpperCase()}</span></h1>

  <div class="info">
    <strong>Gateway:</strong> ${gatewayUrl}<br>
    <strong>Merchant Safe ID:</strong> ${Env.AKBANK_MERCHANT_SAFE_ID}<br>
    <strong>merchantOid:</strong> ${merchantOid}<br>
    <strong>Amount:</strong> 1.00 TL (test)
  </div>

  <form action="${gatewayUrl}" method="POST">
    ${inputs}
    <button type="submit">▶ Akbank Ödeme Sayfasını Aç</button>
  </form>

  <details style="margin-top:32px">
    <summary style="cursor:pointer;font-weight:bold">Form Alanları (debug)</summary>
    <table>
      <thead><tr><th>Alan</th><th>Değer</th></tr></thead>
      <tbody>${debugRows}</tbody>
    </table>
  </details>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
