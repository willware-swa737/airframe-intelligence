import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FORM_337_PROMPT = `You are analyzing a PDF that may contain ONE or MULTIPLE FAA Form 337 (Major Repair and Alteration) documents for a general aviation aircraft.

IMPORTANT: A single PDF file often contains multiple individual Form 337s. Each Form 337 is a separate event identified by the "MAJOR REPAIR AND ALTERATION" header, a different date, owner, or mechanic. Older microfilm-scanned FAA Registry forms are ALSO Form 337s even if they look different or weathered. Supporting documents like STC certificates and airworthiness certificates are NOT Form 337s — exclude them from the count.

Count EVERY distinct Form 337 in the entire document and list each repair/alteration separately.

Extract all key information and return ONLY a valid JSON object with this exact structure:
{
  "analyzed_at": "<current ISO 8601 timestamp>",
  "document_count": <number of 337 forms analyzed>,
  "repairs_alterations": [
    {
      "date": "<YYYY-MM-DD or best approximation>",
      "description": "<concise description of the repair or alteration>",
      "system": "<one of: Avionics, Engine, Airframe, Propeller, Landing Gear, Fuel System, Electrical, Other>",
      "performed_by": "<name and certificate number if visible>",
      "facility": "<shop or facility name if mentioned>",
      "stc": "<STC number if this was an STC installation, otherwise null>",
      "approved_by": "<DER or DAR name/number if applicable, otherwise null>"
    }
  ],
  "buyer_summary": "<2-3 sentence plain-English summary of all work done and what it means for a buyer>",
  "flags": ["<list of notable items: STCs installed, engine work, structural repairs, avionics upgrades, etc>"],
  "concerns": "<any items a buyer should ask about or investigate further, or null if none>"
}
Return ONLY the JSON object. No markdown, no explanation.`;

const TITLE_HISTORY_PROMPT = `You are analyzing an aircraft title history report. Extract all key information and return ONLY a valid JSON object with this exact structure:
{
  "analyzed_at": "<current ISO 8601 timestamp>",
  "ownership_chain": [
    {
      "from": "<YYYY-MM-DD>",
      "to": "<YYYY-MM-DD or 'present'>",
      "owner": "<owner name or entity>",
      "type": "<Individual, Corporation, LLC, Partnership, Trust, or Government>"
    }
  ],
  "total_owners": <number>,
  "liens": ["<description of any lien found, or empty array if none>"],
  "accidents": ["<any accident or incident references found, or empty array if none>"],
  "registration_gaps": ["<any gaps in registration continuity, or empty array if none>"],
  "current_status": "<e.g. 'Clear title', 'Active lien — see details', 'Registration expired'>",
  "buyer_summary": "<2-3 sentence plain-English summary highlighting ownership history and anything a buyer must know>",
  "flags": ["<notable items: multiple owners, lien history, long gaps, etc>"],
  "concerns": "<anything a buyer should investigate or ask their attorney about, or null if none>"
}
Return ONLY the JSON object. No markdown, no explanation.`;

async function downloadDocumentAsBase64(
  adminClient: ReturnType<typeof createAdminClient>,
  filePath: string
): Promise<string> {
  const { data, error } = await adminClient.storage
    .from("aircraft-documents")
    .download(filePath);

  if (error || !data) throw new Error(`Failed to download ${filePath}: ${error?.message}`);

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

// POST /api/hangar/[id]/analyze — run Claude analysis on uploaded documents (admin only)
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, email")
    .eq("id", user.id)
    .single();

  if (profile?.tier !== "admin" && user.email !== "will.ware@me.com") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const analyzeType: "form_337" | "title_history" | "both" = body.type || "both";

  const adminClient = createAdminClient();

  // Fetch the aircraft entry for context
  const { data: entry } = await adminClient
    .from("hangar_entries")
    .select("n_number, make, model, year, aircraft_id")
    .eq("id", id)
    .single();

  const aircraftLabel = entry
    ? `${entry.year || ""} ${entry.make || ""} ${entry.model || ""} (${entry.n_number || "unknown N-number"})`.trim()
    : `Aircraft ID ${id}`;

  const results: Record<string, unknown> = {};

  // Analyze Form 337s
  if (analyzeType === "form_337" || analyzeType === "both") {
    const { data: docs } = await adminClient
      .from("aircraft_documents")
      .select("*")
      .eq("entry_id", id)
      .eq("type", "form_337");

    if (docs && docs.length > 0) {
      try {
        // Build content array with all 337 PDFs
        const contentBlocks: Anthropic.MessageParam["content"] = [];

        for (const doc of docs) {
          const b64 = await downloadDocumentAsBase64(adminClient, doc.file_path);
          contentBlocks.push({
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: b64,
            },
          } as Anthropic.DocumentBlockParam);
        }

        contentBlocks.push({
          type: "text",
          text: `Aircraft: ${aircraftLabel}\nNote: ${docs.length} PDF file(s) attached — each may contain MULTIPLE Form 337s. Count all distinct forms in the documents.\n\n${FORM_337_PROMPT}`,
        });

        const response = await anthropic.messages.create({
          model: "claude-opus-4-6",
          max_tokens: 2048,
          messages: [{ role: "user", content: contentBlocks }],
        });

        const rawText = response.content[0].type === "text" ? response.content[0].text : "";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const summary = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: rawText, error: "Could not parse JSON" };
        summary.analyzed_at = new Date().toISOString();
        // document_count comes from Claude's count of distinct Form 337s in the PDF

        if (entry?.aircraft_id) {
          await adminClient.from("aircraft").update({ form_337_summary: summary }).eq("id", entry.aircraft_id);
        }

        results.form_337 = summary;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.form_337_error = msg;
      }
    } else {
      results.form_337 = null;
      results.form_337_note = "No Form 337 documents uploaded";
    }
  }

  // Analyze Title History
  if (analyzeType === "title_history" || analyzeType === "both") {
    const { data: docs } = await adminClient
      .from("aircraft_documents")
      .select("*")
      .eq("entry_id", id)
      .eq("type", "title_history");

    if (docs && docs.length > 0) {
      const doc = docs[0]; // Only one title history
      try {
        const b64 = await downloadDocumentAsBase64(adminClient, doc.file_path);

        const response = await anthropic.messages.create({
          model: "claude-opus-4-6",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: b64,
                  },
                } as Anthropic.DocumentBlockParam,
                {
                  type: "text",
                  text: `Aircraft: ${aircraftLabel}\n\n${TITLE_HISTORY_PROMPT}`,
                },
              ],
            },
          ],
        });

        const rawText = response.content[0].type === "text" ? response.content[0].text : "";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const summary = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: rawText, error: "Could not parse JSON" };
        summary.analyzed_at = new Date().toISOString();

        if (entry?.aircraft_id) {
          await adminClient.from("aircraft").update({ title_history_summary: summary }).eq("id", entry.aircraft_id);
        }

        results.title_history = summary;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.title_history_error = msg;
      }
    } else {
      results.title_history = null;
      results.title_history_note = "No title history document uploaded";
    }
  }

  return NextResponse.json({ success: true, results });
}

// GET /api/hangar/[id]/analyze — get signed download URLs for documents (paid members)
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const isPaid = profile?.tier && ["buyer", "pro", "admin"].includes(profile.tier);
  if (!isPaid) return NextResponse.json({ error: "Upgrade required" }, { status: 403 });

  const docType = new URL(req.url).searchParams.get("type");

  const adminClient = createAdminClient();

  let query = adminClient
    .from("aircraft_documents")
    .select("*")
    .eq("entry_id", id);

  if (docType) query = query.eq("type", docType);

  const { data: docs } = await query.order("uploaded_at", { ascending: true });
  if (!docs || docs.length === 0) return NextResponse.json({ urls: [] });

  const urls = await Promise.all(
    docs.map(async (doc) => {
      const { data } = await adminClient.storage
        .from("aircraft-documents")
        .createSignedUrl(doc.file_path, 3600); // 1-hour expiry
      return {
        id: doc.id,
        filename: doc.filename,
        type: doc.type,
        uploaded_at: doc.uploaded_at,
        url: data?.signedUrl || null,
      };
    })
  );

  return NextResponse.json({ urls });
}
