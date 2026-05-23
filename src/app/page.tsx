"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type Finding = {
  type: string;
  title: string;
  detail: string;
  impact: string;
};

type HealthCheckResult = {
  money_left: string;
  findings: Finding[];
};

type DigestItem = {
  headline: string;
  detail: string;
  action: string;
};

type DigestResult = {
  week: string;
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

type Profile = {
  company: string;
  products: string;
  markets: string;
};

// ── Styles ────────────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0f1117",
    color: "#e8eaf0",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: "15px",
    lineHeight: "1.6",
  } as React.CSSProperties,

  header: {
    backgroundColor: "#161a24",
    borderBottom: "1px solid #1e2535",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "64px",
  } as React.CSSProperties,

  logo: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: "-0.3px",
  } as React.CSSProperties,

  logoAccent: {
    color: "#3b82f6",
  } as React.CSSProperties,

  tagline: {
    fontSize: "13px",
    color: "#6b7280",
  } as React.CSSProperties,

  hero: {
    textAlign: "center" as const,
    padding: "64px 24px 48px",
    maxWidth: "680px",
    margin: "0 auto",
  },

  heroTitle: {
    fontSize: "36px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "16px",
    lineHeight: "1.2",
    letterSpacing: "-0.5px",
  } as React.CSSProperties,

  heroSub: {
    fontSize: "17px",
    color: "#9ca3af",
    maxWidth: "520px",
    margin: "0 auto 24px",
  } as React.CSSProperties,

  badge: {
    display: "inline-block",
    backgroundColor: "#1e3a5f",
    color: "#60a5fa",
    border: "1px solid #2563eb33",
    borderRadius: "20px",
    padding: "5px 14px",
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.3px",
    marginBottom: "24px",
  } as React.CSSProperties,

  main: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "0 24px 80px",
  } as React.CSSProperties,

  tabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "32px",
    backgroundColor: "#161a24",
    padding: "6px",
    borderRadius: "12px",
    border: "1px solid #1e2535",
  } as React.CSSProperties,

  tab: (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    transition: "all 0.15s",
    backgroundColor: active ? "#2563eb" : "transparent",
    color: active ? "#ffffff" : "#6b7280",
  }),

  card: {
    backgroundColor: "#161a24",
    border: "1px solid #1e2535",
    borderRadius: "16px",
    padding: "32px",
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "8px",
  } as React.CSSProperties,

  sectionSub: {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "24px",
  } as React.CSSProperties,

  fieldGroup: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "16px",
  } as React.CSSProperties,

  fieldFull: {
    marginBottom: "16px",
  } as React.CSSProperties,

  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "#9ca3af",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "8px",
  } as React.CSSProperties,

  input: {
    width: "100%",
    backgroundColor: "#0f1117",
    border: "1px solid #2a3142",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "14px",
    color: "#e8eaf0",
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.15s",
  } as React.CSSProperties,

  btn: {
    width: "100%",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "14px 24px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "8px",
    transition: "background-color 0.15s",
  } as React.CSSProperties,

  btnDisabled: {
    backgroundColor: "#1e2535",
    color: "#6b7280",
    cursor: "not-allowed",
  } as React.CSSProperties,

  resultBox: {
    marginTop: "28px",
    borderTop: "1px solid #1e2535",
    paddingTop: "28px",
  } as React.CSSProperties,

  moneyHighlight: {
    backgroundColor: "#052e16",
    border: "1px solid #16a34a44",
    borderRadius: "12px",
    padding: "20px 24px",
    marginBottom: "24px",
    textAlign: "center" as const,
  } as React.CSSProperties,

  moneyLabel: {
    fontSize: "12px",
    color: "#6b7280",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "6px",
  } as React.CSSProperties,

  moneyValue: {
    fontSize: "32px",
    fontWeight: 800,
    color: "#22c55e",
    letterSpacing: "-0.5px",
  } as React.CSSProperties,

  moneySub: {
    fontSize: "13px",
    color: "#6b7280",
    marginTop: "4px",
  } as React.CSSProperties,

  findingCard: (type: string): React.CSSProperties => {
    const colors: Record<string, { bg: string; border: string }> = {
      tariff_exposure:    { bg: "#1c1020", border: "#9333ea33" },
      fta_missed:         { bg: "#1c1b10", border: "#ca8a0433" },
      upcoming_risk:      { bg: "#1c1010", border: "#ef444433" },
      growth_opportunity: { bg: "#0c1c10", border: "#16a34a33" },
    };
    const c = colors[type] || { bg: "#161a24", border: "#1e2535" };
    return {
      backgroundColor: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: "12px",
      padding: "16px 20px",
      marginBottom: "12px",
      display: "flex",
      gap: "14px",
      alignItems: "flex-start",
    };
  },

  findingDot: (type: string): React.CSSProperties => {
    const colors: Record<string, string> = {
      tariff_exposure:    "#a855f7",
      fta_missed:         "#eab308",
      upcoming_risk:      "#ef4444",
      growth_opportunity: "#22c55e",
    };
    return {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      backgroundColor: colors[type] || "#6b7280",
      marginTop: "6px",
      flexShrink: 0,
    };
  },

  findingTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "4px",
  } as React.CSSProperties,

  findingDetail: {
    fontSize: "13px",
    color: "#9ca3af",
    marginBottom: "6px",
  } as React.CSSProperties,

  findingImpact: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#6b7280",
    fontStyle: "italic" as const,
  } as React.CSSProperties,

  digestSection: (type: "urgent" | "watch" | "opportunities"): React.CSSProperties => {
    const config = {
      urgent:        { bg: "#1c1010", border: "#ef444433" },
      watch:         { bg: "#1c1b10", border: "#ca8a0433" },
      opportunities: { bg: "#0c1c10", border: "#16a34a33" },
    };
    const c = config[type];
    return {
      backgroundColor: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "16px",
    };
  },

  digestHeader: (type: "urgent" | "watch" | "opportunities"): React.CSSProperties => {
    const colors = { urgent: "#ef4444", watch: "#eab308", opportunities: "#22c55e" };
    return {
      fontSize: "11px",
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.8px",
      color: colors[type],
      marginBottom: "14px",
    };
  },

  digestItem: {
    paddingBottom: "12px",
    marginBottom: "12px",
    borderBottom: "1px solid #1e2535",
  } as React.CSSProperties,

  digestItemLast: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottom: "none",
  } as React.CSSProperties,

  digestHeadline: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "4px",
  } as React.CSSProperties,

  digestDetail: {
    fontSize: "13px",
    color: "#9ca3af",
    marginBottom: "6px",
  } as React.CSSProperties,

  digestAction: {
    fontSize: "12px",
    color: "#60a5fa",
    fontWeight: 600,
  } as React.CSSProperties,

  statRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "20px",
  } as React.CSSProperties,

  statBox: {
    backgroundColor: "#0f1117",
    border: "1px solid #1e2535",
    borderRadius: "10px",
    padding: "14px 16px",
  } as React.CSSProperties,

  statLabel: {
    fontSize: "11px",
    color: "#6b7280",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.4px",
    marginBottom: "4px",
  } as React.CSSProperties,

  statValue: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#ffffff",
  } as React.CSSProperties,

  docList: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 20px",
  } as React.CSSProperties,

  docItem: {
    padding: "8px 0",
    borderBottom: "1px solid #1e2535",
    fontSize: "14px",
    color: "#e8eaf0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  } as React.CSSProperties,

  tipBox: {
    backgroundColor: "#0c1c32",
    border: "1px solid #2563eb33",
    borderRadius: "10px",
    padding: "16px 20px",
    marginTop: "16px",
  } as React.CSSProperties,

  tipLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#60a5fa",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "6px",
  } as React.CSSProperties,

  tipText: {
    fontSize: "14px",
    color: "#e8eaf0",
  } as React.CSSProperties,

  errorBox: {
    backgroundColor: "#1c1010",
    border: "1px solid #ef444433",
    borderRadius: "10px",
    padding: "14px 18px",
    color: "#ef4444",
    fontSize: "14px",
    marginTop: "20px",
  } as React.CSSProperties,

  spinner: {
    display: "inline-block",
    width: "18px",
    height: "18px",
    border: "2px solid #ffffff44",
    borderTopColor: "#ffffff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    marginRight: "10px",
    verticalAlign: "middle",
  } as React.CSSProperties,
};

// ── Helper ────────────────────────────────────────────────────────────────

async function callIntel(payload: Record<string, string>) {
  const res = await fetch("/api/intel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// ── Sub-components ────────────────────────────────────────────────────────

function ProfileFields({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  return (
    <>
      <div style={s.fieldFull}>
        <label style={s.label}>Company Name</label>
        <input
          style={s.input}
          placeholder="e.g. Sri Murugan Exports Pvt Ltd"
          value={profile.company}
          onChange={(e) => onChange({ ...profile, company: e.target.value })}
        />
      </div>
      <div style={s.fieldGroup}>
        <div>
          <label style={s.label}>Products / HSN Codes</label>
          <input
            style={s.input}
            placeholder="e.g. Cotton knitwear, HSN 6109"
            value={profile.products}
            onChange={(e) => onChange({ ...profile, products: e.target.value })}
          />
        </div>
        <div>
          <label style={s.label}>Export Markets</label>
          <input
            style={s.input}
            placeholder="e.g. USA, UK, Germany"
            value={profile.markets}
            onChange={(e) => onChange({ ...profile, markets: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}

function LoadingBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }} disabled={loading}>
      {loading && <span style={s.spinner} />}
      {loading ? "Analysing…" : label}
    </button>
  );
}

// ── Feature 1: Health Check ───────────────────────────────────────────────

function HealthCheck({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.company || !profile.products || !profile.markets) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await callIntel({
        action: "health_check",
        company: profile.company,
        products: profile.products,
        markets: profile.markets,
      });
      setResult(data);
    } catch {
      setError("Could not generate report. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.card}>
      <div style={s.sectionTitle}>Export Health Check</div>
      <div style={s.sectionSub}>
        Enter your profile and see exactly where your exports are exposed — and where you&apos;re leaving money on the table.
      </div>
      <form onSubmit={handleSubmit}>
        <ProfileFields profile={profile} onChange={setProfile} />
        <LoadingBtn loading={loading} label="Run Health Check" />
      </form>
      {error && <div style={s.errorBox}>{error}</div>}
      {result && (
        <div style={s.resultBox}>
          <div style={s.moneyHighlight}>
            <div style={s.moneyLabel}>Estimated money left on the table last year</div>
            <div style={s.moneyValue}>{result.money_left}</div>
            <div style={s.moneySub}>In missed FTA benefits, overpaid duties &amp; preventable delays</div>
          </div>
          {result.findings?.map((f, i) => (
            <div key={i} style={s.findingCard(f.type)}>
              <div style={s.findingDot(f.type)} />
              <div>
                <div style={s.findingTitle}>{f.title}</div>
                <div style={s.findingDetail}>{f.detail}</div>
                <div style={s.findingImpact}>{f.impact}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Feature 2: Weekly Digest ──────────────────────────────────────────────

function WeeklyDigest({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DigestResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.company || !profile.products || !profile.markets) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await callIntel({
        action: "weekly_digest",
        company: profile.company,
        products: profile.products,
        markets: profile.markets,
      });
      setResult(data);
    } catch {
      setError("Could not generate digest. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function DigestSection({
    type,
    label,
    items,
  }: {
    type: "urgent" | "watch" | "opportunities";
    label: string;
    items: DigestItem[];
  }) {
    if (!items?.length) return null;
    return (
      <div style={s.digestSection(type)}>
        <div style={s.digestHeader(type)}>{label}</div>
        {items.map((item, i) => (
          <div key={i} style={i === items.length - 1 ? s.digestItemLast : s.digestItem}>
            <div style={s.digestHeadline}>{item.headline}</div>
            <div style={s.digestDetail}>{item.detail}</div>
            <div style={s.digestAction}>→ {item.action}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={s.card}>
      <div style={s.sectionTitle}>Weekly Intelligence Digest</div>
      <div style={s.sectionSub}>
        See a sample of the weekly briefing you&apos;d receive — urgent alerts, items to watch, and opportunities specific to your products and markets.
      </div>
      <form onSubmit={handleSubmit}>
        <ProfileFields profile={profile} onChange={setProfile} />
        <LoadingBtn loading={loading} label="Generate Sample Digest" />
      </form>
      {error && <div style={s.errorBox}>{error}</div>}
      {result && (
        <div style={s.resultBox}>
          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "20px", fontWeight: 600 }}>
            {result.week}
          </div>
          <DigestSection type="urgent" label="Urgent — Act Now" items={result.urgent} />
          <DigestSection type="watch" label="Watch — Monitor Closely" items={result.watch} />
          <DigestSection type="opportunities" label="Opportunities" items={result.opportunities} />
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
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await callIntel({ action: "shipment_check", hsn, destination, value });
      setResult(data);
    } catch {
      setError("Could not check shipment. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.card}>
      <div style={s.sectionTitle}>Shipment Check</div>
      <div style={s.sectionSub}>
        Before your shipment leaves, check the tariff rate, duty, required documents, and any port issues — plus one tip to save money.
      </div>
      <form onSubmit={handleSubmit}>
        <div style={s.fieldGroup}>
          <div>
            <label style={s.label}>HSN Code</label>
            <input
              style={s.input}
              placeholder="e.g. 6109"
              value={hsn}
              onChange={(e) => setHsn(e.target.value)}
            />
          </div>
          <div>
            <label style={s.label}>Destination Country</label>
            <input
              style={s.input}
              placeholder="e.g. United States"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
        </div>
        <div style={s.fieldFull}>
          <label style={s.label}>Shipment Value</label>
          <input
            style={s.input}
            placeholder="e.g. $50,000 or ₹40 lakh"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <LoadingBtn loading={loading} label="Check Shipment" />
      </form>
      {error && <div style={s.errorBox}>{error}</div>}
      {result && (
        <div style={s.resultBox}>
          <div style={s.statRow}>
            <div style={s.statBox}>
              <div style={s.statLabel}>Tariff Rate</div>
              <div style={{ ...s.statValue, color: "#ef4444" }}>{result.tariff_rate}</div>
            </div>
            <div style={s.statBox}>
              <div style={s.statLabel}>Estimated Duty</div>
              <div style={{ ...s.statValue, color: "#eab308" }}>{result.estimated_duty}</div>
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <div style={s.label}>Required Documents</div>
            <ul style={s.docList}>
              {result.documents?.map((doc, i) => (
                <li key={i} style={s.docItem}>
                  <span style={{ color: "#22c55e", fontSize: "12px" }}>✓</span>
                  {doc}
                </li>
              ))}
            </ul>
          </div>
          {result.port_issues && (
            <div style={{ marginBottom: "16px" }}>
              <div style={s.label}>Port &amp; Customs Notes</div>
              <div style={{ fontSize: "14px", color: "#9ca3af" }}>{result.port_issues}</div>
            </div>
          )}
          <div style={s.tipBox}>
            <div style={s.tipLabel}>Money-Saving Tip</div>
            <div style={s.tipText}>{result.money_tip}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function Home() {
  const [tab, setTab] = useState<"health" | "digest" | "shipment">("health");
  const [profile, setProfile] = useState<Profile>({ company: "", products: "", markets: "" });

  return (
    <div style={s.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px #2563eb22; }
        button:hover:not(:disabled) { background-color: #1d4ed8 !important; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <header style={s.header}>
        <div style={s.logo}>
          Trade<span style={s.logoAccent}>Intel</span>
        </div>
        <div style={s.tagline}>Trade intelligence for Indian textile exporters</div>
      </header>

      <div style={s.hero}>
        <div style={s.badge}>Live Intelligence · No Login Required</div>
        <h1 style={s.heroTitle}>
          Know what&apos;s changing before<br />it costs you money
        </h1>
        <p style={s.heroSub}>
          US tariffs at 63.9% · India-UK FTA live · EU CBAM from Q1 2026 — enter your profile and get intelligence specific to your products and markets, right now.
        </p>
      </div>

      <main style={s.main}>
        <div style={s.tabs}>
          <button style={s.tab(tab === "health")} onClick={() => setTab("health")}>
            Health Check
          </button>
          <button style={s.tab(tab === "digest")} onClick={() => setTab("digest")}>
            Weekly Digest
          </button>
          <button style={s.tab(tab === "shipment")} onClick={() => setTab("shipment")}>
            Shipment Check
          </button>
        </div>

        {tab === "health" && <HealthCheck profile={profile} setProfile={setProfile} />}
        {tab === "digest" && <WeeklyDigest profile={profile} setProfile={setProfile} />}
        {tab === "shipment" && <ShipmentCheck />}
      </main>
    </div>
  );
}
