import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Navigation from "@/components/Navigation";
import HangarCard from "@/components/HangarCard";

export default async function HangarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: entries } = await supabase
    .from("hangar_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const hangar = entries ?? [];

  // Stats
  const avgPrice = hangar.filter(e => e.listing_price).length
    ? Math.round(hangar.filter(e => e.listing_price).reduce((sum, e) => sum + e.listing_price, 0) / hangar.filter(e => e.listing_price).length)
    : null;
  const totalFlags = hangar.reduce((sum, e) => sum + (e.red_flags_count ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 sm:pb-8">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Hangar</h1>
            <p className="text-slate-400 text-sm mt-0.5">{hangar.length} aircraft tracked</p>
          </div>
          <Link href="/add" className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add aircraft
          </Link>
        </div>

        {/* Stats bar */}
        {hangar.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{hangar.length}</div>
              <div className="text-xs text-slate-400 mt-0.5">Aircraft</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">
                {avgPrice ? `$${(avgPrice / 1000).toFixed(0)}k` : "—"}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Avg price</div>
            </div>
            <div className="card p-4 text-center">
              <div className={`text-2xl font-bold ${totalFlags > 0 ? "text-red-600" : "text-green-600"}`}>
                {totalFlags}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Red flags</div>
            </div>
          </div>
        )}

        {/* Aircraft grid */}
        {hangar.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">✈️</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Your hangar is empty</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              Paste a listing URL from Trade-A-Plane, Barnstormers, or Controller to add your first aircraft.
            </p>
            <Link href="/add" className="btn-primary text-sm py-2.5 px-6 inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add your first aircraft
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hangar.map((entry) => (
              <HangarCard
                key={entry.id}
                id={entry.id}
                make={entry.make}
                model={entry.model}
                year={entry.year}
                nNumber={entry.n_number}
                ttaf={entry.ttaf}
                smoh={entry.smoh}
                tbo={entry.tbo}
                listingPrice={entry.listing_price}
                listingLocation={entry.listing_location}
                listingSource={entry.listing_source}
                status={entry.status}
                redFlagsCount={entry.red_flags_count ?? 0}
                enrichmentStatus={entry.enrichment_status}
                aiSummary={entry.ai_summary}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
