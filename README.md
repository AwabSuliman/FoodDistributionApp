# Food Distribution App

A Next.js MVP for coordinating Zakatul Fitr food box distribution across recipients, mosque admins, and volunteer drivers.

## What It Does

- Recipients can submit a food box request with household size, contact details, and delivery instructions.
- Admins can review, approve, deny, search, and filter requests.
- Admins can approve or deny volunteer driver applications.
- Drivers can apply to volunteer, select an approved driver profile, claim available deliveries, and update delivery status.
- The dashboard tracks requests by operational state, family size, approved drivers, denied drivers, and pending driver applications.
- Supabase authentication protects the dashboard when Supabase environment variables are configured.

## Tech Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Supabase Auth with `@supabase/ssr`
- Supabase PostgreSQL with row-level security in configured environments
- File-backed JSON persistence for local demo mode
- Server Actions for form submissions and mutations

## Getting Started

Install dependencies:

```bash
npm install
```

Create `.env.local` from the example file and add your Supabase project values:

```bash
cp .env.example .env.local
```

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Apply `supabase/migrations/202607230001_initial_schema.sql` to the Supabase project. With the Supabase CLI linked to the project, run:

```bash
supabase db push
```

The same migration can be pasted into the Supabase SQL Editor when the CLI is unavailable. It creates the active season, request and driver tables, audit events, row-level security policies, and atomic delivery workflow functions.

In Supabase Auth URL Configuration, set the Site URL and add this redirect URL:

```text
http://localhost:3000/auth/callback
```

Use the production domain in the production project.

## Admin Access

Project-level Supabase permissions do not automatically grant admin access inside the application. After creating the staff Auth account, assign its trusted application role from the SQL Editor:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@example.com';
```

Replace the example email, then sign out and back in so Supabase issues a token containing the new claim. Never place the admin role in public signup metadata.

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm run lint
npm run build
npm test
```

## Demo Notes

Without Supabase environment variables, the app stores demo state in `data/zakatul-fitr-state.json`. If that file is missing, the app recreates it from the seeded data in `src/lib/store.ts`.

When Supabase environment variables are present, `/` and `/dashboard` require sign-in and `/login` handles sign-in, sign-up, and sign-out. New users can sign up as recipients or prospective drivers. Drivers cannot view or claim deliveries until an admin approves their database application. Admin access is trusted only from Supabase `app_metadata.role = "admin"`.

Supabase email confirmation links return through `/auth/callback`, which exchanges the auth code for a session and redirects back to the original protected page. In Supabase Auth settings, add your `NEXT_PUBLIC_SITE_URL` value to the allowed redirect URLs.

The database policies scope recipients to their own requests, approved drivers to available or assigned deliveries, and admins to operational data. Delivery claims and state transitions execute atomically in PostgreSQL to prevent two drivers from claiming the same request.

## Deployment Checklist

- Apply every migration in `supabase/migrations` before deploying the matching application build.
- Add all three environment variables to the hosting project.
- Add the production `/auth/callback` URL to Supabase Auth redirects.
- Create staff accounts manually and set their trusted `app_metadata.role` to `admin`.
- Verify recipient, pending-driver, approved-driver, and admin accounts separately.
- Run `npm test`, `npm run lint`, and `npm run build`.
