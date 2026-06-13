# Notes for Claude

## Coming Soon gate on the home page

The main home page (`/`) is currently showing a "Coming Soon" screen so guests
don't land on an unfinished invite page. **All original code is intact** — it is
just bypassed by an early return.

### How to undo (restore the full home page)

1. Open `src/app/page.tsx`.
2. Find the line near the top that reads:
   ```ts
   const COMING_SOON = true;
   ```
3. Change it to:
   ```ts
   const COMING_SOON = false;
   ```
4. That's it. The `if (COMING_SOON) { ... }` block will no longer execute and
   the real page (auth, RSVP form, etc.) will render as before.

Alternatively, you can delete the entire gate block (the `COMING_SOON` const,
the comment lines around it, and the `if (COMING_SOON) { return (...); }` block
in `Home()`) to remove the dead code entirely.

### What the gate does NOT affect

- `/akahoshi` — the engagement-party menu page is live and unaffected.
- `/admin` — admin routes are unaffected.
