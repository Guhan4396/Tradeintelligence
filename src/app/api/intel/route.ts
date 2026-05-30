import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

type Mode = "export" | "import";

type ExportHealthRow = {
  product: string;
  hsn: string;
  country: string;       // destination
  amount: string;
  rebateClaimed: string; // RoDTEP / Drawback / RoSCTL already claimed (₹)
  incoterm: string;      // FOB / CIF / DDP / Other
  date: string;
};

type ImportHealthRow = {
  product: string;
  hsn: string;
  country: string;    // source
  amount: string;
  dutyPaid: string;   // total Indian customs duty paid (₹)
  ftaClaimed: string; // "yes" | "no"
  date: string;
};

type SavingsItem = { label: string; amount: number; basis: string };

type HealthExportRaw = {
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

type HealthResultRaw = {
  totalSavings: number;
  exports: HealthExportRaw[];
  additionalFindings: string[];
};

type DigestItemRaw = {
  title: string;
  detail: string;
  country: string;
  referenceDate?: string;
  product?: string;
  hsn?: string;
  section?: string;
};

type DigestResultRaw = {
  urgent: DigestItemRaw[];
  watch: DigestItemRaw[];
  opportunities: DigestItemRaw[];
};

// ── Prompt builders ───────────────────────────────────────────────────────

function buildExportHealthPrompt(company: string, rows: ExportHealthRow[], countries: string[]): string {
  const countryList = countries.join(", ");
  const rowsText = rows
    .map((r, i) =>
      `  Row ${i + 1}: Product=${r.product}${r.hsn ? ` (HSN: ${r.hsn})` : ""}` +
      `, DestinationCountry=${r.country}, Date=${r.date}` +
      `, ExportValue=₹${r.amount}` +
      `, RebateAlreadyClaimed=₹${r.rebateClaimed || "0"}` +
      `, Incoterm=${r.incoterm}`
    )
    .join("\n");

  return `You are a trade intelligence analyst specialising in Indian textile exports.

Company: ${company}
Mode: EXPORT (Indian exporter sending goods abroad)

COUNTRY CONSTRAINT — THIS IS NON-NEGOTIABLE:
The user's destination countries are ONLY: ${countryList}
ONLY generate content about the countries in this list: [${countryList}]
Do NOT mention, reference, or surface any intelligence about any country not in this list.
Every item you return must be tagged with one of the listed countries and that country only.
If you have nothing relevant to say about a listed country, return fewer items — do not pad with content about other countries.

CRITICAL: India does NOT charge export duty on textiles/apparel. The exporter's cost exposure is entirely on the Indian side (unclaimed rebates) and the destination side only if Incoterm is DDP or CIF.

Export records (each row is one shipment):
${rowsText}

AMOUNT INSTRUCTIONS: All amounts in Indian rupees as plain integers. Never use "lakh" or "crore".

Key regulatory timeline (apply strictly by date):
- India-UK FTA duty-free: in force from 1 July 2025 ONLY
- India-UAE CEPA: in force since May 2022
- India-Australia ECTA: in force from December 2022
- EU CBAM carbon reporting: applicable from Q1 2026 ONLY
- US tariff on Indian textiles: ~63.9% effective rate through 2025-2026
- RoDTEP scheme: ongoing from January 2021
- RoSCTL scheme: ongoing for apparel/made-ups
- Drawback: ongoing

For each row, analyse based on rules valid AS OF THAT ROW'S EXPORT DATE, against these five categories:
1. UNCLAIMED RoDTEP / DRAWBACK / RoSCTL — Indian-side rebate gap for that HSN on that date (compare RebateAlreadyClaimed vs estimated entitlement)
2. FTA READINESS FOR BUYER COMPETITIVENESS — was a destination FTA available that the exporter's documentation didn't qualify for, costing buyer price power
3. INCOTERMS-SPECIFIC EXPOSURE — if DDP or CIF: include destination duty as exporter cost; if FOB: exclude destination duty from exporter's leakage
4. COMPLIANCE COST / MARKET ACCESS RISK — CBAM (Q1 2026), forced-labour cotton rules, REACH, etc., specifically for the destination country
5. DOCUMENTATION / PORT RISK — common rejection or demurrage causes at the specific destination port

Tag each breakdown line with a category name from the list above verbatim, and with the specific country from the user's list.
Do NOT include any line for a country not in the user's list: [${countryList}]

ARITHMETIC RULE: Set potentialSaving = exact arithmetic sum of savingsBreakdown amounts.

Return ONLY valid JSON (no markdown fences, no extra text):
{
  "totalSavings": <integer — sum of all rows' potentialSaving>,
  "exports": [
    {
      "product": "<product>",
      "hsn": "<HSN or empty>",
      "country": "<must be one of: ${countryList}>",
      "date": "<YYYY-MM-DD>",
      "amountExported": <integer rupees>,
      "tariffPaid": <integer rupees — RebateAlreadyClaimed value from input>,
      "potentialSaving": <integer rupees — exact sum of savingsBreakdown>,
      "savingsBreakdown": [
        { "label": "<CATEGORY: specific scheme or rule>", "amount": <integer rupees>, "basis": "<why this applies and on what date>" }
      ],
      "loophole": "<why this saving was available>",
      "fix": "<specific actionable fix>"
    }
  ],
  "additionalFindings": ["<finding specific to user's countries only>"]
}`;
}

function buildImportHealthPrompt(company: string, rows: ImportHealthRow[], countries: string[]): string {
  const countryList = countries.join(", ");
  const rowsText = rows
    .map((r, i) =>
      `  Row ${i + 1}: Product=${r.product}${r.hsn ? ` (HSN: ${r.hsn})` : ""}` +
      `, SourceCountry=${r.country}, Date=${r.date}` +
      `, AssessableValue=₹${r.amount}` +
      `, CustomsDutyPaid=₹${r.dutyPaid}` +
      `, FTAClaimed=${r.ftaClaimed}`
    )
    .join("\n");

  return `You are a trade intelligence analyst specialising in Indian textile imports.

Company: ${company}
Mode: IMPORT (Indian importer bringing goods into India)

COUNTRY CONSTRAINT — THIS IS NON-NEGOTIABLE:
The user's source countries are ONLY: ${countryList}
ONLY generate content about the countries in this list: [${countryList}]
Do NOT mention, reference, or surface any intelligence about any country not in this list.
Every item you return must be tagged with one of the listed countries and that country only.
If you have nothing relevant to say about a listed country, return fewer items — do not pad with content about other countries.

CRITICAL: The Indian government charges import duty at the port. Components: BCD (Basic Customs Duty) + IGST + AIDC (Agriculture Infrastructure Development Cess) + Social Welfare Surcharge (SWS on BCD) + anti-dumping where applicable.

Import records (each row is one shipment):
${rowsText}

AMOUNT INSTRUCTIONS: All amounts in Indian rupees as plain integers. Never use "lakh" or "crore".

Key Indian FTA timeline (apply strictly by date):
- India-UAE CEPA: active since May 2022 — preferential BCD for qualifying textiles from UAE
- India-Japan CEPA: active since August 2011
- India-Korea CEPA: active since January 2010
- India-ASEAN FTA: active since January 2010
- India-Australia ECTA: active since December 2022
- SAFTA: active for SAARC members including Bangladesh, Sri Lanka
- India-EFTA Trade & Economic Partnership Agreement: signed March 2024, not yet in force
- India-UK FTA: in force from 1 July 2025 ONLY

For each row, analyse based on rules valid AS OF THE IMPORT DATE, against these five categories:
1. UNCLAIMED IMPORT FTA / PREFERENTIAL DUTY — was an Indian FTA preferential or zero BCD available from the source country on that date that the importer did not claim?
2. HSN MISCLASSIFICATION — could a more precise 8-digit Indian HSN sub-classification have yielded a lower BCD or exemption from AIDC or anti-dumping?
3. IGST CASH FLOW / REFUND OPPORTUNITIES — input tax credit, drawback on inputs used for re-export
4. SCHEME ELIGIBILITY — Advance Authorisation, EPCG, MOOWR, SEZ routing options
5. ANTI-DUMPING / SAFEGUARD DUTY EXPOSURE — anti-dumping duties currently in force on this HSN from this specific source country

Tag each breakdown line with a category name from the list above verbatim, and with the specific source country from the user's list.
Do NOT include any line for a country not in the user's list: [${countryList}]

ARITHMETIC RULE: Set potentialSaving = exact arithmetic sum of savingsBreakdown amounts.

Return ONLY valid JSON (no markdown fences, no extra text):
{
  "totalSavings": <integer — sum of all rows' potentialSaving>,
  "exports": [
    {
      "product": "<product>",
      "hsn": "<HSN or empty>",
      "country": "<must be one of: ${countryList}>",
      "date": "<YYYY-MM-DD>",
      "amountExported": <integer rupees — AssessableValue from input>,
      "tariffPaid": <integer rupees — CustomsDutyPaid from input>,
      "potentialSaving": <integer rupees — exact sum of savingsBreakdown>,
      "savingsBreakdown": [
        { "label": "<CATEGORY: specific scheme or rule>", "amount": <integer rupees>, "basis": "<why this applies and on what date>" }
      ],
      "loophole": "<why this saving was available>",
      "fix": "<specific actionable fix>"
    }
  ],
  "additionalFindings": ["<finding specific to user's source countries only>"]
}`;
}

function buildWeeklyDigestPrompt(
  mode: Mode,
  countries: string[],
  countryDateMap: Record<string, string>,
  productHsnMap: Record<string, { product: string; hsn: string }[]>
): string {
  const today = new Date().toISOString().slice(0, 10);
  const countryList = countries.join(", ");
  const dateLines = countries.map((c) => `  ${c}: ${countryDateMap[c] || today}`).join("\n");
  const productLines = countries
    .map((c) => {
      const items = productHsnMap[c] || [];
      return `  ${c}: ${items.length > 0 ? items.map((p) => `${p.product}${p.hsn ? ` (HSN ${p.hsn})` : ""}`).join(", ") : "not specified"}`;
    })
    .join("\n");

  const modeDesc = mode === "export"
    ? "Indian textile EXPORTER — sending goods from India to foreign destinations"
    : "Indian textile IMPORTER — bringing goods from foreign sources into India";

  const regulatoryContext = mode === "export"
    ? `- India-UK FTA: ACTIVE since 1 Jul 2025 — zero duty for qualifying textiles to UK
- India-UAE CEPA: ACTIVE since May 2022 — preference for goods to UAE
- India-Australia ECTA: ACTIVE since Dec 2022
- EU CBAM Phase 1: ACTIVE from Jan 2026 — carbon reporting required for EU exports
- US tariffs on Indian textiles: ~63.9% effective rate
- RoDTEP and Drawback: ongoing rebate schemes for exporters`
    : `- India-UAE CEPA: ACTIVE since May 2022 — preferential BCD for UAE-origin textiles
- India-Japan CEPA: ACTIVE since 2011
- India-Korea CEPA: ACTIVE since 2010
- India-ASEAN FTA: ACTIVE since 2010
- India-Australia ECTA: ACTIVE since Dec 2022
- India-UK FTA: ACTIVE from 1 Jul 2025
- Anti-dumping duties: multiple HSNs covered, country-specific`;

  return `You are a trade intelligence analyst. Today's date is ${today}.

User mode: ${modeDesc}

COUNTRY CONSTRAINT — NON-NEGOTIABLE:
The user cares ONLY about these countries: [${countryList}]
ONLY generate content about the countries in this list.
Do NOT mention, reference, or surface any intelligence about any country not in this list.
Every item you return must be tagged with one of the listed countries and that country only.
If you have no genuine item for a country, leave that country out — do not pad.

Country reference dates:
${dateLines}

Products per country:
${productLines}

Current regulatory context (${today}):
${regulatoryContext}

Generate Urgent / Watch / Opportunities items relevant ONLY to the listed countries on or around their reference dates.
Each item must be specific to ONE country from the user's list and anchored to that country's reference date.
Every item must be tagged with one of the listed countries.

Item rules:
- Must be relevant to ${mode === "export" ? "Indian exporters" : "Indian importers"} for the specific product-country combination
- Must be current as of the reference date — not historical
- Must be concrete, specific, and actionable
- Must reference the country name exactly as in the user's list

Return ONLY valid JSON (no markdown fences, no extra text):
{
  "urgent": [
    {
      "section": "urgent",
      "title": "<short headline>",
      "detail": "<2-3 sentences — what it means and what to do>",
      "country": "<must be one of: ${countryList}>",
      "referenceDate": "<that country's reference date from the map above>",
      "product": "<product from user inputs if applicable, else empty>",
      "hsn": "<HSN if known, else empty>"
    }
  ],
  "watch": [
    {
      "section": "watch",
      "title": "<short headline>",
      "detail": "<2-3 sentences>",
      "country": "<must be one of: ${countryList}>",
      "referenceDate": "<that country's reference date>",
      "product": "<product>",
      "hsn": ""
    }
  ],
  "opportunities": [
    {
      "section": "opportunities",
      "title": "<short headline>",
      "detail": "<2-3 sentences — specific scheme or rate available now>",
      "country": "<must be one of: ${countryList}>",
      "referenceDate": "<that country's reference date>",
      "product": "<product>",
      "hsn": ""
    }
  ]
}

2-3 items per section maximum. Be specific and actionable. Do not invent regulations.`;
}

function buildExportShipmentPrompt(hsn: string, destination: string, value: string, incoterm: string): string {
  return `You are a trade compliance specialist for Indian textile exports.

Mode: EXPORT (Indian exporter → foreign destination)

Shipment details:
- HSN code: ${hsn}
- Destination country: ${destination}
- Shipment value: ₹${value}
- Incoterm: ${incoterm}

COUNTRY CONSTRAINT: All output must relate ONLY to ${destination}. Do NOT compare with or reference other countries.

CRITICAL: India does NOT charge export duty on textiles or apparel. State this clearly.
Incoterm = ${incoterm}: ${incoterm === "DDP" || incoterm === "CIF" ? "Destination duty IS the exporter's cost — include it in analysis." : "Destination duty is the BUYER's cost — do NOT frame it as exporter's leakage."}

Return ONLY valid JSON:
{
  "hsn": "${hsn}",
  "destination": "${destination}",
  "tariff_rate": "<duty rate at ${destination} for this HSN>",
  "estimated_duty": "<estimated duty at ${destination} on ₹${value} shipment>",
  "indian_export_duty": "None — Indian textiles/apparel are not subject to Indian export duty",
  "indian_schemes": [
    "<RoDTEP rate for this HSN with rebate estimate>",
    "<Drawback rate/eligibility>",
    "<RoSCTL if applicable>"
  ],
  "fta_at_destination": "<applicable India-${destination} FTA and documentation needed, or 'No FTA currently in force' if none>",
  "documents": ["<doc1>", "<doc2>", "<doc3>", "<doc4>", "<doc5>"],
  "port_notes": "<port and customs notes specific to ${destination}>",
  "money_tip": "<one specific actionable tip to reduce duty or improve compliance for ${destination}>"
}`;
}

function buildImportShipmentPrompt(hsn: string, source: string, value: string): string {
  return `You are a trade compliance specialist for Indian textile imports.

Mode: IMPORT (foreign source → Indian importer)

Shipment details:
- HSN code: ${hsn}
- Source country: ${source}
- Shipment value (assessable): ₹${value}

COUNTRY CONSTRAINT: All output must relate ONLY to ${source}. Do NOT compare with or reference other countries.

Indian duty structure to apply:
- BCD (Basic Customs Duty): rate for this HSN
- IGST: standard rate on (assessable value + BCD)
- AIDC (Agriculture Infrastructure Development Cess): if applicable
- SWS (Social Welfare Surcharge): 10% of BCD
- Anti-dumping / safeguard: if in force for this HSN from ${source}

FTA check: Is there an India-${source} FTA or preferential trade agreement that offers reduced BCD? If yes, specify the rate and the Certificate of Origin type needed.

Return ONLY valid JSON:
{
  "hsn": "${hsn}",
  "source": "${source}",
  "bcd_rate": "<BCD % for this HSN>",
  "igst_rate": "<IGST %>",
  "aidc": "<AIDC % or 'Nil'>",
  "sws": "<SWS amount or %>",
  "total_duty": "<total estimated duty on ₹${value} assessable value>",
  "fta_preferential": "<FTA preferential BCD rate from ${source} if available, with CoO type needed — or 'No applicable FTA' if none>",
  "anti_dumping": "<anti-dumping or safeguard duty in force for this HSN from ${source} — or 'None identified'>",
  "scheme_options": [
    "<Advance Authorisation eligibility>",
    "<EPCG eligibility>",
    "<MOOWR eligibility>",
    "<SEZ routing option>"
  ],
  "documents": ["<doc1>", "<doc2>", "<doc3>", "<doc4>", "<doc5>"],
  "money_tip": "<one specific actionable tip for this import from ${source}>"
}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.content[0].text as string;
}

function parseToRupees(v: unknown): number {
  if (typeof v === "number") return Math.round(v);
  if (typeof v !== "string") return 0;
  const s = v.toLowerCase().replace(/[₹,\s]/g, "");
  const lakhMatch = s.match(/^([\d.]+)\s*lakh/);
  if (lakhMatch) return Math.round(parseFloat(lakhMatch[1]) * 100_000);
  const croreMatch = s.match(/^([\d.]+)\s*crore/);
  if (croreMatch) return Math.round(parseFloat(croreMatch[1]) * 1_00_00_000);
  const plain = parseFloat(s);
  return isNaN(plain) ? 0 : Math.round(plain);
}

function enforceHealthArithmetic(data: HealthResultRaw): HealthResultRaw {
  if (!Array.isArray(data.exports)) return data;
  let runningTotal = 0;
  for (const exp of data.exports) {
    exp.amountExported = parseToRupees(exp.amountExported);
    exp.tariffPaid = parseToRupees(exp.tariffPaid);
    if (Array.isArray(exp.savingsBreakdown) && exp.savingsBreakdown.length > 0) {
      for (const item of exp.savingsBreakdown) {
        item.amount = parseToRupees(item.amount);
      }
      exp.potentialSaving = exp.savingsBreakdown.reduce((sum, item) => sum + item.amount, 0);
    } else {
      exp.potentialSaving = parseToRupees(exp.potentialSaving);
    }
    runningTotal += exp.potentialSaving;
  }
  data.totalSavings = runningTotal;
  return data;
}

function filterHealthByCountries(data: HealthResultRaw, allowed: Set<string>): HealthResultRaw {
  data.exports = data.exports.filter((e) => allowed.has(e.country.toLowerCase()));
  return enforceHealthArithmetic(data);
}

function filterDigestByCountries(data: DigestResultRaw, allowed: Set<string>): DigestResultRaw {
  const filter = (items: DigestItemRaw[]) =>
    items.filter((item) => item.country && allowed.has(item.country.toLowerCase()));
  data.urgent = filter(data.urgent || []);
  data.watch = filter(data.watch || []);
  data.opportunities = filter(data.opportunities || []);
  return data;
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { action, mode } = body as { action: string; mode?: Mode };

    let prompt: string;
    let countries: string[] = [];

    if (action === "health_check") {
      const { company, rows } = body as {
        company: string;
        rows: ExportHealthRow[] | ImportHealthRow[];
        countries: string[];
      };
      countries = (body.countries as string[]) || [];
      if (mode === "import") {
        prompt = buildImportHealthPrompt(company, rows as ImportHealthRow[], countries);
      } else {
        prompt = buildExportHealthPrompt(company, rows as ExportHealthRow[], countries);
      }
    } else if (action === "weekly_digest") {
      const { countryDateMap, productHsnMap } = body as {
        countries: string[];
        countryDateMap: Record<string, string>;
        productHsnMap: Record<string, { product: string; hsn: string }[]>;
      };
      countries = (body.countries as string[]) || [];
      prompt = buildWeeklyDigestPrompt(mode || "export", countries, countryDateMap, productHsnMap);
    } else if (action === "shipment_check") {
      if (mode === "import") {
        const { source, value } = body as { hsn: string; source: string; value: string };
        countries = [source];
        prompt = buildImportShipmentPrompt(body.hsn as string, source, value);
      } else {
        const { destination, value, incoterm } = body as { hsn: string; destination: string; value: string; incoterm?: string };
        countries = [destination];
        prompt = buildExportShipmentPrompt(body.hsn as string, destination, value, incoterm || "FOB");
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const text = await callClaude(prompt, apiKey);
    const jsonText = text.replace(/```json\n?|\n?```/g, "").trim();

    let data: unknown;
    try {
      data = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 500 });
    }

    // Server-side country filter — safety net regardless of model output
    const allowedSet = new Set(countries.map((c) => c.toLowerCase()));

    if (action === "health_check") {
      data = filterHealthByCountries(data as HealthResultRaw, allowedSet);
    } else if (action === "weekly_digest") {
      data = filterDigestByCountries(data as DigestResultRaw, allowedSet);
    }
    // shipment_check inherently concerns one country — no list filtering needed

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Intel API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
