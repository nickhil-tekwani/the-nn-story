import { db, events, groupMembers, groups, rsvps } from "@/db";
import type { AnalyticsDataset, AnalyticsRow } from "./types";
import { selectNightTimeAttendees } from "./nightTime";

const CHICAGO = "America/Chicago";

function dateKey(date: Date | null | undefined): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHICAGO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function weekKey(date: Date): string {
  const localDate = dateKey(date)!;
  const noonUtc = new Date(`${localDate}T12:00:00Z`);
  const day = noonUtc.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  noonUtc.setUTCDate(noonUtc.getUTCDate() - daysFromMonday);
  return noonUtc.toISOString().slice(0, 10);
}

function sizeBucket(size: number): string {
  if (size <= 2) return String(size);
  if (size <= 4) return "3–4";
  return "5+";
}

function utilizationBucket(attending: number, invited: number): string {
  const rate = invited > 0 ? attending / invited : 0;
  if (rate === 0) return "0%";
  if (rate < 0.5) return "1–49%";
  if (rate < 1) return "50–99%";
  return "100%";
}

export async function loadAnalyticsRows(dataset: AnalyticsDataset): Promise<AnalyticsRow[]> {
  const [groupRows, rsvpRows, memberRows] = await Promise.all([
    db.select().from(groups),
    db.select().from(rsvps),
    db.select().from(groupMembers),
  ]);

  const rsvpByGroup = new Map(rsvpRows.map((rsvp) => [rsvp.groupId, rsvp]));
  const membersByGroup = new Map<number, typeof memberRows>();
  for (const member of memberRows) {
    const list = membersByGroup.get(member.groupId) ?? [];
    list.push(member);
    membersByGroup.set(member.groupId, list);
  }

  const currentRows = groupRows.map((group): AnalyticsRow => {
    const rsvp = rsvpByGroup.get(group.id);
    const members = membersByGroup.get(group.id) ?? [];
    const responded = Boolean(rsvp);
    const attending = Boolean(rsvp?.attending);
    const attendingIndividuals = attending ? rsvp?.partySize ?? 0 : 0;
    const decliningIndividuals = responded
      ? Math.max(0, group.maxPartySize - attendingIndividuals)
      : 0;
    const awaitingIndividuals = responded ? 0 : group.maxPartySize;
    const locality = !attending ? "Unknown" : rsvp?.needsHotel ? "Out of town" : "Local";
    const firstMember = [...members].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0];
    const claimStatus = members.length === 0
      ? "Unclaimed"
      : members.length >= group.maxPartySize
        ? "Fully connected"
        : "Partially connected";

    return {
      group_id: group.id,
      group_names: group.invitedNames.join(", "),
      group_label: group.groupLabel ?? "Unlabeled",
      current_rsvp_status: !responded ? "Awaiting response" : attending ? "Attending" : "Declined",
      claim_status: claimStatus,
      locality,
      invited_size_bucket: sizeBucket(group.maxPartySize),
      party_size_bucket: sizeBucket(attendingIndividuals),
      utilization_bucket: utilizationBucket(attendingIndividuals, group.maxPartySize),
      created_date: dateKey(group.createdAt),
      first_claim_date: dateKey(group.claimedAt ?? firstMember?.joinedAt),
      latest_rsvp_date: dateKey(rsvp?.updatedAt),
      latest_rsvp_at: rsvp?.updatedAt.toISOString() ?? null,
      invited_groups: 1,
      invited_individuals: group.maxPartySize,
      claimed_groups: members.length > 0 ? 1 : 0,
      connected_accounts: members.length,
      responded_groups: responded ? 1 : 0,
      attending_groups: attending ? 1 : 0,
      declining_groups: responded && !attending ? 1 : 0,
      outstanding_groups: responded ? 0 : 1,
      attending_individuals: attendingIndividuals,
      declining_individuals: decliningIndividuals,
      awaiting_individuals: awaitingIndividuals,
      responded_individuals: responded ? group.maxPartySize : 0,
      local_individuals: locality === "Local" ? attendingIndividuals : 0,
      out_of_town_individuals: locality === "Out of town" ? attendingIndividuals : 0,
      attending_party_size: attending ? attendingIndividuals : null,
      current_party_size: attendingIndividuals,
    };
  });

  if (dataset === "invitations" || dataset === "current_rsvps") return currentRows;

  if (dataset === "night_time_attendees") return selectNightTimeAttendees(groupRows, rsvpRows);

  const currentByGroup = new Map(currentRows.map((row) => [Number(row.group_id), row]));

  if (dataset === "attendees") {
    return rsvpRows.flatMap((rsvp) => {
      if (!rsvp.attending) return [];
      const current = currentByGroup.get(rsvp.groupId);
      return rsvp.partyMembers.map((name) => ({
        group_id: rsvp.groupId,
        attendee_name: name,
        group_names: current?.group_names ?? "Unknown group",
        group_label: current?.group_label ?? "Unlabeled",
        locality: current?.locality ?? "Unknown",
        attendee_count: 1,
      }));
    });
  }

  if (dataset === "connected_accounts") {
    return memberRows.map((member) => {
      const current = currentByGroup.get(member.groupId);
      return {
        group_id: member.groupId,
        group_names: current?.group_names ?? "Unknown group",
        group_label: current?.group_label ?? "Unlabeled",
        claim_status: current?.claim_status ?? "Unclaimed",
        connected_date: dateKey(member.joinedAt),
        connected_at: member.joinedAt.toISOString(),
        connected_accounts: 1,
      };
    });
  }

  const eventRows = await db.select().from(events);
  const rsvpEvents = eventRows
    .filter((event) => event.event === "rsvp_submitted" || event.event === "admin_rsvp_updated")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const seenGuestGroups = new Set<number>();

  return rsvpEvents.map((event) => {
    const groupId = event.groupId ?? -1;
    const current = currentByGroup.get(groupId);
    const props = event.properties ?? {};
    const source = props.source === "admin" || event.event === "admin_rsvp_updated" ? "Admin" : "Guest";
    const isFirstGuestResponse = source === "Guest" && !seenGuestGroups.has(groupId);
    if (source === "Guest") seenGuestGroups.add(groupId);
    return {
      group_id: groupId,
      group_names: current?.group_names ?? "Deleted or unknown group",
      group_label: current?.group_label ?? "Unlabeled",
      current_rsvp_status: current?.current_rsvp_status ?? "Unknown",
      current_party_size: current?.current_party_size ?? 0,
      activity_date: dateKey(event.createdAt),
      activity_week: weekKey(event.createdAt),
      activity_at: event.createdAt.toISOString(),
      activity_source: source,
      activity_type: props.action === "first_response" || isFirstGuestResponse ? "First response" : "Update",
      activity_count: 1,
    };
  });
}
