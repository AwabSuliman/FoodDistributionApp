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
- File-backed JSON persistence in `data/zakatul-fitr-state.json`
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

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm run lint
npm run build
```

## Demo Notes

The app stores demo state in `data/zakatul-fitr-state.json`. If that file is missing, the app recreates it from the seeded data in `src/lib/store.ts`.

When Supabase environment variables are present, `/` and `/dashboard` require sign-in and `/login` handles sign-in, sign-up, and sign-out. New users can sign up as recipients or drivers. Admin access is trusted only from Supabase `app_metadata.role = "admin"` so staff should assign it in the Supabase dashboard or through a secure back-office process.

Supabase email confirmation links return through `/auth/callback`, which exchanges the auth code for a session and redirects back to the original protected page. In Supabase Auth settings, add your `NEXT_PUBLIC_SITE_URL` value to the allowed redirect URLs.

Without Supabase environment variables, the app stays in local demo mode so the dashboard can still be reviewed without external credentials.
