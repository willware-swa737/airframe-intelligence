import Link from "next/link";

interface HangarCardProps {
  id: string;
  make?: string;
  model?: string;
  year?: number;
  nNumber?: string;
  ttaf?: number;
  smoh?: number;
  tbo?: number;
  listingPrice?: number;
  listingLocation?: string;
  listingSource?: string;
  status: string;
  redFlagsCount: number;
  enrichmentStatus: string;
  aiSummary?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  considering: { label: "Considering", color: "bg-blue-50 text-blue-700" },
  inspection_scheduled: { label: "Inspection Scheduled", color: "bg-yellow-50 text-yellow-700" },
  offer_made: { label: "Offer Made", color: "bg-purple-50 text-purple-700" },
  passed: { label: "Passed", color: "bg-slate-100 text-slate-500" },
  purchased: { label: "Purchased ✓", color: "bg-green-50 text-green-700" },
};

export default function HangarCard({
  id, make, model, year, nNumber, ttaf, smoh, tbo, listingPrice,
  listingLocation, listingSource, status, redFlagsCount, enrichmentStatus, aiSummary,
}: HangarCardProps) {
  const statusCfg = statusConfig[status] ?? statusConfig.considering;
  const smohPct = smoh && tbo ? (smoh / tbo) * 100 : null;
  const engineWarn = smohPct && smohPct > 75;

  return (
    <Link href={`/hangar/${id}`} className="card block hover:shadow-md transition-shadow duration-150 overflow-hidden group">
      {/* Card header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-lg leading-tight truncate">
              {year && make && model ? `${year} ${make} ${model}` : make && model ? `${make} ${model}` : "Aircraft"}
            </h3>
            {nNumber && <p className="text-sm text-slate-400 font-mono">{nNumber}</p>}
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className={`badge ${statusCfg.color}`}>{statusCfg.label}</span>
            {redFlagsCount > 0 && (
              <span className="badge bg-red-50 text-red-600">
                ⚠️ {redFlagsCount} flag{redFlagsCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Key specs row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {ttaf != null && (
            <span className="text-slate-600"><span className="font-medium">{ttaf.toLocaleString()}</span> <span className="text-slate-400">TTAF</span></span>
          )}
          {smoh != null && (
            <span className={engineWarn ? "text-red-600 font-semibold" : "text-slate-600"}>
              <span className="font-medium">{smoh.toLocaleString()}</span> <span className={engineWarn ? "text-red-400" : "text-slate-400"}>SMOH</span>
              {engineWarn && " ⚠️"}
            </span>
          )}
          {listingPrice != null && (
            <span className="text-slate-600 font-medium">${listingPrice.toLocaleString()}</span>
          )}
          {listingLocation && (
            <span className="text-slate-400">{listingLocation}</span>
          )}
        </div>
      </div>

      {/* AI summary or enrichment status */}
      {enrichmentStatus === "complete" && aiSummary && (
        <div className="px-5 pb-4">
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{aiSummary}</p>
        </div>
      )}
      {enrichmentStatus === "in_progress" && (
        <div className="px-5 pb-4 flex items-center gap-2 text-xs text-blue-600">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Researching…
        </div>
      )}
      {enrichmentStatus === "pending" && (
        <div className="px-5 pb-4 text-xs text-slate-400">Enrichment pending</div>
      )}

      {/* Footer */}
      {listingSource && (
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400 capitalize">{listingSource}</span>
          <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </Link>
  );
}
