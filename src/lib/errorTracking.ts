/**
 * Error Tracking Utility
 * 
 * Provides centralized error tracking and reporting.
 * Currently uses a simple implementation that can be extended
 * with Sentry or other error tracking services.
 * 
 * Features:
 * - Captures unhandled errors
 * - Captures unhandled promise rejections
 * - Provides manual error reporting
 * - Context enrichment for better debugging
 */

import { logger } from './logger';

interface ErrorContext {
  userId?: string;
  route?: string;
  action?: string;
  componentName?: string;
  [key: string]: unknown;
}

interface CapturedError {
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  userAgent: string;
  url: string;
}

// Store recent errors for debugging (in-memory, limited)
const recentErrors: CapturedError[] = [];
const MAX_STORED_ERRORS = 50;

/**
 * Add error to recent errors queue
 */
function storeError(error: CapturedError): void {
  recentErrors.unshift(error);
  if (recentErrors.length > MAX_STORED_ERRORS) {
    recentErrors.pop();
  }
}

/**
 * Format error for logging/reporting
 */
function formatError(error: Error, context: ErrorContext = {}): CapturedError {
  return {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
  };
}

/**
 * Report error to tracking service
 * Can be extended to send to Sentry, LogRocket, etc.
 */
async function reportError(capturedError: CapturedError): Promise<void> {
  // Store locally for debugging
  storeError(capturedError);

  // Log to console with structured format
  logger.error('Captured error', {
    message: capturedError.message,
    context: capturedError.context,
    url: capturedError.url,
  });

  // In production, you would send this to an error tracking service
  // Example Sentry integration (when SDK is added):
  // if (window.Sentry) {
  //   Sentry.captureException(error, { extra: context });
  // }
}

/**
 * Error Tracking API
 */
export const errorTracking = {
  /**
   * Manually capture an error with context
   */
  captureError: (error: Error, context: ErrorContext = {}): void => {
    const captured = formatError(error, context);
    reportError(captured);
  },

  /**
   * Capture a message (non-error) for tracking
   */
  captureMessage: (message: string, context: ErrorContext = {}): void => {
    const pseudoError = new Error(message);
    const captured = formatError(pseudoError, { ...context, type: 'message' });
    reportError(captured);
  },

  /**
   * Set user context for error tracking
   */
  setUser: (userId: string | null): void => {
    if (userId) {
      logger.debug('Error tracking user set', { userId: userId.slice(0, 8) + '...' });
    }
    // When Sentry is integrated:
    // Sentry.setUser(userId ? { id: userId } : null);
  },

  /**
   * Get recent errors for debugging
   */
  getRecentErrors: (): CapturedError[] => {
    return [...recentErrors];
  },

  /**
   * Clear recent errors
   */
  clearErrors: (): void => {
    recentErrors.length = 0;
  },

  /**
   * Initialize global error handlers
   */
  init: (): void => {
    if (typeof window === 'undefined') return;

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      const error = event.error || new Error(event.message);
      errorTracking.captureError(error, {
        type: 'unhandled_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      errorTracking.captureError(error, {
        type: 'unhandled_rejection',
      });
    });

    logger.info('Error tracking initialized');
  },
};

export default errorTracking;
