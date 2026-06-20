# Admin Dashboard Setup

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open **SQL Editor** and run the full contents of `supabase/schema.sql`

## 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API (keep secret!) |
| `ADMIN_EMAIL` | Your email — must match the Supabase Auth user |

## 3. Create your admin user

1. In Supabase Dashboard → **Authentication** → **Users**
2. Click **Add user** → enter the same email as `ADMIN_EMAIL` with a strong password

## 4. Storage bucket

The schema SQL creates a `portfolio-media` bucket automatically. If it fails, create it manually:

- **Storage** → **New bucket** → name: `portfolio-media`, **Public bucket**: ON

## 5. Start the app

```bash
npm run dev
```

- Portfolio: http://localhost:4001
- Admin: http://localhost:4001/admin

## How it works

- **Public site** loads designs, videos, and clients from Supabase. If Supabase is not configured, it falls back to the static files in `public/`.
- **Admin dashboard** at `/admin` is hidden from visitors — only your `ADMIN_EMAIL` can sign in.
- Upload a project → it's stored in Supabase Storage + database → appears on the portfolio immediately (no code changes needed).
- Drag rows in the project table to reorder. Toggle ⭐ featured and 👁 published status inline.

## Migrating existing content

Your current designs, videos, and logos in `public/` still work as fallbacks. To migrate them to Supabase:

1. Sign in to `/admin`
2. Use **New Project** for each item, uploading the file from `public/designs`, `public/videos`, or `public/logos`
3. Once all items are in Supabase, the site will use database content automatically
