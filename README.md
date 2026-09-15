# Save the Date — Engagement Party

An invite site with Google sign-in,
phone-number-based invite verification, an RSVP form, and an admin portal for
managing the guest list. Built to deploy to Vercel as one project (frontend +
API routes = the backend).

- **Event:** Friday, September 19, 2026 · Cincinnati, OH
- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · Auth.js
  (NextAuth v5, Google) · Neon Postgres · Drizzle ORM

## How it works

1. **Not signed in** → background photo + "Sign in with Google".
2. **Signed in, invite not yet verified** → enter the phone number where you got
   your invite. It's matched against the admin-uploaded guest list.
   - Number not on the list → rejected.
   - Approved number and group has room → connect the Google account to the
     group's shared invite and RSVP.
   - One Google account can belong to only one group. A group can connect up to
     its invited party size in distinct Google accounts.
   - Secondary members see a one-time notice that they joined an existing group.
3. **Verified** → event details + the group's shared RSVP form (attending? local
   or out of town? party size, capped at the per-household max set by the admin).
4. **Admins** (emails in `ADMIN_EMAILS`) get `/admin` to upload guests and see
   live RSVP status.

## Stay planning

`/stay` is a private, group-shared travel planner for guests who are attending,
marked out of town, and belong to `Nick Friends`, `Nikki Friends`, or `Nick Fam`.
It records hotel or friend/family lodging, independent inbound and outbound
travel modes, and shows privacy-limited same-hotel coordination names. The
protected `/admin/stay` workspace provides host oversight, editing, CSV export,
and hotel catalog management.

Apply `drizzle/0003_stay_planning.sql` before deploying this feature. As with
all migrations, validate it on a disposable Neon branch first; never test it
against the production `main` database.

## Local setup

### 1. Install

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Then fill in `.env.local` (it's gitignored — never commit it):

| Variable | Where to get it |
| --- | --- |
| `DATABASE_URL` | Neon connection string (see step 3) |
| `AUTH_SECRET` | Run `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud Console (see step 4) |
| `ADMIN_EMAILS` | Comma-separated Google emails that get admin access |
| `NEXT_PUBLIC_VIDEO_URL` | Defaults to the bundled placeholder; swap later |
| `NEXT_PUBLIC_EVENT_DATE` / `NEXT_PUBLIC_EVENT_CITY` | Already set for you |

### 3. Database (Neon Postgres)

Easiest path is through Vercel:

1. In your Vercel project → **Storage** → **Create Database** → **Neon**.
2. Vercel injects `DATABASE_URL` into the project automatically. For local dev,
   copy the connection string from the Neon dashboard into `.env.local`.

Or create a free database directly at [neon.tech](https://neon.tech) and paste
its connection string.

Then create the tables:

```bash
npm run db:push      # pushes the schema to your database
```

(`npm run db:studio` opens a browser GUI to inspect rows.)

#### Safe feature testing with a disposable Neon branch

Never run schema migrations or test RSVPs against the production `main`
database. Neon branches are copy-on-write clones, so they are suitable for
testing migrations against realistic data without changing production.

Authenticate the Neon CLI and locate the project and its current branches:

```bash
npx --yes neonctl auth
npx --yes neonctl projects list
npx --yes neonctl branches list --project-id <PROJECT_ID>
```

If the account belongs to multiple organizations, add `--org-id <ORG_ID>` to
the project-list command. Do not reuse a preview branch belonging to another PR.

Create a feature-specific branch from `main`. Give manual test branches an
expiration so they clean themselves up if teardown is forgotten:

```bash
npx --yes neonctl branches create \
  --project-id <PROJECT_ID> \
  --parent main \
  --name dev/<FEATURE_NAME> \
  --expires-at <ISO_8601_TIMESTAMP>
```

Record the returned branch ID, then verify it before applying migrations:

```bash
npx --yes neonctl branches get <DEV_BRANCH_ID> \
  --project-id <PROJECT_ID>
```

Keep the development connection string shell-scoped instead of replacing the
production-like `DATABASE_URL` in `.env.local`. These commands fetch it at
runtime without printing or committing credentials:

```bash
env DATABASE_URL="$(npx --yes neonctl connection-string <DEV_BRANCH_ID> \
  --project-id <PROJECT_ID> --no-color)" npm run db:push

env DATABASE_URL="$(npx --yes neonctl connection-string <DEV_BRANCH_ID> \
  --project-id <PROJECT_ID> --no-color)" npm run dev
```

For an existing installation, validate the exact checked-in SQL migration on
the disposable branch rather than using `db:push`. `neonctl psql` requires a
local `psql` installation:

```bash
npx --yes neonctl psql <DEV_BRANCH_ID> \
  --project-id <PROJECT_ID> < drizzle/<MIGRATION_FILE>.sql
```

Local Google OAuth still uses the credentials in `.env.local`; its authorized
redirect URI must include
`http://localhost:3000/api/auth/callback/google`. The shell-level
`DATABASE_URL` above overrides only the database target for that server process.

Before opening a production PR, test at least:

1. `npm test`, `npx tsc --noEmit`, and `npm run build`.
2. Signed-out access and the expected 401/403 responses from protected APIs.
3. First Google account claims an approved phone number.
4. A second Google account claims the same group, sees the one-time shared-RSVP
   notice, and can read/update the same RSVP.
5. Group membership never exceeds `maxPartySize` and one email cannot connect
   to multiple groups.
6. Removing one account in the admin portal preserves the shared RSVP.

Create test-only groups and phone numbers only inside the disposable branch;
never add fixtures to production migrations. When testing is complete, stop the
local server and explicitly delete the branch:

```bash
npx --yes neonctl branches delete <DEV_BRANCH_ID> \
  --project-id <PROJECT_ID>
```

Never commit `.env.local`, connection strings, database passwords, OAuth codes,
or CLI authentication files.

### 4. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs &
   Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs** — add both:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://YOUR-DOMAIN.vercel.app/api/auth/callback/google`
4. Copy the Client ID / Secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
5. On the **OAuth consent screen**, while in "Testing" mode add your testers'
   Google emails (or publish the app so any Google account can sign in).

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000. To reach the admin portal, sign in with an email
listed in `ADMIN_EMAILS`, then visit `/admin`.

## Uploading guests

In `/admin`, paste CSV rows (header optional):

```csv
names, phones, group
"Jane Smith; John Smith", "(513) 555-0142; (513) 555-0143", "Core"
"Alex Doe", "513-555-0199", "Nick Friends"
```

- Phone numbers are normalized (formatting/`+1` ignored), so guests can type
  theirs however they like.
- Re-uploading a phone that already exists **updates** the name and cap and
  **preserves** connected accounts and the existing RSVP. A group cannot be
  reduced below its current number of connected accounts.

## Deploying to Vercel

1. Push this repo to GitHub (the `.gitignore` keeps `.env.local` out).
2. Import the repo in Vercel.
3. Add all the env vars from `.env.example` under **Settings → Environment
   Variables** (use real values). If you created the Neon DB via Vercel Storage,
   `DATABASE_URL` is already there.
4. Make sure your production redirect URI is in the Google OAuth config.
5. Apply every unapplied SQL migration in `drizzle/` to the production database
   before deploying code that depends on it. For an existing installation,
   `0001_multi_account_group_access.sql` backfills current claim owners safely.
6. Deploy.

## Swapping in the real video

The placeholder at `public/placeholder-loop.mp4` is served from Vercel's global
CDN/Edge Network automatically. Two options for the real video:

- **Small file (< ~10 MB):** drop it in `public/`, set
  `NEXT_PUBLIC_VIDEO_URL=/your-video.mp4`.
- **Larger file (recommended):** upload to **Vercel Blob** (Vercel project →
  **Storage → Blob**), then set `NEXT_PUBLIC_VIDEO_URL` to the Blob URL. Blob is
  CDN-backed, so playback stays smooth.

Encode as MP4 (H.264 + AAC), `-movflags +faststart`, ~1080p for best
size/quality. A gradient fallback shows behind the video, so the page never
looks broken while it loads.

## Security notes

- All secrets live in `.env.local` (gitignored) and Vercel env vars — nothing
  sensitive is committed.
- Admin API routes re-check `ADMIN_EMAILS` server-side on every request; the
  client `isAdmin` flag is for UI only.
- Membership emails are globally unique, enforcing one group per Google account.
  Group/slot uniqueness plus retrying allocation keeps simultaneous claims at or
  below the group's `maxPartySize`.
- Admin account removal deletes only the membership row; the group's shared RSVP
  is preserved.
