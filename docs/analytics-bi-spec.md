# Admin Analytics / Lightweight BI Workspace

## Status

Product and technical specification only. Do not implement from this document
until the work is explicitly picked up.

## Outcome

Add an admin-only `/analytics` workspace, linked from `/admin`, for exploring
invitation and RSVP data. It should behave like a small BI tool rather than a
collection of fixed dashboards: admins choose a dataset, measures, dimensions,
filters, and a visualization, while a small set of useful reports provides good
starting points.

The first release is primarily about the **current RSVP state**. Historical
activity is supporting context: admins should be able to see when RSVP activity
or changes spiked and drill into which groups responded on a selected date.

Keep the interface calm and progressive. Show a useful summary and simple
controls first; disclose advanced configuration only when requested.

## Confirmed product decisions

- `/analytics` and every analytics API are restricted to emails in
  `ADMIN_EMAILS`, using the same authorization rules as `/admin`.
- The default reporting grain is invitation/group, not named attendee.
- Names may appear in a deliberate drill-down, such as clicking a date to see
  who responded, but are not ordinary chart dimensions or headline metrics.
- Current-state reporting is primary. Time-series reporting is secondary and
  is meant to identify spikes and periods of change.
- Guest actions and admin actions must both be visible in history, but shown as
  separate series and filters. Guest-only should be the default historical
  view.
- The existing five `groupLabel` values are sufficient for now.
- Hotel reporting is out of scope even though `needsHotel` remains in the
  database. Local versus out-of-town is the only travel-related breakdown.
- Saved reports are shared with all admins immediately; there is no private
  report ownership model.
- A result table is always available. Compatible charts are optional views
  above the table.
- Traffic analytics and visit-to-claim conversion are not part of the initial
  implementation. A future integration approach is documented below.

## Metric semantics

Analytics must use a semantic metric layer rather than letting the browser
construct SQL. Definitions should be visible through short tooltips.

At the individual level, current RSVP state must reconcile to invited capacity:

- **Invited individuals:** sum of `groups.maxPartySize`.
- **Attending individuals:** `rsvps.partySize` for attending RSVPs; otherwise
  zero.
- **Declining individuals:**
  - no RSVP: zero;
  - group RSVP is no: the full `maxPartySize`;
  - group RSVP is yes: `maxPartySize - partySize`.
- **Awaiting individuals:** full `maxPartySize` when no RSVP exists; otherwise
  zero.

Therefore:

`invited individuals = attending individuals + declining individuals + awaiting individuals`

Example: a two-person invitation that declines contributes two declining
individuals and zero attendees. A four-person invitation that RSVPs for two
contributes two attendees and two declining individuals.

Other initial measures:

- Invited groups
- Average/minimum/maximum invited group size
- Claimed groups
- Connected accounts
- Responded groups
- Attending groups
- Declining groups
- Outstanding groups
- Response rate: responded groups / invited groups
- Acceptance rate: attending individuals / responded individuals
- Capacity utilization: attending individuals / invited individuals
- Average attending party size
- Local attending groups and individuals
- Out-of-town attending groups and individuals
- RSVP activity count
- Distinct groups with RSVP activity

Counts must state their grain (`groups`, `individuals`, `accounts`, or
`events`) in labels to prevent ambiguity.

## Semantic datasets

Expose curated datasets instead of raw tables so joins cannot silently multiply
rows:

1. **Invitations** — one record per `groups` row, with derived current status.
2. **Current RSVPs** — one record per group, including groups with no RSVP.
3. **Attendees** — one derived record per current named attendee; drill-down
   oriented and not the default dataset.
4. **Connected accounts** — one record per `group_members` row.
5. **RSVP activity** — one record per relevant `events` row.

## Dimensions and filters

Initial supported dimensions:

- Group label
- Current RSVP status: attending, declined, awaiting response
- Claim status: unclaimed, partially connected, fully connected
- Locality: local, out of town, unknown
- Invited-size bucket: 1, 2, 3–4, 5+
- Attending-party-size bucket
- Capacity-utilization bucket
- Group created date
- First claim date
- Connected-account date
- Latest RSVP date
- RSVP activity date
- RSVP activity source: guest or admin
- RSVP activity type: first response or subsequent update, when derivable

Do not expose email, phone, allergy text, dietary selections, or hotel status as
general BI dimensions. Hometown is also excluded from the initial builder;
local/out-of-town provides the required breakdown without noisy free-text data.

Filters support equals, not equals, one-of, not-one-of, date range, numeric
range, is empty, and is not empty where applicable. Multiple filters combine
with AND initially. OR groups and nested filter logic are out of scope for v1.

## Calculations

The first release supports approved semantic measures with these aggregations
where meaningful:

- Count and distinct count
- Sum
- Average
- Minimum and maximum
- Median
- Percentage of total
- Conversion/rate measures defined by the server
- Cumulative total for time series

Do not accept arbitrary SQL or user-authored formulas in v1. A later formula
builder may combine approved measures, but it must not expose raw database
expressions.

## Page design

### Navigation and authorization

- Add an `Analytics` link/button to the `/admin` header.
- Add a reciprocal `Guest Admin` link on `/analytics`.
- Protect the page on the server, matching the signed-out and unauthorized
  behavior of `/admin`.
- Independently authorize every API route; hiding the page is not sufficient.

### Default view

The landing view should avoid overwhelming the user:

1. A compact row of at most five KPIs:
   - invited individuals;
   - attending individuals;
   - declining individuals;
   - awaiting individuals;
   - group response rate.
2. A report selector with the canned reports below.
3. A single `Build a report` action that reveals the query builder.
4. One visualization followed by its underlying table.

Do not show every dimension, measure, and chart type simultaneously. The builder
should guide the user in order: dataset, measure, group-by, filters, display.
Advanced settings live in a collapsible section.

### Query builder

- One dataset selector.
- One or more compatible measures.
- Zero, one, or two group-by dimensions in v1.
- Add/remove filter rows.
- Visualization selector limited to compatible choices.
- Plain-language query summary, for example: `Attending individuals by group
  label for current RSVPs.`
- Run automatically for lightweight changes, with a short debounce; provide an
  explicit Run button if queries become expensive.
- Encode unsaved configuration in the URL so it can be bookmarked.
- Provide Reset and Save report actions.

### Results and drill-down

- Always provide a results table, including totals when meaningful.
- Initial displays: KPI, table, bar, stacked bar, line/area, and donut.
- Clicking a compatible chart mark applies a filter or opens drill-down.
- Clicking a date in RSVP activity opens the groups that had activity that day.
- Drill-down shows invited/group names, group label, current RSVP status,
  current party size, activity timestamp, and whether the change was made by a
  guest or admin. It does not show emails or phone numbers.
- A drill-down row may link to the corresponding group in `/admin` if the admin
  page supports stable row targeting; otherwise omit the link in v1.
- CSV export uses the same server-validated query and respects the same privacy
  rules.
- Show the data freshness timestamp and timezone (`America/Chicago` by default,
  with timestamps stored in UTC).

## Canned reports

Only these reports ship initially:

1. **RSVP executive summary**
   - invited, attending, declining, and awaiting individuals;
   - invited/responded/attending/declining groups;
   - response rate and capacity utilization.

2. **RSVP activity over time**
   - daily or weekly event counts;
   - guest and admin activity as separate series;
   - guest-only default;
   - optional cumulative view;
   - date click-through to affected groups.

3. **Invitation funnel**
   - invited groups -> claimed groups -> responded groups -> attending groups;
   - counts and conversion percentages;
   - group-based funnel only, because account and individual grains are not
     interchangeable.

4. **Group-size analysis**
   - invited-size distribution;
   - average invited and attending party size;
   - capacity utilization;
   - optional group-label filter, but no large default cross-tab.

5. **Attendance by group label**
   - one table row per group label with at least one attending group;
   - unique count of attending groups;
   - total count of attending individuals;
   - current attending RSVP state only.

6. **Outstanding invitations**
   - unclaimed groups;
   - claimed groups with no RSVP;
   - sortable by invitation size, group label, and age;
   - drill-down to names.

Explicitly excluded canned reports: RSVP status by group label, hotel/travel
planning, dietary planning, and RSVP revision auditing. The underlying builder
may still answer simple supported questions such as current status filtered by
group label or local versus out-of-town.

## Saved reports

Saved reports are shared globally across the small admin team.

Suggested table:

```text
analytics_reports
- id
- name
- description (nullable)
- query_config jsonb
- created_by
- created_at
- updated_by
- updated_at
```

Requirements:

- Any admin can create, open, rename, update, and delete any saved report.
- Confirm deletion.
- Store a `version` inside `query_config` so future schema changes can migrate or
  reject old configurations safely.
- Canned reports are code-defined and cannot be overwritten. An admin may save
  a modified canned report as a new shared report.
- Display who last updated a saved report and when; do not otherwise build a
  permissions system.

## API and query contract

Suggested routes:

- `GET /api/admin/analytics/catalog` — datasets, measures, dimensions,
  operators, and compatible visualizations.
- `POST /api/admin/analytics/query` — validated aggregate or drill-down query.
- `POST /api/admin/analytics/export` — protected CSV export.
- `GET/POST /api/admin/analytics/reports` — list/create saved reports.
- `PUT/DELETE /api/admin/analytics/reports/[id]` — update/delete saved report.

Illustrative request:

```json
{
  "dataset": "current_rsvps",
  "measures": ["attending_individuals", "average_attending_party_size"],
  "dimensions": ["group_label"],
  "filters": [
    { "field": "current_rsvp_status", "operator": "equals", "value": "attending" }
  ],
  "dateRange": null,
  "sort": [{ "field": "attending_individuals", "direction": "desc" }],
  "limit": 100
}
```

The server maps allowlisted identifiers to Drizzle or parameterized SQL
expressions. Never accept raw column names, SQL fragments, or formulas from the
client. Validate dataset/measure/dimension compatibility and impose limits on
dimensions, rows, export size, and query complexity.

## Existing data and historical limitations

The operational Neon database already has:

- `groups`, `group_members`, `rsvps`, and `events`;
- group creation, claim/join, latest RSVP update, and event timestamps;
- `invite_claimed`, guest `rsvp_submitted`, and `admin_rsvp_updated` events.

There is no separate analytics database in the repository. Vercel Analytics and
Umami are also installed, but neither is currently queried by the application.

Current-state metrics can be derived reliably from `groups` plus the current
`rsvps` row. RSVP activity charts can use `events`, with these caveats:

- event logging intentionally does not block the operational request, so rare
  log-write failures can create gaps;
- existing RSVP event properties contain attending status, hotel status, and
  party size, but not a complete before/after snapshot;
- the app can count activity and locate spikes, but cannot always reconstruct
  every historical field change from current data;
- first-response versus later-update status must be derived by ordering events
  per group, and older data may be incomplete;
- names in historical drill-down are current group names, not historical
  snapshots.

For the initial goal of identifying activity spikes, these limitations are
acceptable if they are documented in the UI. Do not present the event log as a
perfect audit ledger.

### Recommended event hardening

When implementing analytics, improve new RSVP history without rewriting old
events:

- add an explicit event `source` (`guest` or `admin`), either as a column or a
  stable property;
- record whether the action is a first response or an update;
- record normalized old and new RSVP snapshots for status, party size, and
  locality;
- add an event schema version;
- consider writing the operational RSVP and its event in one transaction so
  history cannot silently diverge;
- retain backward-compatible interpretation for existing events.

Do not add hotel information to the new analytics event contract.

## Future: site traffic and conversion funnel

This is intentionally not part of the initial feature, but this section should
be sufficient for a later agent to investigate and implement it.

### Goal

Measure a privacy-conscious funnel such as:

`site visit -> sign-in started -> signed in -> invite claim attempted -> invite claimed -> RSVP submitted`

and answer where anonymous or authenticated users drop off.

### Current instrumentation

- `@vercel/analytics` is loaded globally for site analytics.
- Umami Cloud is loaded globally and receives client events including sign-in
  clicks, phone claim success/error, RSVP interactions, and RSVP submission.
- The Neon `events` table stores successful server-side invite claims and RSVP
  submissions/updates linked to groups.
- There is no application-side API integration that reads Vercel Analytics or
  Umami data.

### Recommended design

1. Choose one traffic source as the canonical anonymous analytics source;
   Umami is the likely fit because custom events already exist, but confirm API
   access, retention, and export capabilities at implementation time.
2. Define canonical funnel events and remove semantic duplication between
   client and server event names.
3. Generate a privacy-safe anonymous journey ID in the browser. Do not put
   phone numbers, emails, attendee names, or raw OAuth identifiers into traffic
   analytics.
4. On successful claim, emit a one-way bridge identifier or server event that
   allows aggregate pre-claim/post-claim funnel analysis without exposing guest
   identity in the traffic system.
5. Treat client events as behavioral telemetry and Neon server events as the
   source of truth for successful claims and RSVPs.
6. Add a server-only integration or scheduled import that queries aggregate
   Umami/Vercel data. Never expose provider credentials to the browser.
7. Store daily aggregate funnel facts in Neon if provider API latency or
   retention makes live queries unreliable. Do not copy raw visitor data unless
   a concrete reporting need justifies it.
8. Provide a separate `Traffic & conversion` dataset and canned funnel so its
   anonymous visitor grain cannot be accidentally joined to invitation counts.
9. Document cookie/consent and retention implications before introducing any
   persistent cross-session identifier.

### Questions for that future work

- Which traffic provider should be authoritative?
- Is anonymous-to-known journey stitching actually needed, or are aggregate
  stage counts sufficient?
- What retention window is useful?
- Should bots, admin traffic, and preview deployments be excluded?
- Is consent required for the chosen anonymous identifier and deployment
  geography?

## Performance and indexing

The guest list is small, so query Neon directly for v1; do not introduce a data
warehouse or cube service. Avoid premature materialized views. Inspect query
plans before adding indexes; likely candidates include event type/time,
event group/time, RSVP update time, member join time, and group label.

Cache only catalog metadata and code-defined canned report definitions. Current
RSVP results should remain fresh after an admin or guest update.

## Privacy and accessibility

- No email or phone dimensions or exports.
- No allergy/dietary details in analytics.
- Names appear only in intentional drill-down/export results needed to explain
  an aggregate.
- Record analytics page/report access only if there is a concrete audit need;
  do not add surveillance by default.
- Charts need text/table equivalents, keyboard interaction, adequate contrast,
  and non-color series labels.
- Empty, loading, error, and partial-history states must be explicit.

## Acceptance criteria

- Signed-out and non-admin users cannot load `/analytics` or call any analytics
  endpoint.
- `/admin` links to `/analytics`, and `/analytics` links back.
- The five default KPIs reconcile exactly to current group/RSVP data.
- Attending + declining + awaiting individuals equals invited individuals.
- A two-person group that declines counts as two declining individuals and zero
  attendees.
- Admins can build a report from allowlisted datasets, measures, dimensions, and
  filters without writing SQL.
- Results always have a table; compatible charts can be selected.
- The canned reports produce documented metrics and useful empty states.
- RSVP activity defaults to guest-only, can include admin changes, and visually
  separates the two sources.
- Clicking an activity date reveals the relevant groups without exposing email
  or phone numbers.
- Any admin can create, edit, and delete a shared saved report.
- Saved configurations are versioned and validated when loaded.
- CSV export is admin-protected and uses the same semantic query rules.
- Existing hotel data is not surfaced.
- Existing RSVP administration and guest RSVP behavior remain unchanged.

## Test plan

- Unit-test every semantic measure, especially reconciliation and zero/empty
  denominators.
- Test current states: unclaimed/no RSVP, claimed/no RSVP, attending full party,
  attending partial party, declined group, and admin-entered RSVP.
- Test group and individual grains independently to catch join multiplication.
- Test guest/admin activity separation and date bucketing at timezone boundaries.
- Test historical gaps/legacy event properties without crashing or inventing
  values.
- Test every analytics route for signed-out, non-admin, and admin sessions.
- Test malformed identifiers, incompatible dimensions, oversized limits, and
  attempted raw SQL injection.
- Test shared report create/update/delete and configuration-version rejection.
- Test keyboard and table access for every canned chart.
- Run the existing suite, TypeScript checking, and production build.

## Suggested implementation order

1. Semantic metric catalog and unit tests.
2. Protected query endpoint and current-state KPI query.
3. `/analytics` shell, navigation, and default executive summary.
4. Progressive query builder, results table, and URL state.
5. Chart views and drill-down.
6. Historical event interpretation and event hardening.
7. Remaining canned reports.
8. Shared saved reports and CSV export.
9. Authorization, privacy, accessibility, and regression verification.

## Non-goals for v1

- Raw SQL, arbitrary formulas, or unrestricted database fields
- Traffic/visitor analytics or anonymous-to-guest identity stitching
- Hotel, dietary, allergy, phone, or email reporting
- Geographic normalization or hometown reporting
- Private reports or per-report permissions
- Scheduled emails, alerts, dashboards, or warehouse infrastructure
- Perfect reconstruction of historical RSVP state before event hardening
