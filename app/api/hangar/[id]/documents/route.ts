import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

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

// GET /api/hangar/[id]/documents — list documents for this aircraft
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: docs, error } = await supabase
    .from("aircraft_documents")
    .select("*")
    .eq("entry_id", params.id)
    .order("uploaded_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: docs });
}

// POST /api/hangar/[id]/documents — upload a PDF (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin check
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, email")
    .eq("id", user.id)
    .single();

  if (profile?.tier !== "admin" && user.email !== "will.ware@me.com") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const docType = formData.get("type") as string | null;

  if (!file || !docType) {
    return NextResponse.json({ error: "Missing file or type" }, { status: 400 });
  }
  if (!["form_337", "title_history"].includes(docType)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Unique path: entryId/type/timestamp-filename
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${params.id}/${docType}/${timestamp}-${safeName}`;

  const { error: uploadError } = await adminClient.storage
    .from("aircraft-documents")
    .upload(filePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Record in aircraft_documents table
  const { data: doc, error: dbError } = await adminClient
    .from("aircraft_documents")
    .insert({
      entry_id: params.id,
      type: docType,
      filename: file.name,
      file_path: filePath,
      file_size: file.size,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (dbError) {
    // Clean up the storage upload if DB insert fails
    await adminClient.storage.from("aircraft-documents").remove([filePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ document: doc }, { status: 201 });
}

// DELETE /api/hangar/[id]/documents?docId=xxx — remove a document (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const docId = new URL(req.url).searchParams.get("docId");
  if (!docId) return NextResponse.json({ error: "Missing docId" }, { status: 400 });

  const adminClient = createAdminClient();

  const { data: doc } = await adminClient
    .from("aircraft_documents")
    .select("file_path")
    .eq("id", docId)
    .eq("entry_id", params.id)
    .single();

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  await adminClient.storage.from("aircraft-documents").remove([doc.file_path]);
  await adminClient.from("aircraft_documents").delete().eq("id", docId);

  return NextResponse.json({ success: true });
}
