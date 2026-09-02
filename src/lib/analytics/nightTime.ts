import type { AnalyticsRow } from "./types";

const NIGHT_TIME_GROUP_LABELS = new Set(["Nick Friends", "Nikki Friends"]);
const NIGHT_TIME_CORE_NAMES = new Set(["nickhil", "nikki", "natasha", "abhi"]);
const NIGHT_TIME_FAM_FRIEND_NAMES = new Set([
  "manasa",
  "cody",
  "priya",
  "neha",
  "rohit",
  "diya",
  "suhaas",
  "ananya",
  "disha",
  "vibha",
  "vignesh",
  "nidhi",
  "amogh",
]);

function firstName(name: string): string {
  return name.trim().toLocaleLowerCase().split(/\s+/)[0].replace(/[^a-z]/g, "");
}

export function selectNightTimeAttendees(
  groupRows: Array<{ id: number; invitedNames: string[]; groupLabel: string | null }>,
  rsvpRows: Array<{ groupId: number; attending: boolean; partyMembers: string[] }>,
): AnalyticsRow[] {
  const rsvpByGroup = new Map(rsvpRows.map((rsvp) => [rsvp.groupId, rsvp]));

  return groupRows
    .flatMap((group) => {
      const rsvp = rsvpByGroup.get(group.id);
      const names = NIGHT_TIME_GROUP_LABELS.has(group.groupLabel ?? "")
        ? rsvp?.attending ? rsvp.partyMembers : []
        : group.groupLabel === "Core"
          ? group.invitedNames.filter((name) => NIGHT_TIME_CORE_NAMES.has(firstName(name)))
          : group.groupLabel === "Nikki Fam Friends"
            ? rsvp?.attending
              ? rsvp.partyMembers.filter((name) => NIGHT_TIME_FAM_FRIEND_NAMES.has(firstName(name)))
              : []
          : [];

      return names
      .map((name) => ({
        group_id: group.id,
        attendee_name: name.trim(),
        group_label: group.groupLabel ?? "Unlabeled",
        attendee_count: 1,
      }));
    })
    .sort((left, right) => String(left.attendee_name).localeCompare(String(right.attendee_name)));
}
