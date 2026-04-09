"use client";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  entryId: string;
  currentAvionics: string[];
}

export default function AvioncsPanelUpload({ entryId, currentAvionics }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ avionics: string[]; notes?: string } | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(file: File) {
    setLoading(true);
    setError("");
    setResult(null);
    setSaved(false);

    try {
      const imageBase64 = await fileToBase64(file);
      const imageMediaType = file.type as "image/jpeg" | "image/png" | "image/webp";

      const res = await fetch("/api/analyze-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, imageMediaType }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Analysis failed");

      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setLoading(true);

    try {
      const supabase = createClient();
      // Merge with existing avionics, deduplicate
      const merged = [...new Set([...currentAvionics, ...result.avionics])];

      const { error: updateError } = await supabase
        .from("hangar_entries")
        .update({ identified_avionics: merged })
        .eq("id", entryId);

      if (updateError) throw updateError;

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      {!result ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200 hover:border-blue-200 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                Analyzing panel…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Identify from panel photo
              </>
            )}
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">Found {result.avionics.length} items:</p>
          <div className="flex flex-wrap gap-1.5">
            {result.avionics.map((item, i) => (
              <span key={i} className="badge bg-blue-50 text-blue-700 text-xs">{item}</span>
            ))}
          </div>
          {result.notes && (
            <p className="text-xs text-slate-500 italic">{result.notes}</p>
          )}
          <div className="flex gap-2 pt-1">
            {saved ? (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Saved to hangar
              </span>
            ) : (
              <button
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center gap-1 text-xs bg-blue-700 text-white px-2.5 py-1.5 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
              >
                {loading ? "Saving…" : "Save to hangar"}
              </button>
            )}
            <button
              onClick={() => { setResult(null); setSaved(false); }}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
