import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
    const { url } = await request.json();
    if (!url) {
          return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

  try {
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
        const clean = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 20000);

      const message = await client.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 2048,
              messages: [{
                        role: "user",
                        content: `You are an aviation data extraction specialist. Extract ALL available data from this aircraft listing. Aviation ads use abbreviations: TTSN/TTAF=total time, SMOH=since major overhaul, STOH=since top overhaul, TBO=time between overhauls, A/P=autopilot, LR=long range, IFR=instrument flight rules, ADS-B=ADS-B transponder.

                        Return ONLY valid JSON with these fields (omit fields not found, use null for unknown):
                        {
                          "nNumber": "N3339W",
                            "make": "PIPER",
                              "model": "CHEROKEE SIX-260",
                                "year": 1965,
                                  "ttaf": 4660,
                                    "smoh": 1540,
                                      "tbo": 2000,
                                        "propTime": null,
                                          "price": 84900,
                                            "location": "Denver, CO",
                                              "engineMake": "Lycoming",
                                                "engineModel": "O-540",
                                                  "paintCondition": "Needs paint",
                                                    "interiorCondition": "Good",
                                                      "logbooksAvailable": "Unknown",
                                                        "damageHistory": "None",
                                                          "avionics": ["King IFR", "ADS-B", "Wing leveler autopilot", "Long range fuel"],
                                                            "listingDescription": "Full text of the listing description and seller notes",
                                                              "aiSummary": "2-3 sentence expert summary of this aircraft as a purchase candidate",
                                                                "redFlags": [
                                                                    {"severity": "medium", "category": "Engine", "message": "Engine at 77% of TBO (1540/2000 hrs). 460 hrs remaining."},
                                                                        {"severity": "low", "category": "Paint", "message": "Seller notes paint needs work."}
                                                                          ]
                                                                          }

                                                                          Rules:
                                                                          - paintCondition: extract exactly what seller says about paint (e.g. "Needs paint", "Good", "Fresh paint")
                                                                          - damageHistory: "None" if seller says no damage, otherwise describe it
                                                                          - logbooksAvailable: "Available", "Not Available", or "Unknown"
                                                                          - avionics: list every piece of equipment mentioned (radios, GPS, autopilot, fuel tanks, etc.)
                                                                          - tbo: if not stated, infer from engine (O-540=2000, IO-360=1800, O-300=1800, IO-520=1700, TSIO-520=1400)
                                                                          - engineMake/engineModel: infer from aircraft type if not stated (Cherokee Six 260 = Lycoming O-540)
                                                                          - listingDescription: capture the full ad text verbatim
                                                                          - redFlags severity: "high"=damage/airworthiness issue, "medium"=engine >75% TBO or missing major info, "low"=cosmetic or minor

                                                                          Listing text:
                                                                          ${clean}`,
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

      const data = JSON.parse(jsonMatch[0]);
        return NextResponse.json(data);
  } catch (error) {
        console.error("Scrape error:", error);
        return NextResponse.json({ error: "Scraping failed. Try screenshot mode." }, { status: 500 });
  }
}
