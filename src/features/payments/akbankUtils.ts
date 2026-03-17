import { createHmac, randomBytes } from 'node:crypto';

import { Env } from '@/libs/Env';

// ------------------------------------------------------------------
// Gateway URLs
// ------------------------------------------------------------------
export const AKBANK_GATEWAYS = {
  testPayHosting: 'https://virtualpospaymentgatewaypre.akbank.com/payhosting',
  prodPayHosting: 'https://virtualpospaymentgateway.akbank.com/payhosting',
  testPaymentApi: 'https://virtualpospaymentgatewaypre.akbank.com/api/v1/payment',
  prodPaymentApi: 'https://virtualpospaymentgateway.akbank.com/api/v1/payment',
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

export type AkbankPaymentApiRequest = {
  version: '1.00';
  txnCode: '1000';
  requestDateTime: string;
  randomNumber: string;
  terminal: {
    merchantSafeId: string;
    terminalSafeId: string;
  };
  card: {
    cardNumber: string;
    cvv2: string;
    expireDate: string;
  };
  order: {
    orderId: string;
  };
  reward: {
    ccbRewardAmount: string;
    pcbRewardAmount: string;
    xcbRewardAmount: string;
  };
  transaction: {
    amount: string;
    currencyCode: 949;
    motoInd: 0;
    installCount: 1;
  };
  customer: {
    emailAddress: string;
    ipAddress: string;
  };
};

export type AkbankPaymentApiResponse = {
  txnCode?: string;
  responseCode?: string;
  responseMessage?: string;
  hostResponseCode?: string;
  hostMessage?: string;
  txnDateTime?: string;
  terminal?: {
    merchantSafeId?: string;
    terminalSafeId?: string;
  };
  card?: {
    cardHolderName?: string;
  };
  order?: {
    orderId?: string;
  };
  transaction?: {
    authCode?: string;
    rrn?: string;
    batchNumber?: number;
    stan?: number;
    amount?: number;
    installCount?: number;
  };
  campaign?: {
    additionalInstallCount?: number;
    deferingDate?: string;
    deferingMonth?: number;
  };
  reward?: Record<string, unknown>;
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
 *
 * PHP equivalent: base64_encode(hash_hmac('sha512', $data, $secretKey, true))
 * The secret key is used as-is (string), matching Akbank's PHP example.
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

export const getAkbankPaymentApiUrl = (): string => {
  const customUrl = process.env.AKBANK_PAYMENT_API_URL?.trim();

  if (customUrl) {
    return customUrl;
  }

  return Env.AKBANK_ENV === 'prod'
    ? AKBANK_GATEWAYS.prodPaymentApi
    : AKBANK_GATEWAYS.testPaymentApi;
};

export const formatAkbankCardExpireDate = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 4);
};

export const maskCardNumber = (cardNumber: string): string => {
  const digits = cardNumber.replace(/\D/g, '');

  if (digits.length <= 4) {
    return digits;
  }

  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

export const isAkbankPaymentApproved = (response: AkbankPaymentApiResponse): boolean => {
  return response.responseCode === 'VPS-0000';
};

export const getAkbankPaymentErrorMessage = (response: AkbankPaymentApiResponse): string => {
  return response.hostMessage || response.responseMessage || 'Akbank ödeme işlemi başarısız oldu';
};

export const chargeAkbankPaymentApi = async (
  payload: AkbankPaymentApiRequest,
): Promise<AkbankPaymentApiResponse> => {
  const response = await fetch(getAkbankPaymentApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let data: AkbankPaymentApiResponse;

  try {
    data = JSON.parse(rawText) as AkbankPaymentApiResponse;
  } catch (error) {
    console.error('AKBANK Payment API non-JSON response', {
      status: response.status,
      body: rawText.slice(0, 1000),
      error,
    });
    throw new Error(`AKBANK Payment API invalid response (${response.status})`);
  }

  if (!response.ok) {
    console.error('AKBANK Payment API HTTP error', {
      status: response.status,
      data,
    });
    throw new Error(getAkbankPaymentErrorMessage(data));
  }

  return data;
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
