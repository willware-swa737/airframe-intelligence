import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("tier").eq("id", user.id).single();
  if (profile?.tier !== "admin" && user.email !== "will.ware@me.com") return null;
  return user;
}

export async function GET() {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminSb = createAdminClient();
  const { data, error } = await adminSb
    .from("profiles")
    .select("id, email, full_name, tier, created_at")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, tier } = await request.json();
  const validTiers = ["free", "buyer", "pro", "admin"];
  if (!userId || !validTiers.includes(tier)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const adminSb = createAdminClient();
  const { data, error } = await adminSb
    .from("profiles")
    .update({ tier, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
