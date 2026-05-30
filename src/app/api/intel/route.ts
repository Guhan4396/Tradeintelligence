import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

type UnifiedExportRow = {
  product: string;
  hsn: string;
  country: string;
  amount: string;
  tariffPaid: string;
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

function buildHealthCheckPrompt(company: string, exportRows: UnifiedExportRow[]): string {
  const rowsText = exportRows
    .map(
      (r, i) =>
        `  Row ${i + 1}: Product=${r.product}${r.hsn ? ` (HSN: ${r.hsn})` : ""}, Country=${r.country}, Date=${r.date}, Amount=₹${r.amount}, Tariff Paid=₹${r.tariffPaid}`
    )
    .join("\n");

  return `You are a trade intelligence analyst specialising in Indian textile exports.

Company: ${company}

Export history (each row is one shipment — product, destination, value in rupees, tariff paid in rupees, date):
${rowsText}

CRITICAL INSTRUCTION: Evaluate each export row using ONLY the tariff/FTA/regulatory rules that were in force AS OF THAT SPECIFIC EXPORT DATE. Do not apply rules that had not yet come into effect on the export date.

AMOUNT INSTRUCTIONS: All amounts are in Indian rupees. Never use the word "lakh" or "crore". Express every figure as a plain integer rupee amount (e.g. 1346750, not "₹13.46 lakh").

Key regulatory timeline (apply strictly by date):
- India-UK FTA duty-free: in force from 1 July 2025 ONLY — do NOT apply for any export dated before 1 July 2025
- India-UAE CEPA: in force since May 2022 — applicable for exports from May 2022 onwards
- India-Australia ECTA: in force from December 2022 — applicable for exports from December 2022 onwards
- EU CBAM carbon reporting: applicable from Q1 2026 ONLY — do NOT apply for exports before 1 January 2026
- US tariff on Indian textiles: escalated through 2025, approximately 63.9% effective rate
- RoDTEP scheme: ongoing from January 2021 — applicable for exports from January 2021 onwards

For each row, build a savingsBreakdown: a list of individual saving line items. Each item must have a concrete basis (a named scheme, a specific rate, a rule) that was valid on the export date. Do NOT invent numbers for schemes you are not confident applied on that date.

ARITHMETIC RULE: Set potentialSaving to the EXACT arithmetic sum of the savingsBreakdown amounts. Do not report a total that differs from the sum. Every rupee in the total must map to a named line item.

Return ONLY valid JSON (no markdown fences, no extra text) in exactly this shape:
{
  "totalSavings": <integer — sum of all rows' potentialSaving>,
  "exports": [
    {
      "product": "<product name>",
      "hsn": "<HSN code or empty string>",
      "country": "<country>",
      "date": "<YYYY-MM-DD>",
      "amountExported": <integer rupees>,
      "tariffPaid": <integer rupees>,
      "potentialSaving": <integer rupees — exact sum of savingsBreakdown amounts>,
      "savingsBreakdown": [
        { "label": "<scheme or rule name>", "amount": <integer rupees>, "basis": "<why this applies and on what date>" }
      ],
      "loophole": "<why this saving was available — no lakh/crore words>",
      "fix": "<specific actionable fix — no lakh/crore words>"
    }
  ],
  "additionalFindings": ["<finding — no lakh/crore words>"]
}`;
}

function buildWeeklyDigestPrompt(query: string): string {
  const today = new Date().toISOString().slice(0, 10);

  return `You are a trade intelligence analyst specialising in Indian textile exports. Today's date is ${today}.

The user wants a current intelligence digest for: "${query}"

Interpret this as one or more product-market combinations. Examples of valid inputs:
- "cotton T-shirts for USA" → cotton T-shirts exported to USA
- "wool, USA, UK" → wool products for USA and UK markets
- "leather for Germany, cotton for UK" → two separate combinations

For each relevant product-market combination, generate current intelligence covering what Indian textile exporters need to know RIGHT NOW.

Current regulatory context as of ${today}:
- India-UK FTA: ACTIVE since 1 Jul 2025 — zero duty available for qualifying textiles to UK
- India-UAE CEPA: ACTIVE since May 2022
- India-Australia ECTA: ACTIVE since Dec 2022
- EU CBAM Phase 1: ACTIVE from Jan 2026 — embedded carbon reporting now required for EU exports
- US tariffs on Indian textiles: ~63.9% effective rate, ongoing through 2025-2026
- RoDTEP scheme: ongoing — exporters should be claiming this rebate
- India-EU FTA: under negotiation, not yet in force

Only include items that are:
1. Relevant to Indian exporters of the specified products to the specified markets
2. Current as of today (${today}) — not historical
3. Concrete, specific, and actionable

Return ONLY valid JSON (no markdown fences, no extra text):
{
  "urgent": [
    { "title": "<short headline>", "detail": "<2-3 sentences — what it means and what to do>", "country": "<destination country>", "referenceDate": "${today}", "product": "<product>", "hsn": "<HSN if known, else empty>" }
  ],
  "watch": [
    { "title": "<short headline>", "detail": "<2-3 sentences>", "country": "<country>", "referenceDate": "${today}", "product": "<product>", "hsn": "" }
  ],
  "opportunities": [
    { "title": "<short headline>", "detail": "<2-3 sentences — specific scheme or rate available now>", "country": "<country>", "referenceDate": "${today}", "product": "<product>", "hsn": "" }
  ]
}

2-3 items per section. Be specific and actionable. Do not invent regulations that do not exist.`;
}

function buildShipmentPrompt(hsn: string, destination: string, value: string): string {
  return `You are a trade compliance specialist for Indian textile exports.

Shipment details:
- HSN code: ${hsn}
- Destination country: ${destination}
- Shipment value: ${value} (assume USD if no currency given)

Generate a Shipment Check report. Return ONLY valid JSON with this exact structure:
{
  "hsn": "${hsn}",
  "destination": "${destination}",
  "tariff_rate": "X%",
  "estimated_duty": "Rs X lakh / $X",
  "documents": ["document 1", "document 2", "document 3", "document 4"],
  "port_issues": "string describing any recent port or customs issues for this route",
  "money_tip": "string with one specific actionable tip to reduce duty or improve compliance"
}

Use real tariff data where possible. For US destination, apply the current 26-63.9% effective tariff regime on Indian textiles. For UK, note India-UK FTA preferences if the HSN qualifies. For EU, note CBAM if applicable. Be specific and actionable. Return only the JSON, no other text.`;
}

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

// Parse any monetary value the model might return to a plain integer rupees.
// Handles: numbers, strings with ₹/commas, "X lakh", "X crore".
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
    // Normalise all monetary fields to integers
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

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { action } = body;

    let prompt: string;

    if (action === "health_check") {
      const { company, exportRows } = body as {
        company: string;
        exportRows: UnifiedExportRow[];
      };
      prompt = buildHealthCheckPrompt(company, exportRows);
    } else if (action === "weekly_digest") {
      const { query } = body as { query: string };
      prompt = buildWeeklyDigestPrompt(query);
    } else if (action === "shipment_check") {
      const { hsn, destination, value } = body as {
        hsn: string;
        destination: string;
        value: string;
      };
      prompt = buildShipmentPrompt(hsn, destination, value);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const text = await callClaude(prompt, apiKey);
    const jsonText = text.replace(/```json\n?|\n?```/g, "").trim();

    let data: unknown;
    try {
      data = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 }
      );
    }

    if (action === "health_check") {
      data = enforceHealthArithmetic(data as HealthResultRaw);
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Intel API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
