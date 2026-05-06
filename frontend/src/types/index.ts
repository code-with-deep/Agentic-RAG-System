export interface ClaimResult {
  claim_id: string
  claim_text: string
  status: "SUPPORTED" | "NOT_SUPPORTED" | "CONTRADICTED"
  supporting_chunk_id: string | null
  evidence: string
  confidence: number
}

export interface ConfidenceBreakdown {
  retrieval_relevance: number
  faithfulness: number
  context_coverage: number
  coherence: number
  final_score: number
  confidence_percentage: number
  confidence_level: "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW"
  confidence_color: string
  confidence_badge: string
  disclaimer: string | null
  breakdown: {
    retrieval_relevance: { score: number; weight: number; weighted: number }
    faithfulness: { score: number; weight: number; weighted: number }
    context_coverage: { score: number; weight: number; weighted: number }
    coherence: { score: number; weight: number; weighted: number }
  }
}

export interface TraceStep {
  step_number: number
  step_name: string
  decision: string
  reasoning: string
  input_summary: Record<string, any>
  output_summary: Record<string, any>
  time_taken_ms: number
  timestamp: string
  alternatives_considered: string[]
}

export interface ChunkResult {
  chunk_id: string
  text: string
  source: string
  page_number: number
  score: number
  strategy: string
  crag_classification: "CORRECT" | "AMBIGUOUS" | "INCORRECT"
}

export interface AnnotationMap {
  claim_text: string
  start_index: number
  end_index: number
  status: "SUPPORTED" | "NOT_SUPPORTED" | "CONTRADICTED"
  confidence: number
}

export interface AgenticResponse {
  query_id: string
  original_query: string
  query_type: string
  routing_confidence: number
  strategy_used: string
  final_answer: string
  confidence_breakdown: ConfidenceBreakdown
  source_label: string
  claims: ClaimResult[]
  hallucination_score: number
  fallback_level: number
  iterations_count: number
  total_latency_ms: number
  decision_trace: TraceStep[]
  retrieved_chunks: ChunkResult[]
  annotation_map: AnnotationMap[]
}

export interface SimpleRAGResponse {
  query_id: string
  query: string
  answer: string
  chunks_used: ChunkResult[]
  latency_ms: number
  source_label: string
}

export interface Document {
  doc_id: string
  filename: string
  file_type: string
  total_pages: number
  upload_date: string
  file_size: number
  tags: string[]
  chunk_counts: Record<string, number>
}

export interface EvaluationResult {
  total_questions: number
  pass_rate: number
  per_question_results: any[]
  aggregate: {
    agentic: {
      faithfulness: number
      relevancy: number
      accuracy: number
      hallucination: number
      overall: number
    }
    simple: {
      faithfulness: number
      relevancy: number
      accuracy: number
      hallucination: number
      overall: number
    }
    improvement: {
      faithfulness_delta: number
      relevancy_delta: number
      accuracy_delta: number
      hallucination_reduction: number
      overall_delta: number
    }
  }
  summary: string
  evaluated_at: string
}

export interface StatsResponse {
  avg_confidence: number
  retry_rate: number
  fallback_rate: number
  avg_latency_ms: number
  total_queries: number
  hallucination_catch_rate: number
}
