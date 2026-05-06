import type {  ClaimResult, AnnotationMap  } from '../types';
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

interface ClaimAnnotatorProps {
  answer: string;
  annotations: AnnotationMap[];
  claims: ClaimResult[];
  hallucinationScore: number;
}

export function ClaimAnnotator({ answer, annotations, claims, hallucinationScore }: ClaimAnnotatorProps) {
  const [activeClaim, setActiveClaim] = useState<string | null>(null);

  // Sort annotations by start_index
  const sortedAnnotations = [...annotations].sort((a, b) => a.start_index - b.start_index);

  // Split text into segments
  const segments: { text: string; annotation?: AnnotationMap }[] = [];
  let currentIdx = 0;

  sortedAnnotations.forEach((anno) => {
    if (anno.start_index > currentIdx) {
      segments.push({ text: answer.slice(currentIdx, anno.start_index) });
    }
    segments.push({ text: answer.slice(anno.start_index, anno.end_index), annotation: anno });
    currentIdx = anno.end_index;
  });

  if (currentIdx < answer.length) {
    segments.push({ text: answer.slice(currentIdx) });
  }

  const supportedCount = claims.filter(c => c.status === "SUPPORTED").length;
  const notSupportedCount = claims.filter(c => c.status === "NOT_SUPPORTED").length;
  const contradictedCount = claims.filter(c => c.status === "CONTRADICTED").length;

  const halPercent = Math.round(hallucinationScore * 100);
  const halColor = halPercent < 20 ? "bg-green-500" : halPercent < 40 ? "bg-yellow-500" : "bg-red-500";
  const halText = halPercent < 20 ? "Low Risk" : halPercent < 40 ? "Medium Risk" : "High Risk";

  return (
    <div className="space-y-6">
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 font-serif leading-relaxed text-gray-200 text-lg shadow-inner">
        {segments.map((seg, idx) => {
          if (!seg.annotation) return <span key={idx}>{seg.text}</span>;
          
          const isSupported = seg.annotation.status === "SUPPORTED";
          const isNotSupported = seg.annotation.status === "NOT_SUPPORTED";
          const isContradicted = seg.annotation.status === "CONTRADICTED";
          const isHovered = activeClaim === seg.annotation.claim_text;

          const baseClass = "relative group cursor-help px-1 rounded transition-colors border-b-2";
          const highlightClass = isSupported
            ? "bg-green-500/20 border-green-500/50 hover:bg-green-500/30"
            : isNotSupported
            ? "bg-red-500/20 border-red-500/50 hover:bg-red-500/30 line-through decoration-red-500/50"
            : "bg-orange-500/20 border-orange-500/50 hover:bg-orange-500/30";

          const hoverGlow = isHovered 
            ? isSupported ? "ring-2 ring-green-500/50 bg-green-500/30" 
              : isNotSupported ? "ring-2 ring-red-500/50 bg-red-500/30" 
              : "ring-2 ring-orange-500/50 bg-orange-500/30"
            : "";

          const matchedClaim = claims.find(c => c.claim_text === seg.annotation?.claim_text);

          return (
            <span 
              key={idx} 
              className={cn(baseClass, highlightClass, hoverGlow)}
              onMouseEnter={() => setActiveClaim(seg.annotation!.claim_text)}
              onMouseLeave={() => setActiveClaim(null)}
            >
              {seg.text}
              
              <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900 border border-gray-700 shadow-xl rounded-lg p-3 pointer-events-none">
                <div className="flex items-center space-x-2 mb-2 border-b border-gray-800 pb-2">
                  {isSupported ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                   isNotSupported ? <XCircle className="w-4 h-4 text-red-500" /> :
                   <AlertTriangle className="w-4 h-4 text-orange-500" />}
                  <span className={cn(
                    "font-bold text-xs",
                    isSupported ? "text-green-500" : isNotSupported ? "text-red-500" : "text-orange-500"
                  )}>
                    {seg.annotation.status.replace("_", " ")}
                  </span>
                  <span className="text-gray-500 text-xs flex-1 text-right">
                    {(seg.annotation.confidence * 100).toFixed(0)}% conf
                  </span>
                </div>
                {matchedClaim?.evidence ? (
                  <p className="text-xs text-gray-300 italic font-sans leading-tight line-clamp-3">
                    "{matchedClaim.evidence}"
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 font-sans">No supporting evidence found in retrieved chunks.</p>
                )}
              </div>
            </span>
          );
        })}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 border-b border-gray-800">
          <div className="p-4 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-800">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Hallucination Risk</span>
            <div className="flex items-center space-x-2">
              <span className={cn("text-xl font-bold", halPercent < 20 ? "text-green-500" : halPercent < 40 ? "text-yellow-500" : "text-red-500")}>
                {halPercent}%
              </span>
              <span className="text-sm text-gray-400">{halText}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-800 rounded-full mt-2 overflow-hidden">
              <div className={cn("h-full rounded-full", halColor)} style={{ width: `${halPercent}%` }} />
            </div>
          </div>
          <div className="p-4 flex items-center justify-center space-x-3 text-green-400">
            <CheckCircle2 className="w-6 h-6" />
            <div className="flex flex-col">
              <span className="text-xl font-bold">{supportedCount}</span>
              <span className="text-xs text-green-500/70 uppercase">Verified</span>
            </div>
          </div>
          <div className="p-4 flex items-center justify-center space-x-3 text-red-400 md:border-l border-gray-800">
            <XCircle className="w-6 h-6" />
            <div className="flex flex-col">
              <span className="text-xl font-bold">{notSupportedCount}</span>
              <span className="text-xs text-red-500/70 uppercase">Unsupported</span>
            </div>
          </div>
          <div className="p-4 flex items-center justify-center space-x-3 text-orange-400 md:border-l border-gray-800">
            <AlertTriangle className="w-6 h-6" />
            <div className="flex flex-col">
              <span className="text-xl font-bold">{contradictedCount}</span>
              <span className="text-xs text-orange-500/70 uppercase">Contradicted</span>
            </div>
          </div>
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-950 border-b border-gray-800 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium">Claim</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Confidence</th>
                <th className="px-4 py-3 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {claims.map((claim, idx) => (
                <tr 
                  key={claim.claim_id} 
                  className={cn(
                    "hover:bg-gray-800/50 cursor-pointer transition-colors",
                    activeClaim === claim.claim_text ? "bg-gray-800" : ""
                  )}
                  onMouseEnter={() => setActiveClaim(claim.claim_text)}
                  onMouseLeave={() => setActiveClaim(null)}
                >
                  <td className="px-4 py-3 text-gray-300 font-medium">
                    {claim.claim_text}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-1 text-[10px] font-bold rounded-full border",
                      claim.status === "SUPPORTED" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                      claim.status === "NOT_SUPPORTED" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    )}>
                      {claim.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {(claim.confidence * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 italic max-w-xs truncate">
                    {claim.evidence || "—"}
                  </td>
                </tr>
              ))}
              {claims.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No factual claims extracted from this answer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
