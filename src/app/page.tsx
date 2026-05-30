"use client";

import { useState } from "react";

// ── Constants ─────────────────────────────────────────────────────────────

const MARKETS = [
  "USA", "UK", "Germany", "France", "Italy", "UAE", "Netherlands",
  "Belgium", "Spain", "Australia", "Canada", "Japan", "Saudi Arabia",
  "Bangladesh", "Vietnam", "South Korea", "Singapore", "Turkey",
];

// ── Types ─────────────────────────────────────────────────────────────────

type ExportRow = {
  id: string;
  product: string;
  hsn: string;
  country: string;
  amount: string;
  tariffPaid: string;
  date: string;
};

type SavingsItem = { label: string; amount: number; basis: string };

type HealthExport = {
  product: string;
  hsn: string;
  country: string;
  date: string;
  amountExported: number;
  tariffPaid: number;
  potentialSaving: number;
  savingsBreakdown: SavingsItem[];
  loophole: string;
  fix: string;
};

type HealthCheckResult = {
  totalSavings: number;
  exports: HealthExport[];
  additionalFindings: string[];
};

type DigestItem = {
  title: string;
  detail: string;
  country: string;
  referenceDate?: string;
  product?: string;
  hsn?: string;
};

type DigestResult = {
  urgent: DigestItem[];
  watch: DigestItem[];
  opportunities: DigestItem[];
};

type ShipmentResult = {
  hsn: string;
  destination: string;
  tariff_rate: string;
  estimated_duty: string;
  documents: string[];
  port_issues: string;
  money_tip: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────

function newRow(): ExportRow {
  return { id: Math.random().toString(36).slice(2), product: "", hsn: "", country: "", amount: "", tariffPaid: "", date: "" };
}

async function callIntel(payload: Record<string, unknown>) {
  const res = await fetch("/api/intel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Request failed: ${res.status}`);
  return json;
}

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
}

function formatRupees(n: unknown): string {
  const rounded = Math.round(Number(n));
  if (isNaN(rounded)) return "₹0";
  const s = rounded.toString();
  if (s.length <= 3) return `₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const groups: string[] = [];
  let r = rest;
  while (r.length > 2) {
    groups.unshift(r.slice(-2));
    r = r.slice(0, -2);
  }
  if (r) groups.unshift(r);
  return `₹${groups.join(",")},${last3}`;
}

// ── Design tokens ─────────────────────────────────────────────────────────

const C = {
  pageBg:      "#08090a",
  cardBg:      "#0b0c0e",
  inputBg:     "#0f1011",
  border:      "#1a1a1c",
  inputBorder: "#1f2023",
  text:        "#f0f0f0",
  textMid:     "#c0c4ce",
  textMuted:   "#9ca3af",
  textDim:     "#7a8290",
  textFaint:   "#6b7280",
  textGhost:   "#4a5568",
  accent:      "#5e6ad2",
  accentHover: "#6b77e0",
  green:       "#22c55e",
  greenBg:     "#081408",
  greenBorder: "#0f2a0f",
  amber:       "#d97706",
  amberBg:     "#120f03",
  amberBorder: "#2a2308",
  red:         "#ef4444",
  redBg:       "#130808",
  redBorder:   "#2a1010",
};

// ── Shared style atoms ────────────────────────────────────────────────────

const sInput: React.CSSProperties = {
  width: "100%",
  background: C.inputBg,
  border: `1px solid ${C.inputBorder}`,
  borderRadius: 6,
  padding: "9px 12px",
  fontSize: 14,
  color: C.text,
  fontFamily: "inherit",
  boxSizing: "border-box",
  outline: "none",
};

const sLabel: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: C.textMuted,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const sRunBtn = (disabled: boolean): React.CSSProperties => ({
  width: "100%",
  background: disabled ? C.inputBorder : C.accent,
  border: "none",
  borderRadius: 7,
  padding: "11px",
  fontSize: 14,
  fontWeight: 500,
  color: disabled ? C.textMuted : "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: "inherit",
  marginTop: 28,
  letterSpacing: "-0.01em",
});

// ── Sub-components ────────────────────────────────────────────────────────

const COL_GRID = "2fr 1.2fr 1.2fr 1.4fr 1.4fr 1.4fr 28px";
const COL_LABELS = ["Product / category", "HSN code", "Country", "Amount (₹)", "Tariff paid (₹)", "Date of export", ""];

function ExportRowsInput({ rows, onChange }: { rows: ExportRow[]; onChange: (r: ExportRow[]) => void }) {
  function update(id: string, field: keyof ExportRow, value: string) {
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }
  function remove(id: string) {
    if (rows.length === 1) return;
    onChange(rows.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
        Export records
      </div>

      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: COL_GRID, gap: 8, marginBottom: 6, padding: "0 2px" }}>
        {COL_LABELS.map((h, i) => (
          <div key={i} style={{ fontSize: 11.5, fontWeight: 500, color: C.textFaint, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</div>
        ))}
      </div>

      {rows.map((row) => (
        <div key={row.id} style={{ display: "grid", gridTemplateColumns: COL_GRID, gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input style={sInput} placeholder="Cotton knitwear" value={row.product} onChange={(e) => update(row.id, "product", e.target.value)} />
          <input style={sInput} placeholder="6109.10" value={row.hsn} onChange={(e) => update(row.id, "hsn", e.target.value)} />
          <select
            value={row.country}
            onChange={(e) => update(row.id, "country", e.target.value)}
            style={{ ...sInput, appearance: "none" as React.CSSProperties["appearance"], color: row.country ? C.text : C.textDim, cursor: "pointer" }}
          >
            <option value="">Country</option>
            {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input style={sInput} type="number" min="0" placeholder="₹ 25,00,000" value={row.amount} onChange={(e) => update(row.id, "amount", e.target.value)} />
          <input style={sInput} type="number" min="0" placeholder="₹ 1,25,000" value={row.tariffPaid} onChange={(e) => update(row.id, "tariffPaid", e.target.value)} />
          <input style={sInput} type="date" value={row.date} onChange={(e) => update(row.id, "date", e.target.value)} />
          <button
            onClick={() => remove(row.id)}
            disabled={rows.length === 1}
            style={{ background: "none", border: `1px solid ${C.inputBorder}`, borderRadius: 4, width: 24, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: rows.length === 1 ? "not-allowed" : "pointer", color: rows.length === 1 ? C.textGhost : C.textDim, fontSize: 14, padding: 0, fontFamily: "inherit", flexShrink: 0, opacity: rows.length === 1 ? 0.4 : 1 }}
          >×</button>
        </div>
      ))}

      <button
        onClick={() => onChange([...rows, newRow()])}
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.accent, cursor: "pointer", padding: "6px 0", marginTop: 4, background: "none", border: "none", fontFamily: "inherit" }}
      >
        + Add shipment
      </button>
      <p style={{ fontSize: 13, color: C.textFaint, marginTop: 8, lineHeight: 1.5 }}>
        Rupee amounts only — e.g. 2500000 for ₹25 lakh.
      </p>
    </div>
  );
}

function Spinner() {
  return <span style={{ display: "inline-block", width: 13, height: 13, border: `1.5px solid #ffffff33`, borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 7, verticalAlign: "middle" }} />;
}

function InfoStrip({ text }: { text: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 10, background: C.cardBg }}>
      <span style={{ color: C.accent, fontSize: 14, marginTop: 2, flexShrink: 0 }}>↗</span>
      <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.65 }}>{text}</div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 7, border: `1px solid ${C.redBorder}`, background: C.redBg, marginTop: 20, fontSize: 12.5, color: "#9b3a3a", lineHeight: 1.55 }}>
      <span style={{ flexShrink: 0, color: C.red, fontSize: 13 }}>⚠</span>
      <div>{message}</div>
    </div>
  );
}

// ── Feature 1: Health Check ───────────────────────────────────────────────

function HealthCheck({ company, setCompany, exportRows, setExportRows }: {
  company: string; setCompany: (v: string) => void;
  exportRows: ExportRow[]; setExportRows: (r: ExportRow[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [error, setError] = useState("");

  const completeRows = exportRows.filter((r) => r.product && r.country && r.amount && r.tariffPaid && r.date);
  const canSubmit = company.trim() && completeRows.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await callIntel({
        action: "health_check",
        company,
        exportRows: completeRows.map(({ product, hsn, country, amount, tariffPaid, date }) => ({ product, hsn, country, amount, tariffPaid, date })),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const savingBorderColor = (n: number) => n > 500000 ? C.green : n > 0 ? C.amber : C.inputBorder;

  return (
    <div>
      <InfoStrip text={<><strong style={{ color: C.textMid }}>How it works:</strong> Each row is one shipment. We apply the rules in force on that exact date — FTA preferences, anti-dumping duties, scheme eligibility — and surface the gap between what you paid and what was available.</>} />

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label style={sLabel}>Company name</label>
          <input style={sInput} placeholder="e.g. Sri Murugan Exports Pvt Ltd" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>

        <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "24px 0" }} />

        <ExportRowsInput rows={exportRows} onChange={setExportRows} />

        <button type="submit" disabled={!canSubmit || loading} style={sRunBtn(!canSubmit || loading)}>
          {loading && <Spinner />}{loading ? "Analysing…" : "Run health check →"}
        </button>
      </form>

      {error && <ErrorBanner message={error} />}

      {result && (
        <div style={{ marginTop: 32 }}>
          <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, marginBottom: 28 }} />

          {/* Total savings */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.greenBorder}`, borderRadius: 8, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Total recoverable savings</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: C.green, letterSpacing: "-0.03em", marginBottom: 2 }}>{formatRupees(result.totalSavings)}</div>
              <div style={{ fontSize: 11.5, color: C.textFaint }}>{result.exports.length} export{result.exports.length !== 1 ? "s" : ""} analysed</div>
            </div>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Savings opportunities</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: C.text, letterSpacing: "-0.03em", marginBottom: 2 }}>
                {result.exports.filter(e => e.potentialSaving > 0).length}
              </div>
              <div style={{ fontSize: 11.5, color: C.textFaint }}>shipments with recoverable duty</div>
            </div>
          </div>

          {/* Per-export rows */}
          {result.exports.map((exp, i) => (
            <div key={i} style={{ border: `1px solid ${C.inputBorder}`, borderLeftWidth: 3, borderLeftColor: savingBorderColor(exp.potentialSaving), borderRadius: 8, padding: "16px 18px", marginBottom: 10, background: C.cardBg }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text, letterSpacing: "-0.01em" }}>
                  {exp.product}{exp.hsn ? ` (${exp.hsn})` : ""} → {exp.country}
                </div>
                <span style={{ fontSize: 11.5, color: C.textFaint, whiteSpace: "nowrap", marginLeft: 16 }}>{formatDate(exp.date)}</span>
              </div>

              <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11.5, color: C.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>Exported</div>
                  <div style={{ fontSize: 14, color: C.textMid, fontWeight: 500 }}>{formatRupees(exp.amountExported)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: C.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>Tariff paid</div>
                  <div style={{ fontSize: 14, color: C.textMid, fontWeight: 500 }}>{formatRupees(exp.tariffPaid)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: C.green, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>Potential saving</div>
                  <div style={{ fontSize: 16, color: C.green, fontWeight: 600 }}>{formatRupees(exp.potentialSaving)}</div>
                </div>
              </div>

              {/* Savings breakdown */}
              {exp.savingsBreakdown?.length > 0 && (
                <div style={{ background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 12 }}>
                  {exp.savingsBreakdown.map((item, j) => (
                    <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "6px 0", borderBottom: j < exp.savingsBreakdown.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <div>
                        <div style={{ fontSize: 13.5, color: C.textMid, fontWeight: 500 }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{item.basis}</div>
                      </div>
                      <div style={{ fontSize: 13.5, color: C.green, fontWeight: 600, marginLeft: 16, whiteSpace: "nowrap" }}>{formatRupees(item.amount)}</div>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 7, marginTop: 4, borderTop: `1px solid ${C.inputBorder}` }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total</div>
                    <div style={{ fontSize: 14, color: C.green, fontWeight: 600 }}>{formatRupees(exp.potentialSaving)}</div>
                  </div>
                </div>
              )}

              <p style={{ fontSize: 13.5, color: C.textMuted, fontStyle: "italic", marginBottom: 10, lineHeight: 1.6 }}>{exp.loophole}</p>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 14px", background: "#080d17", border: `1px solid #0e1a2e`, borderRadius: 6, fontSize: 14, color: "#7a9fd4", lineHeight: 1.65 }}>
                <span style={{ flexShrink: 0 }}>↗</span>
                <span>{exp.fix}</span>
              </div>
            </div>
          ))}

          {result.additionalFindings?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Additional findings</div>
              {result.additionalFindings.map((f, i) => (
                <div key={i} style={{ fontSize: 14, color: C.textMid, padding: "12px 16px", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 8, lineHeight: 1.65 }}>{f}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Feature 2: Weekly Digest ──────────────────────────────────────────────

function WeeklyDigest() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DigestResult | null>(null);
  const [error, setError] = useState("");

  const canSubmit = !loading && query.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await callIntel({ action: "weekly_digest", query: query.trim() });
      setResult({
        urgent: Array.isArray(data.urgent) ? data.urgent : [],
        watch: Array.isArray(data.watch) ? data.watch : [],
        opportunities: Array.isArray(data.opportunities) ? data.opportunities : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  type AlertVariant = "warn" | "info" | "green";
  function AlertItem({ item, variant }: { item: DigestItem; variant: AlertVariant }) {
    const cfg = {
      warn:  { bg: C.amberBg,  border: C.amberBorder, iconColor: C.amber,  textColor: "#c4973a", strongColor: "#d4a84a", icon: "⚠" },
      info:  { bg: "#080d17",  border: "#0e1a2e",      iconColor: C.accent, textColor: "#6a9ad4", strongColor: "#8ab8e8", icon: "↗" },
      green: { bg: C.greenBg,  border: C.greenBorder,  iconColor: C.green,  textColor: "#4aaa4a", strongColor: "#5aca5a", icon: "↑" },
    }[variant];

    const tag = [item.product, item.hsn ? `HSN ${item.hsn}` : null, item.country].filter(Boolean).join(" · ");

    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 18px", borderRadius: 8, border: `1px solid ${cfg.border}`, background: cfg.bg, marginBottom: 10, lineHeight: 1.7 }}>
        <span style={{ flexShrink: 0, color: cfg.iconColor, fontSize: 16, marginTop: 2 }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: cfg.strongColor, marginBottom: 4 }}>{item.title}</div>
          <div style={{ fontSize: 14, color: cfg.textColor, lineHeight: 1.7 }}>{item.detail}</div>
          {tag && <div style={{ fontSize: 12, color: C.textFaint, marginTop: 8, letterSpacing: "0.02em" }}>{tag}</div>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <InfoStrip text={<><strong style={{ color: C.textMid }}>How it works:</strong> Type what you export and where — e.g. <em style={{ color: C.textMid }}>&ldquo;cotton T-shirts for USA, wool for UK&rdquo;</em> — and get current regulatory intelligence specific to those products and markets as of today.</>} />

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 8 }}>
          <label style={sLabel}>What are you exporting and where?</label>
          <textarea
            style={{ ...sInput, minHeight: 80, resize: "vertical", lineHeight: 1.6, paddingTop: 10 }}
            placeholder="e.g. cotton T-shirts for USA, wool fabric for UK, leather goods for Germany"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p style={{ fontSize: 13, color: C.textFaint, marginBottom: 4, lineHeight: 1.5 }}>
          Use plain English — product names, markets, or both. Comma-separated works too.
        </p>
        <button type="submit" disabled={!canSubmit} style={sRunBtn(!canSubmit)}>
          {loading && <Spinner />}{loading ? "Fetching intelligence…" : "Get weekly digest →"}
        </button>
      </form>

      {error && <ErrorBanner message={error} />}

      {result && (
        <div style={{ marginTop: 32 }}>
          <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, marginBottom: 28 }} />

          {result.urgent.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.amber, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Urgent — act now</div>
              {result.urgent.map((item, i) => <AlertItem key={i} item={item} variant="warn" />)}
            </div>
          )}
          {result.watch.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Watch — monitor closely</div>
              {result.watch.map((item, i) => <AlertItem key={i} item={item} variant="info" />)}
            </div>
          )}
          {result.opportunities.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.green, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Opportunities</div>
              {result.opportunities.map((item, i) => <AlertItem key={i} item={item} variant="green" />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Feature 3: Shipment Check ─────────────────────────────────────────────

function ShipmentCheck() {
  const [hsn, setHsn] = useState("");
  const [destination, setDestination] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShipmentResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hsn || !destination || !value) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await callIntel({ action: "shipment_check", hsn, destination, value } as Record<string, unknown>);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <InfoStrip text={<><strong style={{ color: C.textMid }}>Pre-shipment check:</strong> Enter the shipment you&#39;re planning and we&#39;ll flag every compliance requirement, documentation gap, and duty optimisation before it leaves the port.</>} />

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={sLabel}>HSN code</label>
            <input style={sInput} placeholder="e.g. 6109" value={hsn} onChange={(e) => setHsn(e.target.value)} />
          </div>
          <div>
            <label style={sLabel}>Destination</label>
            <input style={sInput} placeholder="e.g. United States" value={destination} onChange={(e) => setDestination(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 4 }}>
          <label style={sLabel}>Shipment value (₹ or $)</label>
          <input style={sInput} placeholder="e.g. $50,000 or ₹40 lakh" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <button type="submit" disabled={!hsn || !destination || !value || loading} style={sRunBtn(!hsn || !destination || !value || loading)}>
          {loading && <Spinner />}{loading ? "Analysing…" : "Check shipment compliance →"}
        </button>
      </form>

      {error && <ErrorBanner message={error} />}

      {result && (
        <div style={{ marginTop: 28 }}>
          <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, marginBottom: 24 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Tariff rate</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: C.red, letterSpacing: "-0.03em" }}>{result.tariff_rate}</div>
            </div>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Estimated duty</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: C.amber, letterSpacing: "-0.03em" }}>{result.estimated_duty}</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Required documents</div>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              {result.documents?.map((doc, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: i < result.documents.length - 1 ? `1px solid ${C.border}` : "none", fontSize: 14, color: C.textMid }}>
                  <span style={{ color: C.green, fontSize: 12, fontWeight: 700 }}>✓</span>{doc}
                </div>
              ))}
            </div>
          </div>

          {result.port_issues && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Port &amp; customs notes</div>
              <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.65 }}>{result.port_issues}</div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 16px", borderRadius: 7, border: "1px solid #0e1a2e", background: "#080d17", fontSize: 14, color: "#7a9fd4", lineHeight: 1.65 }}>
            <span style={{ flexShrink: 0, color: C.accent, fontSize: 15 }}>↗</span>
            <div><strong style={{ color: "#9ab8e0", fontWeight: 500 }}>Money-saving tip — </strong>{result.money_tip}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function Home() {
  const [tab, setTab] = useState<"health" | "digest" | "shipment">("health");
  const [company, setCompany] = useState("");
  const [exportRows, setExportRows] = useState<ExportRow[]>([newRow()]);

  const tabs = [
    { id: "health",   label: "Export Health Check" },
    { id: "digest",   label: "Weekly Digest" },
    { id: "shipment", label: "Shipment Check" },
  ] as const;

  return (
    <div style={{ minHeight: "100vh", background: C.pageBg, fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, sans-serif", fontSize: 14, lineHeight: 1.6, color: C.text }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus { border-color: #5e6ad2 !important; outline: none; }
        input::placeholder { color: #3d4456; }
        button:hover:not(:disabled) { opacity: 0.85; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", height: 52, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.pageBg, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#fff", letterSpacing: "-0.01em" }}>
          <div style={{ width: 18, height: 18, background: "linear-gradient(135deg, #5e6ad2 0%, #8b5cf6 100%)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>T</div>
          TradeIntel
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ fontSize: 12.5, color: tab === t.id ? C.text : C.textDim, padding: "6px 12px", borderRadius: 6, cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", transition: "color 0.1s" }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={{ fontSize: 12.5, color: C.textMuted, background: "none", border: "none", padding: "5px 10px", borderRadius: 5, cursor: "pointer", fontFamily: "inherit" }}>Log in</button>
          <button style={{ fontSize: 12.5, fontWeight: 500, color: "#fff", background: C.accent, border: "none", padding: "5px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "80px 40px 56px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: C.textMuted, border: `1px solid ${C.inputBorder}`, padding: "5px 12px", borderRadius: 20, marginBottom: 32, letterSpacing: "0.02em", textTransform: "uppercase" }}>
          <div style={{ width: 6, height: 6, background: C.accent, borderRadius: "50%" }} />
          Live intelligence — no login required
        </div>
        <h1 style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.08, color: "#fff", margin: "0 0 20px" }}>
          Know what&#39;s changing<br />before it costs you
        </h1>
        <p style={{ fontSize: 17, color: C.textMid, lineHeight: 1.7, margin: "0 auto 48px", maxWidth: 600 }}>
          Enter your export history and get specific, date-accurate intelligence on tariffs, FTA benefits, and compliance gaps — for every shipment.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
          {[["US tariffs", "63.9%"], ["India–UK FTA live", "Jul 2025"], ["EU CBAM from", "Q1 2026"]].map(([label, val], i, arr) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.textDim }}>
                {label} <span style={{ color: C.text, fontWeight: 500 }}>{val}</span>
              </span>
              {i < arr.length - 1 && <span style={{ width: 1, height: 14, background: C.inputBorder, display: "inline-block" }} />}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${C.border}`, maxWidth: 1100, margin: "0 auto", padding: "0 40px", display: "flex" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ fontSize: 14, fontWeight: tab === t.id ? 500 : 400, color: tab === t.id ? "#fff" : C.textDim, padding: "12px 20px", cursor: "pointer", marginBottom: -1, background: "none", border: "none", borderBottom: tab === t.id ? `2px solid ${C.accent}` : "2px solid transparent", fontFamily: "inherit", whiteSpace: "nowrap", transition: "color 0.1s" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 40px 80px" }}>
        {tab === "health"   && <HealthCheck company={company} setCompany={setCompany} exportRows={exportRows} setExportRows={setExportRows} />}
        {tab === "digest"   && <WeeklyDigest />}
        {tab === "shipment" && <ShipmentCheck />}
      </main>
    </div>
  );
}
