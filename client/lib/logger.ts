/**
 * Structured logger with PII redaction
 * Only logs in development or when DEBUG is enabled
 */

const IS_DEV = process.env.NODE_ENV === 'development'
const DEBUG_ENABLED = process.env.DEBUG === 'true'
const SHOULD_LOG = IS_DEV || DEBUG_ENABLED

/**
 * Redacts sensitive information from objects
 */
function redactPII(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => redactPII(item))
  }

  const redacted: Record<string, unknown> = {}
  const sensitiveKeys = [
    'id', 'user_id', 'org_id', 'email', 'phone', 'address',
    'userId', 'orgId', 'sessionId', 'slug', 'token', 
    'password', 'secret', 'key', 'authorization'
  ]

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk.toLowerCase()))
    
    if (isSensitive && typeof value === 'string') {
      // Redact but show first 4 chars for debugging
      redacted[key] = value.length > 4 ? `${value.substring(0, 4)}****` : '****'
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactPII(value)
    } else {
      redacted[key] = value
    }
  }

  return redacted
}

/**
 * Logger levels
 */
export const logger = {
  /**
   * Debug-level logging (most verbose)
   * Only logs when DEBUG=true or in development
   */
  debug: (message: string, data?: unknown) => {
    if (!SHOULD_LOG) return
    const timestamp = new Date().toISOString()
    console.log(`[DEBUG ${timestamp}] ${message}`, data ? redactPII(data) : '')
  },

  /**
   * Info-level logging
   * Only logs in development or when DEBUG is enabled
   */
  info: (message: string, data?: unknown) => {
    if (!SHOULD_LOG) return
    const timestamp = new Date().toISOString()
    console.log(`[INFO ${timestamp}] ${message}`, data ? redactPII(data) : '')
  },

  /**
   * Warning-level logging
   * Always logs but redacts PII
   */
  warn: (message: string, data?: unknown) => {
    const timestamp = new Date().toISOString()
    console.warn(`[WARN ${timestamp}] ${message}`, data ? redactPII(data) : '')
  },

  /**
   * Error-level logging
   * Always logs but redacts PII
   */
  error: (message: string, error?: unknown) => {
    const timestamp = new Date().toISOString()
    if (error instanceof Error) {
      console.error(`[ERROR ${timestamp}] ${message}`, {
        name: error.name,
        message: error.message,
        // Only include stack in development
        ...(SHOULD_LOG && { stack: error.stack })
      })
    } else {
      console.error(`[ERROR ${timestamp}] ${message}`, error ? redactPII(error) : '')
    }
  },

  /**
   * Security-relevant logging
   * Always logs with minimal context (no PII)
   */
  security: (message: string, context?: { action: string; resource?: string; result: 'allowed' | 'denied' }) => {
    const timestamp = new Date().toISOString()
    console.log(`[SECURITY ${timestamp}] ${message}`, context ? {
      action: context.action,
      resource: context.resource ? '[REDACTED]' : undefined,
      result: context.result
    } : '')
  }
}

/**
 * Conditional logger for development only
 */
export const devLogger = {
  log: (...args: unknown[]) => {
    if (SHOULD_LOG) {
      console.log(...args.map(arg => typeof arg === 'object' ? redactPII(arg) : arg))
    }
  },
  warn: (...args: unknown[]) => {
    if (SHOULD_LOG) {
      console.warn(...args.map(arg => typeof arg === 'object' ? redactPII(arg) : arg))
    }
  },
  error: (...args: unknown[]) => {
    if (SHOULD_LOG) {
      console.error(...args.map(arg => typeof arg === 'object' ? redactPII(arg) : arg))
    }
  }
}
