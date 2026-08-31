"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SignOutButton } from "@/components/AuthButtons";
import type { AnalyticsFilter, AnalyticsQuery, AnalyticsResult, AnalyticsRow, SavedAnalyticsConfig } from "@/lib/analytics/types";
import styles from "./AnalyticsPortal.module.css";

type Visualization = SavedAnalyticsConfig["visualization"];
type CatalogItem = { key: string; label: string; datasets: string[]; type: string; values?: string[] };
type Catalog = {
  datasets: Array<{ key: AnalyticsQuery["dataset"]; label: string; description: string }>;
  dimensions: CatalogItem[];
  measures: CatalogItem[];
  operators: string[];
};
type SavedReport = {
  id: number;
  name: string;
  description: string | null;
  queryConfig: SavedAnalyticsConfig;
  updatedBy: string;
  updatedAt: string;
};

const COLORS = ["#c1121f", "#1d4ed8", "#a16207", "#047857", "#7e22ce", "#be185d"];

const DEFAULT_QUERY: AnalyticsQuery = {
  version: 1,
  dataset: "current_rsvps",
  measures: ["invited_individuals", "attending_individuals", "declining_individuals", "awaiting_individuals", "response_rate"],
  dimensions: [],
  filters: [],
  limit: 100,
  mode: "aggregate",
};

const CANNED: Array<{ key: string; name: string; description: string; visualization: Visualization; query: AnalyticsQuery }> = [
  { key: "summary", name: "RSVP executive summary", description: "The current invitation and response picture.", visualization: "table", query: DEFAULT_QUERY },
  { key: "activity", name: "RSVP activity over time", description: "See when guest responses and changes happened.", visualization: "line", query: { version: 1, dataset: "rsvp_activity", measures: ["activity_count"], dimensions: ["activity_date", "activity_source"], filters: [{ field: "activity_source", operator: "equals", value: "Guest" }], sort: [{ field: "activity_date", direction: "asc" }], limit: 200, mode: "aggregate" } },
  { key: "funnel", name: "Invitation funnel", description: "Invited groups through claim, response, and attendance.", visualization: "funnel", query: { version: 1, dataset: "current_rsvps", measures: ["invited_groups", "claimed_groups", "responded_groups", "attending_groups"], dimensions: [], filters: [], limit: 20, mode: "aggregate" } },
  { key: "size", name: "Group-size analysis", description: "Party-size distribution and capacity use.", visualization: "bar", query: { version: 1, dataset: "current_rsvps", measures: ["invited_groups", "average_invited_size", "average_attending_party_size", "capacity_utilization"], dimensions: ["invited_size_bucket"], filters: [], limit: 20, mode: "aggregate" } },
  { key: "attendance_by_group", name: "Attendance by group label", description: "Unique attending groups and total attending individuals for each group label.", visualization: "table", query: { version: 1, dataset: "current_rsvps", measures: ["attending_groups", "attending_individuals"], dimensions: ["group_label"], filters: [{ field: "current_rsvp_status", operator: "equals", value: "Attending" }], sort: [{ field: "group_label", direction: "asc" }], limit: 20, mode: "aggregate" } },
  { key: "outstanding", name: "Outstanding invitations", description: "Groups that have not submitted an RSVP.", visualization: "bar", query: { version: 1, dataset: "current_rsvps", measures: ["outstanding_groups", "awaiting_individuals"], dimensions: ["claim_status"], filters: [{ field: "current_rsvp_status", operator: "equals", value: "Awaiting response" }], limit: 20, mode: "aggregate" } },
  { key: "latency", name: "Response latency", description: "Time from first claim to first guest response.", visualization: "bar", query: { version: 1, dataset: "rsvp_activity", measures: ["median_response_hours", "active_groups"], dimensions: ["group_label"], filters: [{ field: "activity_source", operator: "equals", value: "Guest" }, { field: "activity_type", operator: "equals", value: "First response" }], limit: 20, mode: "aggregate" } },
];

function formatValue(value: unknown, type: string): string {
  if (value == null || value === "") return "—";
  if (type === "percent" && typeof value === "number") return `${(value * 100).toFixed(value === 0 || value === 1 ? 0 : 1)}%`;
  if (type === "hours" && typeof value === "number") return value < 48 ? `${value.toFixed(1)} hr` : `${(value / 24).toFixed(1)} days`;
  if (type === "number" && typeof value === "number") return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
  if (type === "datetime") return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" }).format(new Date(String(value)));
  return String(value);
}

function cloneQuery(query: AnalyticsQuery): AnalyticsQuery {
  return JSON.parse(JSON.stringify(query)) as AnalyticsQuery;
}

function readUrlConfig(): SavedAnalyticsConfig | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("report");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as SavedAnalyticsConfig;
    return parsed.version === 1 ? parsed : null;
  } catch { return null; }
}

export default function AnalyticsPortal() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [query, setQuery] = useState<AnalyticsQuery>(DEFAULT_QUERY);
  const [visualization, setVisualization] = useState<Visualization>("table");
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [summary, setSummary] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedCanned, setSelectedCanned] = useState("summary");
  const [detail, setDetail] = useState<AnalyticsResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [activeSavedId, setActiveSavedId] = useState<number | null>(null);

  const run = useCallback(async (nextQuery: AnalyticsQuery, target: "result" | "summary" = "result") => {
    if (target === "result") { setLoading(true); setError(null); }
    const response = await fetch("/api/admin/analytics/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextQuery),
    });
    const data = await response.json();
    if (!response.ok) {
      if (target === "result") setError(data.error || "Could not run this report.");
    } else if (target === "summary") setSummary(data);
    else setResult(data);
    if (target === "result") setLoading(false);
  }, []);

  const loadSaved = useCallback(async () => {
    const response = await fetch("/api/admin/analytics/reports");
    if (response.ok) setSavedReports((await response.json()).reports);
  }, []);

  useEffect(() => {
    const urlConfig = readUrlConfig();
    if (urlConfig) {
      setQuery(urlConfig.query);
      setVisualization(urlConfig.visualization);
      setBuilderOpen(true);
      setSelectedCanned("");
    }
    const startingQuery = urlConfig?.query ?? DEFAULT_QUERY;
    Promise.all([
      fetch("/api/admin/analytics/catalog").then((response) => response.ok ? response.json() : null),
      run(startingQuery),
      run(DEFAULT_QUERY, "summary"),
      loadSaved(),
    ]).then(([loadedCatalog]) => setCatalog(loadedCatalog));
  }, [loadSaved, run]);

  const updateQuery = useCallback((next: AnalyticsQuery) => {
    setQuery(next);
    setSelectedCanned("");
  }, []);

  useEffect(() => {
    if (!builderOpen || selectedCanned) return;
    const timer = window.setTimeout(() => run(query), 250);
    const config: SavedAnalyticsConfig = { version: 1, query, visualization };
    const url = new URL(window.location.href);
    url.searchParams.set("report", encodeURIComponent(JSON.stringify(config)));
    window.history.replaceState(null, "", url);
    return () => window.clearTimeout(timer);
  }, [builderOpen, query, run, selectedCanned, visualization]);

  const chooseCanned = (key: string) => {
    const report = CANNED.find((item) => item.key === key);
    if (!report) return;
    const next = cloneQuery(report.query);
    setSelectedCanned(key);
    setActiveSavedId(null);
    setQuery(next);
    setVisualization(report.visualization);
    setBuilderOpen(false);
    setDetail(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("report");
    window.history.replaceState(null, "", url);
    run(next);
  };

  const openSaved = (report: SavedReport) => {
    setQuery(cloneQuery(report.queryConfig.query));
    setVisualization(report.queryConfig.visualization);
    setSelectedCanned("");
    setBuilderOpen(true);
    setDetail(null);
    setActiveSavedId(report.id);
    setSaveName(report.name);
    setSaveDescription(report.description ?? "");
  };

  const openDrilldown = async (extraFilter?: AnalyticsFilter) => {
    setDetailLoading(true);
    const detailQuery: AnalyticsQuery = {
      ...query,
      measures: [],
      dimensions: [],
      filters: extraFilter ? [...query.filters.filter((filter) => filter.field !== extraFilter.field), extraFilter] : query.filters,
      mode: "detail",
      limit: 200,
    };
    const response = await fetch("/api/admin/analytics/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(detailQuery) });
    const data = await response.json();
    setDetail(response.ok ? data : null);
    setDetailLoading(false);
  };

  const saveReport = async () => {
    setSaveStatus(null);
    const response = await fetch(activeSavedId ? `/api/admin/analytics/reports/${activeSavedId}` : "/api/admin/analytics/reports", {
      method: activeSavedId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: saveName, description: saveDescription, queryConfig: { version: 1, query, visualization } }),
    });
    const data = await response.json();
    if (!response.ok) return setSaveStatus(data.error || "Could not save report.");
    setSaveName(""); setSaveDescription(""); setSaveOpen(false); setSaveStatus(activeSavedId ? "Shared report updated." : "Saved for all admins.");
    setActiveSavedId(data.report.id);
    await loadSaved();
  };

  const deleteSaved = async (id: number) => {
    if (!window.confirm("Delete this shared report for every admin?")) return;
    const response = await fetch(`/api/admin/analytics/reports/${id}`, { method: "DELETE" });
    if (response.ok) {
      if (activeSavedId === id) setActiveSavedId(null);
      await loadSaved();
    }
  };

  const exportCsv = async () => {
    const response = await fetch("/api/admin/analytics/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query) });
    if (!response.ok) return;
    const href = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a"); anchor.href = href; anchor.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click();
    URL.revokeObjectURL(href);
  };

  const canned = CANNED.find((item) => item.key === selectedCanned);
  const availableMeasures = catalog?.measures.filter((item) => item.datasets.includes(query.dataset)) ?? [];
  const availableDimensions = catalog?.dimensions.filter((item) => item.datasets.includes(query.dataset)) ?? [];
  const querySummary = useMemo(() => {
    const measures = query.measures.map((key) => catalog?.measures.find((item) => item.key === key)?.label ?? key).join(", ");
    const dimensions = query.dimensions.map((key) => catalog?.dimensions.find((item) => item.key === key)?.label ?? key).join(" and ");
    return `${measures || "Detail rows"}${dimensions ? ` by ${dimensions}` : ""}${query.filters.length ? ` with ${query.filters.length} filter${query.filters.length === 1 ? "" : "s"}` : ""}.`;
  }, [catalog, query]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <h1 className={styles.title}>Analytics <span className={styles.star}>★</span></h1>
          <div className={styles.headerLinks}><Link href="/admin">Guest Admin</Link><Link href="/engagement">View site</Link><SignOutButton /></div>
        </header>

        <SummaryKpis result={summary} />

        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <div><h2 className={styles.sectionTitle}>Reports</h2><p className={styles.sectionCopy}>Start with a useful view, then adjust it only if needed.</p></div>
            <select className={styles.select} value={selectedCanned} onChange={(event) => chooseCanned(event.target.value)} aria-label="Choose a report">
              {CANNED.map((report) => <option value={report.key} key={report.key}>{report.name}</option>)}
              {!selectedCanned && <option value="">Custom report</option>}
            </select>
          </div>
          {savedReports.length > 0 && <div className={styles.savedList} aria-label="Shared saved reports">{savedReports.map((report) => <span className={styles.savedChip} key={report.id}><button onClick={() => openSaved(report)}>{report.name}</button><button className={styles.delete} onClick={() => deleteSaved(report.id)} aria-label={`Delete ${report.name}`}>×</button></span>)}</div>}
        </section>

        <section className={styles.panel}>
          <div className={styles.reportTop}>
            <div><h2 className={styles.sectionTitle}>{canned?.name ?? "Custom report"}</h2><p className={styles.sectionCopy}>{canned?.description ?? querySummary}</p></div>
            <div className={styles.toolbar}>
              <button className={styles.button} onClick={() => { setBuilderOpen((open) => !open); setSelectedCanned(""); }}>{builderOpen ? "Hide builder" : "Build a report"}</button>
              <button className={styles.button} onClick={exportCsv} disabled={!result}>Export CSV</button>
              <button className={styles.primary} onClick={() => setSaveOpen((open) => !open)}>{activeSavedId ? "Update report" : "Save report"}</button>
            </div>
          </div>

          {saveOpen && <div className={styles.saveBox}><div className={styles.builderGrid}><div className={styles.field}><label htmlFor="save-name">Report name</label><input id="save-name" className={styles.input} value={saveName} onChange={(event) => setSaveName(event.target.value)} maxLength={100} /></div><div className={styles.field}><label htmlFor="save-description">Description (optional)</label><input id="save-description" className={styles.input} value={saveDescription} onChange={(event) => setSaveDescription(event.target.value)} /></div></div><div className={styles.saveActions}><span className={styles.sectionCopy}>{saveStatus}</span><div>{activeSavedId && <button className={styles.quiet} onClick={() => { setActiveSavedId(null); setSaveName(""); setSaveDescription(""); }}>Save as new</button>} <button className={styles.quiet} onClick={() => setSaveOpen(false)}>Cancel</button> <button className={styles.primary} onClick={saveReport} disabled={!saveName.trim()}>{activeSavedId ? "Update for all admins" : "Save for all admins"}</button></div></div></div>}
          {saveStatus && !saveOpen && <p className={styles.sectionCopy}>{saveStatus}</p>}

          {builderOpen && catalog && <QueryBuilder catalog={catalog} query={query} visualization={visualization} measures={availableMeasures} dimensions={availableDimensions} onQuery={updateQuery} onVisualization={setVisualization} summary={querySummary} onReset={() => { updateQuery(cloneQuery(DEFAULT_QUERY)); setVisualization("kpi"); }} />}

          {loading ? <div className={styles.loading}>Calculating…</div> : error ? <div className={styles.error}>{error}</div> : result && <>
            <Chart result={result} visualization={visualization} onSelect={(field, value) => openDrilldown({ field, operator: "equals", value })} />
            <ResultTable result={result} />
            <div className={styles.meta}><span>Updated {formatValue(result.generatedAt, "datetime")} CT</span><button className={styles.quiet} onClick={() => openDrilldown()} disabled={detailLoading}>{detailLoading ? "Loading…" : "View matching groups"}</button></div>
            {result.caveats?.map((caveat) => <p className={styles.caveat} key={caveat}>{caveat}</p>)}
          </>}
        </section>
      </div>
      {detail && <DetailModal result={detail} onClose={() => setDetail(null)} />}
    </main>
  );
}

function SummaryKpis({ result }: { result: AnalyticsResult | null }) {
  const row = result?.rows[0];
  const items = [
    ["invited_individuals", "Invited individuals", "number"],
    ["attending_individuals", "Attending individuals", "number"],
    ["declining_individuals", "Declining individuals", "number"],
    ["awaiting_individuals", "Awaiting individuals", "number"],
    ["response_rate", "Group response rate", "percent"],
  ];
  return <section className={styles.kpis} aria-label="Current RSVP summary">{items.map(([key, label, type]) => <div className={styles.kpi} key={key}><span className={styles.kpiValue}>{row ? formatValue(row[key], type) : "…"}</span><span className={styles.kpiLabel}>{label}</span></div>)}</section>;
}

function QueryBuilder({ catalog, query, visualization, measures, dimensions, onQuery, onVisualization, summary, onReset }: { catalog: Catalog; query: AnalyticsQuery; visualization: Visualization; measures: CatalogItem[]; dimensions: CatalogItem[]; onQuery: (query: AnalyticsQuery) => void; onVisualization: (value: Visualization) => void; summary: string; onReset: () => void }) {
  const setDataset = (dataset: AnalyticsQuery["dataset"]) => {
    const firstMeasure = catalog.measures.find((item) => item.datasets.includes(dataset));
    onVisualization("table");
    onQuery({ version: 1, dataset, measures: firstMeasure ? [firstMeasure.key] : [], dimensions: [], filters: [], limit: 100, mode: "aggregate" });
  };
  const toggleMeasure = (key: string) => onQuery({ ...query, measures: query.measures.includes(key) ? query.measures.filter((item) => item !== key) : [...query.measures, key].slice(0, 6) });
  const toggleDimension = (key: string) => {
    const next = query.dimensions.includes(key) ? query.dimensions.filter((item) => item !== key) : [...query.dimensions, key].slice(0, 2);
    if (next.length > 0 && (visualization === "kpi" || visualization === "funnel")) onVisualization("bar");
    if (next.length === 0 && !["kpi", "table", "funnel"].includes(visualization)) onVisualization("table");
    onQuery({ ...query, dimensions: next });
  };
  const updateFilter = (index: number, patch: Partial<AnalyticsFilter>) => onQuery({ ...query, filters: query.filters.map((filter, itemIndex) => itemIndex === index ? { ...filter, ...patch } : filter) });
  const visualizations: Visualization[] = query.dimensions.length === 0 ? ["kpi", "table", "funnel"] : ["table", "bar", "stacked_bar", "line", "area", "donut"];
  return <div className={styles.advanced}>
    <div className={styles.builderGrid}>
      <div className={styles.field}><label htmlFor="dataset">1. Dataset</label><select id="dataset" className={styles.select} value={query.dataset} onChange={(event) => setDataset(event.target.value as AnalyticsQuery["dataset"])}>{catalog.datasets.map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}</select></div>
      <div className={styles.field}><label htmlFor="visualization">5. Display</label><select id="visualization" className={styles.select} value={visualizations.includes(visualization) ? visualization : "table"} onChange={(event) => onVisualization(event.target.value as Visualization)}>{visualizations.map((item) => <option value={item} key={item}>{item.replaceAll("_", " ")}</option>)}</select></div>
      <div className={styles.field}><span className={styles.label}>2. Measures (up to 6)</span><div className={styles.checks}>{measures.map((item) => <label className={styles.check} key={item.key}><input type="checkbox" checked={query.measures.includes(item.key)} onChange={() => toggleMeasure(item.key)} />{item.label}</label>)}</div></div>
      <div className={styles.field}><span className={styles.label}>3. Group by (up to 2)</span><div className={styles.checks}>{dimensions.map((item) => <label className={styles.check} key={item.key}><input type="checkbox" checked={query.dimensions.includes(item.key)} onChange={() => toggleDimension(item.key)} />{item.label}</label>)}</div></div>
    </div>
    <div><span className={styles.label}>4. Filters</span>{query.filters.map((filter, index) => {
      const definition = dimensions.find((item) => item.key === filter.field);
      return <div className={styles.filterRow} key={`${filter.field}-${index}`}><select className={styles.select} value={filter.field} onChange={(event) => updateFilter(index, { field: event.target.value, value: "", to: undefined })}>{dimensions.map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}</select><select className={styles.select} value={filter.operator} onChange={(event) => updateFilter(index, { operator: event.target.value as AnalyticsFilter["operator"], value: "", to: undefined })}>{["equals", "not_equals", "one_of", "not_one_of", "between", "is_empty", "is_not_empty"].map((operator) => <option value={operator} key={operator}>{operator.replaceAll("_", " ")}</option>)}</select><FilterValueEditor filter={filter} definition={definition} onChange={(patch) => updateFilter(index, patch)} /><button className={styles.quiet} onClick={() => onQuery({ ...query, filters: query.filters.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></div>;
    })}<button className={styles.button} onClick={() => dimensions[0] && onQuery({ ...query, filters: [...query.filters, { field: dimensions[0].key, operator: "equals", value: "" }] })} disabled={!dimensions.length}>Add filter</button></div>
    <p className={styles.summary}>{summary}</p><div className={styles.builderActions}><span className={styles.sectionCopy}>Changes run automatically and are reflected in the URL.</span><button className={styles.quiet} onClick={onReset}>Reset</button></div>
  </div>;
}

function FilterValueEditor({ filter, definition, onChange }: { filter: AnalyticsFilter; definition?: CatalogItem; onChange: (patch: Partial<AnalyticsFilter>) => void }) {
  if (filter.operator === "is_empty" || filter.operator === "is_not_empty") {
    return <span className={styles.sectionCopy}>No value needed</span>;
  }
  const inputType = definition?.type === "date" ? "date" : definition?.type === "number" ? "number" : "text";
  if (filter.operator === "between") {
    return <div style={{ display: "flex", gap: ".35rem", alignItems: "center" }}><input aria-label="From" className={styles.input} type={inputType} value={String(Array.isArray(filter.value) ? "" : filter.value ?? "")} onChange={(event) => onChange({ value: event.target.value })} /><span className={styles.sectionCopy}>to</span><input aria-label="To" className={styles.input} type={inputType} value={String(filter.to ?? "")} onChange={(event) => onChange({ to: event.target.value })} /></div>;
  }
  if (filter.operator === "one_of" || filter.operator === "not_one_of") {
    return <input className={styles.input} aria-label="Comma-separated values" placeholder="Value one, value two" value={Array.isArray(filter.value) ? filter.value.join(", ") : String(filter.value ?? "")} onChange={(event) => onChange({ value: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} />;
  }
  if (definition?.values) {
    return <select className={styles.select} value={String(Array.isArray(filter.value) ? "" : filter.value ?? "")} onChange={(event) => onChange({ value: event.target.value })}><option value="">Choose…</option>{definition.values.map((value) => <option value={value} key={value}>{value}</option>)}</select>;
  }
  return <input className={styles.input} type={inputType} value={String(Array.isArray(filter.value) ? "" : filter.value ?? "")} onChange={(event) => onChange({ value: event.target.value })} />;
}

function Chart({ result, visualization, onSelect }: { result: AnalyticsResult; visualization: Visualization; onSelect: (field: string, value: string | number) => void }) {
  const dimensionColumns = result.columns.filter((column) => column.type === "string" || column.type === "date");
  const measureColumns = result.columns.filter((column) => column.type === "number" || column.type === "percent" || column.type === "hours");
  if (visualization === "table" || !measureColumns.length) return null;
  if (visualization === "kpi") return <div className={styles.kpis}>{measureColumns.slice(0, 5).map((column) => <div className={styles.kpi} key={column.key}><span className={styles.kpiValue}>{formatValue(result.rows[0]?.[column.key], column.type)}</span><span className={styles.kpiLabel}>{column.label}</span></div>)}</div>;
  if (visualization === "funnel") {
    const row = result.rows[0] ?? {};
    const max = Math.max(...measureColumns.map((column) => Number(row[column.key]) || 0), 1);
    return <div className={`${styles.chart} ${styles.funnel}`}>{measureColumns.map((column) => { const value = Number(row[column.key]) || 0; return <div className={styles.funnelStep} style={{ width: `${Math.max(35, value / max * 100)}%` }} key={column.key}><strong>{formatValue(value, column.type)}</strong> {column.label}</div>; })}</div>;
  }
  const dimension = dimensionColumns[0]; const measure = measureColumns[0];
  if (!dimension) return null;
  if (visualization === "line" || visualization === "area") return <LineChart result={result} dimensions={dimensionColumns} measure={measure} onSelect={onSelect} />;
  if (visualization === "donut") {
    const total = result.rows.reduce((sum, row) => sum + (Number(row[measure.key]) || 0), 0) || 1;
    let cursor = 0;
    const stops = result.rows.map((row, index) => { const start = cursor; cursor += (Number(row[measure.key]) || 0) / total * 100; return `${COLORS[index % COLORS.length]} ${start}% ${cursor}%`; });
    return <div className={styles.chart}><div style={{ width: "12rem", height: "12rem", borderRadius: "50%", margin: "0 auto", background: `conic-gradient(${stops.join(",")})`, boxShadow: "inset 0 0 0 3rem var(--paper)" }} role="img" aria-label={`${measure.label} by ${dimension.label}`} /><div className={styles.legend}>{result.rows.map((row, index) => <button key={String(row[dimension.key])} onClick={() => onSelect(dimension.key, row[dimension.key] as string)}><span className={styles.swatch} style={{ background: COLORS[index % COLORS.length] }} />{String(row[dimension.key])}: {formatValue(row[measure.key], measure.type)}</button>)}</div></div>;
  }
  const max = Math.max(...result.rows.map((row) => Number(row[measure.key]) || 0), 1);
  return <div className={`${styles.chart} ${styles.bars}`}>{result.rows.map((row) => <button className={styles.barRow} key={dimensionColumns.map((column) => row[column.key]).join("-")} onClick={() => onSelect(dimension.key, row[dimension.key] as string)}><span className={styles.barLabel}>{dimensionColumns.map((column) => String(row[column.key])).join(" · ")}</span><span className={styles.barTrack}><span className={styles.barFill} style={{ width: `${(Number(row[measure.key]) || 0) / max * 100}%` }} /></span><span className={styles.barValue}>{formatValue(row[measure.key], measure.type)}</span></button>)}</div>;
}

function LineChart({ result, dimensions, measure, onSelect }: { result: AnalyticsResult; dimensions: AnalyticsResult["columns"]; measure: AnalyticsResult["columns"][number]; onSelect: (field: string, value: string | number) => void }) {
  const xKey = dimensions[0].key; const seriesKey = dimensions[1]?.key;
  const xValues = [...new Set(result.rows.map((row) => String(row[xKey])))].sort();
  const series = seriesKey ? [...new Set(result.rows.map((row) => String(row[seriesKey])))] : [measure.label];
  const max = Math.max(...result.rows.map((row) => Number(row[measure.key]) || 0), 1);
  const width = 800, height = 250, left = 38, top = 18, plotW = 730, plotH = 185;
  const pointsFor = (name: string) => xValues.map((x, index) => {
    const row = result.rows.find((item) => String(item[xKey]) === x && (!seriesKey || String(item[seriesKey]) === name));
    const value = Number(row?.[measure.key]) || 0;
    return { x, value, px: left + (xValues.length <= 1 ? plotW / 2 : index / (xValues.length - 1) * plotW), py: top + plotH - value / max * plotH };
  });
  return <div className={styles.chart}><svg className={styles.lineSvg} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${measure.label} over ${dimensions[0].label}`}><line x1={left} y1={top + plotH} x2={left + plotW} y2={top + plotH} stroke="#c9c1b8" />{series.map((name, seriesIndex) => { const points = pointsFor(name); return <g key={name}><polyline fill={"none"} stroke={COLORS[seriesIndex % COLORS.length]} strokeWidth="3" points={points.map((point) => `${point.px},${point.py}`).join(" ")} />{points.map((point) => <circle key={point.x} cx={point.px} cy={point.py} r="5" fill={COLORS[seriesIndex % COLORS.length]} tabIndex={0} role="button" aria-label={`${point.x}: ${point.value}`} onClick={() => onSelect(xKey, point.x)}><title>{point.x}: {point.value}</title></circle>)}</g>; })}<text x={left} y={height - 12} fontSize="12" fill="#746b64">{xValues[0]}</text><text x={left + plotW} y={height - 12} fontSize="12" textAnchor="end" fill="#746b64">{xValues.at(-1)}</text><text x={left - 8} y={top + 4} fontSize="12" textAnchor="end" fill="#746b64">{max}</text></svg>{seriesKey && <div className={styles.legend}>{series.map((name, index) => <span key={name} className={styles.sectionCopy}><span className={styles.swatch} style={{ background: COLORS[index % COLORS.length] }} />{name}</span>)}</div>}</div>;
}

function ResultTable({ result }: { result: AnalyticsResult }) {
  if (!result.rows.length) return <div className={styles.empty}>No data matches this report.</div>;
  return <div className={styles.tableWrap}><table className={styles.table}><thead><tr>{result.columns.map((column) => <th className={["number", "percent", "hours"].includes(column.type) ? styles.numeric : ""} key={column.key}>{column.label}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}>{result.columns.map((column) => <td className={["number", "percent", "hours"].includes(column.type) ? styles.numeric : ""} key={column.key}>{formatValue(row[column.key], column.type)}</td>)}</tr>)}</tbody></table></div>;
}

function DetailModal({ result, onClose }: { result: AnalyticsResult; onClose: () => void }) {
  useEffect(() => { const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose(); document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [onClose]);
  return <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Matching groups"><section className={styles.modalCard}><div className={styles.sectionHeader}><div><h2 className={styles.sectionTitle}>Matching groups</h2><p className={styles.sectionCopy}>{result.totalRows} matching row{result.totalRows === 1 ? "" : "s"}; names are shown only for this drill-down.</p></div><button className={styles.button} onClick={onClose}>Close</button></div><div style={{ marginTop: "1rem" }}><ResultTable result={result} /></div></section></div>;
}
