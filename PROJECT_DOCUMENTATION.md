# Oncore — Technical Architecture & Build Guide

> **What this is:** a single, comprehensive **Markdown spec** for building the app end‑to‑end with **Next.js (App Router) + Supabase**. It covers the product scope, SSR patterns, directory structure, auth & RBAC, database schema (DDL), RLS policies, storage, page‑by‑page build notes, code samples, and deployment workflow.
> **Why this approach:** it aligns with your pitch (artist‑first UX, mobile/offline future, AI imports/exports) while shipping a secure and maintainable MVP.&#x20;
> **What you already have:** a clean Next.js + Supabase base with Docker/Compose, Makefile automation, environment switching, and Supabase types generation. We’ll extend that foundation.&#x20;

---

## Table of Contents

1. [Product Summary](#product-summary)
2. [Tech Stack & Local/Prod Environments](#tech-stack--localprod-environments)
3. [High‑Level Architecture](#high-level-architecture)
4. [Routing & App Structure (App Router)](#routing--app-structure-app-router)
5. [Authentication & Authorization (RBAC + Collaborators + Access Codes)](#authentication--authorization-rbac--collaborators--access-codes)
6. [Database Schema (DDL)](#database-schema-ddl)
7. [Row‑Level Security (RLS) & Storage Policies](#row-level-security-rls--storage-policies)
8. [Pages to Build (Feature by Feature)](#pages-to-build-feature-by-feature)
9. [SSR, Server Actions, Realtime, Caching](#ssr-server-actions-realtime-caching)
10. [File Uploads & Documents](#file-uploads--documents)
11. [Styling, Components, and Naming Conventions](#styling-components-and-naming-conventions)
12. [Testing & QA](#testing--qa)
13. [Deployment](#deployment)
14. [Implementation Plan (Milestones)](#implementation-plan-milestones)

---

## Product Summary

Oncore is a touring operations hub where **artist/tour teams** and **promoter/venue teams** collaborate on **shows, logistics, advancing, documents, day schedules, and contacts**—with simple status tracking, inline comments, and shared documents. Future phases add **AI imports** (parse emails & riders) and **exports** (day sheets), plus **mobile + offline** for on‑the‑road teams. This targets travel-heavy artists, managers, tour managers, and agents who waste hours chasing info across tools.&#x20;

**Primary modules for MVP**

* **Shows** (per artist), **Team**, **Advancing**, **Day**, **Back Office**, **Settings**.
* Collaboration model: **Org members** (artist/tour org) + **external collaborators** (promoters) scoped to specific shows/sessions.
* Access control: **org roles** (owner/admin/editor/viewer) and **show collaborator roles** (promoter\_editor/promoter\_viewer).
* Advancing page: two columns (**FROM US** / **FROM YOU**), inline edit, comments, C/P status, top **Documents** box, **Team & Travel** sheet‑style popup.

---

## Tech Stack & Local/Prod Environments

* **Next.js 15 (App Router)**, **TypeScript**, **Tailwind**, **Supabase** (Auth, Postgres, Realtime, Storage), **Lucide** icons.
* **Docker/Compose** profiles for dev and prod, **Makefile** for DX automation, **Supabase CLI**, **generated TS types**. The current base already includes these pieces and environment switching via `PROD_DB` with separate keys/URLs, plus `docs/supabase-setup.md`. Keep using those conventions.&#x20;

---

## High‑Level Architecture

* **Multi‑tenant by Organization (workspace).**
  Users join an org (artist/tour company). **All rows carry `org_id`**.
* **External collaborators (promoters)** are added **per show** without joining the org.
* **Advancing access code** gates entry; guests sign in (OTP) then enter code → they become show collaborators.
* **Server‑heavy UI** using **React Server Components (RSC)** for SSR/streaming and **Server Actions** for mutations. Minimal client components for realtime, grids, and editors.
* **Storage** with private buckets and metadata‑aware RLS (org/show/session scoping).

---

## Routing & App Structure (App Router)

Use **route groups** and an **org‑scoped app shell**:

```
app/
  (marketing)/
    page.tsx
    pricing/page.tsx
  (auth)/
    sign-in/page.tsx
    invite/[token]/page.tsx
  (app)/
    [org]/
      layout.tsx              # loads org & left-nav, protects with auth
      day/page.tsx
      shows/page.tsx
      shows/[showId]/page.tsx
      team/page.tsx
      advancing/page.tsx
      advancing/[sessionId]/page.tsx
      back-office/page.tsx
      settings/page.tsx
  s/[accessCode]/page.tsx      # Advancing access-code entry → resolves session→redirect
middleware.ts
```

> **SSR note**: authed pages are user‑specific → use RSC with **per‑request server Supabase client** bound to cookies; avoid caching or call `noStore()` when needed.

---

## Authentication & Authorization (RBAC + Collaborators + Access Codes)

### Org Roles (coarse permissions across the org)

* `owner` (billing, member mgmt, delete org)
* `admin` (manage members, artists, shows, everything)
* `editor` (create/edit shows, advancing, team, docs)
* `viewer` (read‑only)

### Show Collaborator Roles (external promoters)

* `promoter_editor` (edit advancing, upload docs, update logistics for their show)
* `promoter_viewer` (view‑only for their show)

### Advancing Access Code Flow (recommended MVP)

1. Promoter opens `/s/[accessCode]`.
2. If not signed in → OTP sign‑in.
3. On submit, server verifies **hashed** code → finds session & show → **inserts/links user** to `show_collaborators` with role (editor/viewer).
4. Redirect to `/[org]/advancing/[sessionId]`.

This yields strong auditability and aligns with your roadmap to mobile + notifications + AI.&#x20;

---

## Database Schema (DDL)

> Use Supabase migrations. Keep **snake\_case**, add **`org_id`** everywhere, and **indexes** for common filters.

### 1) Organizations, Members, Artists, Venues, Shows

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create type org_role as enum ('owner','admin','editor','viewer');

create table org_members (
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid not null,
  role org_role not null,
  invited_email text,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table artists (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text unique,
  created_at timestamptz not null default now()
);

create table venues (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text, city text, country text,
  capacity int,
  contacts jsonb,
  created_at timestamptz not null default now()
);

create type show_status as enum ('draft','confirmed','cancelled');

create table shows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  artist_id uuid references artists(id) on delete set null,
  venue_id uuid references venues(id),
  date date not null,
  doors_at timestamptz,
  set_time timestamptz,
  status show_status not null default 'draft',
  title text,
  notes text,
  created_at timestamptz not null default now()
);

create type show_collab_role as enum ('promoter_editor','promoter_viewer');

create table show_collaborators (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  user_id uuid,
  email text not null,
  role show_collab_role not null default 'promoter_editor',
  invited_by uuid,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (show_id, email)
);

create index on shows (org_id, date);
create index on show_collaborators (show_id, email);
```

### 2) Advancing (sessions, fields, comments, documents/files)

```sql
create type party as enum ('from_us','from_you');
create type field_status as enum ('pending','confirmed');

create table advancing_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  show_id uuid not null references shows(id) on delete cascade,
  title text not null,
  access_code_hash text,   -- hash only, never plaintext
  expires_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table advancing_fields (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  session_id uuid not null references advancing_sessions(id) on delete cascade,
  section text not null,
  field_name text not null,
  field_type text not null default 'text',  -- 'text','textarea','file','date','time','number','grid'
  value jsonb,                              -- for 'grid' store {columns,rows}
  status field_status not null default 'pending',
  party_type party not null,
  sort_order int not null default 1000,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (session_id, section, field_name, party_type)
);

create table advancing_comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  field_id uuid not null references advancing_fields(id) on delete cascade,
  author_id uuid,
  author_name text,
  body text not null,
  created_at timestamptz not null default now()
);

-- Session-level "Documents" boxes (multi-file, any type)
create table advancing_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  session_id uuid not null references advancing_sessions(id) on delete cascade,
  party_type party not null,
  label text,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- File registry (maps to storage)
create table files (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  session_id uuid references advancing_sessions(id) on delete cascade,
  document_id uuid references advancing_documents(id) on delete cascade,
  field_id uuid references advancing_fields(id) on delete cascade,
  storage_path text not null,
  original_name text,
  content_type text,
  size_bytes int,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create index on advancing_sessions (org_id, show_id);
create index on advancing_fields (session_id, party_type);
create index on files (session_id);
```

### 3) Team & Day (People, Assignments, Schedule)

```sql
create table people (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid,       -- optional link to auth.users
  name text not null,
  email text, phone text, role_title text, notes text,
  created_at timestamptz not null default now()
);

create table show_assignments (
  show_id uuid references shows(id) on delete cascade,
  person_id uuid references people(id) on delete cascade,
  duty text,
  primary key (show_id, person_id)
);

create table schedule_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  show_id uuid references shows(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  title text not null,
  location text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);
```

---

## Row‑Level Security (RLS) & Storage Policies

Enable RLS and use helper functions to check **org membership** or **show collaborator access**.

```sql
-- Helpers
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select current_setting('request.jwt.claims', true)::jsonb;
$$;

create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif((auth.jwt()->>'sub')::text, '' ), null)::uuid;
$$;

create or replace function is_org_member(p_org uuid) returns boolean language sql stable as $$
  select exists(select 1 from org_members where org_id=p_org and user_id=auth.uid());
$$;

create or replace function has_show_access(p_show uuid, min_role text) returns boolean
language sql stable as $$
  with me as (
    select role from show_collaborators where show_id=p_show and user_id=auth.uid()
  )
  select case
    when (select role from me) is null then false
    when min_role='view' then true
    when min_role='edit' then (select role from me) in ('promoter_editor')
    else false
  end;
$$;
```

**Policies (examples):**

```sql
alter table organizations enable row level security;
create policy org_select on organizations for select using (is_org_member(id));

alter table shows enable row level security;
create policy shows_select on shows for select
  using (is_org_member(org_id) or has_show_access(id,'view'));
create policy shows_modify on shows for insert with check (is_org_member(org_id));
create policy shows_update on shows for update using (is_org_member(org_id));

alter table advancing_sessions enable row level security;
create policy adv_sessions_select on advancing_sessions for select
  using (is_org_member(org_id) or has_show_access(show_id,'view'));
create policy adv_sessions_insert on advancing_sessions for insert with check (is_org_member(org_id));

alter table advancing_fields enable row level security;
create policy adv_fields_select on advancing_fields for select
  using (exists (select 1 from advancing_sessions s
        where s.id=session_id and (is_org_member(s.org_id) or has_show_access(s.show_id,'view'))));
create policy adv_fields_write on advancing_fields for
  insert with check (exists (select 1 from advancing_sessions s
        where s.id=session_id and (is_org_member(s.org_id) or has_show_access(s.show_id,'edit')))),
  update using (exists (select 1 from advancing_sessions s
        where s.id=session_id and (is_org_member(s.org_id) or has_show_access(s.show_id,'edit'))));

-- Repeat for advancing_comments, advancing_documents, files, people, schedule_items
```

**Storage buckets**: `documents`, `advancing-files`, `images`.
**Policy idea**: validate object `metadata` for org/show/session.

```sql
-- storage.objects example
create policy doc_read on storage.objects for select
  using (
    bucket_id in ('documents','advancing-files')
    and (
      (metadata->>'org_id')::uuid in (select org_id from org_members where user_id=auth.uid())
      or exists (select 1 from shows sh
                 where sh.id=(metadata->>'show_id')::uuid
                   and (is_org_member(sh.org_id) or has_show_access(sh.id,'view')))
    )
  );

create policy doc_write on storage.objects for insert
  with check (
    bucket_id in ('documents','advancing-files')
    and (
      (metadata->>'org_id')::uuid in (select org_id from org_members where user_id=auth.uid())
      or exists (select 1 from shows sh
                 where sh.id=(metadata->>'show_id')::uuid
                   and has_show_access(sh.id,'edit'))
    )
  );
```

---

## Pages to Build (Feature by Feature)

### **Layout & Navigation**

* **`/[org]/layout.tsx`**: loads org (SSR), renders left nav with tabs: Day / Shows / Team / Advancing / Back Office / Settings.
* Middleware protects `(app)` routes; `(marketing)` is public.

### **Shows**

* **List** (SSR RSC): filter by date; create via Server Action.
* **Detail**: venue, times, crew assignments, link to **Advancing** session; invite promoter.

### **Advancing**

* **List**: session table (title, show, % confirmed).
* **Session** (`/[org]/advancing/[sessionId]`): two columns (**FROM US** / **FROM YOU**).

  * **DocumentsBox** at top (drag‑drop multi‑file; compact).
  * Sections (Team & Travel, Logistics, Venue/Production, Admin/Business, Shared).
  * **FieldRow**: label, value editor, **comments (left of status)**, P/C toggle.
  * **Team & Travel SheetModal**: grid editor (columns: Name, Email, Phone, Bags, Role, **Hotel Room Request**).

### **Day**

* Today’s schedule across shows (`schedule_items`), quick add, filter by artist.

### **Team**

* People directory (crew + linked users), assign to shows, contact info.

### **Back Office**

* Document manager (contracts, riders, visas, boarding passes) with tags.

### **Settings**

* Org profile, members (invite + roles), billing placeholder.

---

## SSR, Server Actions, Realtime, Caching

### Server/Client Supabase

```ts
// lib/supabase/server.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export function getSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}
```

```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### SSR in RSC

```ts
// app/(app)/[org]/shows/page.tsx
import { unstable_noStore as noStore } from 'next/cache'
import { getSupabaseServer } from '@/lib/supabase/server'

export default async function ShowsPage({ params }: { params:{org:string} }) {
  noStore()
  const sb = getSupabaseServer()
  const { data: shows } = await sb.from('shows')
    .select('*')
    .eq('org_id', params.org)
    .order('date', { ascending: true })
  return <ShowsTable data={shows ?? []} />
}
```

### Server Actions (writes)

```ts
// app/(app)/[org]/shows/actions.ts
'use server'
import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/server'

const schema = z.object({
  orgId: z.string().uuid(),
  title: z.string().min(1),
  date: z.string()
})

export async function createShow(input: unknown) {
  const { orgId, title, date } = schema.parse(input)
  const sb = getSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await sb.from('shows').insert({ org_id: orgId, title, date })
    .select('id').single()
  if (error) throw error
  return data.id
}
```

### Realtime (client component snippet)

```ts
// components/advancing/useRealtimeFields.ts
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useRealtimeFields(sessionId: string, onChange: () => void) {
  useEffect(() => {
    const ch = supabase.channel(`adv_fields:${sessionId}`)
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'advancing_fields', filter: `session_id=eq.${sessionId}` },
          onChange)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sessionId, onChange])
}
```

### Caching

* Authed pages: call `noStore()` or set `export const dynamic='force-dynamic'`.
* Public/marketing pages: SSG/ISR as needed.

---

## File Uploads & Documents

**Bucket**: `advancing-files` (private).
**Client upload** (set metadata for RLS):

```ts
const path = `${sessionId}/${crypto.randomUUID()}-${file.name}`
await supabase.storage.from('advancing-files').upload(path, file, {
  metadata: { org_id: orgId, show_id: showId, session_id: sessionId, party_type }
})
```

**Registry row** (optional but recommended for listing & audit):

```ts
await sb.from('files').insert({
  org_id: orgId,
  session_id: sessionId,
  document_id,           // if attaching to a Documents box
  storage_path: path,
  original_name: file.name,
  content_type: file.type,
  size_bytes: file.size,
  uploaded_by: user.id
})
```

---

## Styling, Components, and Naming Conventions

* **DB**: snake\_case tables & columns; enums for roles/status; foreign keys with `on delete cascade` where safe; add **indexes** for common filters.
* **Routes**: kebab‑case segments; org as path param for multi‑tenant routing.
* **React**: `PascalCase` components, `camelCase` props; `components/ui/*` for primitives; `components/advancing/*` for feature widgets.
* **Sections & fields**: use stable `section` names (`Team & Travel`, `Logistics`, `Venue/Production`, `Admin/Business`, `Shared`) and **party\_type** (`from_us` / `from_you`).
* **Status**: map UI **C/P** ↔ DB `confirmed/pending`.
* **DocumentsBox**: compact list at column top; centered prompt when empty (no large buttons).

---

## Testing & QA

* **Unit**: small utilities, Server Actions with mocked Supabase.
* **Integration**: RLS policy checks (PostgREST or SQL tests).
* **E2E**: Playwright flows: sign‑in → create org → create show → invite collaborator → create advancing → upload file → status toggle → comments realtime.
* **Accessibility**: keyboard nav in grid modal, proper ARIA for status badges and comments.

---

## Deployment

Your base already defines **multi‑stage Dockerfile**, **Compose profiles**, **Makefile** commands for dev/prod, Supabase local proxy, and environment switching (via `PROD_DB`). Continue using those exact workflows. Key targets include `make setup-local`, `make dev`, `make prod`, `make migration-diff`, `make deploy`, `make generate-types`.&#x20;

---

## Implementation Plan (Milestones)

**M0 – Tooling**

* Wire supabase migrations dir; run initial migration; verify types generation.

**M1 – Identity & Org**

* Orgs, org\_members, RLS. First‑login org create, `[org]` layout & nav.

**M2 – Shows & Venues**

* Tables + CRUD + list/detail (SSR). Storage `documents`.

**M3 – Advancing MVP**

* Advancing tables, RLS, **DocumentsBox** (top), **FieldRow** (inline edit, comments left of status, P/C), **Team & Travel** SheetModal (grid as JSON).
* `/s/[accessCode]` flow that **links user → collaborator**.

**M4 – Team & Day**

* People, assignments, schedule items; Day page list.

**M5 – Back Office**

* Tagged docs (contracts, riders, visas, boarding passes).

**M6 – Polish**

* Progress bar (% confirmed), “show pending only”, audit log, email notifications (Edge Function).

---

## Example UI Components (Advancing)

**FieldRow (simplified)**

```tsx
// components/advancing/FieldRow.tsx
'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export function FieldRow({ field }: { field: any }) {
  const [value, setValue] = useState(field.value?.text ?? '')
  const [status, setStatus] = useState(field.status)

  async function save() {
    await supabase.from('advancing_fields').update({
      value: { text: value }, status
    }).eq('id', field.id)
  }

  return (
    <div className="grid grid-cols-[1fr,2fr,auto,auto] items-center gap-2 py-2">
      <div className="text-sm text-neutral-300">{field.field_name}</div>
      <input
        value={value}
        onChange={(e)=>setValue(e.target.value)}
        onBlur={save}
        className="w-full rounded border bg-neutral-900 px-2 py-1"
      />
      {/* Comments button/input to the LEFT of status */}
      <button className="text-xs underline mr-2" onClick={()=>{/* open comments */}}>
        Comments
      </button>
      <button
        onClick={()=>{ setStatus(status==='pending'?'confirmed':'pending'); save(); }}
        className={`px-2 py-1 text-xs rounded ${status==='confirmed'?'bg-green-700':'bg-amber-700'}`}
        aria-label={`Mark ${status==='pending'?'Confirmed':'Pending'}`}
      >
        {status==='confirmed'?'C':'P'}
      </button>
    </div>
  )
}
```

**Team & Travel Sheet Modal (sketch)**

```tsx
// components/advancing/SheetModal.tsx
'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export function SheetModal({ fieldId, initialGrid }: { fieldId:string; initialGrid:any }) {
  const [grid, setGrid] = useState(initialGrid ?? {
    columns: ['Name','Email','Phone','Bags','Role','Hotel Room Request'],
    rows: []
  })

  async function save() {
    await supabase.from('advancing_fields')
      .update({ value: grid })
      .eq('id', fieldId)
  }

  // Render a minimal table; swap in AG Grid or TanStack Table later
  return (
    <div className="p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr>{grid.columns.map(c=><th key={c} className="text-left p-2">{c}</th>)}</tr></thead>
          <tbody>
            {grid.rows.map((r:any, i:number)=>(
              <tr key={i}>{grid.columns.map((c:string)=>(
                <td key={c} className="p-2">
                  <input defaultValue={r[c]??''} onBlur={(e)=>{ r[c]=e.target.value; setGrid({...grid})}} />
                </td>
              ))}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={()=>{ grid.rows.push({}); setGrid({...grid}) }} className="rounded bg-neutral-800 px-3 py-1">Add row</button>
        <button onClick={save} className="rounded bg-blue-700 px-3 py-1">Save</button>
      </div>
    </div>
  )
}
```

---

## Notes Linking Back to Existing Setup & Vision

* Reuse the **Docker/Compose profiles**, **Makefile targets** (`make setup-local`, `make dev`, `make prod`, `make migration-diff`, `make deploy`), and **Supabase local proxy** already in the repo to keep environments consistent and painless.&#x20;
* This build aligns with the **pain points/solution/roadmap** (centralized logistics + docs, AI imports/exports, mobile/offline) and your **target users** (artists/crew/managers/agents).&#x20;

---

### Appendix: Environment Examples

* The current project uses `PROD_DB` and dual local/prod Supabase keys/URLs in `.env.local`. Keep that pattern for easy switching and a visible in‑app environment indicator (already present).&#x20;

---

**End of Guide** ✅