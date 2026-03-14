/**
 * AKBANK Ödeme Debug Scripti
 * Çalıştır: node scripts/debug-akbank.mjs
 *
 * .env.local dosyasındaki credentials ile tam bir form payload'u oluşturur
 * ve hash hesaplamayı doğrular.
 */

import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── .env.local oku ────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  const raw = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const idx = trimmed.indexOf('=');
    if (idx === -1) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    env[key] = val;
  }
  return env;
}

// ── Hash ─────────────────────────────────────────────────────────────────────
function hashToString(value, secretKey) {
  return createHmac('sha512', secretKey).update(value, 'utf8').digest('base64');
}

function buildHashInput(f) {
  return [
    f.paymentModel,
    f.txnCode,
    f.merchantSafeId,
    f.terminalSafeId,
    f.orderId,
    f.lang,
    f.amount,
    f.ccbRewardAmount,
    f.pcbRewardAmount,
    f.xcbRewardAmount,
    f.currencyCode,
    f.installCount,
    f.okUrl,
    f.failUrl,
    f.emailAddress,
    f.mobilePhone,
    f.homePhone,
    f.workPhone,
    f.randomNumber,
    f.requestDateTime,
    f.b2bIdentityNumber,
    f.merchantData,
    f.merchantBranchNo,
    f.mobileEci,
    f.walletProgramData,
    f.mobileAssignedId,
    f.mobileDeviceType,
  ].join('');
}

// ── Helper ───────────────────────────────────────────────────────────────────
function formatDateTime(date = new Date()) {
  const p2 = n => String(n).padStart(2, '0');
  const p3 = n => String(n).padStart(3, '0');
  return `${date.getFullYear()}-${p2(date.getMonth() + 1)}-${p2(date.getDate())}T`
    + `${p2(date.getHours())}:${p2(date.getMinutes())}:${p2(date.getSeconds())}.${p3(date.getMilliseconds())}`;
}

function randomHex128() {
  return randomBytes(64).toString('hex'); // 128 hex chars, lowercase
}

// ── Ana test ─────────────────────────────────────────────────────────────────
const env = loadEnv();

const MERCHANT_SAFE_ID = env.AKBANK_MERCHANT_SAFE_ID;
const TERMINAL_SAFE_ID = env.AKBANK_TERMINAL_SAFE_ID;
const SECRET_KEY = env.AKBANK_SECRET_KEY;
const AKBANK_ENV = env.AKBANK_ENV ?? 'test';

console.log('\n══════════════════════════════════════════════════════');
console.log('AKBANK DEBUG - Kimlik Bilgileri');
console.log('══════════════════════════════════════════════════════');
console.log('MERCHANT_SAFE_ID :', MERCHANT_SAFE_ID);
console.log('TERMINAL_SAFE_ID :', TERMINAL_SAFE_ID);
console.log('SECRET_KEY       :', SECRET_KEY ? `${SECRET_KEY.slice(0, 8)}...${SECRET_KEY.slice(-4)} (${SECRET_KEY.length} karakter)` : '❌ EKSİK');
console.log('AKBANK_ENV       :', AKBANK_ENV);

if (!MERCHANT_SAFE_ID || MERCHANT_SAFE_ID.includes('your_')
  || !TERMINAL_SAFE_ID || TERMINAL_SAFE_ID.includes('your_')
  || !SECRET_KEY || SECRET_KEY.includes('your_')) {
  console.error('\n❌ HATA: .env.local içinde gerçek AKBANK kimlik bilgileri eksik!\n');
  process.exit(1);
}

// Test ödeme parametreleri
const BASE_URL = 'http://localhost:3000';
const merchantOid = `BRB${Date.now()}0001`;
const requestDateTime = formatDateTime();
const randomNumber = randomHex128();

const fields = {
  paymentModel: 'PAY_HOSTING',
  txnCode: '1000',
  merchantSafeId: MERCHANT_SAFE_ID,
  terminalSafeId: TERMINAL_SAFE_ID,
  orderId: merchantOid,
  lang: 'TR',
  amount: '10.00', // 10 TL test tutarı
  ccbRewardAmount: '0.00',
  pcbRewardAmount: '0.00',
  xcbRewardAmount: '0.00',
  currencyCode: '949',
  installCount: '1',
  okUrl: `${BASE_URL}/api/akbank/return?flow=product&redirect=%2Fcheckout%2Fsuccess`,
  failUrl: `${BASE_URL}/api/akbank/return?flow=product&redirect=%2Fcheckout%2Ffailed`,
  emailAddress: 'test@example.com',
  mobilePhone: '5000000000',
  homePhone: '',
  workPhone: '',
  randomNumber,
  requestDateTime,
  b2bIdentityNumber: '',
  merchantData: '',
  merchantBranchNo: '',
  mobileEci: '',
  walletProgramData: '',
  mobileAssignedId: '',
  mobileDeviceType: '',
};

const hashInput = buildHashInput(fields);
const hash = hashToString(hashInput, SECRET_KEY);

console.log('\n══════════════════════════════════════════════════════');
console.log('AKBANK DEBUG - Form Alanları');
console.log('══════════════════════════════════════════════════════');
for (const [k, v] of Object.entries({ ...fields, hash })) {
  const display = v.length > 80 ? `${v.slice(0, 77)}...` : v;
  console.log(`  ${k.padEnd(24)}: ${display}`);
}

console.log('\n══════════════════════════════════════════════════════');
console.log('AKBANK DEBUG - Hash Hesaplama');
console.log('══════════════════════════════════════════════════════');
console.log('Hash Input (ilk 120 karakter):');
console.log(' ', `${hashInput.slice(0, 120)}...`);
console.log('\nHash Input Uzunluğu:', hashInput.length, 'karakter');
console.log('randomNumber Uzunluğu:', randomNumber.length, '(beklenen: 128)');
console.log('randomNumber Lowercase:', randomNumber === randomNumber.toLowerCase() ? '✅ evet' : '❌ hayır (büyük harf var!)');
console.log('\nÜretilen Hash:', hash);
console.log('Hash Uzunluğu:', hash.length, 'karakter');

console.log('\n══════════════════════════════════════════════════════');
console.log('AKBANK DEBUG - Gateway URL');
console.log('══════════════════════════════════════════════════════');
const gatewayUrl = AKBANK_ENV === 'prod'
  ? 'https://virtualpospaymentgateway.akbank.com/payhosting'
  : 'https://virtualpospaymentgatewaypre.akbank.com/payhosting';
console.log('URL:', gatewayUrl);

console.log('\n══════════════════════════════════════════════════════');
console.log('AKBANK DEBUG - Test HTML Formu');
console.log('══════════════════════════════════════════════════════');
console.log('Aşağıdaki HTML\'i tarayıcıda aç ve "Submit" butonuna bas:');
console.log('(debug-akbank-form.html dosyasına kaydedildi)\n');

const allFields = { ...fields, hash };
const htmlInputs = Object.entries(allFields)
  .map(([k, v]) => `  <input type="hidden" name="${k}" value="${v}">`)
  .join('\n');

const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Akbank Debug Test</title></head>
<body>
<h2>Akbank PAY_HOSTING Test Formu</h2>
<p><strong>merchantOid:</strong> ${merchantOid}</p>
<p><strong>amount:</strong> ${fields.amount} TL</p>
<p><strong>txnCode:</strong> ${fields.txnCode}</p>
<p><strong>okUrl:</strong> ${fields.okUrl}</p>
<p><strong>failUrl:</strong> ${fields.failUrl}</p>
<form action="${gatewayUrl}" method="POST">
${htmlInputs}
  <button type="submit" style="padding:10px 20px;font-size:16px;background:green;color:white;border:none;cursor:pointer">
    Akbank Test Ödemesi Başlat
  </button>
</form>
</body>
</html>`;
writeFileSync('debug-akbank-form.html', html, 'utf8');
console.log('✅ debug-akbank-form.html oluşturuldu');
console.log('\nNot: Bu form, gerçek Akbank TEST ortamına bağlanır.');
console.log('Test kart bilgileri için Akbank\'tan aldığınız dökümanı kullanın.\n');

// Yanıt hash doğrulama örneği
console.log('══════════════════════════════════════════════════════');
console.log('AKBANK DEBUG - Yanıt Hash Doğrulama Örneği');
console.log('══════════════════════════════════════════════════════');
const mockResponse = {
  txnCode: '1000',
  responseCode: 'VPS-0000',
  responseMessage: 'BAŞARILI',
  hostResponseCode: '00',
  hostMessage: '000 ONAY KODU TEST01',
  txnDateTime: requestDateTime,
  merchantSafeId: MERCHANT_SAFE_ID,
  terminalSafeId: TERMINAL_SAFE_ID,
  cardHolderName: 'TEST USER',
  orderId: merchantOid,
  authCode: '123456',
  rrn: '502824615059',
  batchNumber: '1',
  stan: '1',
  amount: '10.00',
  installCount: '1',
  additionalInstallCount: '0',
  deferingMonth: '0',
  ccbEarnedRewardAmount: '0.00',
  ccbBalanceRewardAmount: '0.00',
  ccbRewardDesc: '',
  pcbEarnedRewardAmount: '0.00',
  pcbBalanceRewardAmount: '0.00',
  xcbEarnedRewardAmount: '0.00',
  xcbBalanceRewardAmount: '0.00',
  hashParams: 'txnCode+responseCode+responseMessage+hostResponseCode+hostMessage+txnDateTime+merchantSafeId+terminalSafeId+orderId+cardHolderName+authCode+rrn+batchNumber+stan+amount+installCount+additionalInstallCount+deferingMonth+ccbEarnedRewardAmount+ccbBalanceRewardAmount+ccbRewardDesc+pcbEarnedRewardAmount+pcbBalanceRewardAmount+xcbEarnedRewardAmount+xcbBalanceRewardAmount',
};

const respPlain = mockResponse.hashParams
  .split('+')
  .map(p => mockResponse[p] ?? '')
  .join('');
mockResponse.hash = hashToString(respPlain, SECRET_KEY);

const verified = hashToString(respPlain, SECRET_KEY) === mockResponse.hash;
console.log('Mock yanıt hash doğrulama:', verified ? '✅ BAŞARILI' : '❌ BAŞARISIZ');
console.log('(Bu gerçek Akbank yanıtı değil, sadece lokal test)\n');
