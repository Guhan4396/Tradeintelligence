import { NextResponse } from "next/server";

export async function GET() {
  const keySet = !!process.env.ANTHROPIC_API_KEY;
  const keyPreview = keySet
    ? `${process.env.ANTHROPIC_API_KEY!.slice(0, 8)}...`
    : "NOT SET";

  return NextResponse.json({ keySet, keyPreview });
}
