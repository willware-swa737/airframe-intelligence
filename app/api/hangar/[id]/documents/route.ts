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
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );
}

// GET — list documents, or ?sign=1 to get a pre-signed upload URL for large files
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  if (url.searchParams.get("sign") === "1") {
    const { data: profile } = await supabase.from("profiles").select("tier, email").eq("id", user.id).single();
    if (profile?.tier !== "admin" && user.email !== "will.ware@me.com") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const type = url.searchParams.get("type");
    const filename = url.searchParams.get("filename") || "document.pdf";
    if (!type || !["form_337", "title_history"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    const adminClient = createAdminClient();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${id}/${type}/${Date.now()}-${safeName}`;
    const { data: signed, error: signError } = await adminClient.storage
      .from("aircraft-documents")
      .createSignedUploadUrl(filePath);
    if (signError) return NextResponse.json({ error: signError.message }, { status: 500 });
    return NextResponse.json({ signedUrl: signed.signedUrl, token: signed.token, filePath });
  }

  const { data: docs, error } = await supabase
    .from("aircraft_documents")
    .select("*")
    .eq("entry_id", id)
    .order("uploaded_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: docs });
}

// POST — record a document already uploaded to storage (JSON metadata),
//         or upload a small PDF directly (FormData, <4 MB)
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("tier, email").eq("id", user.id).single();
  if (profile?.tier !== "admin" && user.email !== "will.ware@me.com") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const contentType = req.headers.get("content-type") || "";

  // JSON path: file was already uploaded to storage by the browser
  if (contentType.includes("application/json")) {
    const body = await req.json();
    const { type: docType, filename, file_path: filePath, file_size: fileSize } = body;
    if (!docType || !filename || !filePath) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!["form_337", "title_history"].includes(docType)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    const { data: doc, error: dbError } = await adminClient
      .from("aircraft_documents")
      .insert({ entry_id: id, type: docType, filename, file_path: filePath, file_size: fileSize ?? null, uploaded_by: user.id })
      .select()
      .single();
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ document: doc }, { status: 201 });
  }

  // FormData path: small PDF sent directly
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const docType = formData.get("type") as string | null;
  if (!file || !docType) return NextResponse.json({ error: "Missing file or type" }, { status: 400 });
  if (!["form_337", "title_history"].includes(docType)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${id}/${docType}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await adminClient.storage
    .from("aircraft-documents")
    .upload(filePath, buffer, { contentType: "application/pdf", upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: doc, error: dbError } = await adminClient
    .from("aircraft_documents")
    .insert({ entry_id: id, type: docType, filename: file.name, file_path: filePath, file_size: file.size, uploaded_by: user.id })
    .select()
    .single();
  if (dbError) {
    await adminClient.storage.from("aircraft-documents").remove([filePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }
  return NextResponse.json({ document: doc }, { status: 201 });
}

// DELETE — remove a document (admin only)
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("tier, email").eq("id", user.id).single();
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
    .eq("entry_id", id)
    .single();
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  await adminClient.storage.from("aircraft-documents").remove([doc.file_path]);
  await adminClient.from("aircraft_documents").delete().eq("id", docId);
  return NextResponse.json({ success: true });
}
