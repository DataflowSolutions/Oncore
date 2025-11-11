# Make Local = Prod (Supabase + RLS) — Step-by-Step

Goal: your **local dev** should hit auth + RLS + pooler the same way **prod** does, so bugs blow up **before** deploy.

---

## 0) Big picture (what & why)

* **What breaks in prod:** requests go **Browser/Server → API Gateway → PostgREST → (pooler) → Postgres**. Nested RLS or cross-table checks + missing JWT context ⇒ `permission denied`.
* **What we’ll do:** in local, **force the same path**, **turn on pooler-like behavior**, and **move cross-table logic into RPCs (SECURITY DEFINER)**. Add a tiny **auth probe**, use **prod-like env keys**, and run your app in **production mode** locally.

---

## 1) Environment: use the new keys everywhere (no direct DB in app)

**Why:** app traffic must go through PostgREST with a JWT, exactly like prod.

Create/update `.env.local` (and your prod envs accordingly):

```bash
# App talks to REST (PostgREST) with keys — not raw DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_xxx

# For server-only calls that still respect RLS (normal backend code)
SUPABASE_SECRET_DEFAULT_KEY=sb_secret_xxx

# Keep this ONLY for migrations/CLI/admin scripts — never in runtime app code
DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
```

**Don’t** use `DATABASE_URL` in your Next.js app for runtime reads/writes. Use `@supabase/supabase-js` with the keys.

---

## 2) Run your app locally in “prod mode”

**Why:** Next.js dev mode hides bugs; prod mode matches headers/cookies and fetch behavior.

```bash
# one-time: supabase local stack
supabase start

# build & run Next.js like prod
pnpm build    # or npm/yarn
NODE_ENV=production pnpm start
```

Point your app to **local Supabase** if you prefer fully offline dev:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=anon_local_key
SUPABASE_SECRET_DEFAULT_KEY=service_role_local_key
```

Supabase local already includes **Kong (gateway)** + **PostgREST**, so you’re exercising the same path.

---

## 3) Add a tiny auth probe (dev guardrail)

**Why:** fast way to confirm `auth.uid()` is actually set in the DB context.

Create migration `*_rpc_auth_probe.sql`:

```sql
create or replace function public.rpc_auth_probe()
returns table (
  auth_uid uuid,
  current_role text,
  jwt_claims jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    auth.uid(),
    current_role,
    coalesce(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb);
end;
$$;

revoke all on function public.rpc_auth_probe() from public;
grant execute on function public.rpc_auth_probe() to anon, authenticated, service_role;
```

**Use it in dev on app boot / a diagnostics page** — if `auth_uid` is `null` when you’re logged in, fail fast.

---

## 4) Stop cross-table RLS from the client → move into RPCs

**Why:** policies that read other RLS’d tables are fragile via PostgREST/pooler. Put that logic in **SECURITY DEFINER** RPCs that gate on `auth.uid()`.

Create migration `*_org_access.sql`:

```sql
-- membership
create or replace function app_get_org_membership(p_org_id uuid)
returns table (role text)
language sql
security definer
set search_path = public
as $$
  select om.role
  from org_members om
  where om.org_id = p_org_id
    and om.user_id = auth.uid()
  limit 1;
$$;

grant execute on function app_get_org_membership(uuid) to authenticated;

-- org by slug (only if member)
create or replace function app_get_org_by_slug(p_slug text)
returns organizations
language sql
security definer
set search_path = public
as $$
  select o.*
  from organizations o
  join org_members om on om.org_id = o.id
  where o.slug = p_slug and om.user_id = auth.uid()
  limit 1;
$$;

grant execute on function app_get_org_by_slug(text) to authenticated;

-- subscription read (only if member)
create or replace function app_get_org_subscription(p_org_id uuid)
returns org_subscriptions
language sql
security definer
set search_path = public
as $$
  select s.*
  from org_subscriptions s
  join org_members om on om.org_id = s.org_id
  where s.org_id = p_org_id and om.user_id = auth.uid()
  limit 1;
$$;

grant execute on function app_get_org_subscription(uuid) to authenticated;
```

**Create/compose flows atomically** (example: venue+show creation) in one RPC:

```sql
create or replace function app_create_show(
  p_org_id uuid,
  p_title text,
  p_date timestamptz,
  p_venue jsonb  -- { name, city, ... } or null if existing
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_sub_status text;
  v_venue_id uuid;
  v_show_id uuid;
begin
  select role into v_role from app_get_org_membership(p_org_id);
  if v_role is null then
    raise exception 'not a member' using errcode='P0001';
  end if;

  select status into v_sub_status from app_get_org_subscription(p_org_id);
  if v_sub_status is null then
    raise exception 'subscription missing' using errcode='P0001';
  end if;

  if p_venue is not null then
    insert into venues (org_id, name, city, country)
    values (p_org_id, p_venue->>'name', p_venue->>'city', p_venue->>'country')
    returning id into v_venue_id;
  end if;

  insert into shows (org_id, title, show_date, venue_id)
  values (p_org_id, p_title, p_date, v_venue_id)
  returning id into v_show_id;

  return v_show_id;
end;
$$;

grant execute on function app_create_show(uuid, text, timestamptz, jsonb) to authenticated;
```

**In Next.js server code, call RPCs**:

```ts
// server-only
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getOrgBySlug(slug: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!, // user-scoped
    { cookies: { get: (k) => cookieStore.get(k)?.value } }
  )
  const { data, error } = await supabase.rpc('app_get_org_by_slug', { p_slug: slug })
  if (error) throw error
  return data
}
```

> TL;DR: **no more direct `from('org_members')` / `from('organizations')` in app code** when membership/joins are involved.

---

## 5) Simulate the transaction pooler locally

**Why:** surface “prepared statements / session” quirks in dev too.

### A) If you sometimes connect directly (ORM, migrations):

* Use **PgBouncer** locally in Docker (example below).
* Or at minimum, **disable prepared statements** in your client:

**Prisma**: add `?pgbouncer=true` to the URL used by Prisma (not the app’s supabase-js path).

**node-postgres** (pg): set `statement_timeout` if you want, and use simple protocol via client options in the lib you’re using.

### B) docker-compose snippet (adds pgBouncer in front of your local PG)

```yaml
version: '3.8'
services:
  # Supabase local stack (started via `supabase start`) already includes Postgres.
  # If you want a separate pgbouncer:
  pgbouncer:
    image: edoburu/pgbouncer:latest
    environment:
      - DB_HOST=db
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASSWORD=<local_db_password>
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=100
      - DEFAULT_POOL_SIZE=10
    ports:
      - "6543:6543"
    depends_on:
      - db
```

Then point any **direct DB consumers (Prisma/psql)** at `postgres://postgres:<pw>@localhost:6543/postgres` and turn on their **pgbouncer/simple** flags.

> Your **Next.js app** should still use **supabase-js** (REST), not this URL.

---

## 6) Seed to match prod expectations

**Why:** “subscription not found” = missing seed.

Create a **single RPC** that creates an org, inserts the creator as owner, and adds a **trial subscription**:

```sql
create or replace function app_create_org_with_owner(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode='P0001';
  end if;

  insert into organizations (name, slug) values (p_name, p_slug)
  returning id into v_org_id;

  insert into org_members (org_id, user_id, role)
  values (v_org_id, auth.uid(), 'owner');

  insert into org_subscriptions (org_id, status, plan, trial_ends_at)
  values (v_org_id, 'trialing', 'basic', now() + interval '14 days');

  return v_org_id;
end;
$$;

grant execute on function app_create_org_with_owner(text, text) to authenticated;
```

Use this in both local & prod so data shape matches.

---

## 7) Minimal tests that hit PostgREST (not the DB)

**Why:** you want to fail CI when auth/RLS drifts.

* **Test A (happy path):** sign in a user, call `rpc_auth_probe()` ⇒ `auth_uid != null`, then call your RPCs (`app_get_org_by_slug`, `app_get_org_subscription`, etc.) ⇒ expect 200/data.
* **Test B (no token):** call RPCs without JWT ⇒ expect 401/permission denied.
* **Test C (wrong org):** different user calls the same ⇒ expect permission denied.

Example (vitest/playwright/supertest — your pick). The important bit: **use supabase-js** and set/omit the token exactly like your app would.

---

## 8) Make a “prod-like” dev target

Add an npm script:

```json
{
  "scripts": {
    "dev:prodlike": "supabase start && pnpm build && NODE_ENV=production pnpm start"
  }
}
```

Run **that** when debugging RLS. It guarantees you’re going through **Gateway → PostgREST** with **JWT**.

---

## 9) Quick policy hygiene (keep these)

* Keep policy roles explicit: `TO authenticated`.
* Keep policy predicates **simple** (`user_id = auth.uid()`), and push anything cross-table into definer RPCs.
* For any remaining direct `.from(...).select()` you truly need, ensure it **doesn’t** rely on joining other RLS’d tables.

---

## 10) When you *must* do admin stuff

* Put it in an **Edge Function / server worker** that uses `SUPABASE_SECRET_DEFAULT_KEY` (new secret key) and do it there — *not* in user routes. Keep it isolated/audited.
* Still prefer **RPCs** even for admin to keep logic in DB and unit-testable.

---

### TL;DR flow you’ll end up with

1. User logs in → JWT lives in cookies.
2. Server code uses **supabase-js (server client)** pulling cookies → calls **RPCs**.
3. RPCs are `SECURITY DEFINER`, internally use `auth.uid()` to authorize, then touch tables.
4. Local app runs in **prod mode**, hits **local Supabase gateway + PostgREST**, optional **pgBouncer** for any direct DB clients.
5. Tests call the **same RPCs** with/without tokens to catch RLS regressions.

Ship this setup and local will scream the same way prod does — but earlier, and with cleaner stack traces.
