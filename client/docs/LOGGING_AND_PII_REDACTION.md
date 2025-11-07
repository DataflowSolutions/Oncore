# Logging and PII Redaction

## Overview

This document describes the structured logging system implemented to prevent Personal Identifiable Information (PII) from being exposed in application logs.

## Problem Statement

**P0 Security Issue**: The application was logging sensitive user data including:
- User IDs
- Organization IDs and slugs
- Email addresses
- IP addresses
- Session tokens
- Error details containing PII

This violated privacy regulations and created security risks in production environments.

## Solution

### 1. Structured Logger (`lib/logger.ts`)

A centralized logging utility that:
- **Automatically redacts PII** from log messages
- **Gates verbose logging** behind `NODE_ENV` and `DEBUG` environment variables
- **Provides different log levels**: debug, info, warn, error, security
- **Only logs in development** unless explicitly enabled

### 2. PII Redaction

The logger automatically redacts sensitive fields:
```typescript
const sensitiveKeys = [
  'id', 'user_id', 'org_id', 'email', 'phone', 'address',
  'userId', 'orgId', 'sessionId', 'slug', 'token', 
  'password', 'secret', 'key', 'authorization'
]
```

**Example**:
```typescript
// Before:
console.log('User:', { userId: 'abc123', email: 'user@example.com' })
// Logs: User: { userId: 'abc123', email: 'user@example.com' }

// After:
logger.debug('User data', { userId: 'abc123', email: 'user@example.com' })
// Logs in dev: [DEBUG 2025-11-07...] User data { userId: 'abc1****', email: 'user****' }
// Logs in prod: (nothing - debug logs are suppressed)
```

### 3. Environment-Based Logging

```typescript
const IS_DEV = process.env.NODE_ENV === 'development'
const DEBUG_ENABLED = process.env.DEBUG === 'true'
const SHOULD_LOG = IS_DEV || DEBUG_ENABLED
```

**Log Levels**:
- `logger.debug()` - Only in development or when DEBUG=true
- `logger.info()` - Only in development or when DEBUG=true  
- `logger.warn()` - Always logs (but redacts PII)
- `logger.error()` - Always logs (but redacts PII)
- `logger.security()` - Always logs (minimal context, no PII)

### 4. Security Logging

Special logger for audit trails:
```typescript
logger.security('Auth check failed', {
  action: 'api_access',
  resource: '/api/orgs/...',  // Automatically redacted
  result: 'denied'
})
```

## Usage

### Import the Logger

```typescript
import { logger } from '@/lib/logger'
```

### Debug Logging (Development Only)

```typescript
logger.debug('Cache: Fetching org', { slug: orgSlug })
// Only appears in development or when DEBUG=true
```

### Error Logging (Production Safe)

```typescript
try {
  // ... code
} catch (error) {
  logger.error('Failed to fetch data', error)
  // Logs error with redacted PII, includes stack trace only in dev
}
```

### Security Events

```typescript
if (!session) {
  logger.security('Unauthorized API access', {
    action: 'api_request',
    result: 'denied'
  })
}
```

## Files Updated

### Core Logger
- ✅ `lib/logger.ts` - Structured logger with PII redaction

### Cache & Utils
- ✅ `lib/cache.ts` - Replaced console.log with logger.debug
- ✅ `lib/supabase.ts` - Replaced console.log with logger.debug
- ✅ `lib/supabase/admin.server.ts` - Removed debug logging

### Middleware
- ✅ `app/utils/supabase/middleware.ts` - Added lightweight logger, removed PII from logs

### API Routes
- ✅ `app/api/sync/route.ts` - Replaced console with logger
- ✅ `app/api/activity-log/route.ts` - Added PII redaction, security logging
- ✅ `app/api/[org]/venues/route.ts` - Replaced console.error

### Pages & Layouts
- ✅ `app/(app)/[org]/layout.tsx` - Replaced console.log
- ✅ `app/(app)/[org]/page.tsx` - Replaced console.log

## Environment Variables

Add to your `.env` or `.env.local`:

```bash
# Enable debug logging in production (use sparingly)
DEBUG=false

# Development automatically enables all logging
NODE_ENV=development
```

## Production Checklist

Before deploying to production:

- [ ] Verify `NODE_ENV=production` is set
- [ ] Verify `DEBUG` is not set to `true` (or not set at all)
- [ ] Check build output for any remaining `console.log` statements
- [ ] Test that logs don't contain actual user IDs, emails, or tokens
- [ ] Verify error tracking service (e.g., Sentry) is configured with PII scrubbing

## Testing

### Test PII Redaction

```typescript
import { logger } from '@/lib/logger'

// This should redact sensitive data
logger.debug('Test', {
  userId: '12345678-abcd-1234-abcd-123456789012',
  email: 'test@example.com',
  orgSlug: 'my-org',
  regularField: 'visible'
})

// Expected output in dev:
// [DEBUG ...] Test { userId: '1234****', email: 'test****', orgSlug: 'my-o****', regularField: 'visible' }
```

### Test Environment Gating

```bash
# Should log debug messages
NODE_ENV=development npm run dev

# Should NOT log debug messages
NODE_ENV=production npm run build && npm run start

# Should log debug messages even in production
NODE_ENV=production DEBUG=true npm run start
```

## Future Improvements

1. **Integrate with logging service** (Datadog, LogRocket, etc.)
2. **Add request ID tracking** for distributed tracing
3. **Implement log sampling** for high-volume endpoints
4. **Add performance metrics** alongside logs
5. **Create custom redaction rules** per data type

## Related Issues

- ✅ Fixed P0: PII dumped to logs
- ✅ Fixed: Dev tooling shipped to prod (separate logger for dev)
- Supports: Security monitoring and audit logging
