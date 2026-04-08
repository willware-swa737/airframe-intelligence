import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Navigation from "@/components/Navigation";

const statusOptions = [
  { value: "considering", label: "Considering" },
  { value: "inspection_scheduled", label: "Inspection Scheduled" },
  { value: "offer_made", label: "Offer Made" },
  { value: "passed", label: "Passed" },
  { value: "purchased", label: "Purchased" },
];

export default async function AircraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: entry } = await supabase
    .from("hangar_entries")
    .select("*, aircraft(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!entry) notFound();

  const aircraft = entry.aircraft;
  const hasNTSB = aircraft?.ntsb_accidents?.length > 0;
  const hasADs = aircraft?.airworthiness_directives?.length > 0;
  const has337s = aircraft?.form_337s?.length > 0;

  // Engine life percentage
  const engineLifePct = entry.smoh && entry.tbo ? Math.round((entry.smoh / entry.tbo) * 100) : null;
  const engineLifeColor = engineLifePct
    ? engineLifePct >= 90 ? "bg-red-500"
    : engineLifePct >= 75 ? "bg-yellow-400"
    : "bg-green-500"
    : null;

  // Red flags
  const redFlags: Array<{severity: string; category: string; message: string}> = entry.red_flags || [];

  // Avionics
  const avionics: string[] = entry.identified_avionics || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-24 sm:pb-8">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* Back */}
        <Link href="/hangar" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-5 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to hangar
        </Link>

        {/* Aircraft header */}
        <div className="card p-6 mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {entry.year && entry.make && entry.model
                  ? `${entry.year} ${entry.make} ${entry.model}`
                  : entry.make && entry.model
                  ? `${entry.make} ${entry.model}`
                  : "Aircraft"}
              </h1>
              {entry.n_number && (
                <p className="text-slate-400 font-mono text-sm mt-0.5">{entry.n_number}</p>
              )}
              {entry.listing_location && (
                <p className="text-slate-500 text-sm mt-1">ð {entry.listing_location}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {redFlags.length > 0 && (
                <span className="badge bg-red-50 text-red-600">â ï¸ {redFlags.length} red flag{redFlags.length !== 1 ? "s" : ""}</span>
              )}
              {entry.listing_price && (
                <span className="badge bg-green-50 text-green-700 font-semibold">${entry.listing_price.toLocaleString()}</span>
              )}
            </div>
          </div>

          {/* Specs grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
            {[
              { label: "TTAF", value: entry.ttaf ? `${entry.ttaf.toLocaleString()} hrs` : "â" },
              { label: "SMOH", value: entry.smoh ? `${entry.smoh.toLocaleString()} hrs` : "â", warn: engineLifePct !== null && engineLifePct >= 75 },
              { label: "TBO", value: entry.tbo ? `${entry.tbo.toLocaleString()} hrs` : "â" },
              { label: "Prop Time", value: entry.prop_time ? `${entry.prop_time.toLocaleString()} hrs` : "â" },
            ].map((spec) => (
              <div key={spec.label}>
                <div className="text-xs text-slate-400 uppercase tracking-wide font-medium">{spec.label}</div>
                <div className={`text-lg font-semibold mt-0.5 ${spec.warn ? "text-amber-600" : "text-slate-900"}`}>
                  {spec.value}
                </div>
              </div>
            ))}
          </div>

          {/* Engine life bar */}
          {engineLifePct !== null && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">Engine Life Used</span>
                <span className={`text-xs font-semibold ${engineLifePct >= 90 ? "text-red-600" : engineLifePct >= 75 ? "text-amber-600" : "text-green-600"}`}>
                  {engineLifePct}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${engineLifeColor}`}
                  style={{ width: `${Math.min(engineLifePct, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {entry.smoh?.toLocaleString()} / {entry.tbo?.toLocaleString()} hrs â {(entry.tbo - entry.smoh).toLocaleString()} hrs remaining
              </p>
            </div>
          )}

          {/* Listing link */}
          {entry.listing_url && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <a href={entry.listing_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                View original listing
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Left column */}
          <div className="sm:col-span-2 space-y-4">

            {/* Red Flags */}
            {redFlags.length > 0 && (
              <div className="card p-5 border-amber-200 bg-amber-50/30">
                <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">ð©</span> Red Flag Analysis
                </h2>
                <ul className="space-y-2.5">
                  {redFlags.map((flag, i) => (
                    <li key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                      flag.severity === "high" ? "bg-red-50 border border-red-200" :
                      flag.severity === "medium" ? "bg-amber-50 border border-amber-200" :
                      "bg-slate-50 border border-slate-200"
                    }`}>
                      <div className="flex-shrink-0 mt-0.5">
                        <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${
                          flag.severity === "high" ? "bg-red-100 text-red-700" :
                          flag.severity === "medium" ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {flag.severity}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-medium mb-0.5">{flag.category}</div>
                        <div className="text-sm text-slate-700">{flag.message}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Summary */}
            {entry.ai_summary && (
              <div className="card p-5">
                <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">ð¤</span> AI Summary
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">{entry.ai_summary}</p>
              </div>
            )}

            {/* Airframe & Engine */}
            <div className="card p-5">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-lg">ð§</span> Airframe & Engine
              </h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ["TTAF", entry.ttaf ? `${entry.ttaf.toLocaleString()} hrs` : null],
                  ["SMOH", entry.smoh ? `${entry.smoh.toLocaleString()} hrs` : null],
                  ["TBO", entry.tbo ? `${entry.tbo.toLocaleString()} hrs` : null],
                  ["Prop Time", entry.prop_time ? `${entry.prop_time.toLocaleString()} hrs` : null],
                  ["Engine", [entry.engine_make, entry.engine_model].filter(Boolean).join(" ") ||
                    [aircraft?.engine_make, aircraft?.engine_model].filter(Boolean).join(" ") || null],
                  ["Engine Type", aircraft?.engine_type_description || aircraft?.engine_type || null],
                ].map(([label, value]) => value ? (
                  <div key={label as string}>
                    <dt className="text-slate-400 text-xs uppercase tracking-wide">{label}</dt>
                    <dd className="text-slate-800 font-medium mt-0.5">{value}</dd>
                  </div>
                ) : null)}
              </dl>
            </div>

            {/* Condition & Records */}
            {(entry.paint_condition || entry.interior_condition || entry.logbooks_available || entry.damage_history) && (
              <div className="card p-5">
                <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-lg">ð</span> Condition & Records
                </h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {[
                    ["Paint", entry.paint_condition],
                    ["Interior", entry.interior_condition],
                    ["Logbooks", entry.logbooks_available],
                    ["Damage History", entry.damage_history],
                  ].map(([label, value]) => value ? (
                    <div key={label as string}>
                      <dt className="text-slate-400 text-xs uppercase tracking-wide">{label}</dt>
                      <dd className={`font-medium mt-0.5 ${
                        label === "Damage History" && value !== "None" ? "text-red-600" :
                        label === "Logbooks" && value === "Not Available" ? "text-amber-600" :
                        "text-slate-800"
                      }`}>
                        {label === "Damage History" && value === "None" ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            None
                          </span>
                        ) : value as string}
                      </dd>
                    </div>
                  ) : null)}
                </dl>
              </div>
            )}

            {/* Avionics */}
            {avionics.length > 0 && (
              <div className="card p-5">
                <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">ð¡</span> Avionics & Equipment
                </h2>
                <div className="flex flex-wrap gap-2">
                  {avionics.map((item, i) => (
                    <span key={i} className="badge bg-slate-100 text-slate-700 text-xs">{item}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Listing Description */}
            {entry.listing_description && (
              <div className="card p-5">
                <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">ð</span> Listing Description
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{entry.listing_description}</p>
              </div>
            )}

            {/* FAA Registry */}
            {aircraft && (
              <div className="card p-5">
                <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-lg">ðï¸</span> FAA Registry
                </h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {[
                    ["Status", aircraft.faa_status_description || aircraft.faa_status],
                    ["Registrant", aircraft.registrant_name],
                    ["Location", [aircraft.registrant_city, aircraft.registrant_state].filter(Boolean).join(", ")],
                    ["Expiration", aircraft.faa_expiration_date],
                    ["Serial #", aircraft.serial_number],
                    ["Engine", [aircraft.engine_make, aircraft.engine_model].filter(Boolean).join(" ")],
                  ].map(([label, value]) => value ? (
                    <div key={label as string}>
                      <dt className="text-slate-400 text-xs uppercase tracking-wide">{label}</dt>
                      <dd className="text-slate-700 font-medium mt-0.5">{value}</dd>
                    </div>
                  ) : null)}
                </dl>
              </div>
            )}

            {/* NTSB */}
            <div className="card p-5">
              <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span className="text-lg">ð¨</span> NTSB Accident History
              </h2>
              {hasNTSB ? (
                <ul className="space-y-2 text-sm text-slate-600">
                  {(aircraft.ntsb_accidents as Array<{date: string; location: string; description: string}>).map((acc, i) => (
                    <li key={i} className="border-l-2 border-red-300 pl-3 py-1">
                      <div className="font-medium text-red-700">{acc.date} â {acc.location}</div>
                      <div className="text-slate-500">{acc.description}</div>
                    </li>
                  ))}
                </ul>
              ) : entry.enrichment_status === "complete" ? (
                <p className="text-sm text-green-600 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  No accidents on record
                </p>
              ) : (
                <p className="text-sm text-slate-400">Enrichment required</p>
              )}
            </div>

          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Status */}
            <div className="card p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Status</h2>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((opt) => (
                  <span
                    key={opt.value}
                    className={`badge cursor-default ${
                      entry.status === opt.value
                        ? "bg-blue-700 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {opt.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="card p-5">
              <h2 className="font-semibold text-slate-900 mb-2">My Notes</h2>
              {entry.user_notes ? (
                <p className="text-sm text-slate-600 leading-relaxed">{entry.user_notes}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">No notes yet</p>
              )}
            </div>

            {/* Enrichment */}
            <div className="card p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Data Sources</h2>
              {[
                { label: "FAA Registry", done: !!aircraft },
                { label: "NTSB Accidents", done: entry.enrichment_status === "complete" },
                { label: "ADS-B Flight Data", done: entry.enrichment_status === "complete" },
                { label: "Form 337s", done: has337s },
                { label: "Airworthiness Directives", done: hasADs },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-slate-600">{label}</span>
                  {done ? (
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-xs text-slate-300">Pending</span>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
