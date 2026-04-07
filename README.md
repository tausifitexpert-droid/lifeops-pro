# ⚡ TaskFlow Pro

Task & payment management app — React + Vite + Supabase.

---

## Quick Setup (5 minutes)

### 1 — Get your Supabase API key

Your project URL is already set:
```
https://vqxuuswirettloxbeudp.supabase.co
```

For the API key, go to your **Supabase Dashboard → Settings → API Keys**:

- **New projects (recommended):** Copy the **Publishable key** — starts with `sb_publishable_...`
- **Existing projects:** You can still use the legacy **anon key** (starts with `eyJhbGci...`) — it works fine until Supabase fully deprecates it

> The new `sb_publishable_` key is the modern replacement for the anon key. Same permissions, better security and rotation support.

---

### 2 — Run the database schema

1. Go to **Supabase Dashboard → SQL Editor → New Query**
2. Paste the entire contents of `supabase_schema.sql`
3. Click **Run** — this creates all 5 tables, RLS policies, indexes, and auto-profile trigger

---

### 3 — Set GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret name              | Value |
|--------------------------|-------|
| `VITE_SUPABASE_URL`      | `https://vqxuuswirettloxbeudp.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your `sb_publishable_...` key (or legacy anon key) |

---

### 4 — Enable GitHub Pages

Repo → **Settings → Pages → Source → GitHub Actions**

Push to `main` → auto-deploys. Live at:
```
https://YOUR_USERNAME.github.io/taskflow-pro/
```

---

### 5 — Make yourself admin

In Supabase SQL Editor, run once after signing up:
```sql
update public.profiles set role = 'admin' where email = 'your@email.com';
```

---

## Local Development

```bash
cp .env.example .env
# Edit .env — paste your sb_publishable_ key

npm install
npm run dev
```

---

## Database Tables

| Table | What it stores |
|-------|---------------|
| `profiles` | Users (auto-created on signup via trigger) |
| `tasks` | Tasks with vendor, amount, due date, reminders |
| `payment_methods` | Saved payment methods per user |
| `emails` | Scanned emails linked to tasks |
| `notifications` | In-app notification inbox |

---

## API Key Types (Supabase 2025)

| Key type | Format | Use for |
|----------|--------|---------|
| Publishable (new) | `sb_publishable_...` | Client-side — use this |
| Secret (new) | `sb_secret_...` | Server-side only, never in browser |
| Anon (legacy) | `eyJhbGci...` | Still works, being phased out |
| Service role (legacy) | `eyJhbGci...` | Server-side only, never in browser |
