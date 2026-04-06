import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  try {
    // Fetch the listing page
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AirframeIntelligence/1.0; +https://airframeintelligence.com)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Could not fetch listing. Try screenshot mode." }, { status: 422 });
    }

    const html = await res.text();
    // Strip scripts/styles for token efficiency
    const clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000); // limit tokens

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `You are an aviation data extraction specialist. Extract structured aircraft listing data from this text.

Return ONLY a JSON object with these fields (omit fields you cannot find):
{
  "nNumber": "N12345",
  "make": "CESSNA",
  "model": "172S",
  "year": 1998,
  "ttaf": 3200,
  "smoh": 450,
  "tbo": 2000,
  "propTime": 450,
  "price": 85000,
  "location": "Denver, CO",
  "description": "brief summary"
}

Listing text:
${clean}`,
      }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse listing data" }, { status: 500 });
    }

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json({ error: "Scraping failed. Try screenshot mode." }, { status: 500 });
  }
}
