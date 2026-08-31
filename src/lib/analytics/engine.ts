import { DATASETS, DETAIL_COLUMNS, DIMENSIONS, MEASURES } from "./catalog";
import type { AnalyticsFilter, AnalyticsQuery, AnalyticsResult, AnalyticsRow, AnalyticsValue } from "./types";

const MAX_DIMENSIONS = 2;
const MAX_MEASURES = 6;
const MAX_ROWS = 500;

export class AnalyticsQueryError extends Error {}

function numeric(value: AnalyticsValue): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function compareValue(left: AnalyticsValue, right: string | number): boolean {
  return String(left ?? "") === String(right);
}

function matchesFilter(row: AnalyticsRow, filter: AnalyticsFilter): boolean {
  const value = row[filter.field];
  switch (filter.operator) {
    case "equals": return filter.value != null && !Array.isArray(filter.value) && compareValue(value, filter.value);
    case "not_equals": return filter.value != null && !Array.isArray(filter.value) && !compareValue(value, filter.value);
    case "one_of": return Array.isArray(filter.value) && filter.value.some((candidate) => compareValue(value, candidate));
    case "not_one_of": return Array.isArray(filter.value) && !filter.value.some((candidate) => compareValue(value, candidate));
    case "between": {
      if (filter.value == null || Array.isArray(filter.value) || filter.to == null || value == null) return false;
      if (typeof value === "number" && Number.isFinite(Number(filter.value)) && Number.isFinite(Number(filter.to))) {
        return value >= Number(filter.value) && value <= Number(filter.to);
      }
      return String(value) >= String(filter.value) && String(value) <= String(filter.to);
    }
    case "is_empty": return value == null || value === "";
    case "is_not_empty": return value != null && value !== "";
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function aggregateMeasure(rows: AnalyticsRow[], key: string): number {
  const definition = MEASURES[key];
  if (definition.aggregate === "ratio") {
    const numerator = rows.reduce((sum, row) => sum + (numeric(row[definition.numerator!]) ?? 0), 0);
    const denominator = rows.reduce((sum, row) => sum + (numeric(row[definition.denominator!]) ?? 0), 0);
    return denominator === 0 ? 0 : numerator / denominator;
  }
  if (definition.aggregate === "distinct") {
    return new Set(rows.map((row) => row[definition.field!]).filter((value) => value != null)).size;
  }
  const values = rows.map((row) => numeric(row[definition.field!])).filter((value): value is number => value != null);
  if (definition.aggregate === "average") return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  if (definition.aggregate === "median") return median(values);
  return values.reduce((sum, value) => sum + value, 0);
}

export function validateAnalyticsQuery(input: unknown): AnalyticsQuery {
  if (!input || typeof input !== "object") throw new AnalyticsQueryError("A query object is required.");
  const raw = input as Partial<AnalyticsQuery>;
  if (raw.version !== 1) throw new AnalyticsQueryError("Unsupported analytics query version.");
  if (!raw.dataset || !DATASETS[raw.dataset]) throw new AnalyticsQueryError("Unknown analytics dataset.");
  const measures = Array.isArray(raw.measures) ? raw.measures : [];
  const dimensions = Array.isArray(raw.dimensions) ? raw.dimensions : [];
  const filters = Array.isArray(raw.filters) ? raw.filters : [];
  if ((raw.mode ?? "aggregate") === "aggregate" && measures.length === 0) throw new AnalyticsQueryError("Choose at least one measure.");
  if (measures.length > MAX_MEASURES) throw new AnalyticsQueryError(`Choose at most ${MAX_MEASURES} measures.`);
  if (dimensions.length > MAX_DIMENSIONS) throw new AnalyticsQueryError(`Choose at most ${MAX_DIMENSIONS} dimensions.`);
  for (const measure of measures) {
    if (!MEASURES[measure]?.datasets.includes(raw.dataset)) throw new AnalyticsQueryError(`Measure "${measure}" is not available for this dataset.`);
  }
  for (const dimension of dimensions) {
    if (!DIMENSIONS[dimension]?.datasets.includes(raw.dataset)) throw new AnalyticsQueryError(`Dimension "${dimension}" is not available for this dataset.`);
  }
  for (const filter of filters) {
    if (!filter || typeof filter.field !== "string" || !DIMENSIONS[filter.field]?.datasets.includes(raw.dataset)) {
      throw new AnalyticsQueryError("A filter uses an unavailable field.");
    }
    if (!["equals", "not_equals", "one_of", "not_one_of", "between", "is_empty", "is_not_empty"].includes(filter.operator)) {
      throw new AnalyticsQueryError("A filter uses an unavailable operator.");
    }
  }
  const limit = Math.min(Math.max(Number(raw.limit) || 100, 1), MAX_ROWS);
  return {
    version: 1,
    dataset: raw.dataset,
    measures,
    dimensions,
    filters,
    sort: Array.isArray(raw.sort) ? raw.sort.slice(0, 3) : [],
    limit,
    mode: raw.mode === "detail" ? "detail" : "aggregate",
  };
}

function sortRows(rows: AnalyticsRow[], query: AnalyticsQuery): AnalyticsRow[] {
  const sorts = query.sort ?? [];
  if (sorts.length === 0) return rows;
  const allowed = new Set([...query.dimensions, ...query.measures, ...DETAIL_COLUMNS[query.dataset].map((column) => column.key)]);
  return [...rows].sort((left, right) => {
    for (const sort of sorts) {
      if (!allowed.has(sort.field)) continue;
      const a = left[sort.field];
      const b = right[sort.field];
      const comparison = typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a ?? "").localeCompare(String(b ?? ""));
      if (comparison !== 0) return sort.direction === "desc" ? -comparison : comparison;
    }
    return 0;
  });
}

export function runAnalyticsQuery(rawRows: AnalyticsRow[], query: AnalyticsQuery): AnalyticsResult {
  const filtered = rawRows.filter((row) => query.filters.every((filter) => matchesFilter(row, filter)));
  let columns: AnalyticsResult["columns"];
  let resultRows: AnalyticsRow[];

  if (query.mode === "detail") {
    columns = DETAIL_COLUMNS[query.dataset];
    resultRows = filtered.map((row) => Object.fromEntries(columns.map((column) => [column.key, row[column.key] ?? null])));
  } else {
    columns = [
      ...query.dimensions.map((key) => ({ key, label: DIMENSIONS[key].label, type: DIMENSIONS[key].type })),
      ...query.measures.map((key) => ({ key, label: MEASURES[key].label, type: MEASURES[key].type })),
    ];
    const groups = new Map<string, { values: AnalyticsRow; rows: AnalyticsRow[] }>();
    for (const row of filtered) {
      const values = Object.fromEntries(query.dimensions.map((dimension) => [dimension, row[dimension] ?? "Unknown"]));
      const key = JSON.stringify(values);
      const group = groups.get(key) ?? { values, rows: [] };
      group.rows.push(row);
      groups.set(key, group);
    }
    if (query.dimensions.length === 0 && groups.size === 0) groups.set("all", { values: {}, rows: [] });
    resultRows = [...groups.values()].map((group) => ({
      ...group.values,
      ...Object.fromEntries(query.measures.map((measure) => [measure, aggregateMeasure(group.rows, measure)])),
    }));
  }

  resultRows = sortRows(resultRows, query);
  const totalRows = resultRows.length;
  const limit = query.limit ?? 100;
  return {
    columns,
    rows: resultRows.slice(0, limit),
    totalRows,
    truncated: totalRows > limit,
    generatedAt: new Date().toISOString(),
    timezone: "America/Chicago",
    caveats: query.dataset === "rsvp_activity"
      ? ["Historical activity is based on best-effort events and may contain gaps from older submissions."]
      : undefined,
  };
}
