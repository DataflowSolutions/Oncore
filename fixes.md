
# 🔥 P0 — Blockers (ship-stoppers)

* [ ] **Dev tooling shipped to prod**

  * **Where:** React Query Devtools always rendered.
  * **Fix:** Only mount when `process.env.NODE_ENV==='development'`.

* [ ] **Duplicate Supabase helper stacks = drift risk**

  * **Where:** `app/utils/supabase/server.ts` vs `lib/supabase/server.ts` (+ two browser helpers).
  * **Fix:** Single server factory + single browser factory; shared env loader; memoize; admin client only in server-only file.

* [ ] **Env model is inconsistent / unsafe**

  * **Where:** `.env.example` exposes server secrets as `NEXT_PUBLIC_*`; next config exposes `PROD_DB` to client; proxies only in dev.
  * **Fix:** Split public vs server vars; add **runtime env validation** (Zod/Valibot) at boot; document required keys for local/prod; stop exposing DB config to client. **Rotate credentials** after cleanup.

---

# ⚠️ P1 — High (security/correctness/perf)

* [ ] **Revalidate paths don’t match real routes**

  * **Where:** Calls like `revalidatePath('/[org]/venues')` or using org **UUID** instead of **slug**.
  * **Fix:** Revalidate actual slugged routes (e.g. `revalidatePath(\`/${orgSlug}/venues`)`) and any API paths your hooks hit.

* [ ] **Cache strategy conflict**

  * **Where:** `export const dynamic = 'force-dynamic'` + `export const revalidate = 30`.
  * **Fix:** Pick one: either dynamic rendering (no ISR) or ISR with reasonable `revalidate`. Document why.

* [ ] **Client-only fetching on landing/dashboard**

  * **Fix:** Move initial org/membership fetch to server component/route loader; hydrate React Query with `initialData` to avoid double fetch & spinner.

* [ ] **Selected show hook re-fetches needlessly**

  * **Fix:** Pass title/metadata via props/context from the page payload, set as `initialData` in the query; avoid extra API call on every nav.

* [ ] **CSV import = N× round trips**

  * **Fix:** Batch lookups (prefetch maps), use `upsert` and transactions; keep network calls O(1–2) per file, not per row.

* [ ] **`/api/sync` iterates orgs sequentially**

  * **Fix:** Single aggregated SQL or `Promise.all` with concurrency limit; remove noisy raw logs.

* [ ] **Org creation slug race**

  * **Fix:** Rely on DB unique constraint; catch duplicate-key and show friendly “slug taken” message (and add reserved slugs).

* [ ] **Onboarding/subscription coupling**

  * **Issue:** `app_create_organization_with_owner` doesn’t seed `org_subscriptions`; RLS may block later.
  * **Fix:** Create default subscription row in same transaction or via trigger.

* [ ] **Invitation constraints**

  * **Fix:** Enforce `invite_token IS NOT NULL` when `status='invited'`; keep unique index; add server-side generator checks.

* [ ] **Param typing oddities**

  * **Where:** Route handlers/layouts type `params` as `Promise`.
  * **Fix:** Use standard `{ params: { ... } }` types; remove unnecessary `await`.

---

# 🛠 P2 — Medium (data integrity & DX)

* [ ] **Add referential integrity to auth**

  * **Fix:** Add deferred FKs or cleanup triggers from `org_members.user_id` (and similar `created_by`) → `auth.users(id)`, or a job to purge orphans.

* [ ] **Activity log retention**

  * **Where:** `archive_old_activity_logs` deletes outright.
  * **Fix:** Consider partitioned tables + retention policy, or copy to cold storage before delete.

* [ ] **Post-deploy stats**

  * **Fix:** Keep ANALYZE/vacuum jobs running post-deploy (as scripted) to maintain planner stats.

* [ ] **Seed data hygiene**

  * **Fix:** Guard seeds from shared/staging; swap realistic emails/phones for obvious fakes; separate prod seed from dev fixtures.

* [ ] **Server action duplication**

  * **Where:** org creation under `app/(auth)/create-org/actions.ts` **and** `lib/actions/organizations.ts`.
  * **Fix:** Consolidate into one canonical action; reuse everywhere.

* [ ] **RLS policy churn**

  * **Fix:** Document final intended policies per role; add automated tests asserting can/can’t read/write for each critical table.

---

# 🎨 P3 — Polish & UX

* [ ] **Sign-in UX**

  * **Fix:** Wrap Supabase errors in friendly copy, add rate-limit/lockout messaging, redirect to the user’s org dashboard if available (not always `/`).

* [ ] **Reserved slugs & validation**

  * **Fix:** Client-side slug availability check; block reserved words (`admin`, `api`, etc.) consistently.

* [ ] **Env docs & proxies**

  * **Fix:** Update README with full env matrix (local vs prod), clarify when Supabase proxy is used (dev only), and safe `NEXT_PUBLIC_*` usage.

* [ ] **Cache module imports**

  * **Fix:** Use static imports for cache utilities (avoid per-request dynamic imports) and document invalidation patterns.

---

## ✅ Quick acceptance checks (for future you)

* Unauthed users can’t hit `/[org]/**` **or** API routes (tests pass).
* No `NEXT_PUBLIC_*` contains secrets; admin key never appears in client bundles (spot-check build artifacts).
* `revalidatePath` calls target **real** slug paths; caches actually refresh on mutation.
* Devtools, debug logs, and heavy traces **do not** render/log in production.
* RLS tests green for all roles across core tables.
* Creating an org atomically provisions subscription row; duplicate slug races handled gracefully.
* CSV imports are fast (O(1–2) network calls) and idempotent.
