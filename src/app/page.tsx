"use client";

import { useState, useEffect } from "react";

// ── Constants ─────────────────────────────────────────────────────────────

const MARKETS = [
  "USA", "UK", "Germany", "France", "Italy", "UAE", "Netherlands",
  "Belgium", "Spain", "Australia", "Canada", "Japan", "Saudi Arabia",
  "Bangladesh", "Vietnam", "South Korea", "Singapore", "Turkey",
];

const INCOTERMS = ["FOB", "CIF", "DDP", "Other"];

// ── Types ─────────────────────────────────────────────────────────────────

type Mode = "export" | "import";

type ExportRow = {
  id: string;
  product: string;
  hsn: string;
  country: string;       // destination
  amount: string;        // export value (₹)
  rebateClaimed: string; // RoDTEP / Drawback / RoSCTL claimed (₹)
  incoterm: string;      // FOB / CIF / DDP / Other
  date: string;
};

type ImportRow = {
  id: string;
  product: string;
  hsn: string;
  country: string;    // source
  amount: string;     // assessable value (₹)
  dutyPaid: string;   // total Indian customs duty paid (₹)
  ftaClaimed: string; // "yes" | "no"
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

type ShipmentResultExport = {
  mode: "export";
  hsn: string;
  destination: string;
  tariff_rate: string;
  estimated_duty: string;
  indian_export_duty: string;
  indian_schemes: string[];
  fta_at_destination: string;
  documents: string[];
  port_notes: string;
  money_tip: string;
};

type ShipmentResultImport = {
  mode: "import";
  hsn: string;
  source: string;
  bcd_rate: string;
  igst_rate: string;
  aidc: string;
  sws: string;
  total_duty: string;
  fta_preferential: string;
  anti_dumping: string;
  scheme_options: string[];
  documents: string[];
  money_tip: string;
};

type ShipmentResult = ShipmentResultExport | ShipmentResultImport;

// ── Helpers ───────────────────────────────────────────────────────────────

function newExportRow(): ExportRow {
  return { id: Math.random().toString(36).slice(2), product: "", hsn: "", country: "", amount: "", rebateClaimed: "", incoterm: "FOB", date: "" };
}

function newImportRow(): ImportRow {
  return { id: Math.random().toString(36).slice(2), product: "", hsn: "", country: "", amount: "", dutyPaid: "", ftaClaimed: "no", date: "" };
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
  while (r.length > 2) { groups.unshift(r.slice(-2)); r = r.slice(0, -2); }
  if (r) groups.unshift(r);
  return `₹${groups.join(",")},${last3}`;
}

function extractCountries(rows: ExportRow[] | ImportRow[]): string[] {
  const set = new Set<string>();
  rows.forEach((r) => { if (r.country) set.add(r.country); });
  return Array.from(set);
}

function buildCountryDateMap(rows: ExportRow[] | ImportRow[]): Record<string, string> {
  const map: Record<string, string> = {};
  rows.forEach((r) => {
    if (r.country && r.date) {
      if (!map[r.country] || r.date > map[r.country]) map[r.country] = r.date;
    }
  });
  return map;
}

// ── Design tokens ─────────────────────────────────────────────────────────

const C = {
  pageBg:      "#ffffff",
  cardBg:      "#f9fafb",
  inputBg:     "#ffffff",
  border:      "#e5e7eb",
  inputBorder: "#d1d5db",
  text:        "#111827",
  textMid:     "#374151",
  textMuted:   "#6b7280",
  textDim:     "#9ca3af",
  textFaint:   "#9ca3af",
  textGhost:   "#d1d5db",
  accent:      "#5e6ad2",
  accentHover: "#4a57c4",
  green:       "#16a34a",
  greenBg:     "#f0fdf4",
  greenBorder: "#bbf7d0",
  amber:       "#b45309",
  amberBg:     "#fffbeb",
  amberBorder: "#fde68a",
  red:         "#dc2626",
  redBg:       "#fef2f2",
  redBorder:   "#fecaca",
  exportColor: "#5e6ad2",
  exportBg:    "#eef0fd",
  importColor: "#0891b2",
  importBg:    "#ecfeff",
};

// ── Shared style atoms ────────────────────────────────────────────────────

const sInput: React.CSSProperties = {
  width: "100%",
  background: "#f8f9fb",
  border: "1px solid #c8cdd8",
  borderRadius: 7,
  padding: "10px 13px",
  fontSize: 15,
  fontWeight: 500,
  color: "#0a0f1e",
  fontFamily: "inherit",
  boxSizing: "border-box",
  outline: "none",
  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.07), 0 1px 2px rgba(255,255,255,0.9)",
};

const sLabel: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#374151",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: 7,
};

const sRunBtn = (disabled: boolean, mode?: Mode): React.CSSProperties => ({
  width: "100%",
  background: disabled ? "#e5e7eb" : (mode === "import" ? C.importColor : C.accent),
  border: "none",
  borderRadius: 8,
  padding: "13px",
  fontSize: 15,
  fontWeight: 600,
  color: disabled ? "#9ca3af" : "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  boxShadow: disabled ? "none" : `0 2px 8px rgba(${mode === "import" ? "8,145,178" : "94,106,210"},0.35)`,
  fontFamily: "inherit",
  marginTop: 28,
  letterSpacing: "-0.01em",
});

// ── Sub-components ────────────────────────────────────────────────────────

function Spinner() {
  return <span style={{ display: "inline-block", width: 13, height: 13, border: `1.5px solid #ffffff33`, borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 7, verticalAlign: "middle" }} />;
}

function InfoStrip({ text }: { text: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #e0e4ef", borderRadius: 10, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12, background: "#f5f7ff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <span style={{ color: C.accent, fontSize: 16, marginTop: 2, flexShrink: 0 }}>↗</span>
      <div style={{ fontSize: 14, color: "#1f2937", lineHeight: 1.7, fontWeight: 400 }}>{text}</div>
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

function ModePill({ mode }: { mode: Mode }) {
  const isExport = mode === "export";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 20, fontSize: 11.5, fontWeight: 700,
      letterSpacing: "0.07em", textTransform: "uppercase",
      background: isExport ? C.exportBg : C.importBg,
      color: isExport ? C.exportColor : C.importColor,
      border: `1.5px solid ${isExport ? "#c7ccf5" : "#a5e8f5"}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: isExport ? C.exportColor : C.importColor, flexShrink: 0 }} />
      {isExport ? "Export Mode" : "Import Mode"}
    </div>
  );
}

// ── Export Rows Input ─────────────────────────────────────────────────────

const EXP_GRID = "2fr 1fr 1.4fr 1.2fr 1.3fr 0.9fr 1.2fr 28px";
const EXP_LABELS = ["Product / category", "HSN code", "Destination country", "Export value (₹)", "Rebate claimed (₹)", "Incoterm", "Date of export", ""];

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
      <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>
        Shipment records — Export
      </div>
      <div style={{ display: "grid", gridTemplateColumns: EXP_GRID, gap: 8, marginBottom: 8, padding: "0 2px" }}>
        {EXP_LABELS.map((h, i) => (
          <div key={i} style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.id} style={{ display: "grid", gridTemplateColumns: EXP_GRID, gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input style={sInput} placeholder="Cotton knitwear" value={row.product} onChange={(e) => update(row.id, "product", e.target.value)} />
          <input style={sInput} placeholder="6109.10" value={row.hsn} onChange={(e) => update(row.id, "hsn", e.target.value)} />
          <select value={row.country} onChange={(e) => update(row.id, "country", e.target.value)}
            style={{ ...sInput, appearance: "none" as React.CSSProperties["appearance"], color: row.country ? C.text : C.textDim, cursor: "pointer" }}>
            <option value="">Country</option>
            {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input style={sInput} type="number" min="0" placeholder="₹ 25,00,000" value={row.amount} onChange={(e) => update(row.id, "amount", e.target.value)} />
          <input style={sInput} type="number" min="0" placeholder="₹ 0" value={row.rebateClaimed} onChange={(e) => update(row.id, "rebateClaimed", e.target.value)} />
          <select value={row.incoterm} onChange={(e) => update(row.id, "incoterm", e.target.value)}
            style={{ ...sInput, appearance: "none" as React.CSSProperties["appearance"], cursor: "pointer" }}>
            {INCOTERMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input style={sInput} type="date" value={row.date} onChange={(e) => update(row.id, "date", e.target.value)} />
          <button onClick={() => remove(row.id)} disabled={rows.length === 1}
            style={{ background: "none", border: `1px solid ${C.inputBorder}`, borderRadius: 4, width: 24, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: rows.length === 1 ? "not-allowed" : "pointer", color: rows.length === 1 ? C.textGhost : C.textDim, fontSize: 14, padding: 0, fontFamily: "inherit", flexShrink: 0, opacity: rows.length === 1 ? 0.4 : 1 }}>×</button>
        </div>
      ))}
      <button onClick={() => onChange([...rows, newExportRow()])}
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.accent, cursor: "pointer", padding: "6px 0", marginTop: 4, background: "none", border: "none", fontFamily: "inherit" }}>
        + Add shipment
      </button>
      <p style={{ fontSize: 13, color: C.textFaint, marginTop: 8, lineHeight: 1.5 }}>
        Rebate claimed = RoDTEP + Drawback + RoSCTL already claimed. Enter 0 if none.
      </p>
    </div>
  );
}

// ── Import Rows Input ─────────────────────────────────────────────────────

const IMP_GRID = "2fr 1fr 1.4fr 1.2fr 1.3fr 0.9fr 1.2fr 28px";
const IMP_LABELS = ["Product / category", "HSN code (8-digit)", "Source country", "Assessable value (₹)", "Customs duty paid (₹)", "FTA claimed?", "Date of import", ""];

function ImportRowsInput({ rows, onChange }: { rows: ImportRow[]; onChange: (r: ImportRow[]) => void }) {
  function update(id: string, field: keyof ImportRow, value: string) {
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }
  function remove(id: string) {
    if (rows.length === 1) return;
    onChange(rows.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>
        Shipment records — Import
      </div>
      <div style={{ display: "grid", gridTemplateColumns: IMP_GRID, gap: 8, marginBottom: 8, padding: "0 2px" }}>
        {IMP_LABELS.map((h, i) => (
          <div key={i} style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.id} style={{ display: "grid", gridTemplateColumns: IMP_GRID, gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input style={sInput} placeholder="Synthetic fabric" value={row.product} onChange={(e) => update(row.id, "product", e.target.value)} />
          <input style={sInput} placeholder="54076100" value={row.hsn} onChange={(e) => update(row.id, "hsn", e.target.value)} />
          <select value={row.country} onChange={(e) => update(row.id, "country", e.target.value)}
            style={{ ...sInput, appearance: "none" as React.CSSProperties["appearance"], color: row.country ? C.text : C.textDim, cursor: "pointer" }}>
            <option value="">Country</option>
            {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input style={sInput} type="number" min="0" placeholder="₹ 15,00,000" value={row.amount} onChange={(e) => update(row.id, "amount", e.target.value)} />
          <input style={sInput} type="number" min="0" placeholder="₹ 2,50,000" value={row.dutyPaid} onChange={(e) => update(row.id, "dutyPaid", e.target.value)} />
          <select value={row.ftaClaimed} onChange={(e) => update(row.id, "ftaClaimed", e.target.value)}
            style={{ ...sInput, appearance: "none" as React.CSSProperties["appearance"], cursor: "pointer", color: row.ftaClaimed === "yes" ? C.green : C.text }}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
          <input style={sInput} type="date" value={row.date} onChange={(e) => update(row.id, "date", e.target.value)} />
          <button onClick={() => remove(row.id)} disabled={rows.length === 1}
            style={{ background: "none", border: `1px solid ${C.inputBorder}`, borderRadius: 4, width: 24, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: rows.length === 1 ? "not-allowed" : "pointer", color: rows.length === 1 ? C.textGhost : C.textDim, fontSize: 14, padding: 0, fontFamily: "inherit", flexShrink: 0, opacity: rows.length === 1 ? 0.4 : 1 }}>×</button>
        </div>
      ))}
      <button onClick={() => onChange([...rows, newImportRow()])}
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.importColor, cursor: "pointer", padding: "6px 0", marginTop: 4, background: "none", border: "none", fontFamily: "inherit" }}>
        + Add shipment
      </button>
      <p style={{ fontSize: 13, color: C.textFaint, marginTop: 8, lineHeight: 1.5 }}>
        Assessable value = CIF value used by Indian customs. Duty paid = BCD + IGST + all surcharges combined.
      </p>
    </div>
  );
}

// ── Feature 1: Health Check ───────────────────────────────────────────────

function HealthCheck({ mode, company, setCompany, exportRows, setExportRows, importRows, setImportRows }: {
  mode: Mode;
  company: string; setCompany: (v: string) => void;
  exportRows: ExportRow[]; setExportRows: (r: ExportRow[]) => void;
  importRows: ImportRow[]; setImportRows: (r: ImportRow[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { setResult(null); setError(""); }, [mode]);

  const activeRows = mode === "export" ? exportRows : importRows;
  const completeExportRows = exportRows.filter((r) => r.product && r.country && r.amount && r.date);
  const completeImportRows = importRows.filter((r) => r.product && r.country && r.amount && r.date);
  const completeRows = mode === "export" ? completeExportRows : completeImportRows;
  const canSubmit = company.trim() && completeRows.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const countries = extractCountries(activeRows);
      if (mode === "export") {
        const data = await callIntel({
          action: "health_check",
          mode: "export",
          company,
          countries,
          rows: completeExportRows.map(({ product, hsn, country, amount, rebateClaimed, incoterm, date }) => ({ product, hsn, country, amount, rebateClaimed, incoterm, date })),
        });
        setResult(data);
      } else {
        const data = await callIntel({
          action: "health_check",
          mode: "import",
          company,
          countries,
          rows: completeImportRows.map(({ product, hsn, country, amount, dutyPaid, ftaClaimed, date }) => ({ product, hsn, country, amount, dutyPaid, ftaClaimed, date })),
        });
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const savingBorderColor = (n: number) => n > 500000 ? C.green : n > 0 ? C.amber : C.inputBorder;
  const accent = mode === "import" ? C.importColor : C.accent;

  const infoText = mode === "export"
    ? <><strong style={{ color: C.textMid }}>Export mode:</strong> Each row is one shipment from India. We analyse RoDTEP/Drawback/RoSCTL gaps, FTA readiness at the destination, Incoterm-specific exposure, compliance risk (CBAM, forced-labour cotton rules), and port documentation risk — all as of your export date.</>
    : <><strong style={{ color: C.textMid }}>Import mode:</strong> Each row is one import into India. We analyse unclaimed FTA preferential duty, HSN misclassification opportunities, IGST refund/ITC options, scheme eligibility (Advance Auth, EPCG, MOOWR), and anti-dumping/safeguard duty exposure — all as of your import date.</>;

  return (
    <div>
      <InfoStrip text={infoText} />
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label style={sLabel}>Company name</label>
          <input style={sInput} placeholder="e.g. Sri Murugan Exports Pvt Ltd" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "24px 0" }} />
        {mode === "export"
          ? <ExportRowsInput rows={exportRows} onChange={setExportRows} />
          : <ImportRowsInput rows={importRows} onChange={setImportRows} />}
        <button type="submit" disabled={!canSubmit || loading} style={sRunBtn(!canSubmit || loading, mode)}>
          {loading && <Spinner />}{loading ? "Analysing…" : `Run ${mode === "export" ? "export" : "import"} health check →`}
        </button>
      </form>

      {error && <ErrorBanner message={error} />}

      {result && (
        <div style={{ marginTop: 32 }}>
          <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, marginBottom: 28 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
            <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 8, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Total recoverable savings</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: C.green, letterSpacing: "-0.03em", marginBottom: 2 }}>{formatRupees(result.totalSavings)}</div>
              <div style={{ fontSize: 11.5, color: C.textFaint }}>{result.exports.length} shipment{result.exports.length !== 1 ? "s" : ""} analysed</div>
            </div>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Savings opportunities</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: C.text, letterSpacing: "-0.03em", marginBottom: 2 }}>
                {result.exports.filter(e => e.potentialSaving > 0).length}
              </div>
              <div style={{ fontSize: 11.5, color: C.textFaint }}>shipments with recoverable amount</div>
            </div>
          </div>

          {result.exports.map((exp, i) => (
            <div key={i} style={{ border: `1px solid #e5e7eb`, borderLeftWidth: 4, borderLeftColor: savingBorderColor(exp.potentialSaving), borderRadius: 10, padding: "20px 22px", marginBottom: 12, background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0a0f1e", letterSpacing: "-0.02em" }}>
                  {exp.product}{exp.hsn ? ` (${exp.hsn})` : ""} {mode === "export" ? "→" : "←"} {exp.country}
                </div>
                <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500, whiteSpace: "nowrap", marginLeft: 16 }}>{formatDate(exp.date)}</span>
              </div>
              <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 16, padding: "12px 16px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{mode === "export" ? "Exported" : "Assessable value"}</div>
                  <div style={{ fontSize: 15, color: "#111827", fontWeight: 700 }}>{formatRupees(exp.amountExported)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{mode === "export" ? "Rebate claimed" : "Duty paid"}</div>
                  <div style={{ fontSize: 15, color: "#111827", fontWeight: 700 }}>{formatRupees(exp.tariffPaid)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Potential saving</div>
                  <div style={{ fontSize: 18, color: C.green, fontWeight: 800 }}>{formatRupees(exp.potentialSaving)}</div>
                </div>
              </div>

              {exp.savingsBreakdown?.length > 0 && (
                <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px", marginBottom: 14, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)" }}>
                  {exp.savingsBreakdown.map((item, j) => (
                    <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: j < exp.savingsBreakdown.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                      <div>
                        <div style={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{item.basis}</div>
                      </div>
                      <div style={{ fontSize: 15, color: C.green, fontWeight: 700, marginLeft: 16, whiteSpace: "nowrap" }}>{formatRupees(item.amount)}</div>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, marginTop: 4, borderTop: "2px solid #e5e7eb" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</div>
                    <div style={{ fontSize: 16, color: C.green, fontWeight: 800 }}>{formatRupees(exp.potentialSaving)}</div>
                  </div>
                </div>
              )}

              <p style={{ fontSize: 14, color: "#374151", fontWeight: 500, fontStyle: "italic", marginBottom: 12, lineHeight: 1.65 }}>{exp.loophole}</p>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 14px", background: "#eff6ff", border: `1px solid #bfdbfe`, borderRadius: 6, fontSize: 14, color: "#1e40af", lineHeight: 1.65 }}>
                <span style={{ flexShrink: 0 }}>↗</span>
                <span>{exp.fix}</span>
              </div>
            </div>
          ))}

          {result.additionalFindings?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Additional findings</div>
              {result.additionalFindings.map((f, i) => (
                <div key={i} style={{ fontSize: 14, color: "#1f2937", fontWeight: 500, padding: "14px 18px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 8, lineHeight: 1.7 }}>{f}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Feature 2: Weekly Digest ──────────────────────────────────────────────

function WeeklyDigest({ mode, exportRows, importRows }: { mode: Mode; exportRows: ExportRow[]; importRows: ImportRow[] }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DigestResult | null>(null);
  const [error, setError] = useState("");
  const [manualCountries, setManualCountries] = useState("");

  useEffect(() => { setResult(null); setError(""); }, [mode]);

  const activeRows = mode === "export" ? exportRows : importRows;
  const derivedCountries = extractCountries(activeRows);
  const hasRows = derivedCountries.length > 0;
  const countries = hasRows ? derivedCountries : manualCountries.split(",").map(c => c.trim()).filter(Boolean);
  const countryDateMap = hasRows ? buildCountryDateMap(activeRows) : Object.fromEntries(countries.map(c => [c, new Date().toISOString().slice(0, 10)]));

  const productHsnMap: Record<string, { product: string; hsn: string }[]> = {};
  if (hasRows) {
    activeRows.forEach((r) => {
      if (r.country) {
        if (!productHsnMap[r.country]) productHsnMap[r.country] = [];
        if (r.product) productHsnMap[r.country].push({ product: r.product, hsn: r.hsn });
      }
    });
  }

  const canSubmit = !loading && countries.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await callIntel({
        action: "weekly_digest",
        mode,
        countries,
        countryDateMap,
        productHsnMap,
      });
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
      warn:  { bg: C.amberBg,  border: C.amberBorder, iconColor: C.amber,  textColor: "#92400e", strongColor: "#78350f", icon: "⚠" },
      info:  { bg: "#eff6ff",  border: "#bfdbfe",      iconColor: C.accent, textColor: "#1e40af", strongColor: "#1d4ed8", icon: "↗" },
      green: { bg: C.greenBg,  border: C.greenBorder,  iconColor: C.green,  textColor: "#166534", strongColor: "#15803d", icon: "↑" },
    }[variant];

    const arrow = mode === "export" ? "→" : "←";
    const parts = [
      item.product,
      item.hsn ? `HSN ${item.hsn}` : null,
      item.country ? `${arrow} ${item.country}` : null,
      item.referenceDate ? `as of ${formatDate(item.referenceDate)}` : null,
    ].filter(Boolean);
    const tag = parts.join(" · ");

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

  function EmptySection({ label }: { label: string }) {
    return (
      <div style={{ padding: "14px 18px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.cardBg, marginBottom: 10, fontSize: 13.5, color: C.textMuted, fontStyle: "italic" }}>
        No {label} items right now for your selected countries.
      </div>
    );
  }

  const accent = mode === "import" ? C.importColor : C.accent;

  return (
    <div>
      <InfoStrip text={<><strong style={{ color: C.textMid }}>How it works:</strong> The digest reads the countries you&apos;ve entered in the {mode === "export" ? "export" : "import"} health check and surfaces only intelligence relevant to those specific countries. Every item is anchored to that country&apos;s reference date.</>} />

      {hasRows ? (
        <div style={{ marginBottom: 20, padding: "14px 18px", background: "#f5f7ff", border: "1px solid #e0e4ef", borderRadius: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Countries from your {mode} records</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {derivedCountries.map((c) => (
              <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 16, background: mode === "export" ? C.exportBg : C.importBg, color: mode === "export" ? C.exportColor : C.importColor, fontSize: 12.5, fontWeight: 600, border: `1px solid ${mode === "export" ? "#c7ccf5" : "#a5e8f5"}` }}>
                {mode === "export" ? "→" : "←"} {c}
                {countryDateMap[c] && <span style={{ color: C.textFaint, fontWeight: 400 }}>· {formatDate(countryDateMap[c])}</span>}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <label style={sLabel}>No {mode} records yet — enter countries manually</label>
          <input
            style={sInput}
            placeholder="e.g. UK, UAE, Japan (comma-separated)"
            value={manualCountries}
            onChange={(e) => setManualCountries(e.target.value)}
          />
          <p style={{ fontSize: 13, color: C.textFaint, marginTop: 6 }}>
            Or go to the Health Check tab and add shipment records — the digest will auto-read them.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <button type="submit" disabled={!canSubmit} style={sRunBtn(!canSubmit, mode)}>
          {loading && <Spinner />}{loading ? "Fetching intelligence…" : `Get ${mode} digest →`}
        </button>
      </form>

      {error && <ErrorBanner message={error} />}

      {result && (
        <div style={{ marginTop: 32 }}>
          <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, marginBottom: 28 }} />

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.amber, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Urgent — act now</div>
            {result.urgent.length > 0
              ? result.urgent.map((item, i) => <AlertItem key={i} item={item} variant="warn" />)
              : <EmptySection label="urgent" />}
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Watch — monitor closely</div>
            {result.watch.length > 0
              ? result.watch.map((item, i) => <AlertItem key={i} item={item} variant="info" />)
              : <EmptySection label="watch" />}
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.green, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Opportunities</div>
            {result.opportunities.length > 0
              ? result.opportunities.map((item, i) => <AlertItem key={i} item={item} variant="green" />)
              : <EmptySection label="opportunities" />}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Feature 3: Shipment Check ─────────────────────────────────────────────

function ShipmentCheck({ mode }: { mode: Mode }) {
  const [hsn, setHsn] = useState("");
  const [country, setCountry] = useState("");
  const [value, setValue] = useState("");
  const [incoterm, setIncoterm] = useState("FOB");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShipmentResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { setResult(null); setError(""); setCountry(""); setHsn(""); setValue(""); }, [mode]);

  const canSubmit = hsn.trim() && country.trim() && value.trim();
  const accent = mode === "import" ? C.importColor : C.accent;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const payload: Record<string, unknown> = { action: "shipment_check", mode, hsn, value };
      if (mode === "export") { payload.destination = country; payload.incoterm = incoterm; }
      else { payload.source = country; }
      const data = await callIntel(payload);
      setResult({ ...data, mode });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const infoText = mode === "export"
    ? <><strong style={{ color: C.textMid }}>Export shipment check:</strong> Enter the HSN, destination, value, and Incoterms. We&apos;ll surface destination duty rates, Indian export scheme rebates, FTA at destination, and port/documentation requirements — specific to that country only.</>
    : <><strong style={{ color: C.textMid }}>Import shipment check:</strong> Enter the HSN, source country, and value. We&apos;ll itemise Indian BCD, IGST, AIDC, surcharges, check for FTA preferential rates from that source country, anti-dumping exposure, and scheme options.</>;

  return (
    <div>
      <InfoStrip text={infoText} />
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: mode === "export" ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={sLabel}>HSN code</label>
            <input style={sInput} placeholder="e.g. 6109" value={hsn} onChange={(e) => setHsn(e.target.value)} />
          </div>
          <div>
            <label style={sLabel}>{mode === "export" ? "Destination country" : "Source country"}</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)}
              style={{ ...sInput, appearance: "none" as React.CSSProperties["appearance"], color: country ? C.text : C.textDim, cursor: "pointer" }}>
              <option value="">Select country</option>
              {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={sLabel}>Shipment value (₹)</label>
            <input style={sInput} placeholder="e.g. 5000000" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          {mode === "export" && (
            <div>
              <label style={sLabel}>Incoterm</label>
              <select value={incoterm} onChange={(e) => setIncoterm(e.target.value)}
                style={{ ...sInput, appearance: "none" as React.CSSProperties["appearance"], cursor: "pointer" }}>
                {INCOTERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>
        <button type="submit" disabled={!canSubmit || loading} style={sRunBtn(!canSubmit || loading, mode)}>
          {loading && <Spinner />}{loading ? "Analysing…" : "Check shipment →"}
        </button>
      </form>

      {error && <ErrorBanner message={error} />}

      {result && result.mode === "export" && (
        <div style={{ marginTop: 28 }}>
          <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, marginBottom: 24 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Destination duty rate</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.red, letterSpacing: "-0.03em" }}>{result.tariff_rate}</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Estimated destination duty</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.amber, letterSpacing: "-0.03em" }}>{result.estimated_duty}</div>
            </div>
          </div>
          {result.indian_export_duty && (
            <div style={{ padding: "12px 16px", background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 8, marginBottom: 16, fontSize: 14, color: "#166534" }}>
              <strong>Indian export duty:</strong> {result.indian_export_duty}
            </div>
          )}
          {result.indian_schemes?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Indian export schemes available</div>
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                {result.indian_schemes.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < result.indian_schemes.length - 1 ? "1px solid #f3f4f6" : "none", fontSize: 14, color: "#111827", fontWeight: 500 }}>
                    <span style={{ color: C.green, fontSize: 13, fontWeight: 800 }}>↑</span>{s}
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.fta_at_destination && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: "#f5f7ff", border: "1px solid #e0e4ef", borderRadius: 8, fontSize: 14, color: C.textMid, lineHeight: 1.65 }}>
              <strong style={{ color: C.accent }}>FTA at destination:</strong> {result.fta_at_destination}
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Required documents</div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              {result.documents?.map((doc, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < result.documents.length - 1 ? "1px solid #f3f4f6" : "none", fontSize: 14, color: "#111827", fontWeight: 500 }}>
                  <span style={{ color: C.green, fontSize: 13, fontWeight: 800 }}>✓</span>{doc}
                </div>
              ))}
            </div>
          </div>
          {result.port_notes && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Port &amp; customs notes</div>
              <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.65 }}>{result.port_notes}</div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 16px", borderRadius: 7, border: "1px solid #bfdbfe", background: "#eff6ff", fontSize: 14, color: "#1e40af", lineHeight: 1.65 }}>
            <span style={{ flexShrink: 0, color: C.accent, fontSize: 15 }}>↗</span>
            <div><strong style={{ color: "#1d4ed8", fontWeight: 500 }}>Money-saving tip — </strong>{result.money_tip}</div>
          </div>
        </div>
      )}

      {result && result.mode === "import" && (
        <div style={{ marginTop: 28 }}>
          <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, marginBottom: 24 }} />
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Indian duty breakdown</div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              {[
                { label: "Basic Customs Duty (BCD)", value: result.bcd_rate },
                { label: "IGST", value: result.igst_rate },
                { label: "Agriculture Infrastructure Dev Cess (AIDC)", value: result.aidc },
                { label: "Social Welfare Surcharge (SWS)", value: result.sws },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: i < 3 ? "1px solid #f3f4f6" : "none", fontSize: 14 }}>
                  <span style={{ color: "#374151" }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: "#111827" }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", background: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>Total estimated duty</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: C.red }}>{result.total_duty}</span>
              </div>
            </div>
          </div>
          {result.fta_preferential && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 8, fontSize: 14, color: "#166534", lineHeight: 1.65 }}>
              <strong>FTA preferential rate available:</strong> {result.fta_preferential}
            </div>
          )}
          {result.anti_dumping && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 8, fontSize: 14, color: "#92400e", lineHeight: 1.65 }}>
              <strong>Anti-dumping / safeguard exposure:</strong> {result.anti_dumping}
            </div>
          )}
          {result.scheme_options?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Scheme options</div>
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                {result.scheme_options.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < result.scheme_options.length - 1 ? "1px solid #f3f4f6" : "none", fontSize: 14, color: "#111827", fontWeight: 500 }}>
                    <span style={{ color: C.importColor, fontSize: 13, fontWeight: 800 }}>↑</span>{s}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Required documents</div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              {result.documents?.map((doc, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < result.documents.length - 1 ? "1px solid #f3f4f6" : "none", fontSize: 14, color: "#111827", fontWeight: 500 }}>
                  <span style={{ color: C.green, fontSize: 13, fontWeight: 800 }}>✓</span>{doc}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 16px", borderRadius: 7, border: `1px solid #a5e8f5`, background: "#ecfeff", fontSize: 14, color: "#0e7490", lineHeight: 1.65 }}>
            <span style={{ flexShrink: 0, color: C.importColor, fontSize: 15 }}>↗</span>
            <div><strong style={{ color: "#0c5166", fontWeight: 500 }}>Money-saving tip — </strong>{result.money_tip}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function Home() {
  const [mode, setMode] = useState<Mode>("export");
  const [tab, setTab] = useState<"health" | "digest" | "shipment">("health");
  const [company, setCompany] = useState("");
  const [exportRows, setExportRows] = useState<ExportRow[]>([newExportRow()]);
  const [importRows, setImportRows] = useState<ImportRow[]>([newImportRow()]);

  const tabs = [
    { id: "health",   label: "Health Check" },
    { id: "digest",   label: "Weekly Digest" },
    { id: "shipment", label: "Shipment Check" },
  ] as const;

  const isExport = mode === "export";
  const modeAccent = isExport ? C.exportColor : C.importColor;

  return (
    <div style={{ minHeight: "100vh", background: C.pageBg, fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, sans-serif", fontSize: 14, lineHeight: 1.6, color: C.text }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus { border-color: #5e6ad2 !important; outline: none; }
        input::placeholder { color: #9ca3af; }
        textarea::placeholder { color: #9ca3af; }
        button:hover:not(:disabled) { opacity: 0.85; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", height: 52, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.pageBg, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: C.text, letterSpacing: "-0.01em" }}>
          <div style={{ width: 18, height: 18, background: "linear-gradient(135deg, #5e6ad2 0%, #8b5cf6 100%)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>T</div>
          TradeIntel
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ fontSize: 12.5, color: tab === t.id ? C.text : C.textMuted, padding: "6px 12px", borderRadius: 6, cursor: "pointer", background: "none", border: "none", fontFamily: "inherit" }}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Mode toggle in nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3 }}>
          <button
            onClick={() => setMode("export")}
            style={{ fontSize: 12.5, fontWeight: 600, padding: "5px 14px", borderRadius: 6, cursor: "pointer", border: "none", fontFamily: "inherit", transition: "all 0.15s", background: isExport ? C.exportColor : "transparent", color: isExport ? "#fff" : C.textMuted }}
          >
            ↑ Export
          </button>
          <button
            onClick={() => setMode("import")}
            style={{ fontSize: 12.5, fontWeight: 600, padding: "5px 14px", borderRadius: 6, cursor: "pointer", border: "none", fontFamily: "inherit", transition: "all 0.15s", background: !isExport ? C.importColor : "transparent", color: !isExport ? "#fff" : C.textMuted }}
          >
            ↓ Import
          </button>
        </div>
      </nav>

      {/* Persistent mode banner */}
      <div style={{ background: isExport ? C.exportBg : C.importBg, borderBottom: `1px solid ${isExport ? "#c7ccf5" : "#a5e8f5"}`, padding: "6px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <ModePill mode={mode} />
        <span style={{ fontSize: 12, color: isExport ? C.exportColor : C.importColor, fontWeight: 500 }}>
          {isExport ? "Analysing as Indian textile exporter — destination country duties, Indian-side rebates, FTA at buyer" : "Analysing as Indian importer — Indian BCD + IGST + AIDC, FTA from source, anti-dumping exposure"}
        </span>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "60px 40px 40px", textAlign: "center" }}>
        <h1 style={{ fontSize: 52, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.08, color: C.text, margin: "0 0 16px" }}>
          Know what&apos;s changing<br />before it costs you
        </h1>
        <p style={{ fontSize: 17, color: C.textMid, lineHeight: 1.7, margin: "0 auto 32px", maxWidth: 600 }}>
          {isExport
            ? "Enter your export shipments and get date-accurate intelligence on RoDTEP gaps, FTA benefits, and destination compliance — for every country you export to."
            : "Enter your import shipments and get date-accurate intelligence on Indian duty optimisation, FTA preferential rates, and anti-dumping exposure — for every source country."}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
          {(isExport
            ? [["India–UK FTA live", "Jul 2025"], ["EU CBAM from", "Q1 2026"], ["US tariffs", "63.9%"]]
            : [["India–UAE CEPA", "Active"], ["India–UK FTA", "Jul 2025"], ["Anti-dumping", "HSN-specific"]]
          ).map(([label, val], i, arr) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.textDim }}>
                {label} <span style={{ color: modeAccent, fontWeight: 500 }}>{val}</span>
              </span>
              {i < arr.length - 1 && <span style={{ width: 1, height: 14, background: C.inputBorder, display: "inline-block" }} />}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${C.border}`, maxWidth: 1100, margin: "0 auto", padding: "0 40px", display: "flex" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ fontSize: 14, fontWeight: tab === t.id ? 500 : 400, color: tab === t.id ? C.text : C.textMuted, padding: "12px 20px", cursor: "pointer", marginBottom: -1, background: "none", border: "none", borderBottom: tab === t.id ? `2px solid ${modeAccent}` : "2px solid transparent", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 40px 80px" }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "40px 44px", boxShadow: "0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.05)" }}>
          {tab === "health" && (
            <HealthCheck
              mode={mode}
              company={company} setCompany={setCompany}
              exportRows={exportRows} setExportRows={setExportRows}
              importRows={importRows} setImportRows={setImportRows}
            />
          )}
          {tab === "digest" && (
            <WeeklyDigest mode={mode} exportRows={exportRows} importRows={importRows} />
          )}
          {tab === "shipment" && (
            <ShipmentCheck mode={mode} />
          )}
        </div>
      </main>
    </div>
  );
}
