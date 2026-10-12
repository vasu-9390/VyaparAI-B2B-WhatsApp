/**
 * Prompt Injection Sanitizer
 * Strips adversarial jailbreak attempts from unstructured customer messages.
 */

const SUSPICIOUS_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/gi,
  /you\s+are\s+now\s+(an?\s+)?(admin|system|developer|root)/gi,
  /system\s*:\s*/gi,
  /<system>/gi,
  /<\/system>/gi,
  /override\s+(the\s+)?(price|margin|database|discount)/gi,
  /set\s+(the\s+)?price\s+to\s+0/gi,
  /print\s+(the\s+)?(system\s+prompt|api\s*key|password)/gi,
];

export function sanitizeCustomerInput(text) {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text.trim();

  // 1. Enforce length limit (maximum 2,000 characters per WhatsApp message)
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000);
  }

  // 2. Strip suspicious control sequences
  for (const pattern of SUSPICIOUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REMOVED_SUSPICIOUS_DIRECTIVE]');
  }

  // 3. Normalize multiple whitespace and null bytes
  sanitized = sanitized.replace(/\0/g, '').replace(/\s+/g, ' ');

  return sanitized;
}
