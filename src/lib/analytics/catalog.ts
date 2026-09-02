import type { AnalyticsDataset } from "./types";

type ValueType = "string" | "number" | "percent" | "date" | "datetime" | "hours";

export type DimensionDefinition = {
  label: string;
  type: ValueType;
  datasets: AnalyticsDataset[];
  values?: string[];
};

type MeasureDefinition = {
  label: string;
  type: ValueType;
  datasets: AnalyticsDataset[];
  aggregate: "sum" | "average" | "median" | "distinct" | "ratio";
  field?: string;
  numerator?: string;
  denominator?: string;
};

export const DATASETS: Record<AnalyticsDataset, { label: string; description: string }> = {
  invitations: { label: "Invitations", description: "One row per invited group." },
  current_rsvps: { label: "Current RSVPs", description: "The latest RSVP state for every invited group." },
  attendees: { label: "Attendees", description: "One row per currently attending named guest." },
  night_time_attendees: { label: "Night-time attendees", description: "Yes-RSVP names from the two friend groups and eligible family friends, plus the four included Core attendees." },
  connected_accounts: { label: "Connected accounts", description: "One privacy-safe row per connected account." },
  rsvp_activity: { label: "RSVP activity", description: "Guest and admin RSVP activity over time." },
};

const CURRENT: AnalyticsDataset[] = ["invitations", "current_rsvps"];

export const DIMENSIONS: Record<string, DimensionDefinition> = {
  group_label: { label: "Group label", type: "string", datasets: [...CURRENT, "attendees", "connected_accounts", "rsvp_activity"] },
  current_rsvp_status: { label: "RSVP status", type: "string", datasets: CURRENT, values: ["Attending", "Declined", "Awaiting response"] },
  claim_status: { label: "Claim status", type: "string", datasets: [...CURRENT, "connected_accounts"], values: ["Unclaimed", "Partially connected", "Fully connected"] },
  locality: { label: "Locality", type: "string", datasets: [...CURRENT, "attendees"], values: ["Local", "Out of town", "Unknown"] },
  invited_size_bucket: { label: "Invited size", type: "string", datasets: CURRENT, values: ["1", "2", "3–4", "5+"] },
  party_size_bucket: { label: "Attending party size", type: "string", datasets: CURRENT, values: ["0", "1", "2", "3–4", "5+"] },
  utilization_bucket: { label: "Capacity utilization", type: "string", datasets: CURRENT, values: ["0%", "1–49%", "50–99%", "100%"] },
  created_date: { label: "Invitation created date", type: "date", datasets: CURRENT },
  first_claim_date: { label: "First claim date", type: "date", datasets: CURRENT },
  latest_rsvp_date: { label: "Latest RSVP date", type: "date", datasets: CURRENT },
  connected_date: { label: "Connected date", type: "date", datasets: ["connected_accounts"] },
  activity_date: { label: "Activity date", type: "date", datasets: ["rsvp_activity"] },
  activity_week: { label: "Activity week", type: "date", datasets: ["rsvp_activity"] },
  activity_source: { label: "Activity source", type: "string", datasets: ["rsvp_activity"], values: ["Guest", "Admin"] },
  activity_type: { label: "Activity type", type: "string", datasets: ["rsvp_activity"], values: ["First response", "Update"] },
};

export const MEASURES: Record<string, MeasureDefinition> = {
  invited_groups: { label: "Invited groups", type: "number", datasets: CURRENT, aggregate: "sum", field: "invited_groups" },
  invited_individuals: { label: "Invited individuals", type: "number", datasets: CURRENT, aggregate: "sum", field: "invited_individuals" },
  claimed_groups: { label: "Claimed groups", type: "number", datasets: CURRENT, aggregate: "sum", field: "claimed_groups" },
  connected_accounts: { label: "Connected accounts", type: "number", datasets: [...CURRENT, "connected_accounts"], aggregate: "sum", field: "connected_accounts" },
  responded_groups: { label: "Responded groups", type: "number", datasets: CURRENT, aggregate: "sum", field: "responded_groups" },
  attending_groups: { label: "Attending groups", type: "number", datasets: CURRENT, aggregate: "sum", field: "attending_groups" },
  declining_groups: { label: "Declining groups", type: "number", datasets: CURRENT, aggregate: "sum", field: "declining_groups" },
  outstanding_groups: { label: "Outstanding groups", type: "number", datasets: CURRENT, aggregate: "sum", field: "outstanding_groups" },
  attending_individuals: { label: "Attending individuals", type: "number", datasets: CURRENT, aggregate: "sum", field: "attending_individuals" },
  declining_individuals: { label: "Declining individuals", type: "number", datasets: CURRENT, aggregate: "sum", field: "declining_individuals" },
  awaiting_individuals: { label: "Awaiting individuals", type: "number", datasets: CURRENT, aggregate: "sum", field: "awaiting_individuals" },
  local_individuals: { label: "Local individuals", type: "number", datasets: CURRENT, aggregate: "sum", field: "local_individuals" },
  out_of_town_individuals: { label: "Out-of-town individuals", type: "number", datasets: CURRENT, aggregate: "sum", field: "out_of_town_individuals" },
  average_invited_size: { label: "Average invited size", type: "number", datasets: CURRENT, aggregate: "average", field: "invited_individuals" },
  average_attending_party_size: { label: "Average attending party size", type: "number", datasets: CURRENT, aggregate: "average", field: "attending_party_size" },
  response_rate: { label: "Group response rate", type: "percent", datasets: CURRENT, aggregate: "ratio", numerator: "responded_groups", denominator: "invited_groups" },
  acceptance_rate: { label: "Individual acceptance rate", type: "percent", datasets: CURRENT, aggregate: "ratio", numerator: "attending_individuals", denominator: "responded_individuals" },
  capacity_utilization: { label: "Capacity utilization", type: "percent", datasets: CURRENT, aggregate: "ratio", numerator: "attending_individuals", denominator: "invited_individuals" },
  attendee_count: { label: "Attendees", type: "number", datasets: ["attendees"], aggregate: "sum", field: "attendee_count" },
  night_time_attendee_count: { label: "Night-time attendees", type: "number", datasets: ["night_time_attendees"], aggregate: "sum", field: "attendee_count" },
  account_count: { label: "Connected accounts", type: "number", datasets: ["connected_accounts"], aggregate: "sum", field: "connected_accounts" },
  activity_count: { label: "RSVP activities", type: "number", datasets: ["rsvp_activity"], aggregate: "sum", field: "activity_count" },
  active_groups: { label: "Groups with activity", type: "number", datasets: ["rsvp_activity"], aggregate: "distinct", field: "group_id" },
  median_response_hours: { label: "Median response time", type: "hours", datasets: ["rsvp_activity"], aggregate: "median", field: "response_hours" },
};

export const DETAIL_COLUMNS: Record<AnalyticsDataset, Array<{ key: string; label: string; type: ValueType }>> = {
  invitations: [
    { key: "group_names", label: "Invited group", type: "string" },
    { key: "group_label", label: "Group label", type: "string" },
    { key: "current_rsvp_status", label: "RSVP status", type: "string" },
    { key: "invited_individuals", label: "Invited", type: "number" },
    { key: "attending_individuals", label: "Attending", type: "number" },
    { key: "claim_status", label: "Claim status", type: "string" },
  ],
  current_rsvps: [
    { key: "group_names", label: "Invited group", type: "string" },
    { key: "group_label", label: "Group label", type: "string" },
    { key: "current_rsvp_status", label: "RSVP status", type: "string" },
    { key: "invited_individuals", label: "Invited", type: "number" },
    { key: "attending_individuals", label: "Attending", type: "number" },
    { key: "locality", label: "Locality", type: "string" },
    { key: "latest_rsvp_at", label: "Latest RSVP", type: "datetime" },
  ],
  attendees: [
    { key: "attendee_name", label: "Attendee", type: "string" },
    { key: "group_names", label: "Invited group", type: "string" },
    { key: "group_label", label: "Group label", type: "string" },
    { key: "locality", label: "Locality", type: "string" },
  ],
  night_time_attendees: [
    { key: "attendee_name", label: "Attendee", type: "string" },
    { key: "group_label", label: "Included from", type: "string" },
  ],
  connected_accounts: [
    { key: "group_names", label: "Invited group", type: "string" },
    { key: "group_label", label: "Group label", type: "string" },
    { key: "connected_at", label: "Connected", type: "datetime" },
  ],
  rsvp_activity: [
    { key: "group_names", label: "Invited group", type: "string" },
    { key: "group_label", label: "Group label", type: "string" },
    { key: "current_rsvp_status", label: "Current RSVP", type: "string" },
    { key: "current_party_size", label: "Current party size", type: "number" },
    { key: "activity_at", label: "Activity time", type: "datetime" },
    { key: "activity_source", label: "Source", type: "string" },
    { key: "activity_type", label: "Type", type: "string" },
  ],
};

export function publicCatalog() {
  return {
    datasets: Object.entries(DATASETS).map(([key, value]) => ({ key, ...value })),
    dimensions: Object.entries(DIMENSIONS).map(([key, value]) => ({ key, ...value })),
    measures: Object.entries(MEASURES).map(([key, value]) => ({ key, label: value.label, type: value.type, datasets: value.datasets })),
    operators: ["equals", "not_equals", "one_of", "not_one_of", "between", "is_empty", "is_not_empty"],
  };
}
