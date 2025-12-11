/**
 * Structured logger for Supabase Edge Functions (Deno)
 * Automatically redacts PII and respects environment
 */

const IS_DEV = Deno.env.get('DENO_DEPLOYMENT_ID') === undefined

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
    'userId', 'orgId', 'customerId', 'subscriptionId', 'invoiceId',
    'customer_id', 'subscription_id', 'invoice_id',
    'token', 'password', 'secret', 'key', 'authorization'
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
 * Edge Function logger
 */
export const logger = {
  /**
   * Debug-level logging (only in development)
   */
  debug: (message: string, data?: unknown) => {
    if (!IS_DEV) return
    const timestamp = new Date().toISOString()
    console.log(`[DEBUG ${timestamp}] ${message}`, data ? redactPII(data) : '')
  },

  /**
   * Info-level logging (only in development)
   */
  info: (message: string, data?: unknown) => {
    if (!IS_DEV) return
    const timestamp = new Date().toISOString()
    console.log(`[INFO ${timestamp}] ${message}`, data ? redactPII(data) : '')
  },

  /**
   * Warning-level logging (always logs but redacts PII)
   */
  warn: (message: string, data?: unknown) => {
    const timestamp = new Date().toISOString()
    console.warn(`[WARN ${timestamp}] ${message}`, data ? redactPII(data) : '')
  },

  /**
   * Error-level logging (always logs but redacts PII)
   */
  error: (message: string, error?: unknown) => {
    const timestamp = new Date().toISOString()
    if (error instanceof Error) {
      console.error(`[ERROR ${timestamp}] ${message}`, {
        name: error.name,
        message: error.message,
        // Only include stack in development
        ...(IS_DEV && { stack: error.stack })
      })
    } else {
      console.error(`[ERROR ${timestamp}] ${message}`, error ? redactPII(error) : '')
    }
  }
}
