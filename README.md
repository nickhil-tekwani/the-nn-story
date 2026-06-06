# Save the Date — Engagement Party

A single-page invite site with a looping background video, Google sign-in,
phone-number-based invite verification, an RSVP form, and an admin portal for
managing the guest list. Built to deploy to Vercel as one project (frontend +
API routes = the backend).

- **Event:** Friday, September 19, 2026 · Cincinnati, OH
- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · Auth.js
  (NextAuth v5, Google) · Neon Postgres · Drizzle ORM

## How it works

1. **Not signed in** → looping video + "Sign in with Google".
2. **Signed in, invite not yet verified** → enter the phone number where you got
   your invite. It's matched against the admin-uploaded guest list.
   - Number not on the list → rejected.
   - Number already claimed by another Google account → rejected.
   - Match found & unclaimed → bound to your Google account (one account ↔ one
     invite, enforced in the DB).
3. **Verified** → event details + RSVP form (attending? hotel or local? party
   size, capped at the per-household max set by the admin).
4. **Admins** (emails in `ADMIN_EMAILS`) get `/admin` to upload guests and see
   live RSVP status.

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
name, phone, max_party_size
Jane & John Smith, (513) 555-0142, 4
Alex Doe, 513-555-0199, 2
```

- Phone numbers are normalized (formatting/`+1` ignored), so guests can type
  theirs however they like.
- Re-uploading a phone that already exists **updates** the name and cap and
  **preserves** any existing claim/RSVP.

## Deploying to Vercel

1. Push this repo to GitHub (the `.gitignore` keeps `.env.local` out).
2. Import the repo in Vercel.
3. Add all the env vars from `.env.example` under **Settings → Environment
   Variables** (use real values). If you created the Neon DB via Vercel Storage,
   `DATABASE_URL` is already there.
4. Make sure your production redirect URI is in the Google OAuth config.
5. Deploy. After the first deploy, run `npm run db:push` locally against the
   production `DATABASE_URL` (or use Neon's SQL editor with
   `drizzle/0000_*.sql`) to create the tables.

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
- The phone-claim is done as a conditional `UPDATE ... WHERE claimed_by_email IS
  NULL`, so two simultaneous logins can't both claim the same invite.
