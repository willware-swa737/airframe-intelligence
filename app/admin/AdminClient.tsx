"use client";
import { useState } from "react";
import Link from "next/link";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  tier: string;
  created_at: string | null;
};

type Entry = {
  id: string;
  user_id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  n_number: string | null;
  status: string;
  enrichment_status: string;
  listing_price: number | null;
  ttaf: number | null;
  smoh: number | null;
  created_at: string | null;
  profiles: { email: string | null } | null;
};

const TIERS = ["free", "buyer", "pro", "admin"];
const TIER_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  buyer: "bg-blue-100 text-blue-700",
  pro: "bg-purple-100 text-purple-700",
  admin: "bg-red-100 text-red-700",
};

export default function AdminClient({
  initialProfiles,
  initialEntries,
}: {
  initialProfiles: Profile[];
  initialEntries: Entry[];
}) {
  const [tab, setTab] = useState<"users" | "aircraft">("users");
  const [profiles, setProfiles] = useState(initialProfiles);
  const [updating, setUpdating] = useState<string | null>(null);

  async function changeTier(userId: string, newTier: string) {
    setUpdating(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier: newTier }),
      });
      if (!res.ok) throw new Error();
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, tier: newTier } : p))
      );
    } catch {
      alert("Failed to update tier");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {(["users", "aircraft"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize ${
              tab === t
                ? "bg-white border border-b-white border-slate-200 text-slate-900 -mb-px"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "users" ? `&#128101; Users (${profiles.length})` : `&#9992;&#65039; Aircraft (${initialEntries.length})`}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === "users" && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Change Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.full_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER_COLORS[p.tier] ?? "bg-slate-100"}`}>
                      {p.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {TIERS.filter((t) => t !== p.tier).map((t) => (
                        <button
                          key={t}
                          onClick={() => changeTier(p.id, t)}
                          disabled={updating === p.id}
                          className={`text-xs px-2 py-0.5 rounded border transition-colors disabled:opacity-50 ${
                            t === "pro" ? "border-purple-200 text-purple-700 hover:bg-purple-50" :
                            t === "buyer" ? "border-blue-200 text-blue-700 hover:bg-blue-50" :
                            t === "admin" ? "border-red-200 text-red-700 hover:bg-red-50" :
                            "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {updating === p.id ? "…" : `→ ${t}`}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Aircraft tab */}
      {tab === "aircraft" && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aircraft</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">N#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">TTAF / SMOH</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Enrichment</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {initialEntries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {[e.year, e.make, e.model].filter(Boolean).join(" ") || "Unknown"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{e.n_number ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">{e.profiles?.email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {e.listing_price ? `$${e.listing_price.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {e.ttaf ? `${e.ttaf.toLocaleString()}` : "—"} / {e.smoh ? `${e.smoh.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {e.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      e.enrichment_status === "complete" ? "bg-green-100 text-green-700" :
                      e.enrichment_status === "failed" ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {e.enrichment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/hangar/${e.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
