import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Navigation from "@/components/Navigation";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  if (profile?.tier !== "admin" && user.email !== "will.ware@me.com") {
    redirect("/hangar");
  }

  const adminSb = createAdminClient();

  const [{ data: profiles }, { data: entries }] = await Promise.all([
    adminSb
      .from("profiles")
      .select("id, email, full_name, tier, created_at")
      .order("created_at"),
    adminSb
      .from("hangar_entries")
      .select(`
        id, user_id, make, model, year, n_number, status,
        enrichment_status, listing_price, ttaf, smoh, created_at,
        profiles(email)
      `)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">&#9881;&#65039;</span>
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
          <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
            {profiles?.length ?? 0} users &middot; {entries?.length ?? 0} aircraft
          </span>
        </div>
        <AdminClient
          initialProfiles={profiles ?? []}
          initialEntries={entries ?? []}
        />
      </div>
    </div>
  );
}
