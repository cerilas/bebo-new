/**
 * Akbank Secret Key Doğrulama Scripti
 *
 * Akbank portal → Güvenlik Anahtarları sayfasındaki key'i bu scripte gir
 * ve hangi hash formatının eşleştiğini gör.
 *
 * Çalıştır: node scripts/verify-akbank-key.mjs
 */

import { Buffer } from 'node:buffer';
import { createHmac } from 'node:crypto';

// ─── Dökümantasyondaki örnek değerler (Akbank'ın kendi dokümanından) ──────────
// Plain string (docs örneği):
// PAY_HOSTING30002021100817201276087614366067466230211008172012760876143660674662
// f17345db-2ea7-4294-a76c-bf0cb64b4ac9TR10.001.001.001.00949 ... (tam string)
//
// Akbank'ın kendi dokümanından test hash'i verilmediği için,
// biz kendi key'imizin iki versiyonunu karşılaştırıyoruz.
// ─────────────────────────────────────────────────────────────────────────────

const KEY_HEX = '32303236303330393133323830343239333367326731677673357235335f76325f3138353272745f335f7232375f353567743233673837355f32767233763733';
const KEY_PLAIN = Buffer.from(KEY_HEX, 'hex').toString('utf8');

console.log('═══════════════════════════════════════════════════════');
console.log('AKBANK KEY DOĞRULAMA');
console.log('═══════════════════════════════════════════════════════');
console.log('\nKey (hex, .env.local\'da kayıtlı):');
console.log(' ', `${KEY_HEX.slice(0, 40)}...`);
console.log(' Uzunluk:', KEY_HEX.length);

console.log('\nKey (decoded, plain text):');
console.log(' ', KEY_PLAIN);
console.log(' Uzunluk:', KEY_PLAIN.length);

const TEST_STR = 'PAY_HOSTING10001234567890merchantterminaltestordTR10.000.000.000.009491okurlfailurltest@test.com50000000001234567890TRXXXXXXXX2026-01-01T00:00:00.000';

function hmac(key, value) {
  return createHmac('sha512', key).update(value, 'utf8').digest('base64');
}

const hashWithHex = hmac(KEY_HEX, TEST_STR);
const hashWithPlain = hmac(KEY_PLAIN, TEST_STR);

console.log('\n─────────────────────────────────────────────────────');
console.log('Test Hash (hex key kullanılarak):');
console.log(' ', hashWithHex);

console.log('\nTest Hash (decoded plain key kullanılarak):');
console.log(' ', hashWithPlain);

console.log('\n─────────────────────────────────────────────────────');
console.log('YAPMAN GEREKEN:');
console.log('1. Akbank Test Portali → Güvenlik Anahtarları sayfasını aç');
console.log('2. Portaldaki secret key değerini kopyala');
console.log('3. Aşağıdaki satırı kontrol et:\n');
console.log('   Portal key == KEY_HEX?   ', KEY_HEX === '(portaldaki değer)' ? '✅' : '?');
console.log('   Portal key == KEY_PLAIN? ', KEY_PLAIN === '(portaldaki değer)' ? '✅' : '?');
console.log('\nEğer portal KEY_PLAIN ile eşleşiyorsa → .env.local\'ı güncelle:');
console.log(`   AKBANK_SECRET_KEY=${KEY_PLAIN}`);
console.log('\nEğer portal KEY_HEX ile eşleşiyorsa → mevcut .env.local doğru.');
console.log('═══════════════════════════════════════════════════════\n');
