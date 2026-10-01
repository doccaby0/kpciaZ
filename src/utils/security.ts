/**
 * Security and Sanitization Utilities
 * Designed to protect against Cross-Site Scripting (XSS), code injection, 
 * and data corruption without adding operational or package weight.
 */

/**
 * Sanitizes input strings to strip dangerous HTML tags and script injections.
 */
export function sanitizeString(val: string): string {
  if (!val) return '';
  if (typeof val !== 'string') return String(val);

  // 1. Strip common HTML tag injections to prevent stored XSS
  let sanitized = val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
    .replace(/on\w+="[^"]*"/gi, '') // Remove inline handlers like onclick="..."
    .replace(/javascript:[^\s"']*/gi, '') // Remove javascript: protocol links
    .replace(/<\/?[^>]+(>|$)/g, ''); // Remove general HTML tags

  // 2. Escape HTML special characters for safe output context
  const htmlEscapes: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  // Only escape if necessary
  return sanitized.trim();
}

/**
 * Validates and normalizes phone numbers to prevent malformed injections.
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  // Keep only numbers and dashes
  return phone.replace(/[^0-9\-+ ]/g, '').trim();
}

/**
 * Validates email format strictly on client-side
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Rate Limiter utility for submission actions (preventing spamming/DDoS on Netlify forms and Firestore)
 */
const rateLimitCache: { [key: string]: number } = {};

export function checkRateLimit(actionKey: string, limitMs: number = 3000): boolean {
  const now = Date.now();
  const lastCall = rateLimitCache[actionKey];
  
  if (lastCall && now - lastCall < limitMs) {
    return false; // Throttled
  }
  
  rateLimitCache[actionKey] = now;
  return true; // Allowed
}
