# Mantix — Authentication Flow

## Overview

Mantix uses **Supabase Auth** (email + password) with a multi-tenant RLS schema.
Every authenticated user belongs to a `company_id` that isolates their data.

---

## Flow Diagram

```
Browser                         Next.js App                      Supabase
  │                                  │                               │
  │  Visit /                         │                               │
  │─────────────────────────────────>│                               │
  │                                  │  getSession()                 │
  │                                  │──────────────────────────────>│
  │                                  │<─────────────────── session ──│
  │                                  │                               │
  │  [no session] redirect /auth/login                               │
  │<─────────────────────────────────│                               │
  │                                  │                               │
  │  POST /auth/login (email+pass)   │                               │
  │─────────────────────────────────>│                               │
  │                                  │  signInWithPassword()         │
  │                                  │──────────────────────────────>│
  │                                  │<────────────── user+session ──│
  │                                  │  loadProfile(user.id)         │
  │                                  │──────────────────────────────>│
  │                                  │<──────────────── profile ─────│
  │  redirect /                      │                               │
  │<─────────────────────────────────│                               │
  │                                  │                               │
  │  All workspace requests          │  Every Supabase query         │
  │─────────────────────────────────>│  uses RLS: company_id filter  │
  │                                  │──────────────────────────────>│
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client singleton + Database types |
| `src/contexts/AuthContext.tsx` | React context: user, session, profile, signUp, signIn, signOut |
| `src/components/auth/ProtectedRoute.tsx` | Client guard: redirects to /auth/login if not authenticated |
| `src/app/auth/login/page.tsx` | Login page with animated logo collision |
| `src/app/auth/signup/page.tsx` | Sign-up form (creates company + profile in Supabase) |
| `src/lib/auth-utils.ts` | Helper utilities: checkAuth, getProfileById, updateProfile, hasRole |
| `src/app/(workspace)/layout.tsx` | Workspace layout wrapped with `<ProtectedRoute>` |
| `src/app/layout.tsx` | Root layout with `<AuthProvider>` |

---

## Sign-Up Flow

1. User fills fullName, email, password, confirmPassword (and optional companyName)
2. Client-side validation runs
3. `supabase.auth.signUp()` creates the auth user
4. If `companyName` is provided → insert into `companies` table → get `company_id`
5. `supabase.from("profiles").upsert()` creates the user profile with `role: "admin"`
6. `onAuthStateChange` fires → `AuthContext` updates user/session/profile state
7. Redirect to workspace (`/`)

## Sign-In Flow

1. `supabase.auth.signInWithPassword()` validates credentials
2. `onAuthStateChange` fires with new session
3. `loadProfile(user.id)` fetches profile from `profiles` table
4. User lands on workspace

## Session Persistence

Supabase stores the JWT in `localStorage` and auto-refreshes it.
On page reload, `supabase.auth.getSession()` restores the session — no login required.

---

## Row Level Security

All workspace tables enforce multi-tenant isolation:

```sql
-- Example: assets table
CREATE POLICY "Users access own company assets"
  ON assets FOR ALL
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
```

A user can only read/write rows where `company_id` matches their own `profiles.company_id`.

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

These are set in `.env.local` (gitignored) and prefixed with `NEXT_PUBLIC_` so they are
accessible in the browser bundle.
