import { createHmac } from 'node:crypto';

const secretKey = '32303236303330393133323830343239333367326731677673357235335f76325f3138353272745f335f7232375f353567743233673837355f32767233763733';

// Reproduce exact fields from DB log id:76
const hashInput = [
  'PAY_HOSTING', // paymentModel
  '1000', // txnCode
  '2026030913280433885E940871BB8825', // merchantSafeId
  '202603091328043616B7363E8D68B004', // terminalSafeId
  'CRD17734912676291533dXNlcl8z', // orderId
  'TR', // lang
  '30.00', // amount
  '0.00', // ccbRewardAmount
  '0.00', // pcbRewardAmount
  '0.00', // xcbRewardAmount
  '949', // currencyCode
  '1', // installCount
  'https://www.birebiro.com/api/akbank/return?flow=credit&redirect=%2Fpurchase-credits%2Fsuccess', // okUrl
  'https://www.birebiro.com/api/akbank/return?flow=credit&redirect=%2Fpurchase-credits%2Ffailed', // failUrl
  'denizcanilgin@gmail.com', // emailAddress
  '', // mobilePhone
  '', // homePhone
  '', // workPhone
  '7563db919108b02d027252cbda470cb72212807bef0ba405a5f8a85dc8fb37c1fee592de4cbbad70c503c0fbe570ededd0b7cb33c19ae6e5d1bc85eb8b04764b', // randomNumber
  '2026-03-14T12:27:47.629', // requestDateTime
  '', // b2bIdentityNumber
  '', // merchantData
  '', // merchantBranchNo
  '', // mobileEci
  '', // walletProgramData
  '', // mobileAssignedId
  '', // mobileDeviceType
].join('');

console.log('=== HASH INPUT STRING ===');
console.log(hashInput);
console.log('\n=== LENGTH ===', hashInput.length);

const hash = createHmac('sha512', secretKey).update(hashInput, 'utf8').digest('base64');
console.log('\n=== COMPUTED HASH ===');
console.log(hash);

const dbHash = 'ZIh6mocmg4488fUDS/0gR9EWciiyqHQjvPyZat51qmdZ7tor35Y0CI5ZjVi5I5hN7Zf08eiyGNEjNTVKjsSMEg==';
console.log('\n=== DB HASH ===');
console.log(dbHash);
console.log('\n=== MATCH? ===', hash === dbHash);

// Also test Akbank doc example to validate our hash function
console.log('\n\n=== VALIDATING WITH DOC EXAMPLE ===');
const docHashInput = [
  'PAY_HOSTING', // paymentModel
  '3000', // txnCode (doc example uses 3000!)
  '20211008172012760876143660674662', // merchantSafeId
  '20211008172012760876143660674662', // terminalSafeId
  'f17345db-2ea7-4294-a76c-bf0cb64b4ac9', // orderId
  'TR', // lang
  '10.00', // amount
  '1.00', // ccbRewardAmount
  '1.00', // pcbRewardAmount
  '1.00', // xcbRewardAmount
  '949', // currencyCode
  '1', // installCount
  'https://test.com/okUrl', // okUrl
  'https://test.com/failUrl', // failUrl
  'x@xxx', // emailAddress
  '090-2121000000', // mobilePhone
  '090-2121000000', // homePhone
  '090-2121000000', // workPhone
  '5ebc382aa6bb06d909650c92032e16891cef071376f27a28398d531d1270c19201fed655d4677e2e6191b88679359e449cfce2d46c4d20465a1b02a3a26c663f', // randomNumber
  '2025-03-12T13:34:22.123', // requestDateTime
  '', // b2bIdentityNumber
  '', // merchantData
  '', // merchantBranchNo
  '', // mobileEci
  '', // walletProgramData
  '', // mobileAssignedId
  '', // mobileDeviceType
].join('');

console.log('Doc plain string:');
console.log(docHashInput);
console.log('\nExpected from doc:');
console.log('PAY_HOSTING30002021100817201276087614366067466230211008172012760876143660674662f17345db-2ea7-4294-a76c-bf0cb64b4ac9TR10.001.001.001.009491https://test.com/okUrlhttps://test.com/failUrlx@xxx090-2121000000090-2121000000090-21210000005ebc382aa6bb06d909650c92032e16891cef071376f27a28398d531d1270c19201fed655d4677e2e6191b88679359e449cfce2d46c4d20465a1b02a3a26c663f2025-03-12T13:34:22.123');
console.log('\nStrings match?', docHashInput === 'PAY_HOSTING30002021100817201276087614366067466230211008172012760876143660674662f17345db-2ea7-4294-a76c-bf0cb64b4ac9TR10.001.001.001.009491https://test.com/okUrlhttps://test.com/failUrlx@xxx090-2121000000090-2121000000090-21210000005ebc382aa6bb06d909650c92032e16891cef071376f27a28398d531d1270c19201fed655d4677e2e6191b88679359e449cfce2d46c4d20465a1b02a3a26c663f2025-03-12T13:34:22.123');
