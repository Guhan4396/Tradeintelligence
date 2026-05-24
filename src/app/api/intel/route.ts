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

function buildHealthCheckPrompt(company: string, exportRows: UnifiedExportRow[]): string {
  const rowsText = exportRows
    .map(
      (r, i) =>
        `  Row ${i + 1}: Product=${r.product}${r.hsn ? ` (HSN: ${r.hsn})` : ""}, Country=${r.country}, Date=${r.date}, Amount=₹${r.amount} lakh, Tariff Paid=₹${r.tariffPaid} lakh`
    )
    .join("\n");

  return `You are a trade intelligence analyst specialising in Indian textile exports.

Company: ${company}

Export history (each row is one shipment — product, destination, value, tariff, date):
${rowsText}

CRITICAL INSTRUCTION: Evaluate each export row using ONLY the tariff/FTA/regulatory rules that were in force AS OF THAT SPECIFIC EXPORT DATE. Do not apply rules that had not yet come into effect on the export date.

Key regulatory timeline (apply strictly by date):
- India-UK FTA duty-free: in force from 1 July 2025 ONLY — do NOT apply for any export dated before 1 July 2025
- India-UAE CEPA: in force since May 2022 — applicable for exports from May 2022 onwards
- India-Australia ECTA: in force from December 2022 — applicable for exports from December 2022 onwards
- EU CBAM carbon reporting: applicable from Q1 2026 ONLY — do NOT apply for exports before 1 January 2026
- US tariff on Indian textiles: escalated through 2025, approximately 63.9% effective rate
- RoDTEP scheme: ongoing from January 2021 — applicable for exports from January 2021 onwards

For each row, identify:
- Whether the exporter could have used an FTA or scheme that was available on that date to reduce duty
- The actual potential saving in ₹ lakh
- A concise loophole explanation and a specific fix

Return ONLY valid JSON (no markdown fences, no extra text) in exactly this shape:
{
  "totalSavings": <number in lakh, sum of all potentialSaving values>,
  "exports": [
    {
      "product": "<product name>",
      "hsn": "<HSN code or empty string>",
      "country": "<country>",
      "date": "<date>",
      "amountExported": "₹<amount> lakh",
      "tariffPaid": "₹<tariffPaid> lakh",
      "potentialSaving": "₹<number> lakh",
      "loophole": "<why this saving was available>",
      "fix": "<specific actionable fix>"
    }
  ],
  "additionalFindings": ["<finding 1>", "<finding 2>"]
}`;
}

function buildWeeklyDigestPrompt(company: string, exportRows: UnifiedExportRow[]): string {
  const rowLines = exportRows
    .map((r) => `  - ${r.product}${r.hsn ? ` (HSN: ${r.hsn})` : ""} → ${r.country} (reference date: ${r.date})`)
    .join("\n");

  return `You are a trade intelligence analyst specialising in Indian textile exports.

Company: ${company}

Export records to analyse (product → destination, as of the reference date):
${rowLines}

CRITICAL INSTRUCTION: Only generate digest items that are specifically relevant to one of the product+country+date combinations listed above. Every item must map to a specific product, HSN code (if provided), country, and reference date. Do not surface regulations that came into force after the reference date. Do not include generic items.

Key regulatory timeline (apply strictly by date):
- India-UK FTA duty-free: in force from 1 July 2025 ONLY
- India-UAE CEPA: in force since May 2022
- India-Australia ECTA: in force from December 2022
- EU CBAM carbon reporting: applicable from Q1 2026 ONLY
- US tariff on Indian textiles: ~63.9% effective rate through 2025
- RoDTEP scheme: ongoing from January 2021

Return ONLY valid JSON (no markdown fences, no extra text) in exactly this shape:
{
  "urgent": [
    { "title": "<short headline>", "detail": "<2-3 sentence detail specific to the product+country>", "country": "<country>", "referenceDate": "<YYYY-MM-DD>", "product": "<product name>", "hsn": "<HSN code>" }
  ],
  "watch": [
    { "title": "<short headline>", "detail": "<2-3 sentence detail>", "country": "<country>", "referenceDate": "<YYYY-MM-DD>", "product": "<product name>", "hsn": "<HSN code>" }
  ],
  "opportunities": [
    { "title": "<short headline>", "detail": "<2-3 sentence detail>", "country": "<country>", "referenceDate": "<YYYY-MM-DD>", "product": "<product name>", "hsn": "<HSN code>" }
  ]
}

Include 2-3 items per section. Be concrete, specific, and actionable.`;
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
      max_tokens: 2048,
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
      const { company, exportRows } = body as {
        company: string;
        exportRows: UnifiedExportRow[];
      };
      prompt = buildWeeklyDigestPrompt(company, exportRows);
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

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Intel API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
