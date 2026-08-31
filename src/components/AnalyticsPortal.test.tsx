import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AnalyticsPortal from "./AnalyticsPortal";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const summary = {
  columns: [
    { key: "invited_individuals", label: "Invited individuals", type: "number" },
    { key: "attending_individuals", label: "Attending individuals", type: "number" },
    { key: "declining_individuals", label: "Declining individuals", type: "number" },
    { key: "awaiting_individuals", label: "Awaiting individuals", type: "number" },
    { key: "response_rate", label: "Group response rate", type: "percent" },
  ],
  rows: [{ invited_individuals: 12, attending_individuals: 7, declining_individuals: 3, awaiting_individuals: 2, response_rate: 0.8 }],
  totalRows: 1,
  truncated: false,
  generatedAt: "2026-08-25T12:00:00Z",
  timezone: "America/Chicago",
};

describe("AnalyticsPortal", () => {
  it("keeps the landing view compact while showing reconciled KPIs", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/catalog")) return { ok: true, json: async () => ({ datasets: [], dimensions: [], measures: [], operators: [] }) };
      if (url.endsWith("/reports")) return { ok: true, json: async () => ({ reports: [] }) };
      return { ok: true, json: async () => summary };
    }));

    render(<AnalyticsPortal />);

    expect(await screen.findAllByText("12")).toHaveLength(2);
    expect(screen.getAllByText("7")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Build a report" })).toBeTruthy();
    expect(screen.queryByText("1. Dataset")).toBeNull();
    expect(screen.getByRole("option", { name: "Response latency" })).toBeTruthy();
  });
});
