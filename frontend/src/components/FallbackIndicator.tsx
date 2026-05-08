import { Globe, BrainCircuit, AlertOctagon, FileText } from "lucide-react";


interface FallbackIndicatorProps {
  sourceLabel: string;
  fallbackLevel: number;
  answerText?: string;
}

export function FallbackIndicator({ sourceLabel, fallbackLevel, answerText }: FallbackIndicatorProps) {
  if (!sourceLabel) return null;

  if (sourceLabel === "DOCUMENTS" || fallbackLevel === 0) {
    return (
      <div className="flex items-center space-x-2 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1.5 rounded-lg text-sm font-medium w-fit mb-4">
        <FileText className="w-4 h-4" />
        <span>Answered from Your Documents</span>
      </div>
    );
  }

  if (sourceLabel === "WEB_SEARCH" || fallbackLevel === 2) {
    return (
      <div className="mb-4">
        <div className="flex items-center space-x-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-lg text-sm font-medium w-fit">
          <Globe className="w-4 h-4" />
          <span>Answered from Web Search</span>
        </div>
        <div className="mt-2 text-xs text-yellow-500/80 bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-lg">
          This answer was sourced from web search results, not from your uploaded documents.
        </div>
      </div>
    );
  }

  if (sourceLabel === "LLM_GENERAL_KNOWLEDGE" || fallbackLevel === 3) {
    return (
      <div className="mb-4">
        <div className="flex items-center space-x-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1.5 rounded-lg text-sm font-medium w-fit">
          <BrainCircuit className="w-4 h-4" />
          <span>Answered from General AI Knowledge</span>
        </div>
        <div className="mt-2 text-xs text-orange-500/80 bg-orange-500/5 border border-orange-500/10 p-3 rounded-lg">
          ⚠️ This answer is from general AI knowledge and NOT from your documents. It may not be accurate for your specific context.
        </div>
      </div>
    );
  }

  if (sourceLabel === "ABSTAIN" || fallbackLevel === 4) {
    return (
      <div className="mb-4">
        <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-sm font-medium w-fit">
          <AlertOctagon className="w-4 h-4" />
          <span>Could Not Answer</span>
        </div>
        {answerText && (
          <div className="mt-2 text-sm text-red-400 bg-red-500/5 border border-red-500/20 p-4 rounded-lg">
            <p className="font-semibold mb-2">System Response:</p>
            <div className="whitespace-pre-wrap">{answerText}</div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
