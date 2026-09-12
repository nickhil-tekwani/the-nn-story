import { describe, expect, it } from "vitest";
import { AnalyticsQueryError, runAnalyticsQuery, validateAnalyticsQuery } from "./engine";
import type { AnalyticsQuery, AnalyticsRow } from "./types";

const rows: AnalyticsRow[] = [
  {
    group_id: 1,
    group_label: "Core",
    current_rsvp_status: "Attending",
    invited_groups: 1,
    invited_individuals: 4,
    responded_groups: 1,
    attending_groups: 1,
    declining_groups: 0,
    outstanding_groups: 0,
    attending_individuals: 2,
    declining_individuals: 2,
    awaiting_individuals: 0,
    responded_individuals: 4,
    attending_party_size: 2,
  },
  {
    group_id: 2,
    group_label: "Core",
    current_rsvp_status: "Declined",
    invited_groups: 1,
    invited_individuals: 2,
    responded_groups: 1,
    attending_groups: 0,
    declining_groups: 1,
    outstanding_groups: 0,
    attending_individuals: 0,
    declining_individuals: 2,
    awaiting_individuals: 0,
    responded_individuals: 2,
    attending_party_size: null,
  },
  {
    group_id: 3,
    group_label: "Nick Friends",
    current_rsvp_status: "Awaiting response",
    invited_groups: 1,
    invited_individuals: 3,
    responded_groups: 0,
    attending_groups: 0,
    declining_groups: 0,
    outstanding_groups: 1,
    attending_individuals: 0,
    declining_individuals: 0,
    awaiting_individuals: 3,
    responded_individuals: 0,
    attending_party_size: null,
  },
];

function query(overrides: Partial<AnalyticsQuery> = {}): AnalyticsQuery {
  return {
    version: 1,
    dataset: "current_rsvps",
    measures: ["invited_individuals", "attending_individuals", "declining_individuals", "awaiting_individuals"],
    dimensions: [],
    filters: [],
    limit: 100,
    mode: "aggregate",
    ...overrides,
  };
}

describe("analytics semantic engine", () => {
  it("reconciles invited people into attending, declining, and awaiting", () => {
    const result = runAnalyticsQuery(rows, query());
    expect(result.rows[0]).toMatchObject({
      invited_individuals: 9,
      attending_individuals: 2,
      declining_individuals: 4,
      awaiting_individuals: 3,
    });
  });

  it("counts every slot in a fully declined two-person group", () => {
    const result = runAnalyticsQuery(rows, query({
      filters: [{ field: "current_rsvp_status", operator: "equals", value: "Declined" }],
    }));
    expect(result.rows[0]).toMatchObject({ attending_individuals: 0, declining_individuals: 2 });
  });

  it("groups without multiplying group-level measures", () => {
    const result = runAnalyticsQuery(rows, query({
      measures: ["invited_groups", "response_rate"],
      dimensions: ["group_label"],
    }));
    expect(result.rows).toEqual([
      { group_label: "Core", invited_groups: 2, response_rate: 1 },
      { group_label: "Nick Friends", invited_groups: 1, response_rate: 0 },
    ]);
  });

  it("reports attendance and acceptance out of all invited groups by group label", () => {
    const result = runAnalyticsQuery([
      ...rows,
      { ...rows[2], group_id: 4, group_label: "Core" },
    ], validateAnalyticsQuery(query({
      measures: ["attending_groups", "attending_individuals", "group_acceptance_rate"],
      dimensions: ["group_label"],
    })));
    expect(result.rows).toEqual([
      { group_label: "Core", attending_groups: 1, attending_individuals: 2, group_acceptance_rate: 1 / 3 },
      { group_label: "Nick Friends", attending_groups: 0, attending_individuals: 0, group_acceptance_rate: 0 },
    ]);
    expect(result.columns).toContainEqual({ key: "group_acceptance_rate", label: "% of groups that accepted", type: "percent" });
  });

  it("ignores unanswered groups when averaging attending party size", () => {
    const result = runAnalyticsQuery(rows, query({ measures: ["average_attending_party_size"] }));
    expect(result.rows[0].average_attending_party_size).toBe(2);
  });

  it("rejects unavailable fields and raw identifiers", () => {
    expect(() => validateAnalyticsQuery({
      ...query(),
      dimensions: ["email"],
    })).toThrow(AnalyticsQueryError);
  });

  it("compares numeric ranges numerically", () => {
    const rangeRows = [{ ...rows[0], score: 10 }, { ...rows[1], score: 2 }];
    const result = runAnalyticsQuery(rangeRows, query({
      measures: ["invited_groups"],
      filters: [{ field: "score", operator: "between", value: 2, to: 9 }],
    }));
    expect(result.rows[0].invited_groups).toBe(1);
  });
});
