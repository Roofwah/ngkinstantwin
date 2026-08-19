/**
 * Shared Turnstyle Lab defaults for any instant-win style promotion.
 * Per-campaign configs override only what differs (branding, retailer, rules).
 */

export const STANDARD_JOURNEY_STAGES = [
  { id: 'qualifying_purchase', label: 'Qualifying purchase', hint: 'Customer buys eligible products' },
  { id: 'access_point', label: 'Access point', hint: 'Customer scans QR in store' },
  { id: 'entry_opened', label: 'Customer joined', hint: 'Journey begins on their phone' },
  { id: 'otp_sent', label: 'OTP sent', hint: 'SMS verification code' },
  { id: 'customer_verified', label: 'Customer verified', hint: 'Identity confirmed' },
  { id: 'receipt_received', label: 'Receipt received', hint: 'Photo or PDF uploaded' },
  { id: 'reading_receipt', label: 'Reading receipt', hint: 'RRI extracts purchase data' },
  { id: 'purchase_validated', label: 'Purchase validated', hint: 'Eligible brand and amount' },
  { id: 'submitting', label: 'Submit', hint: 'Claim sent to Turnstyle' },
  { id: 'checking_instant_win', label: 'Pure Random', hint: 'Checking instant win' },
  { id: 'instant_win_outcome', label: 'Instant win outcome', hint: 'Winner or not winner' },
  { id: 'prize_allocated', label: 'Prize allocated', hint: 'Prize assigned to customer' },
  { id: 'reporting', label: 'Campaign reporting', hint: 'Data captured for reporting' },
];

export const STANDARD_TURNSTYLE_COMPONENTS = [
  { id: 'access_point', label: 'Access Point', description: 'QR entry at retailer' },
  { id: 'identity', label: 'Identity', description: 'Mobile OTP verification' },
  { id: 'rri', label: 'RRI', description: 'Receipt reading & validation' },
  { id: 'pure_random', label: 'Pure Random', description: 'Instant win engine' },
  { id: 'prize', label: 'Prize', description: 'Prize allocation' },
  { id: 'reporting', label: 'Reporting', description: 'Campaign data capture' },
];

export const DEFAULT_QUALIFYING_RULES = {
  minSpendOptions: [15, 25, 50, 75, 100],
  defaultMinSpend: 15,
  defaultAllowDuplicateReceipts: true,
};

export const DEFAULT_CUSTOMER_MESSAGES = {
  welcome: 'Scan to enter the instant win promotion',
  verified: 'Your mobile number is verified',
  receipt: 'Upload your receipt',
  outcomeWin: 'Congratulations — you have an instant win!',
  outcomeNoWin: 'Thanks for playing — draw entry confirmed',
};
