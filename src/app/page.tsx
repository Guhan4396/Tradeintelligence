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

// Indian-style comma grouping: xx,xx,xxx (last group 3 digits, rest groups of 2)
function formatRupees(n: number): string {
  const rounded = Math.round(n);
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
  pageBg:     "#0f1117",
  headerBg:   "#161a24",
  white:      "#161a24",
  cardBorder: "#1e2535",
  ink:        "#e8eaf0",
  inkMid:     "#c9ccd6",
  gray:       "#9ca3af",
  muted:      "#6b7280",
  inputBg:    "#0f1117",
  inputBorder:"#2a3142",
  blue:       "#3b82f6",
  blueLight:  "#0c1c32",
  blueBorder: "#2563eb44",
  green:      "#22c55e",
  greenLight: "#052e16",
  greenBorder:"#16a34a44",
  red:        "#ef4444",
  redLight:   "#1c1010",
  amber:      "#eab308",
  amberLight: "#1c1b10",
  tabBar:     "#161a24",
};

// ── Shared sub-components ─────────────────────────────────────────────────

const COL_HEADERS = ["Product / Category", "HSN Code", "Country", "Amount (₹)", "Tariff Paid (₹)", "Date of Export", ""];
const COL_GRID = "2.2fr 1fr 1.4fr 1.2fr 1.2fr 1.3fr 36px";

function ExportRowsInput({ rows, onChange }: { rows: ExportRow[]; onChange: (r: ExportRow[]) => void }) {
  function updateRow(id: string, field: keyof ExportRow, value: string) {
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }
  function removeRow(id: string) {
    if (rows.length === 1) return;
    onChange(rows.filter((r) => r.id !== id));
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={sLabel}>Export Records</label>
      <p style={{ fontSize: 13, color: C.gray, marginBottom: 12, marginTop: 4 }}>
        Each row is one shipment. Enter rupee amounts (e.g. 2500000 for ₹25 lakh).
      </p>

      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: COL_GRID, gap: 8, marginBottom: 6 }}>
        {COL_HEADERS.map((h, i) => (
          <div key={i} style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</div>
        ))}
      </div>

      {rows.map((row) => (
        <div key={row.id} style={{ display: "grid", gridTemplateColumns: COL_GRID, gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input
            style={sInput}
            placeholder="e.g. Cotton knitwear"
            value={row.product}
            onChange={(e) => updateRow(row.id, "product", e.target.value)}
          />
          <input
            style={sInput}
            placeholder="e.g. 6109.10"
            value={row.hsn}
            onChange={(e) => updateRow(row.id, "hsn", e.target.value)}
          />
          <select
            value={row.country}
            onChange={(e) => updateRow(row.id, "country", e.target.value)}
            style={{ ...sInput, appearance: "auto" as React.CSSProperties["appearance"] }}
          >
            <option value="">Select country</option>
            {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            type="number"
            min="0"
            placeholder="e.g. 2500000"
            value={row.amount}
            onChange={(e) => updateRow(row.id, "amount", e.target.value)}
            style={sInput}
          />
          <input
            type="number"
            min="0"
            placeholder="e.g. 125000"
            value={row.tariffPaid}
            onChange={(e) => updateRow(row.id, "tariffPaid", e.target.value)}
            style={sInput}
          />
          <input
            type="date"
            value={row.date}
            onChange={(e) => updateRow(row.id, "date", e.target.value)}
            style={sInput}
          />
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            disabled={rows.length === 1}
            title="Remove row"
            style={{
              border: "none", background: "none",
              cursor: rows.length === 1 ? "not-allowed" : "pointer",
              color: rows.length === 1 ? C.muted : C.red,
              fontSize: 18, fontWeight: 700, lineHeight: 1,
              opacity: rows.length === 1 ? 0.3 : 1, padding: "4px 6px",
            }}
          >
            ×
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...rows, newRow()])}
        style={{ background: "none", border: "none", color: C.blue, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "6px 0", marginTop: 4 }}
      >
        + Add another export
      </button>
    </div>
  );
}

function Spinner() {
  return <span style={{ display: "inline-block", width: 16, height: 16, border: `2px solid #ffffff44`, borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 8, verticalAlign: "middle" }} />;
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ marginTop: 20, backgroundColor: C.redLight, border: `1px solid #fca5a5`, borderRadius: 10, padding: "14px 18px", color: C.red, fontSize: 14 }}>
      {message} — please try again.
    </div>
  );
}

// ── Shared style atoms ────────────────────────────────────────────────────

const sLabel: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: C.muted,
  textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8,
};

const sInput: React.CSSProperties = {
  width: "100%", backgroundColor: C.inputBg, border: `1px solid ${C.inputBorder}`,
  borderRadius: 8, padding: "10px 12px", fontSize: 14, color: C.ink,
  outline: "none", boxSizing: "border-box",
};

const sCard: React.CSSProperties = {
  backgroundColor: C.white, border: `1px solid ${C.cardBorder}`,
  borderRadius: 16, padding: 32,
};

const sSubmitBtn = (disabled: boolean): React.CSSProperties => ({
  width: "100%", backgroundColor: disabled ? C.inputBorder : C.ink,
  color: disabled ? C.muted : C.white, border: "none", borderRadius: 10,
  padding: "13px 24px", fontSize: 15, fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer", marginTop: 16,
});

// ── Feature 1: Health Check ───────────────────────────────────────────────

function HealthCheck({
  company, setCompany, exportRows, setExportRows,
}: {
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

  const savingColor = (saving: number) => {
    if (saving > 500000) return C.green;
    if (saving > 0) return C.amber;
    return C.muted;
  };

  return (
    <div style={sCard}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, color: C.ink, marginBottom: 6 }}>Export Health Check</h2>
      <p style={{ fontSize: 14, color: C.gray, marginBottom: 28 }}>
        Enter your export records and we&apos;ll show exactly where money was left on the table — based on the rules in force on each shipment date.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label style={sLabel}>Company Name</label>
          <input style={sInput} placeholder="e.g. Sri Murugan Exports Pvt Ltd" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>

        <ExportRowsInput rows={exportRows} onChange={setExportRows} />

        <button type="submit" disabled={!canSubmit || loading} style={sSubmitBtn(!canSubmit || loading)}>
          {loading && <Spinner />}{loading ? "Analysing…" : "Run Health Check"}
        </button>
      </form>

      {error && <ErrorBox message={error} />}

      {result && (
        <div style={{ marginTop: 32, borderTop: `1px solid ${C.cardBorder}`, paddingTop: 28 }}>
          {/* Hero savings */}
          <div style={{ backgroundColor: C.greenLight, border: `1px solid ${C.greenBorder}`, borderRadius: 12, padding: "20px 24px", textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Total Recoverable Savings</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 38, fontWeight: 700, color: C.green, letterSpacing: "-0.5px" }}>{formatRupees(result.totalSavings)}</div>
            <div style={{ fontSize: 13, color: C.gray, marginTop: 6 }}>Across {result.exports.length} export{result.exports.length !== 1 ? "s" : ""} analysed</div>
          </div>

          {/* Per-export cards */}
          {result.exports.map((exp, i) => (
            <div key={i} style={{ borderLeft: `4px solid ${savingColor(exp.potentialSaving)}`, backgroundColor: C.white, border: `1px solid ${C.cardBorder}`, borderLeftWidth: 4, borderLeftColor: savingColor(exp.potentialSaving), borderRadius: 10, padding: "18px 20px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: C.ink }}>
                  {exp.product}{exp.hsn ? ` (${exp.hsn})` : ""} → {exp.country}
                </div>
                <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap", marginLeft: 12 }}>{formatDate(exp.date)}</span>
              </div>

              {/* Summary figures */}
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Exported</div>
                  <div style={{ fontSize: 14, color: C.inkMid, fontWeight: 600 }}>{formatRupees(exp.amountExported)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Tariff Paid</div>
                  <div style={{ fontSize: 14, color: C.inkMid, fontWeight: 600 }}>{formatRupees(exp.tariffPaid)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.green, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Potential Saving</div>
                  <div style={{ fontSize: 16, color: C.green, fontWeight: 700 }}>{formatRupees(exp.potentialSaving)}</div>
                </div>
              </div>

              {/* Savings breakdown */}
              {exp.savingsBreakdown?.length > 0 && (
                <div style={{ backgroundColor: C.inputBg, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>Savings Breakdown</div>
                  {exp.savingsBreakdown.map((item, j) => (
                    <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "6px 0", borderBottom: j < exp.savingsBreakdown.length - 1 ? `1px solid ${C.cardBorder}` : "none" }}>
                      <div>
                        <div style={{ fontSize: 13, color: C.inkMid, fontWeight: 600 }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{item.basis}</div>
                      </div>
                      <div style={{ fontSize: 13, color: C.green, fontWeight: 700, marginLeft: 16, whiteSpace: "nowrap" }}>{formatRupees(item.amount)}</div>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, marginTop: 4, borderTop: `1px solid ${C.inputBorder}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.4px" }}>Total</div>
                    <div style={{ fontSize: 14, color: C.green, fontWeight: 700 }}>{formatRupees(exp.potentialSaving)}</div>
                  </div>
                </div>
              )}

              <p style={{ fontSize: 13, color: C.gray, fontStyle: "italic", marginBottom: 10 }}>{exp.loophole}</p>
              <div style={{ backgroundColor: C.blueLight, border: `1px solid ${C.blueBorder}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.blue }}>
                → {exp.fix}
              </div>
            </div>
          ))}

          {/* Additional findings */}
          {result.additionalFindings?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontFamily: "Georgia, serif", fontSize: 16, color: C.ink, marginBottom: 12 }}>Additional Findings</h3>
              {result.additionalFindings.map((f, i) => (
                <div key={i} style={{ backgroundColor: C.inputBg, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "12px 16px", fontSize: 14, color: C.inkMid, marginBottom: 8 }}>
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Feature 2: Weekly Digest ──────────────────────────────────────────────

function WeeklyDigest({ company, exportRows }: { company: string; exportRows: ExportRow[] }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DigestResult | null>(null);
  const [error, setError] = useState("");
  const [fallbackMarkets, setFallbackMarkets] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const usableRows = exportRows.filter((r) => r.product.trim() && r.country);
  const hasRows = usableRows.length > 0;

  const canSubmit = !loading && company.trim() && (hasRows || fallbackMarkets.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true); setError(""); setResult(null);

    const digestRows = hasRows
      ? usableRows.map((r) => ({ product: r.product, hsn: r.hsn, country: r.country, date: r.date || today }))
      : fallbackMarkets.split(",").map((m) => m.trim()).filter(Boolean).map((country) => ({ product: "Textile export", hsn: "", country, date: today }));

    try {
      const data = await callIntel({ action: "weekly_digest", company, exportRows: digestRows });
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

  function DigestSection({ type, label, items }: { type: "urgent" | "watch" | "opportunities"; label: string; items: DigestItem[] }) {
    const config = {
      urgent:        { border: C.red,   bg: C.redLight,   textColor: C.red },
      watch:         { border: C.amber, bg: C.amberLight, textColor: C.amber },
      opportunities: { border: C.green, bg: C.greenLight, textColor: C.green },
    };
    const c = config[type];

    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: c.textColor, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>{label}</div>
        {items.length === 0 ? (
          <div style={{ fontSize: 13, color: C.muted, fontStyle: "italic", padding: "10px 0" }}>Nothing to flag this week for your markets.</div>
        ) : (
          items.map((item, i) => {
            const rd = item.referenceDate ? formatDate(item.referenceDate) : "";
            const tagParts = [
              item.product,
              item.hsn ? `HSN ${item.hsn}` : null,
              item.country,
              rd ? `as of ${rd}` : null,
            ].filter(Boolean).join(" · ");
            return (
              <div key={i} style={{ borderLeft: `3px solid ${c.border}`, backgroundColor: c.bg, borderRadius: "0 10px 10px 0", padding: "14px 18px", marginBottom: 10 }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 500 }}>{tagParts}</div>
                <div style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.6 }}>{item.detail}</div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div style={sCard}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, color: C.ink, marginBottom: 6 }}>Weekly Intelligence Digest</h2>
      <p style={{ fontSize: 14, color: C.gray, marginBottom: 24 }}>
        Personalised to your products and markets — anchored to your export dates.
      </p>

      {hasRows ? (
        <div style={{ backgroundColor: C.blueLight, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: C.blue }}>
          <strong>Using your export records:</strong>{" "}
          {usableRows.map((r) => `${r.product}${r.hsn ? ` (${r.hsn})` : ""} → ${r.country}${r.date ? ` · ${formatDate(r.date)}` : ""}`).join(", ")}
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <label style={sLabel}>Export Markets</label>
          <p style={{ fontSize: 12, color: C.gray, marginBottom: 8 }}>Fill in the Health Check tab for product-specific results, or enter markets here for a general digest.</p>
          <input
            style={sInput}
            placeholder="e.g. UK, USA, Germany"
            value={fallbackMarkets}
            onChange={(e) => setFallbackMarkets(e.target.value)}
          />
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <button type="submit" disabled={!canSubmit} style={sSubmitBtn(!canSubmit)}>
          {loading && <Spinner />}{loading ? "Analysing…" : "Generate Digest"}
        </button>
      </form>

      {error && <ErrorBox message={error} />}

      {result && (
        <div style={{ marginTop: 32, borderTop: `1px solid ${C.cardBorder}`, paddingTop: 28 }}>
          <DigestSection type="urgent"        label="Urgent — Act Now"        items={result.urgent} />
          <DigestSection type="watch"         label="Watch — Monitor Closely" items={result.watch} />
          <DigestSection type="opportunities" label="Opportunities"           items={result.opportunities} />
        </div>
      )}
    </div>
  );
}

// ── Feature 3: Shipment Check (unchanged) ────────────────────────────────

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
    <div style={sCard}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, color: C.ink, marginBottom: 6 }}>Shipment Check</h2>
      <p style={{ fontSize: 14, color: C.gray, marginBottom: 28 }}>
        Before your shipment leaves — check tariff rate, duty, required documents, and one tip to save money.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={sLabel}>HSN Code</label>
            <input style={sInput} placeholder="e.g. 6109" value={hsn} onChange={(e) => setHsn(e.target.value)} />
          </div>
          <div>
            <label style={sLabel}>Destination Country</label>
            <input style={sInput} placeholder="e.g. United States" value={destination} onChange={(e) => setDestination(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={sLabel}>Shipment Value</label>
          <input style={sInput} placeholder="e.g. $50,000 or ₹40 lakh" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <button type="submit" disabled={!hsn || !destination || !value || loading} style={sSubmitBtn(!hsn || !destination || !value || loading)}>
          {loading && <Spinner />}{loading ? "Analysing…" : "Check Shipment"}
        </button>
      </form>

      {error && <ErrorBox message={error} />}

      {result && (
        <div style={{ marginTop: 32, borderTop: `1px solid ${C.cardBorder}`, paddingTop: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ backgroundColor: C.inputBg, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ ...sLabel, marginBottom: 4 }}>Tariff Rate</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.red }}>{result.tariff_rate}</div>
            </div>
            <div style={{ backgroundColor: C.inputBg, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ ...sLabel, marginBottom: 4 }}>Estimated Duty</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.amber }}>{result.estimated_duty}</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={sLabel}>Required Documents</label>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {result.documents?.map((doc, i) => (
                <li key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${C.cardBorder}`, fontSize: 14, color: C.inkMid, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: C.green, fontSize: 12, fontWeight: 700 }}>✓</span>{doc}
                </li>
              ))}
            </ul>
          </div>

          {result.port_issues && (
            <div style={{ marginBottom: 16 }}>
              <label style={sLabel}>Port &amp; Customs Notes</label>
              <div style={{ fontSize: 14, color: C.gray }}>{result.port_issues}</div>
            </div>
          )}

          <div style={{ backgroundColor: C.blueLight, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Money-Saving Tip</div>
            <div style={{ fontSize: 14, color: C.inkMid }}>{result.money_tip}</div>
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

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.pageBg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 15, lineHeight: 1.6 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; outline: none; }
        button:hover:not(:disabled) { opacity: 0.88; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Header */}
      <header style={{ backgroundColor: C.headerBg, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: C.ink }}>
          Trade<span style={{ color: "#60a5fa" }}>Intel</span>
        </div>
        <div style={{ fontSize: 13, color: "#a8a29e" }}>Trade intelligence for Indian textile exporters</div>
      </header>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "52px 24px 40px", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "inline-block", backgroundColor: C.blueLight, color: C.blue, border: `1px solid ${C.blueBorder}`, borderRadius: 20, padding: "5px 16px", fontSize: 12, fontWeight: 600, letterSpacing: "0.3px", marginBottom: 20 }}>
          Live Intelligence · No Login Required
        </div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 40, fontWeight: 700, color: C.ink, lineHeight: 1.2, letterSpacing: "-0.5px", marginBottom: 16 }}>
          Know what&apos;s changing before<br />it costs you money
        </h1>
        <p style={{ fontSize: 17, color: C.gray, maxWidth: 520, margin: "0 auto" }}>
          US tariffs at 63.9% · India-UK FTA live from July 2025 · EU CBAM from Q1 2026 — enter your export history and get specific, date-accurate intelligence.
        </p>
      </div>

      {/* Main */}
      <main style={{ maxWidth: 1060, margin: "0 auto", padding: "0 24px 80px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, backgroundColor: C.tabBar, padding: 5, borderRadius: 12 }}>
          {(["health", "digest", "shipment"] as const).map((t) => {
            const labels = { health: "Health Check", digest: "Weekly Digest", shipment: "Shipment Check" };
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, backgroundColor: active ? C.white : "transparent", color: active ? C.ink : C.muted, boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>
                {labels[t]}
              </button>
            );
          })}
        </div>

        {tab === "health" && (
          <HealthCheck
            company={company} setCompany={setCompany}
            exportRows={exportRows} setExportRows={setExportRows}
          />
        )}
        {tab === "digest" && (
          <WeeklyDigest company={company} exportRows={exportRows} />
        )}
        {tab === "shipment" && <ShipmentCheck />}
      </main>
    </div>
  );
}
