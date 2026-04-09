import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_FIELDS = [
  "make", "model", "year", "n_number", "listing_price", "listing_location",
  "ttaf", "smoh", "tbo", "prop_time", "engine_make", "engine_model",
  "paint_condition", "interior_condition", "logbooks_available",
  "damage_history", "user_notes", "listing_description",
];

const NUMERIC_FIELDS = ["year", "listing_price", "ttaf", "smoh", "tbo", "prop_time"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.includes(key)) continue;
    if (value === "" || value === null) {
      updates[key] = null;
    } else if (NUMERIC_FIELDS.includes(key)) {
      const num = Number(value);
      updates[key] = isNaN(num) ? null : num;
    } else {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("hangar_entries")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
