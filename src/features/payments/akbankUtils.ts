import { createHmac, randomBytes } from 'node:crypto';

import { Env } from '@/libs/Env';

// ------------------------------------------------------------------
// Gateway URLs
// ------------------------------------------------------------------
export const AKBANK_GATEWAYS = {
  testPayHosting: 'https://virtualpospaymentgatewaypre.akbank.com/payhosting',
  prodPayHosting: 'https://virtualpospaymentgateway.akbank.com/payhosting',
} as const;

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

/**
 * All fields sent via HTML POST form to Akbank PAY_HOSTING.
 * Optional fields that are empty strings are still sent so that
 * the hash string always has the same structure.
 */
export type AkbankPayHostingRequestFields = {
  paymentModel: 'PAY_HOSTING';
  /** Transaction code. 1000 = sale (Akbank PAY_HOSTING docs). */
  txnCode: '1000';
  merchantSafeId: string;
  terminalSafeId: string;
  orderId: string;
  lang: 'TR' | 'EN';
  /** Amount formatted as "XX.XX" (e.g. "149.99") */
  amount: string;
  ccbRewardAmount: string;
  pcbRewardAmount: string;
  xcbRewardAmount: string;
  /** Currency code: 949 = TRY */
  currencyCode: '949';
  /** Number of installments: "1" = single payment */
  installCount: '1';
  okUrl: string;
  failUrl: string;
  emailAddress: string;
  /** Leave empty — PAY_HOSTING validates non-empty values against a phone pattern */
  mobilePhone: string;
  homePhone: string;
  workPhone: string;
  /** 128-character lowercase hex random string */
  randomNumber: string;
  /** Format: YYYY-MM-DDTHH:mm:ss.SSS */
  requestDateTime: string;
  b2bIdentityNumber: string;
  merchantData: string;
  merchantBranchNo: string;
  mobileEci: string;
  walletProgramData: string;
  mobileAssignedId: string;
  mobileDeviceType: string;
  hash: string;
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Returns date string in Akbank format: YYYY-MM-DDTHH:mm:ss.SSS */
export const formatAkbankDateTime = (date = new Date()): string => {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');

  return (
    `${date.getFullYear()}-`
    + `${pad2(date.getMonth() + 1)}-`
    + `${pad2(date.getDate())}T`
    + `${pad2(date.getHours())}:`
    + `${pad2(date.getMinutes())}:`
    + `${pad2(date.getSeconds())}.`
    + `${pad3(date.getMilliseconds())}`
  );
};

/**
 * Generates a 128-character lowercase hex random string.
 * Akbank documentation example shows lowercase hex.
 */
export const getRandomNumberBase16 = (length = 128): string => {
  const byteLength = Math.ceil(length / 2);
  return randomBytes(byteLength).toString('hex').slice(0, length);
};

/**
 * HMAC-SHA512 → Base64.
 * Used for both request hash generation and response hash verification.
 */
export const hashToString = (value: string, secretKey: string): string => {
  return createHmac('sha512', secretKey).update(value, 'utf8').digest('base64');
};

/** Returns the correct gateway URL based on the AKBANK_ENV env variable. */
export const getPayHostingActionUrl = (): string => {
  return Env.AKBANK_ENV === 'prod'
    ? AKBANK_GATEWAYS.prodPayHosting
    : AKBANK_GATEWAYS.testPayHosting;
};

/**
 * Builds the plain-text string that is HMAC-SHA512 hashed for the request.
 * Order MUST match Akbank documentation exactly.
 */
export const buildPayHostingHashInput = (
  fields: Omit<AkbankPayHostingRequestFields, 'hash'>,
): string => {
  // ALL fields must be included in the hash computation (even empty strings)
  // so that Akbank's hash verification matches. Order MUST match exactly.
  return [
    fields.paymentModel, // PAY_HOSTING
    fields.txnCode, // 1000
    fields.merchantSafeId,
    fields.terminalSafeId,
    fields.orderId,
    fields.lang, // TR | EN
    fields.amount, // e.g. "149.99"
    fields.ccbRewardAmount, // "0.00"
    fields.pcbRewardAmount, // "0.00"
    fields.xcbRewardAmount, // "0.00"
    fields.currencyCode, // "949"
    fields.installCount, // "1"
    fields.okUrl,
    fields.failUrl,
    fields.emailAddress,
    fields.mobilePhone, // "" (empty — avoids VPS-3001 pattern validation)
    fields.homePhone, // ""
    fields.workPhone, // ""
    fields.randomNumber, // 128-char lowercase hex
    fields.requestDateTime, // YYYY-MM-DDTHH:mm:ss.SSS
    fields.b2bIdentityNumber, // ""
    fields.merchantData, // ""
    fields.merchantBranchNo, // ""
    fields.mobileEci, // ""
    fields.walletProgramData, // ""
    fields.mobileAssignedId, // ""
    fields.mobileDeviceType, // ""
  ].join('');
};

// ------------------------------------------------------------------
// Response hash verification
// ------------------------------------------------------------------

/**
 * Verifies the HMAC-SHA512 hash in Akbank's POST-back response.
 * Returns true only when the hash is present AND matches.
 */
export const verifyResponseHash = (
  payload: Record<string, string>,
  secretKey: string,
): boolean => {
  const responseHash = payload.hash;
  const hashParams = payload.hashParams;

  if (!responseHash || !hashParams) {
    console.warn('AKBANK verifyResponseHash: missing hash or hashParams in payload');
    return false;
  }

  const plainValue = hashParams
    .split('+')
    .map(param => payload[param] ?? '')
    .join('');

  const expectedHash = hashToString(plainValue, secretKey);
  const valid = expectedHash === responseHash;

  if (!valid) {
    console.warn('AKBANK verifyResponseHash: hash mismatch', {
      expected: expectedHash,
      received: responseHash,
      hashParams,
    });
  }

  return valid;
};
