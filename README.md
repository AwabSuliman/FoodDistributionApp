# Food Distribution App

A Next.js MVP for coordinating Zakatul Fitr food box distribution across recipients, mosque admins, and volunteer drivers.

## What It Does

- Recipients can submit a food box request with household size, contact details, and delivery instructions.
- Recipients can correct their own request details until the request is approved.
- Recipients and admins can see an audit history from submission through delivery.
- Admins can review, approve, deny, search, and filter requests.
- Admins can move requests into review, approve them, or assign deliveries in batches.
- Admins can open or close recipient request intake without ending the active season.
- Admins can review the full volunteer roster and approve or deny driver applications.
- Admins can select and approve multiple pending driver applications together.
- Admins can assign and unassign deliveries directly from request details.
- Drivers can apply to volunteer, claim available deliveries under their approved account, update delivery status, and record why a delivery was missed.
- Drivers can review their active-season delivery totals and completed attempts.
- The dashboard tracks requests by operational state, family size, approved drivers, denied drivers, and pending driver applications.
- Admin reports summarize families, household members, approved food weight, delivered food weight, and totals by status.
- Drivers can download a route manifest for their currently assigned deliveries.
- Admins can browse archived requests by distribution season, inspect their details, and export a season as CSV.
- Supabase authentication protects the dashboard when Supabase environment variables are configured.
- Signed-in dashboards refresh automatically when another user changes requests, deliveries, driver applications, or seasons.
- Users can request a secure password reset link and choose a new password through the Supabase recovery flow.

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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Apply every migration in `supabase/migrations` to the Supabase project. With the Supabase CLI linked to the project, run:

```bash
supabase db push
```

The migration files can be applied in timestamp order through the Supabase SQL Editor when the CLI is unavailable. They create the active season, request and driver tables, audit events, row-level security policies, atomic delivery workflow functions, and database access hardening.

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

When Supabase environment variables are present, `/` and `/dashboard` require sign-in and `/login` handles sign-in, sign-up, and sign-out. New users can sign up as recipients or prospective drivers. The database copies that signup choice into trusted `app_metadata` and enforces recipient and driver write permissions with row-level security. Drivers cannot view or claim deliveries until an admin approves their database application. Admin access is trusted only from Supabase `app_metadata.role = "admin"`.

Driver applications use the signed-in account's name, email, and user ID. Applicants provide only their current phone number, preventing an application from being attached to a different identity.

Supabase email confirmation links return through `/auth/callback`, which exchanges the auth code for a session and redirects back to the original protected page. In Supabase Auth settings, add your `NEXT_PUBLIC_SITE_URL` value to the allowed redirect URLs.

The database policies scope recipients to their own requests, approved drivers to available or assigned deliveries, and admins to operational data. Delivery claims and state transitions execute atomically in PostgreSQL to prevent two drivers from claiming the same request.

Recipients can update only their own submitted or under-review request. The protected database function locks edits after approval and recalculates box weight from household size; admins retain control of manual box-weight adjustments.

Database triggers record request submission, detail edits, review, approval, and denial. Those entries appear alongside driver assignment and delivery updates in the request activity history.

Admins can close request intake while keeping the current distribution season active, then reopen it later. The database checks the intake setting again when a recipient submits, so a stale browser cannot bypass the closure.

The admin request table supports bulk review, approval, and driver assignment for up to 200 requests. Each bulk database function validates every selected request and rolls back the entire operation if any item has already changed.

Pending driver applications can also be approved in batches of up to 200. Supabase locks and validates every selected application before committing the approvals.

Supabase Realtime keeps open dashboards current across users. Realtime change delivery still follows the table row-level security policies, so each account receives only changes it is allowed to read.

Marking a delivery as not delivered requires a reason. Supabase stores that reason with the delivery event so recipients and admins can see it in the request activity history.

Activating a new distribution season archives the current season. The admin form requires explicit confirmation before making that change.

## Deployment Checklist

- Apply every migration in `supabase/migrations` before deploying the matching application build.
- Add all three environment variables to the hosting project.
- Add the production `/auth/callback` URL to Supabase Auth redirects.
- Create staff accounts manually and set their trusted `app_metadata.role` to `admin`.
- Verify recipient, pending-driver, approved-driver, and admin accounts separately.
- Run `npm test`, `npm run lint`, and `npm run build`.
