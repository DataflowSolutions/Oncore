
# 🔥 P0 — Blockers (ship-stoppers)

- Done

---

# ⚠️ P1 — High (security/correctness/perf)

- All issues resolved!

---

# 🛠 P2 — Medium (data integrity & DX)

* [ ] **Activity log retention**

  * **Where:** `archive_old_activity_logs` deletes outright.
  * **Fix:** Consider partitioned tables + retention policy, or copy to cold storage before delete.

* [ ] **Post-deploy stats**

  * **Fix:** Keep ANALYZE/vacuum jobs running post-deploy (as scripted) to maintain planner stats.

* [ ] **RLS policy churn**

  * **Fix:** Document final intended policies per role; add automated tests asserting can/can't read/write for each critical table.

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
