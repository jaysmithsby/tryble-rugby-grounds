/**
 * Structured Logger Utility
 * 
 * Provides centralized, structured logging with:
 * - PII sanitization
 * - Log levels (debug, info, warn, error)
 * - Consistent JSON format for production
 * - Context enrichment
 * 
 * In development: Pretty-printed logs
 * In production: JSON structured logs (when integrated with log aggregator)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

// PII patterns to sanitize
const PII_PATTERNS = [
  // Email addresses
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL_REDACTED]' },
  // Phone numbers (various formats)
  { pattern: /(\+?[\d\s\-()]{10,})/g, replacement: '[PHONE_REDACTED]' },
  // UUIDs (often user IDs) - only in values, keep for debugging
  // JWT tokens
  { pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, replacement: '[TOKEN_REDACTED]' },
  // Bearer tokens
  { pattern: /Bearer\s+[a-zA-Z0-9._-]+/gi, replacement: 'Bearer [TOKEN_REDACTED]' },
  // API keys (common patterns)
  { pattern: /(?:api[_-]?key|apikey|secret)[=:\s]+["']?[a-zA-Z0-9_-]{20,}["']?/gi, replacement: '[API_KEY_REDACTED]' },
];

/**
 * Sanitize a string to remove PII
 */
export function sanitizePII(str: string): string {
  let sanitized = str;
  for (const { pattern, replacement } of PII_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
}

/**
 * Recursively sanitize an object
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizePII(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // Redact sensitive field names entirely
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('authorization') ||
        lowerKey.includes('cookie')
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(val);
      }
    }
    return sanitized;
  }
  return value;
}

/**
 * Check if we're in production environment
 */
function isProduction(): boolean {
  return import.meta.env.PROD;
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  if (isProduction()) {
    // JSON format for production log aggregators
    return JSON.stringify(entry);
  }
  
  // Pretty format for development
  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
  };
  const reset = '\x1b[0m';
  const color = levelColors[entry.level];
  
  let output = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.message}`;
  if (entry.context && Object.keys(entry.context).length > 0) {
    output += ` ${JSON.stringify(entry.context, null, 2)}`;
  }
  return output;
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  // Skip debug logs in production unless explicitly enabled
  if (level === 'debug' && isProduction()) {
    return;
  }

  const sanitizedContext = context ? sanitizeValue(context) as LogContext : undefined;
  
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: sanitizePII(message),
    context: sanitizedContext,
  };

  const formatted = formatLogEntry(entry);

  switch (level) {
    case 'debug':
    case 'info':
      console.log(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

/**
 * Logger object with methods for each log level
 */
export const logger = {
  /**
   * Debug level - only shown in development
   */
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  
  /**
   * Info level - general information
   */
  info: (message: string, context?: LogContext) => log('info', message, context),
  
  /**
   * Warn level - potential issues
   */
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  
  /**
   * Error level - errors and exceptions
   */
  error: (message: string, context?: LogContext) => log('error', message, context),

  /**
   * Log an error object with stack trace
   */
  exception: (error: Error, context?: LogContext) => {
    log('error', error.message, {
      ...context,
      errorName: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'), // Limit stack trace
    });
  },
};

export default logger;
