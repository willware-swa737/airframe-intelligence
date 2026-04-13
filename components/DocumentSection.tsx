"use client";

import { useState, useRef, useCallback } from "react";

interface Document {
  id: string;
  type: "form_337" | "title_history";
  filename: string;
  uploaded_at: string;
  file_size?: number;
}

interface RepairAlteration {
  date: string;
  description: string;
  system: string;
  performed_by?: string;
  facility?: string;
  stc?: string | null;
  approved_by?: string | null;
}

interface OwnershipRecord {
  from: string;
  to: string;
  owner: string;
  type: string;
}

interface Form337Summary {
  analyzed_at: string;
  document_count: number;
  repairs_alterations: RepairAlteration[];
  buyer_summary: string;
  flags: string[];
  concerns: string | null;
}

interface TitleHistorySummary {
  analyzed_at: string;
  ownership_chain: OwnershipRecord[];
  total_owners: number;
  liens: string[];
  accidents: string[];
  current_status: string;
  buyer_summary: string;
  flags: string[];
  concerns: string | null;
}

interface Props {
  entryId: string;
  isAdmin: boolean;
  isPaid: boolean;
  initialForm337Summary: Form337Summary | null;
  initialTitleSummary: TitleHistorySummary | null;
  initialDocuments: Document[];
}

function formatDate(iso: string) {
  if (!iso) return "Unknown date";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatBytes(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function SystemBadge({ system }: { system: string }) {
  const colors: Record<string, string> = {
    Avionics: "bg-blue-100 text-blue-800",
    Engine: "bg-orange-100 text-orange-800",
    Airframe: "bg-gray-100 text-gray-800",
    Propeller: "bg-green-100 text-green-800",
    "Landing Gear": "bg-purple-100 text-purple-800",
    "Fuel System": "bg-yellow-100 text-yellow-800",
    Electrical: "bg-indigo-100 text-indigo-800",
    Other: "bg-slate-100 text-slate-700",
  };
  const cls = colors[system] || colors.Other;
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {system}
    </span>
  );
}

function ConcernsBadge({ concerns }: { concerns: string | null }) {
  if (!concerns) return null;
  return (
    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
      <span className="font-semibold">⚠️ Buyer Note: </span>{concerns}
    </div>
  );
}

export default function DocumentSection({
  entryId,
  isAdmin,
  isPaid,
  initialForm337Summary,
  initialTitleSummary,
  initialDocuments,
}: Props) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [form337Summary, setForm337Summary] = useState<Form337Summary | null>(initialForm337Summary);
  const [titleSummary, setTitleSummary] = useState<TitleHistorySummary | null>(initialTitleSummary);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analyzeStatus, setAnalyzeStatus] = useState<string | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const [loadingDownloads, setLoadingDownloads] = useState(false);

  const form337Ref = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File, type: "form_337" | "title_history") => {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch(`/api/hangar/${entryId}/documents`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setDocuments((prev) => [...prev, data.document]);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [entryId]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, type: "form_337" | "title_history") => {
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach((f) => uploadFile(f, type));
      e.target.value = "";
    },
    [uploadFile]
  );

  const deleteDocument = useCallback(async (docId: string) => {
    if (!confirm("Remove this document?")) return;
    await fetch(`/api/hangar/${entryId}/documents?docId=${docId}`, { method: "DELETE" });
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }, [entryId]);

  const runAnalysis = useCallback(async (type: "form_337" | "title_history" | "both") => {
    setAnalyzing(true);
    setAnalyzeStatus("Sending to Claude for analysis…");
    try {
      const res = await fetch(`/api/hangar/${entryId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      if (data.results.form_337) setForm337Summary(data.results.form_337);
      if (data.results.title_history) setTitleSummary(data.results.title_history);
      setAnalyzeStatus("Analysis complete ✓");
      setTimeout(() => setAnalyzeStatus(null), 3000);
    } catch (err: unknown) {
      setAnalyzeStatus(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, [entryId]);

  const loadDownloadUrls = useCallback(async () => {
    setLoadingDownloads(true);
    try {
      const res = await fetch(`/api/hangar/${entryId}/analyze`);
      const data = await res.json();
      const map: Record<string, string> = {};
      for (const item of data.urls || []) {
        if (item.url) map[item.id] = item.url;
      }
      setDownloadUrls(map);
    } catch {}
    setLoadingDownloads(false);
  }, [entryId]);

  const form337Docs = documents.filter((d) => d.type === "form_337");
  const titleDocs = documents.filter((d) => d.type === "title_history");
  const hasAnyDocs = documents.length > 0;
  const hasAnyAnalysis = form337Summary || titleSummary;

  // FREE MEMBER VIEW — teaser + upgrade CTA
  if (!isPaid) {
    return (
      <section className="mt-10 border-t pt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📄 Documents &amp; Analysis</h2>

        {!hasAnyDocs && !hasAnyAnalysis ? (
          <p className="text-gray-400 text-sm">No documents uploaded yet.</p>
        ) : (
          <div className="relative">
            {/* Blurred teaser */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="filter blur-sm pointer-events-none select-none p-5 space-y-3">
                <div className="font-medium text-gray-800">Form 337 Analysis — 2 documents</div>
                <div className="text-sm text-gray-600">
                  {form337Summary?.buyer_summary
                    ? form337Summary.buyer_summary.slice(0, 80) + "…"
                    : "Major alteration records are available for this aircraft including avionics upgrades and engine work…"}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">Avionics</span>
                  <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">Engine</span>
                </div>
                <div className="mt-3 font-medium text-gray-800">Title History</div>
                <div className="text-sm text-gray-600">
                  {titleSummary?.buyer_summary
                    ? titleSummary.buyer_summary.slice(0, 80) + "…"
                    : "Ownership chain, lien status, and registration history are available…"}
                </div>
              </div>

              {/* Upgrade overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="text-3xl mb-3">🔒</div>
                <h3 className="font-semibold text-gray-900 text-base mb-1">
                  Full Document Analysis Available
                </h3>
                <p className="text-sm text-gray-500 mb-4 max-w-xs">
                  Upgrade to Buyer to access the complete repair history, ownership chain, lien status, and downloadable documents.
                </p>
                <a
                  href="/pricing"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
                >
                  Upgrade to Buyer →
  #             </a>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  // PAID / ADMIN VIEW
  return (
    <section className="mt-10 border-t pt-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">📄 Documents &amp; Analysis</h2>

      {/* ── ADMIN UPLOAD PANEL ── */}
      {isAdmin && (
        <div className="mb-8 p-5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">ADMIN</span>
            <span className="text-sm font-medium text-gray-700">Document Management</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form 337 upload */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Form 337s ({form337Docs.length})</p>
              <ul className="space-y-1 mb-2">
                {form337Docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-sm bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <span className="truncate text-gray-700 max-w-[160px]" title={d.filename}>{d.filename}</span>
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <span>{formatBytes(d.file_size)}</span>
                      <button onClick={() => deleteDocument(d.id)} className="text-red-400 hover:text-red-600">✕</button>
                    </div>
                  </li>
                ))}
              </ul>
              <input
                ref={form337Ref}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => handleFileChange(e, "form_337")}
              />
              <button
                onClick={() => form337Ref.current?.click()}
                disabled={uploading}
                className="w-full text-sm border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-500 hover:text-blue-600 rounded-lg py-2.5 transition"
              >
                {uploading ? "Uploading…" : "+ Add Form 337 PDF"}
              </button>
            </div>

            {/* Title History upload */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Title History ({titleDocs.length})</p>
              <ul className="space-y-1 mb-2">
                {titleDocs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-sm bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <span className="truncate text-gray-700 max-w-[160px]" title={d.filename}>{d.filename}</span>
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <span>{formatBytes(d.file_size)}</span>
                      <button onClick={() => deleteDocument(d.id)} className="text-red-400 hover:text-red-600">✕</button>
                    </div>
                  </li>
                ))}
              </ul>
              <input
                ref={titleRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleFileChange(e, "title_history")}
              />
              <button
                onClick={() => titleRef.current?.click()}
                disabled={uploading || titleDocs.length >= 1}
                className="w-full text-sm border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-500 hover:text-blue-600 rounded-lg py-2.5 transition disabled:opacity-40"
              >
                {uploading ? "Uploading…" : titleDocs.length >= 1 ? "Title uploaded (replace to update)" : "+ Add Title History PDF"}
              </button>
            </div>
          </div>

          {uploadError && (
            <p className="mt-3 text-sm text-red-600">{uploadError}</p>
          )}

          {/* Analyze button */}
          {documents.length > 0 && (
            <div className="mt-4 flex items-center gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => runAnalysis("both")}
                disabled={analyzing}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                {analyzing ? "Analyzing…" : "Run AI Analysis"}
              </button>
              {analyzeStatus && (
                <span className="text-sm text-gray-600">{analyzeStatus}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── NO DOCUMENTS YET ── */}
      {!hasAnyDocs && !hasAnyAnalysis && (
        <p className="text-gray-400 text-sm">No documents have been uploaded for this aircraft yet.</p>
      )}

      {/* ── FORM 337 SUMMARY ── */}
      {form337Summary && (
        <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-blue-50 px-5 py-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                Form 337 — Major Repairs &amp; Alterations
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {form337Summary.document_count} document{form337Summary.document_count !== 1 ? "s" : ""} · Analyzed {formatDate(form337Summary.analyzed_at)}
              </p>
            </div>
            <button
              onClick={loadDownloadUrls}
              disabled={loadingDownloads}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {loadingDownloads ? "Loading…" : "Get Download Links"}
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Repair timeline */}
            {form337Summary.repairs_alterations?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Work History</p>
                <div className="space-y-3">
                  {form337Summary.repairs_alterations.map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                        {i < form337Summary.repairs_alterations.length - 1 && (
                          <div className="w-px flex-1 bg-gray-200 mt-1" />
                        )}
                      </div>
                      <div className="pb-3">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-gray-400">{item.date}</span>
                          <SystemBadge system={item.system} />
                          {item.stc && (
                            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                              STC {item.stc}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-800">{item.description}</p>
                        {(item.performed_by || item.facility) && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {[item.performed_by, item.facility].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flags */}
            {form337Summary.flags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form337Summary.flags.map((flag, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                    {flag}
                  </span>
                ))}
              </div>
            )}

            {/* Summary */}
            <p className="text-sm text-gray-700 leading-relaxed">{form337Summary.buyer_summary}</p>

            <ConcernsBadge concerns={form337Summary.concerns} />

            {/* Download links */}
            {form337Docs.map((d) => downloadUrls[d.id] && (
              <a
                key={d.id}
                href={downloadUrls[d.id]}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                ↓ {d.filename}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── TITLE HISTORY SUMMARY ── */}
      {titleSummary && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-green-50 px-5 py-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Title History</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Analyzed {formatDate(titleSummary.analyzed_at)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                titleSummary.current_status?.toLowerCase().includes("clear")
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}>
                {titleSummary.current_status}
              </span>
              <button
                onClick={loadDownloadUrls}
                disabled={loadingDownloads}
                className="text-xs text-green-600 hover:text-green-800 font-medium"
              >
                {loadingDownloads ? "Loading…" : "Get Download Link"}
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Ownership chain */}
            {titleSummary.ownership_chain?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Ownership Chain ({titleSummary.total_owners} owner{titleSummary.total_owners !== 1 ? "s" : ""})
                </p>
                <div className="space-y-2">
                  {titleSummary.ownership_chain.map((o, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="text-xs text-gray-400 w-28 flex-shrink-0 pt-0.5">
                        {o.from} → {o.to}
                      </span>
                      <div>
                        <span className="text-gray-800 font-medium">{o.owner}</span>
                        <span className="text-gray-400 text-xs ml-2">({o.type})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Liens */}
            {titleSummary.liens?.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ Liens on Record</p>
                {titleSummary.liens.map((lien, i) => (
                  <p key={i} className="text-sm text-amber-800">{lien}</p>
                ))}
              </div>
            )}

            {/* Accidents */}
            {titleSummary.accidents?.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-semibold text-red-700 mb-1">🔴 Accident/Incident References</p>
                {titleSummary.accidents.map((acc, i) => (
                  <p key={i} className="text-sm text-red-800">{acc}</p>
                ))}
              </div>
            )}

            {/* Flags */}
            {titleSummary.flags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {titleSummary.flags.map((flag, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                    {flag}
                  </span>
                ))}
              </div>
            )}

            <p className="text-sm text-gray-700 leading-relaxed">{titleSummary.buyer_summary}</p>

            <ConcernsBadge concerns={titleSummary.concerns} />

            {/* Download links */}
            {titleDocs.map((d) => downloadUrls[d.id] && (
              <a
                key={d.id}
                href={downloadUrls[d.id]}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                ↓ {d.filename}
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
