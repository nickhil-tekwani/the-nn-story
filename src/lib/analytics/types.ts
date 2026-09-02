export const ANALYTICS_QUERY_VERSION = 1;

export type AnalyticsDataset =
  | "invitations"
  | "current_rsvps"
  | "attendees"
  | "night_time_attendees"
  | "connected_accounts"
  | "rsvp_activity";

export type AnalyticsOperator =
  | "equals"
  | "not_equals"
  | "one_of"
  | "not_one_of"
  | "between"
  | "is_empty"
  | "is_not_empty";

export type AnalyticsFilter = {
  field: string;
  operator: AnalyticsOperator;
  value?: string | number | Array<string | number>;
  to?: string | number;
};

export type AnalyticsQuery = {
  version: 1;
  dataset: AnalyticsDataset;
  measures: string[];
  dimensions: string[];
  filters: AnalyticsFilter[];
  sort?: Array<{ field: string; direction: "asc" | "desc" }>;
  limit?: number;
  mode?: "aggregate" | "detail";
};

export type AnalyticsValue = string | number | null;
export type AnalyticsRow = Record<string, AnalyticsValue>;

export type AnalyticsResult = {
  columns: Array<{
    key: string;
    label: string;
    type: "string" | "number" | "percent" | "date" | "datetime" | "hours";
  }>;
  rows: AnalyticsRow[];
  totalRows: number;
  truncated: boolean;
  generatedAt: string;
  timezone: "America/Chicago";
  caveats?: string[];
};

export type SavedAnalyticsConfig = {
  version: 1;
  query: AnalyticsQuery;
  visualization: "kpi" | "table" | "bar" | "stacked_bar" | "line" | "area" | "donut" | "funnel";
};
