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
  initialForm337Summary: Record<string, unknown> | null;
  initialTitleSummary: Record<string, unknown> | null;
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

// ── Form 337 Dialog ─────────────────────────────────────────────────────────

function Form337Dialog({
  summary,
  onClose,
}: {
  summary: Form337Summary;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-start justify-between rounded-t-2xl">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">
              📋 Form 337 — Major Repairs &amp; Alterations
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {summary.document_count} form
              {summary.document_count !== 1 ? "s" : ""} on file · Analyzed{" "}
              {formatDate(summary.analyzed_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl ml-4 mt-0.5 leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Buyer summary */}
          <p className="text-sm text-gray-700 leading-relaxed">
            {summary.buyer_summary}
          </p>

          {/* Concerns */}
          {summary.concerns && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-xs font-semibold text-amber-700">
                ⚠️ Buyer Note:{" "}
              </span>
              <span className="text-sm text-amber-800">{summary.concerns}</span>
            </div>
          )}

          {/* Repair timeline */}
          {summary.repairs_alterations?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Work History ({summary.repairs_alterations.length} entries)
              </p>
              <div className="space-y-0">
                {summary.repairs_alterations.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                      {i < summary.repairs_alterations.length - 1 && (
                        <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[16px]" />
                      )}
                    </div>
                    <div className="pb-4">
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
                          {[item.performed_by, item.facility]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flags */}
          {summary.flags?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Notable Items
              </p>
              <div className="flex flex-wrap gap-2">
                {summary.flags.map((flag, i) => (
                  <span
                    key={i}
                    className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Title History Dialog ─────────────────────────────────────────────────────

function TitleDialog({
  summary,
  onClose,
}: {
  summary: TitleHistorySummary;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-green-50 px-6 py-4 border-b border-green-100 flex items-start justify-between rounded-t-2xl">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">
              📄 Registration &amp; Title History
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  summary.current_status?.toLowerCase().includes("clear")
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {summary.current_status}
              </span>
              <span className="text-xs text-gray-400">
                Analyzed {formatDate(summary.analyzed_at)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl ml-4 mt-0.5 leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Buyer summary */}
          <p className="text-sm text-gray-700 leading-relaxed">
            {summary.buyer_summary}
          </p>

          {/* Concerns */}
          {summary.concerns && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-xs font-semibold text-amber-700">
                ⚠️ Buyer Note:{" "}
              </span>
              <span className="text-sm text-amber-800">{summary.concerns}</span>
            </div>
          )}

          {/* Liens */}
          {summary.liens?.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-semibold text-red-700 mb-1">
                🔴 Liens on Record
              </p>
              {summary.liens.map((lien, i) => (
                <p key={i} className="text-sm text-red-800">
                  {lien}
                </p>
              ))}
            </div>
          )}

          {/* Accidents */}
          {summary.accidents?.length > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs font-semibold text-orange-700 mb-1">
                ⚠️ Accident/Incident References
              </p>
              {summary.accidents.map((acc, i) => (
                <p key={i} className="text-sm text-orange-800">
                  {acc}
                </p>
              ))}
            </div>
          )}

          {/* Ownership chain */}
          {summary.ownership_chain?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Ownership Chain ({summary.total_owners} owner
                {summary.total_owners !== 1 ? "s" : ""})
              </p>
              <div className="space-y-2">
                {summary.ownership_chain.map((o, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-xs text-gray-400 w-28 flex-shrink-0 pt-0.5">
                      {o.from} → {o.to}
                    </span>
                    <div>
                      <span className="text-gray-800 font-medium">{o.owner}</span>
                      <span className="text-gray-400 text-xs ml-2">
                        ({o.type})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flags */}
          {summary.flags?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Notable Items
              </p>
              <div className="flex flex-wrap gap-2">
                {summary.flags.map((flag, i) => (
                  <span
                    key={i}
                    className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function DocumentSection({
  entryId,
  isAdmin,
  isPaid,
  initialForm337Summary,
  initialTitleSummary,
  initialDocuments,
}: Props) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [form337Summary, setForm337Summary] = useState<Form337Summary | null>(
    initialForm337Summary as Form337Summary | null
  );
  const [titleSummary, setTitleSummary] = useState<TitleHistorySummary | null>(
    initialTitleSummary as TitleHistorySummary | null
  );
  const [uploadingForm337, setUploadingForm337] = useState(false);
  const [uploadingTitle, setUploadingTitle] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analyzeStatus, setAnalyzeStatus] = useState<string | null>(null);
  const [showForm337Dialog, setShowForm337Dialog] = useState(false);
  const [showTitleDialog, setShowTitleDialog] = useState(false);

  const form337Ref = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const form337Docs = documents.filter((d) => d.type === "form_337");
  const titleDocs = documents.filter((d) => d.type === "title_history");
  const hasAnyDocs = documents.length > 0;
  const hasAnyAnalysis = form337Summary || titleSummary;

  // ── Upload via signed URL (bypasses Vercel 4.5 MB limit) ──────────────────
  const uploadFile = useCallback(
    async (file: File, type: "form_337" | "title_history") => {
      const setUploading =
        type === "form_337" ? setUploadingForm337 : setUploadingTitle;
      setUploading(true);
      setUploadError(null);
      try {
        // Step 1: Get a pre-signed upload URL from the server
        const signRes = await fetch(
          `/api/hangar/${entryId}/documents?sign=1&type=${type}&filename=${encodeURIComponent(file.name)}`
        );
        if (!signRes.ok) {
          const d = await signRes.json().catch(() => ({}));
          throw new Error(d.error || "Could not get upload URL (" + signRes.status + ")");
        }
        const { signedUrl, filePath } = await signRes.json();
        if (!signedUrl) throw new Error("No upload URL returned");

        // Step 2: Upload directly to Supabase Storage
        const putRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/pdf" },
          body: file,
        });
        if (!putRes.ok) {
          const t = await putRes.text().catch(() => "");
          throw new Error(t || "Storage upload failed (" + putRes.status + ")");
        }

        // Step 3: Record metadata in DB
        const metaRes = await fetch(`/api/hangar/${entryId}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            filename: file.name,
            file_path: filePath,
            file_size: file.size,
          }),
        });
        if (!metaRes.ok) {
          const d = await metaRes.json().catch(() => ({}));
          throw new Error(d.error || "Failed to record document (" + metaRes.status + ")");
        }
        const metaData = await metaRes.json();
        setDocuments((prev) => [...prev, metaData.document]);
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [entryId]
  );

  const handleFileChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      type: "form_337" | "title_history"
    ) => {
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach((f) => uploadFile(f, type));
      e.target.value = "";
    },
    [uploadFile]
  );

  const deleteDocument = useCallback(
    async (docId: string) => {
      if (!confirm("Remove this document?")) return;
      await fetch(`/api/hangar/${entryId}/documents?docId=${docId}`, {
        method: "DELETE",
      });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    },
    [entryId]
  );

  const runAnalysis = useCallback(
    async (type: "form_337" | "title_history" | "both") => {
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
    },
    [entryId]
  );

  // ── FREE MEMBER VIEW ──────────────────────────────────────────────────────
  if (!isPaid) {
    return (
      <section className="mt-10 border-t pt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          📄 Documents &amp; Analysis
        </h2>
        {!hasAnyDocs && !hasAnyAnalysis ? (
          <p className="text-gray-400 text-sm">No documents uploaded yet.</p>
        ) : (
          <div className="relative">
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="filter blur-sm pointer-events-none select-none p-5 space-y-3">
                <div className="font-medium text-gray-800">
                  Form 337 Analysis —{" "}
                  {form337Docs.length || "2"} document
                  {form337Docs.length !== 1 ? "s" : ""}
                </div>
                <div className="text-sm text-gray-600">
                  {form337Summary?.buyer_summary
                    ? (form337Summary.buyer_summary as string).slice(0, 80) + "…"
                    : "Major alteration records including avionics upgrades, engine work, and STC installations…"}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">Avionics</span>
                  <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">Engine</span>
                </div>
                <div className="mt-3 font-medium text-gray-800">Title History</div>
                <div className="text-sm text-gray-600">
                  {titleSummary?.buyer_summary
                    ? (titleSummary.buyer_summary as string).slice(0, 80) + "…"
                    : "Ownership chain, lien status, and registration history…"}
                </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="text-3xl mb-3">🔒</div>
                <h3 className="font-semibold text-gray-900 text-base mb-1">
                  Full Document Analysis Available
                </h3>
                <p className="text-sm text-gray-500 mb-4 max-w-xs">
                  Upgrade to Buyer to access the complete repair history,
                  ownership chain, lien status, and downloadable documents.
                </p>
                <a
                  href="/pricing"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
                >
                  Upgrade to Buyer →
                </a>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ── PAID / ADMIN VIEW ─────────────────────────────────────────────────────
  return (
    <>
      <section className="mt-10 border-t pt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          📄 Documents &amp; Analysis
        </h2>

        {/* Admin upload panel */}
        {isAdmin && (
          <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                ADMIN
              </span>
              <span className="text-sm font-medium text-gray-700">
                Document Management
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form 337 upload */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Form 337s ({form337Docs.length})
                </p>
                <ul className="space-y-1 mb-2">
                  {form337Docs.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between text-sm bg-white border border-gray-200 rounded-lg px-3 py-2"
                    >
                      <span
                        className="truncate text-gray-700 max-w-[160px]"
                        title={d.filename}
                      >
                        {d.filename}
                      </span>
                      <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <span>{formatBytes(d.file_size)}</span>
                        <button
                          onClick={() => deleteDocument(d.id)}
                          className="text-red-400 hover:text-red-600"
                        >
                          ✕
                        </button>
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
                  disabled={uploadingForm337}
                  className="w-full text-sm border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-500 hover:text-blue-600 rounded-lg py-2.5 transition disabled:opacity-40"
                >
                  {uploadingForm337 ? "Uploading…" : "+ Add Form 337 PDF"}
                </button>
              </div>

              {/* Title History upload */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Title History ({titleDocs.length})
                </p>
                <ul className="space-y-1 mb-2">
                  {titleDocs.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between text-sm bg-white border border-gray-200 rounded-lg px-3 py-2"
                    >
                      <span
                        className="truncate text-gray-700 max-w-[160px]"
                        title={d.filename}
                      >
                        {d.filename}
                      </span>
                      <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <span>{formatBytes(d.file_size)}</span>
                        <button
                          onClick={() => deleteDocument(d.id)}
                          className="text-red-400 hover:text-red-600"
                        >
                          ✕
                        </button>
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
                  disabled={uploadingTitle || titleDocs.length >= 1}
                  className="w-full text-sm border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-500 hover:text-blue-600 rounded-lg py-2.5 transition disabled:opacity-40"
                >
                  {uploadingTitle
                    ? "Uploading…"
                    : titleDocs.length >= 1
                    ? "Title uploaded (replace to update)"
                    : "+ Add Title History PDF"}
                </button>
              </div>
            </div>

            {uploadError && (
              <p className="mt-3 text-sm text-red-600">{uploadError}</p>
            )}

            {/* Analyze button */}
            {hasAnyDocs && (
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

        {/* ── AI Insight Buttons — visible to ALL paid members ── */}
        {hasAnyAnalysis && (
          <div className="flex flex-wrap gap-3 mb-2">
            {form337Summary && (
              <button
                onClick={() => setShowForm337Dialog(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
              >
                <span>📋</span>
                <span>
                  View Form 337 Analysis
                  {form337Summary.document_count > 0 &&
                    ` (${form337Summary.document_count} form${
                      form337Summary.document_count !== 1 ? "s" : ""
                    })`}
                </span>
              </button>
            )}
            {titleSummary && (
              <button
                onClick={() => setShowTitleDialog(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
              >
                <span>📄</span>
                <span>View Registration History</span>
              </button>
            )}
          </div>
        )}

        {/* No docs yet (non-admin paid) */}
        {!hasAnyDocs && !hasAnyAnalysis && !isAdmin && (
          <p className="text-gray-400 text-sm">
            No documents have been uploaded for this aircraft yet.
          </p>
        )}
      </section>

      {/* ── Dialogs ── */}
      {showForm337Dialog && form337Summary && (
        <Form337Dialog
          summary={form337Summary}
          onClose={() => setShowForm337Dialog(false)}
        />
      )}
      {showTitleDialog && titleSummary && (
        <TitleDialog
          summary={titleSummary}
          onClose={() => setShowTitleDialog(false)}
        />
      )}
    </>
  );
}
