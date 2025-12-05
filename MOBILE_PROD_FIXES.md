# Mobile Production Environment Fixes

## Changes Made

### 1. ✅ Created `.env.prod` for Mobile
- **File:** `mobile/.env.prod`
- **Configuration:** Uses production Supabase database
- **Keys:**
  - `SUPABASE_URL=https://alzfpysmlxinthfrbjll.supabase.co`
  - `SUPABASE_ANON_KEY=sb_publishable_F2d8QNlpyyb9qsC_D8nnCQ_cW4Tq8FE`

**Usage:** When running production build, make sure `.env` is pointing to `.env.prod` or the build system loads the prod keys.

---

### 2. 🔧 Fixed "Failed to load show" Error

#### Root Cause
The `showDetailProvider` was using `.single()` which throws an exception when:
- The show doesn't exist
- RLS policies block access (user not authenticated or not an org member)

#### Solution
Changed from `.single()` → `.maybeSingle()` with proper error handling

**File:** `mobile/lib/screens/show_day/providers/show_day_providers.dart`

```dart
// ✅ Now returns null gracefully instead of throwing
final response = await supabase
    .from('shows')
    .select(...)
    .eq('id', showId)
    .maybeSingle();  // <-- Changed from .single()

if (response == null) {
  print('⚠️ Show not found or access denied: $showId (check RLS policies)');
  return null;
}
```

---

### 3. 📊 Enhanced Error Display & Logging

#### Show Day Screen
- **File:** `mobile/lib/screens/show_day/show_day_screen.dart`
- Now displays actual error message in UI (helps with debugging)
- Logs error stack trace to console

#### Shows List Screen  
- **File:** `mobile/lib/screens/shows/shows_list_screen.dart`
- Added error logging for RPC calls
- Shows error details in UI instead of silent failures
- Improved error messages hint at RLS/auth issues

---

## Debugging "Failed to load show" in Production

### Common Causes

1. **User Not Authenticated**
   - Check: Is user logged in with valid credentials?
   - Fix: Verify email/password in production environment

2. **User Not an Org Member**
   - Check: Run this in Supabase console:
     ```sql
     SELECT * FROM org_members 
     WHERE user_id = auth.uid() 
     AND org_id = 'your-org-id';
     ```
   - Fix: Add user to org_members table with appropriate role

3. **Show Belongs to Different Org**
   - Check: Verify show's org_id matches user's org
   - Fix: RLS policy requires `is_org_member(org_id)` 

4. **RLS Policy Blocking Access**
   - Check: Look at error message shown on screen
   - Fix: Review `docs/RLS_POLICIES.md` for access requirements

### How to Debug

1. **Enable verbose logging** (already in place):
   - Error messages now print to console
   - Check Flutter DevTools console or logcat/system logs

2. **Check error message on screen**:
   - Production build now shows actual error text
   - Look for hints like "access denied" or "row not found"

3. **Test with Supabase console**:
   ```sql
   -- Check if user can access this show
   SELECT * FROM shows WHERE id = 'show-id';
   
   -- Verify user's org membership
   SELECT * FROM org_members 
   WHERE user_id = auth.uid();
   ```

4. **Check .env configuration**:
   - Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
   - Look for typos or whitespace issues

---

## How to Use Production Environment

### Option 1: Via Environment File
```bash
# Rename before running
mv mobile/.env mobile/.env.local
mv mobile/.env.prod mobile/.env

# Run app
flutter run -d <device>
```

### Option 2: Via Build Configuration
Update your build system to load `.env.prod` for release builds.

---

## Important Notes

⚠️ **RLS Policies Are Enforced**
- Mobile app uses `anon` key (public/publishable key)
- Same RLS policies as web client apply
- Only org members can access org data
- Show collaborators have special access

✅ **Authentication Still Required**
- App still requires user login
- Anonymous access is NOT allowed for shows
- User must be verified org member or show collaborator

---

## Testing Checklist

- [ ] User can sign in with valid credentials
- [ ] User is member of correct organization
- [ ] Show exists and belongs to user's org
- [ ] `.env.prod` has correct production keys
- [ ] Check Supabase console for any RLS violations
- [ ] Look for errors in Flutter console

---

**Last Updated:** December 4, 2025
