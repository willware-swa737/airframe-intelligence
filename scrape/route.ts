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
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
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
      .slice(0, 20000); // increased limit for full listing content

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `You are an aviation data extraction specialist. Extract ALL available structured data from this aircraft listing.

Return ONLY a valid JSON object with these fields (omit fields you cannot find, use null for unknown):
{
  "nNumber": "N12345",
  "make": "PIPER",
  "model": "CHEROKEE SIX 260",
  "year": 1965,
  "ttaf": 4660,
  "smoh": 1540,
  "tbo": 2000,
  "propTime": null,
  "price": 84900,
  "location": "Denver, CO",
  "engineMake": "Lycoming",
  "engineModel": "O-540",
  "paintCondition": "Good",
  "interiorCondition": "Good",
  "logbooksAvailable": "Available",
  "damageHistory": "None",
  "avionics": ["Garmin GTX 345 ADS-B", "King KX-155 Nav/Com", "Autopilot"],
  "listingDescription": "Full description text from the listing including all seller notes, equipment details, and any other relevant information",
  "aiSummary": "2-3 sentence expert summary of this aircraft as a purchase candidate, highlighting the most important factors",
  "redFlags": [
    {"severity": "medium", "category": "Engine", "message": "Engine at 77% of TBO (1540/2000 hrs). 460 hrs remaining."},
    {"severity": "low", "category": "Records", "message": "Logbook availability not confirmed in listing."}
  ]
}

For redFlags: severity is "high", "medium", or "low". Generate red flags for:
- Engine hours > 75% of TBO (medium), > 90% (high)
- Missing TBO info (low)
- Paint/interior needs work (low)
- No logbook mention (low)
- Any damage history (high)
- Price significantly above/below market (medium)
- Missing prop time (low)

For logbooksAvailable: use "Available", "Not Available", or "Unknown"
For damageHistory: use "None", or describe any damage mentioned
For tbo: if not stated in listing, use standard TBO for that engine (Lycoming O-540 = 2000, IO-360 = 1800, Continental O-300 = 1800, IO-520 = 1700, TSIO-520 = 1400)

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
