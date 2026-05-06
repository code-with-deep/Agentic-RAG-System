import type {  AgenticResponse, SimpleRAGResponse  } from '../types';
import { Zap, RefreshCw, Copy, Check, MessageSquare, ShieldCheck, Activity } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { FallbackIndicator } from "./FallbackIndicator";
import { ConfidenceBreakdown } from "./ConfidenceBreakdown";
import { ClaimAnnotator } from "./ClaimAnnotator";
import { DecisionTrace } from "./DecisionTrace";
import { useStore } from "../store/useStore";

interface AnswerCardProps {
  result: AgenticResponse | SimpleRAGResponse;
  isAgentic?: boolean;
}

export function AnswerCard({ result, isAgentic = false }: AnswerCardProps) {
  const [copied, setCopied] = useState(false);
  const { toggleDecisionTrace, toggleClaimDetails, showDecisionTrace, showClaimDetails } = useStore();

  const handleCopy = () => {
    const textToCopy = isAgentic 
      ? (result as AgenticResponse).final_answer 
      : (result as SimpleRAGResponse).answer;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const agentic = isAgentic ? (result as AgenticResponse) : null;
  const answerText = isAgentic ? agentic!.final_answer : (result as SimpleRAGResponse).answer;

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
          <MessageSquare className="w-6 h-6 text-indigo-500" />
          <span>Answer</span>
        </h2>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-sm text-gray-300">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>{((result as any).total_latency_ms || (result as any).latency_ms) / 1000}s</span>
          </div>
          {isAgentic && agentic!.iterations_count > 1 && (
            <div className="flex items-center space-x-1.5 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-sm text-gray-300">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              <span>{agentic!.iterations_count} iterations</span>
            </div>
          )}
          <button
            onClick={handleCopy}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-700"
            title="Copy answer"
          >
            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isAgentic && (
        <FallbackIndicator 
          sourceLabel={agentic!.source_label} 
          fallbackLevel={agentic!.fallback_level}
          answerText={agentic!.final_answer}
        />
      )}

      {(!isAgentic || agentic!.source_label !== "ABSTAIN") && (
        <>
          {/* Answer Content */}
          <div className="prose prose-invert prose-indigo max-w-none font-serif text-lg leading-relaxed text-gray-300">
            {isAgentic && showClaimDetails ? (
              <ClaimAnnotator 
                answer={agentic!.final_answer}
                annotations={agentic!.annotation_map}
                claims={agentic!.claims}
                hallucinationScore={agentic!.hallucination_score}
              />
            ) : (
              <ReactMarkdown>{answerText}</ReactMarkdown>
            )}
          </div>

          {/* Agentic Extra Info */}
          {isAgentic && (
            <>
              <ConfidenceBreakdown confidence={agentic!.confidence_breakdown} />
              
              <div className="mt-6 pt-6 border-t border-gray-800 flex flex-wrap gap-4">
                <button
                  onClick={toggleClaimDetails}
                  className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>{showClaimDetails ? "Hide Claim Annotations" : "Show Claim Annotations"}</span>
                </button>
                <button
                  onClick={toggleDecisionTrace}
                  className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span>{showDecisionTrace ? "Hide Decision Trace" : "Show Decision Trace"}</span>
                </button>
              </div>

              {showDecisionTrace && (
                <DecisionTrace trace={agentic!.decision_trace} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
