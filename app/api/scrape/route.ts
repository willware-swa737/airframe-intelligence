import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Browser-like headers that aircraft listing sites accept
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

async function fetchListing(url: string): Promise<string> {
  // Try direct fetch first
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Could not fetch listing (HTTP ${res.status}). Try screenshot mode instead.`);
  }

  const html = await res.text();

  // If we got a tiny response it's probably a block/redirect page
  if (html.length < 500) {
    throw new Error("This site blocked the request. Try screenshot mode instead.");
  }

  return html;
}

function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 25000);
}

const EXTRACTION_PROMPT = `You are an aviation data extraction specialist. Extract ALL available structured data from this aircraft listing.

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

Rules:
- For redFlags severity: "high", "medium", or "low"
- Generate red flags for: engine > 75% TBO (medium), > 90% (high), damage history (high), no logbooks (low), needs paint/interior work (low), missing prop time (low)
- For logbooksAvailable: "Available", "Not Available", or "Unknown"
- For damageHistory: "None" or describe the damage
- For tbo: use standard if not listed — Lycoming O-540=2000, IO-360=1800, Continental O-300=1800, IO-520=1700, TSIO-520=1400
- Include everything from the listing description — seller notes, equipment, history

Listing text:`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, imageBase64, imageMediaType } = body;

    // Screenshot / image mode
    if (imageBase64 && imageMediaType) {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageMediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT + "\n\n[Extract data from the screenshot above]",
            },
          ],
        }],
      });

      const content = message.content[0];
      if (content.type !== "text") {
        return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json({ error: "Could not parse listing data from screenshot" }, { status: 500 });
      }

      return NextResponse.json(JSON.parse(jsonMatch[0]));
    }

    // URL mode
    if (!url) {
      return NextResponse.json({ error: "URL or image required" }, { status: 400 });
    }

    let html: string;
    try {
      html = await fetchListing(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not fetch listing";
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    const clean = cleanHtml(html);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\n${clean}`,
      }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse listing data" }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));

  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json({ error: "Scraping failed. Try screenshot mode." }, { status: 500 });
  }
}
