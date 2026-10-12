/**
 * Structured Logger with sensitive data masking
 */

const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'secret', 'key', 'jwt', 'authorization', 'cookie'];

function redactSensitiveData(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(redactSensitiveData);

  const redacted = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s));
    if (isSensitive) {
      redacted[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export const logger = {
  info(message, context = {}) {
    console.log(
      JSON.stringify({
        level: 'INFO',
        timestamp: new Date().toISOString(),
        message,
        ...redactSensitiveData(context),
      })
    );
  },

  warn(message, context = {}) {
    console.warn(
      JSON.stringify({
        level: 'WARN',
        timestamp: new Date().toISOString(),
        message,
        ...redactSensitiveData(context),
      })
    );
  },

  error(message, error = null, context = {}) {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        timestamp: new Date().toISOString(),
        message,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        ...redactSensitiveData(context),
      })
    );
  },

  debug(message, context = {}) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        JSON.stringify({
          level: 'DEBUG',
          timestamp: new Date().toISOString(),
          message,
          ...redactSensitiveData(context),
        })
      );
    }
  },
};
