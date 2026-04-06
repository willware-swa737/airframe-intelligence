"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

type InputMode = "url" | "nnumber" | "screenshot";

export default function AddAircraftPage() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [nNumber, setNNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setProgress("Analyzing listing…");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      let extractedData: Record<string, unknown> = {};

      if (mode === "url" && url) {
        setProgress("Scraping listing…");
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) throw new Error("Failed to scrape listing");
        extractedData = await res.json();
      }

      if ((mode === "nnumber" && nNumber) || extractedData.nNumber) {
        const n = mode === "nnumber" ? nNumber : (extractedData.nNumber as string);
        setProgress("Looking up FAA registry…");
        const res = await fetch(`/api/faa/lookup?n=${encodeURIComponent(n)}`);
        if (res.ok) {
          const faaData = await res.json();
          extractedData = { ...extractedData, ...faaData };
        }
      }

      setProgress("Saving to your hangar…");
      const { data: entry, error: insertError } = await supabase
        .from("hangar_entries")
        .insert({
          user_id: user.id,
          listing_url: url || null,
          listing_source: extractSource(url),
          n_number: extractedData.nNumber as string || nNumber || null,
          make: extractedData.make as string || null,
          model: extractedData.model as string || null,
          year: extractedData.year as number || null,
          ttaf: extractedData.ttaf as number || null,
          smoh: extractedData.smoh as number || null,
          tbo: extractedData.tbo as number || null,
          listing_price: extractedData.price as number || null,
          listing_location: extractedData.location as string || null,
          enrichment_status: "pending",
          status: "considering",
        })
        .select()
        .single();

      if (insertError) throw insertError;
      router.push(`/hangar/${entry.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      setProgress("");
    }
  }

  function extractSource(url: string): string {
    if (url.includes("trade-a-plane")) return "trade-a-plane";
    if (url.includes("barnstormers")) return "barnstormers";
    if (url.includes("controller")) return "controller";
    if (url.includes("aerotrader")) return "aerotrader";
    if (url.includes("airmart")) return "airmart";
    return "other";
  }

  const modes: { id: InputMode; label: string; icon: string; desc: string }[] = [
    { id: "url", label: "Listing URL", icon: "🔗", desc: "Trade-A-Plane, Barnstormers, Controller, AeroTrader" },
    { id: "nnumber", label: "N-Number", icon: "✈️", desc: "Enter the tail number directly" },
    { id: "screenshot", label: "Screenshot", icon: "📸", desc: "Upload a screenshot of the listing" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24 sm:pb-8">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Add Aircraft</h1>
          <p className="text-slate-400 text-sm mt-0.5">We&apos;ll extract the data and start your research</p>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`card p-4 text-left transition-all ${
                mode === m.id ? "border-blue-500 bg-blue-50 border-2" : "hover:border-slate-300"
              }`}
            >
              <div className="text-xl mb-2">{m.icon}</div>
              <div className="text-sm font-semibold text-slate-900">{m.label}</div>
              <div className="text-xs text-slate-400 mt-0.5 leading-tight">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="card p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "url" && (
              <div>
                <label className="label">Listing URL</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://www.trade-a-plane.com/search/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Supported: Trade-A-Plane, Barnstormers, Controller, AeroTrader, AirMart
                </p>
              </div>
            )}

            {mode === "nnumber" && (
              <div>
                <label className="label">N-Number</label>
                <input
                  type="text"
                  className="input font-mono"
                  placeholder="N12345"
                  value={nNumber}
                  onChange={(e) => setNNumber(e.target.value.toUpperCase())}
                  required
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  We&apos;ll look up the FAA registry and start enrichment automatically.
                </p>
              </div>
            )}

            {mode === "screenshot" && (
              <div>
                <label className="label">Upload screenshot</label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-blue-300 transition-colors cursor-pointer">
                  <div className="text-3xl mb-2">📸</div>
                  <p className="text-sm text-slate-500">Drop a full-page screenshot here</p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB</p>
                  <p className="text-xs text-blue-500 mt-3 font-medium">Screenshot upload coming soon</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || mode === "screenshot"}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {progress || "Processing…"}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add to hangar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Tips */}
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs text-blue-700 font-semibold mb-1">💡 Tips</p>
          <ul className="text-xs text-blue-600 space-y-1">
            <li>• If the URL is blocked, try switching to Screenshot mode</li>
            <li>• N-Number entry is fastest if you already know the tail number</li>
            <li>• We&apos;ll automatically pull FAA, NTSB, and ADS-B data for paid accounts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
