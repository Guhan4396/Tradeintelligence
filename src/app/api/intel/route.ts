import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type HealthCheckRequest = {
  action: "health_check";
  company: string;
  products: string;
  markets: string;
};

type DigestRequest = {
  action: "weekly_digest";
  company: string;
  products: string;
  markets: string;
};

type ShipmentRequest = {
  action: "shipment_check";
  hsn: string;
  destination: string;
  value: string;
};

type IntelRequest = HealthCheckRequest | DigestRequest | ShipmentRequest;

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
  "week": "Week of May 19–25, 2026",
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

Include 2-3 items per category. Be specific to their products and markets. Reference real regulatory changes: US tariffs, India-UK FTA (live July 2025), EU CBAM (Q1 2026), DGFT notifications, CBIC circulars. Make it feel like real intelligence they'd act on. Return only the JSON, no other text.`;
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
  "estimated_duty": "₹X lakh / $X",
  "documents": ["document 1", "document 2", "document 3", "document 4"],
  "port_issues": "string describing any recent port or customs issues for this route",
  "money_tip": "string with one specific actionable tip to reduce duty or improve compliance"
}

Use real tariff data where possible. For US destination, apply the current ~26-63.9% effective tariff regime on Indian textiles. For UK, note India-UK FTA preferences if the HSN qualifies. For EU, note CBAM if applicable. Be specific and actionable. Return only the JSON, no other text.`;
}

export async function POST(req: NextRequest) {
  try {
    const body: IntelRequest = await req.json();

    let prompt: string;

    if (body.action === "health_check") {
      prompt = buildHealthCheckPrompt(body.company, body.products, body.markets);
    } else if (body.action === "weekly_digest") {
      prompt = buildDigestPrompt(body.company, body.products, body.markets);
    } else if (body.action === "shipment_check") {
      prompt = buildShipmentPrompt(body.hsn, body.destination, body.value);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response type" }, { status: 500 });
    }

    const jsonText = content.text.replace(/```json\n?|\n?```/g, "").trim();
    const data = JSON.parse(jsonText);

    return NextResponse.json(data);
  } catch (err) {
    console.error("Intel API error:", err);
    return NextResponse.json({ error: "Failed to generate intelligence" }, { status: 500 });
  }
}
