# Storage Metadata Enforcement

This document outlines the two approaches for ensuring storage metadata consistency in the Oncore platform.

## Overview

The challenge: Supabase Storage metadata can be bypassed by clients, leading to inconsistencies between database records and actual storage object metadata.

## Option 1: Edge Function Enforcement (Recommended)

**Location**: `supabase/functions/upload-file/`

**How it works**:
1. Client calls Edge Function instead of direct storage upload
2. Edge Function calls `app_upload_file()` RPC to validate permissions and generate metadata
3. Edge Function performs storage upload with enforced metadata
4. If storage fails, database record is cleaned up automatically

**Advantages**:
- ✅ Guarantees metadata consistency
- ✅ Atomic operations (storage + database)
- ✅ No race conditions
- ✅ Better security (server-side validation)

**Usage**:
```typescript
// Client-side (already implemented in lib/actions/files.ts)
const result = await uploadFile(file, {
  orgId: 'uuid',
  sessionId: 'uuid', // optional
  partyType: 'from_us' // optional
})
```

## Option 2: Post-Upload Verification (Alternative)

**Location**: `supabase/functions/verify-storage/`

**How it works**:
1. Clients upload directly to storage (with potential metadata inconsistencies)
2. Scheduled job runs `verify_storage_metadata()` to cross-check
3. Mismatches are flagged for correction or cleanup

**Advantages**:
- ✅ Works with existing direct upload patterns
- ✅ Can detect and fix historical inconsistencies
- ✅ Less immediate impact on upload performance

**Disadvantages**:
- ❌ Window of inconsistency between upload and verification
- ❌ More complex error handling
- ❌ Requires additional infrastructure (scheduled jobs)

## Activity Log Management

### Current Implementation
- Single table with org-based partitioning via policies
- Automatic timestamping and user tracking
- RPC-only inserts to prevent data tampering

### Scale Management Options

#### Option A: Monthly Partitioning
```sql
-- Example partition (add to migration when needed)
CREATE TABLE activity_log_2025_09 PARTITION OF activity_log
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
```

#### Option B: Archival Strategy
```sql
-- Archive logs older than 90 days (scheduled job)
SELECT archive_old_activity_logs(90);
```

### Usage Examples

```sql
-- Log file upload
SELECT app_log_activity(
  'org-uuid'::uuid,
  'upload',
  'file',
  'file-uuid'::uuid,
  '{"file_name": "contract.pdf", "size": 1024}'::jsonb
);

-- Log show invitation
SELECT app_log_activity(
  'org-uuid'::uuid,
  'invite_sent',
  'show',
  'show-uuid'::uuid,
  '{"recipient_email": "artist@example.com"}'::jsonb
);
```

## Migration Status

The `20250918150642_optimize_consistency.sql` migration includes:

1. ✅ Renamed RPC from `app_upload_file_with_metadata` to `app_upload_file`
2. ✅ Added metadata enforcement indicators in RPC response
3. ✅ Activity log table with proper indexing
4. ✅ Archive function for log management
5. ✅ Comments indicating future partitioning strategy

## Next Steps

1. **Apply the migration**: `make db-reset`
2. **Deploy Edge Function**: `npx supabase functions deploy upload-file`
3. **Test enforced uploads**: Use the updated `uploadFile()` action
4. **Set up log archival**: Schedule `archive_old_activity_logs()` as needed
5. **Monitor storage consistency**: Consider implementing verification job for existing data

## Security Considerations

- Edge Function uses service role key (full permissions)
- RPC functions use security definer with proper access checks
- Activity logs prevent direct inserts (RPC-only)
- File metadata includes verification flags for audit trails

## Performance Notes

- Activity log indexes on `(org_id, created_at)` for efficient queries
- File lookup indexes on `(org_id, created_at)` and collaboration access
- Consider partitioning when activity logs exceed ~1M records per month