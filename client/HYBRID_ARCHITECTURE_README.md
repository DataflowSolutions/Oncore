# Oncore Hybrid Architecture - Setup Complete! 🎉

Your project is now structured for **scalable web + mobile development** using the hybrid architecture approach.

## ✅ What's Been Set Up

### 1. **Edge Functions** (Serverless Backend)
- `stripe-webhook/` - Handle Stripe payment webhooks
- `send-email/` - Send transactional emails via Resend
- `generate-advancing-pdf/` - Generate PDF reports
- `_shared/` - Shared utilities for all Edge Functions

### 2. **Database RPC Functions** (Complex Operations)
- `create_advancing_session()` - Atomically create session with access code
- `submit_hospitality()` - Submit hospitality with validation
- `verify_access_code()` - Verify venue access codes
- `get_show_stats()` - Get statistics for organization
- `bulk_update_show_dates()` - Batch update operations

### 3. **Service Layer** (Shared Between Web & Mobile)
- `show-service.ts` - Show operations
- `advancing-service.ts` - Advancing session operations
- `organization-service.ts` - Organization management

### 4. **Documentation**
- `hybrid-architecture.md` - Complete architecture overview
- `flutter-quick-start.md` - Mobile app setup guide
- `mobile-api-reference.md` - API reference for mobile developers

### 5. **Deployment Scripts**
- `deploy.ps1` - Deploy all Edge Functions with one command

## 📁 Directory Structure

```
client/
├── app/                          # Next.js (Web App)
├── lib/
│   ├── actions/                  # Server Actions (Web only)
│   └── services/                 # Shared services (Web + Mobile)
├── supabase/
│   ├── functions/                # Edge Functions
│   │   ├── _shared/              # Shared utilities
│   │   ├── stripe-webhook/
│   │   ├── send-email/
│   │   └── generate-advancing-pdf/
│   └── migrations/
│       └── 20250101000000_add_rpc_functions.sql
└── docs/
    ├── hybrid-architecture.md
    ├── flutter-quick-start.md
    └── mobile-api-reference.md
```

## 🚀 Next Steps

### For Web Development (Continue MVP)

1. **Use existing Server Actions** for quick iterations:
   ```typescript
   import { createShow } from '@/lib/actions/shows'
   await createShow(formData)
   ```

2. **Migrate to service layer** when ready:
   ```typescript
   import { ShowService } from '@/lib/services/show-service'
   const service = new ShowService(supabase)
   await service.createShow(data)
   ```

3. **Deploy Edge Functions** when integrating Stripe:
   ```powershell
   cd supabase/functions
   ./deploy.ps1
   ```

### For Mobile Development (Later)

1. **Create Flutter project**:
   ```bash
   flutter create oncore_mobile
   ```

2. **Follow setup guide**:
   - Read `docs/flutter-quick-start.md`
   - Use `docs/mobile-api-reference.md` for API calls

3. **Reuse everything**:
   - Same Supabase project
   - Same RPC functions
   - Same Edge Functions
   - Same RLS policies

## 🔧 Configuration Required

### Environment Variables (Supabase Dashboard)

Set these in **Project Settings → Edge Functions**:

```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
```

### Apply Database Migrations

```powershell
cd client
supabase db push
```

This will create all the RPC functions in your database.

## 📖 Key Concepts

### When to Use Each Layer

| **Operation** | **Use This** |
|---------------|-------------|
| Simple CRUD (shows, venues) | Direct Supabase queries |
| Complex multi-step logic | RPC functions (Postgres) |
| External APIs (Stripe, email) | Edge Functions |
| Long-running tasks (>10s) | Next.js API routes (future) |

### Example: Creating an Advancing Session

**Web (Next.js):**
```typescript
import { AdvancingService } from '@/lib/services/advancing-service'

const service = new AdvancingService(supabase)
const session = await service.createSession(showId, orgId)
// Returns: { id, access_code, status, ... }
```

**Mobile (Flutter):**
```dart
final session = await supabase.rpc('create_advancing_session', params: {
  'p_show_id': showId,
  'p_org_id': orgId,
});
// Returns identical data structure
```

**Both platforms call the same database function - code written once!**

## 🎯 Benefits of This Architecture

### ✅ For You Now
- Keep shipping fast with Server Actions
- No rewriting needed for MVP
- Easy to understand and debug

### ✅ For Mobile Later
- Flutter uses same backend (Supabase)
- Same RPC functions work identically
- Same Edge Functions via HTTP
- No separate API server needed

### ✅ For Scaling
- Supabase scales automatically
- Add Edge Functions as needed
- Can migrate to custom server if required (rare)
- Pay for complexity only when needed

## 🔒 Security

All operations are protected by:
- **Row-Level Security (RLS)** - Database-level authorization
- **JWT Authentication** - Supabase Auth tokens
- **Input Validation** - RPC functions validate input
- **Environment Variables** - Secrets never exposed

## 📚 Learn More

- [Supabase Documentation](https://supabase.com/docs)
- [Flutter Supabase SDK](https://supabase.com/docs/reference/dart)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)

## 🆘 Troubleshooting

### Edge Function Errors
```powershell
supabase functions logs stripe-webhook --follow
```

### Database Migration Issues
```powershell
supabase db reset  # Reset local DB
supabase db push   # Apply migrations
```

### Type Mismatches
```powershell
supabase gen types typescript --local > lib/database.types.ts
```

## 💬 Questions?

Refer to:
1. `docs/hybrid-architecture.md` - Architecture details
2. `docs/flutter-quick-start.md` - Mobile setup
3. `docs/mobile-api-reference.md` - API reference

---

## 🎉 You're All Set!

Your project now has:
- ✅ Scalable architecture for web + mobile
- ✅ Edge Functions for external integrations
- ✅ RPC functions for complex operations
- ✅ Service layer for code reuse
- ✅ Complete documentation
- ✅ Deployment scripts

**Ship your web MVP now. Build mobile later. Same backend. Zero rewriting.** 🚀
