import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

function buildHealthCheckPrompt(company: string, products: string, markets: string) {
  return `You are a trade intelligence analyst specializing in Indian textile exports.

A textile exporter has provided their profile:
- Company: ${company}
- Products/HSN codes: ${products}
- Export markets: ${markets}

Generate a Health Check report. Return ONLY valid JSON with this exact structure:
{
  "money_left": "₹X-Y lakh",
  "findings": [
    {
      "type": "tariff_exposure",
      "title": "string",
      "detail": "string",
      "impact": "string"
    },
    {
      "type": "fta_missed",
      "title": "string",
      "detail": "string",
      "impact": "string"
    },
    {
      "type": "upcoming_risk",
      "title": "string",
      "detail": "string",
      "impact": "string"
    },
    {
      "type": "growth_opportunity",
      "title": "string",
      "detail": "string",
      "impact": "string"
    }
  ]
}

Be specific to their products and markets. Reference real current tariff regimes (US 63.9% effective tariff on Indian textiles, India-UK FTA since July 2025, EU CBAM from Q1 2026). Make the money_left figure realistic for a ₹50-100 crore exporter. Return only the JSON, no other text.`;
}

function buildDigestPrompt(company: string, products: string, markets: string) {
  return `You are a trade intelligence analyst specializing in Indian textile exports.

Exporter profile:
- Company: ${company}
- Products/HSN codes: ${products}
- Export markets: ${markets}

Generate a sample Weekly Intelligence Digest. Return ONLY valid JSON with this exact structure:
{
  "week": "Week of May 19-25, 2026",
  "urgent": [
    {
      "headline": "string",
      "detail": "string",
      "action": "string"
    }
  ],
  "watch": [
    {
      "headline": "string",
      "detail": "string",
      "action": "string"
    }
  ],
  "opportunities": [
    {
      "headline": "string",
      "detail": "string",
      "action": "string"
    }
  ]
}

Include 2-3 items per category. Be specific to their products and markets. Reference real regulatory changes: US tariffs, India-UK FTA (live July 2025), EU CBAM (Q1 2026), DGFT notifications, CBIC circulars. Make it feel like real intelligence they would act on. Return only the JSON, no other text.`;
}

function buildShipmentPrompt(hsn: string, destination: string, value: string) {
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
      max_tokens: 1024,
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
      prompt = buildHealthCheckPrompt(body.company, body.products, body.markets);
    } else if (action === "weekly_digest") {
      prompt = buildDigestPrompt(body.company, body.products, body.markets);
    } else if (action === "shipment_check") {
      prompt = buildShipmentPrompt(body.hsn, body.destination, body.value);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const text = await callClaude(prompt, apiKey);
    const jsonText = text.replace(/```json\n?|\n?```/g, "").trim();
    const data = JSON.parse(jsonText);

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Intel API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
