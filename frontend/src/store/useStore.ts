import { create } from "zustand";
import type {
  AgenticResponse,
  SimpleRAGResponse,
  Document,
  EvaluationResult,
  StatsResponse,
} from "../types";
import * as api from "../api/client";

interface AppState {
  // Query state
  currentQuery: string;
  agenticResult: AgenticResponse | null;
  simpleResult: SimpleRAGResponse | null;
  isLoadingAgentic: boolean;
  isLoadingSimple: boolean;
  queryError: string | null;
  conversationHistory: { query: string; answer: string }[];
  includeContext: boolean;

  // Document state
  documents: Document[];
  isLoadingDocuments: boolean;
  isUploading: boolean;
  uploadProgress: number;

  // Evaluation state
  evaluationResult: EvaluationResult | null;
  isEvaluating: boolean;
  evaluationError: string | null;

  // Stats state
  stats: StatsResponse | null;

  // UI state
  activeTab: string;
  showDecisionTrace: boolean;
  showClaimDetails: boolean;
  selectedQueryId: string | null;

  // Actions
  setCurrentQuery: (query: string) => void;
  setIncludeContext: (include: boolean) => void;
  runQuery: (query: string) => Promise<void>;
  runComparison: (query: string) => Promise<void>;
  uploadDocument: (file: File, tags: string[]) => Promise<void>;
  fetchDocuments: () => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
  startEvaluation: () => Promise<void>;
  fetchEvaluationResults: () => Promise<void>;
  fetchStats: () => Promise<void>;
  setActiveTab: (tab: string) => void;
  toggleDecisionTrace: () => void;
  toggleClaimDetails: () => void;
  clearResults: () => void;
  resetError: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Query state
  currentQuery: "",
  agenticResult: null,
  simpleResult: null,
  isLoadingAgentic: false,
  isLoadingSimple: false,
  queryError: null,
  conversationHistory: [],
  includeContext: false,

  // Document state
  documents: [],
  isLoadingDocuments: false,
  isUploading: false,
  uploadProgress: 0,

  // Evaluation state
  evaluationResult: null,
  isEvaluating: false,
  evaluationError: null,

  // Stats state
  stats: null,

  // UI state
  activeTab: "home",
  showDecisionTrace: false,
  showClaimDetails: false,
  selectedQueryId: null,

  // Actions
  setCurrentQuery: (query: string) => set({ currentQuery: query }),
  setIncludeContext: (include: boolean) => set({ includeContext: include }),
  
  runQuery: async (query: string) => {
    set({ isLoadingAgentic: true, queryError: null, agenticResult: null });
    try {
      const history = get().includeContext ? get().conversationHistory : [];
      const result = await api.runAgenticQuery(query, history);
      
      set((state) => ({
        agenticResult: result,
        isLoadingAgentic: false,
        conversationHistory: [
          ...state.conversationHistory,
          { query, answer: result.final_answer }
        ].slice(-5) // keep last 5 turns
      }));
      // Auto-fetch stats to update global dashboard
      get().fetchStats();
    } catch (err: any) {
      set({ queryError: err.message, isLoadingAgentic: false });
    }
  },

  runComparison: async (query: string) => {
    set({ 
      isLoadingAgentic: true, 
      isLoadingSimple: true, 
      queryError: null,
      agenticResult: null,
      simpleResult: null
    });
    try {
      const history = get().includeContext ? get().conversationHistory : [];
      const [agenticResult, simpleResult] = await Promise.all([
        api.runAgenticQuery(query, history).catch(err => {
          throw new Error(`Agentic Error: ${err.message}`);
        }),
        api.runSimpleQuery(query).catch(err => {
          throw new Error(`Simple Error: ${err.message}`);
        })
      ]);
      
      set((state) => ({
        agenticResult,
        simpleResult,
        isLoadingAgentic: false,
        isLoadingSimple: false,
        conversationHistory: [
          ...state.conversationHistory,
          { query, answer: agenticResult.final_answer }
        ].slice(-5)
      }));
      get().fetchStats();
    } catch (err: any) {
      set({ 
        queryError: err.message, 
        isLoadingAgentic: false, 
        isLoadingSimple: false 
      });
    }
  },

  uploadDocument: async (file: File, tags: string[]) => {
    set({ isUploading: true });
    try {
      await api.uploadDocument(file, tags);
      await get().fetchDocuments();
    } finally {
      set({ isUploading: false, uploadProgress: 0 });
    }
  },

  fetchDocuments: async () => {
    set({ isLoadingDocuments: true });
    try {
      const docs = await api.getDocuments();
      set({ documents: docs, isLoadingDocuments: false });
    } catch (err) {
      set({ isLoadingDocuments: false });
      console.error(err);
    }
  },

  deleteDocument: async (docId: string) => {
    try {
      await api.deleteDocument(docId);
      await get().fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  },

  startEvaluation: async () => {
    set({ isEvaluating: true, evaluationError: null });
    try {
      await api.startBatchEvaluation();
      // Keep isEvaluating true until we fetch results manually or via polling
    } catch (err: any) {
      set({ evaluationError: err.message, isEvaluating: false });
    }
  },

  fetchEvaluationResults: async () => {
    try {
      const results = await api.getEvaluationResults();
      set({ evaluationResult: results, isEvaluating: false, evaluationError: null });
    } catch (err: any) {
      set({ evaluationError: err.message, isEvaluating: false });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await api.getStats();
      set({ stats });
    } catch (err) {
      console.error(err);
    }
  },

  setActiveTab: (tab: string) => set({ activeTab: tab }),
  toggleDecisionTrace: () => set((state) => ({ showDecisionTrace: !state.showDecisionTrace })),
  toggleClaimDetails: () => set((state) => ({ showClaimDetails: !state.showClaimDetails })),
  
  clearResults: () => set({ 
    currentQuery: "", 
    agenticResult: null, 
    simpleResult: null, 
    queryError: null,
    showDecisionTrace: false,
    showClaimDetails: false
  }),
  
  resetError: () => set({ queryError: null, evaluationError: null })
}));
