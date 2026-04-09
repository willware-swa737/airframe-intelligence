import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PANEL_PROMPT = `You are an expert avionics technician and pilot. Analyze this aircraft cockpit panel photo and identify every piece of avionics and equipment you can see.

Return ONLY a valid JSON object in this exact format:
{
  "avionics": [
    "Garmin G1000 PFD",
    "Garmin G1000 MFD",
    "Garmin GTX 345 ADS-B Transponder",
    "King KX-155 Nav/Com",
    "S-TEC 55X Autopilot",
    "Garmin GMA 340 Audio Panel"
  ],
  "notes": "Optional: any notable observations about the panel (e.g., 'Glass cockpit retrofit', 'Steam gauges with modern GPS')"
}

Rules:
- Be specific with manufacturer and model numbers where visible (e.g., "Garmin GTN 750" not just "GPS")
- Include radios, GPS units, transponders, autopilots, audio panels, EFDs, MFDs, engine monitors, etc.
- If you can read partial model numbers, include your best identification
- List each distinct unit separately
- If a unit is not clearly identifiable, describe what type it is (e.g., "Unknown VHF Com Radio")
- Do not include basic flight instruments (altimeter, airspeed, etc.) unless they are digital/electronic`;

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageMediaType } = await request.json();

    if (!imageBase64 || !imageMediaType) {
      return NextResponse.json(
        { error: "Image required" },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
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
            text: PANEL_PROMPT,
          },
        ],
      }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse avionics data" }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error("Panel analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
