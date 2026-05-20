import axios from "axios";
import type {
  AgenticResponse,
  SimpleRAGResponse,
  Document,
  TraceStep,
  ClaimResult,
  StatsResponse,
  EvaluationResult,
} from "../types";

let API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const client = axios.create({
  baseURL: API_URL,
});

// Request interceptor for logging and auth headers
client.interceptors.request.use(
  (config) => {
    // Inject JWT Bearer Token for secure authentication
    const userData = localStorage.getItem("docmind_user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user && user.token) {
          config.headers["Authorization"] = `Bearer ${user.token}`;
        }
      } catch (e) {
        console.error("Failed to parse user data for JWT injection", e);
      }
    }

    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to extract clean error messages and handle session expiry
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Handle 401 Unauthorized (JWT expired or invalid)
    if (status === 401) {
      console.warn("Session expired or invalid token. Redirecting to login...");
      localStorage.removeItem("docmind_user");
      // Use window.location for hard redirect as we are outside React context
      if (window.location.pathname !== "/auth") {
        window.location.href = "/auth";
      }
    }

    let message = "An unexpected API error occurred.";
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      message = typeof detail === "string" ? detail : JSON.stringify(detail);
    } else if (error.message) {
      message = error.message;
    }
    
    console.error(`[API Error] ${status ? `[${status}] ` : ""}${message}`, error.response?.data);
    return Promise.reject(new Error(message));
  }
);

// --- Document APIs ---
export async function uploadDocument(file: File, tags: string[]): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("tags", tags.join(","));
  const response = await client.post<Document>("/documents/upload", formData);
  return response.data;
}

export async function getDocuments(): Promise<Document[]> {
  const response = await client.get<Document[]>("/documents");
  return response.data;
}

export async function deleteDocument(docId: string): Promise<void> {
  await client.delete(`/documents/${docId}`);
}

// --- Query APIs ---
export async function runAgenticQuery(query: string, conversationHistory?: any[]): Promise<AgenticResponse> {
  const response = await client.post<AgenticResponse>("/query", {
    query,
    conversation_history: conversationHistory || [],
  });
  return response.data;
}

export async function runSimpleQuery(query: string): Promise<SimpleRAGResponse> {
  const response = await client.post<SimpleRAGResponse>("/query/simple", { query });
  return response.data;
}

export async function getQueryTrace(queryId: string): Promise<TraceStep[]> {
  const response = await client.get<TraceStep[]>(`/query/${queryId}/trace`);
  return response.data;
}

export async function getQueryClaims(queryId: string): Promise<ClaimResult[]> {
  const response = await client.get<ClaimResult[]>(`/query/${queryId}/claims`);
  return response.data;
}

export async function getQueryIterations(queryId: string): Promise<any[]> {
  const response = await client.get<any[]>(`/query/${queryId}/iterations`);
  return response.data;
}

export async function getStats(): Promise<StatsResponse> {
  const response = await client.get<StatsResponse>("/stats");
  return response.data;
}

// --- Evaluation APIs ---
export async function runHallucinationCheck(text: string, context: string): Promise<any> {
  const response = await client.post("/evaluate/hallucination", { text, context });
  return response.data;
}

export async function startBatchEvaluation(): Promise<{ job_id: string; message: string; estimated_minutes: number }> {
  // dataset_id "default" is used by the backend whitelist
  const response = await client.post("/evaluation/run", { dataset_id: "default" });
  return response.data;
}

export async function getEvaluationResults(): Promise<EvaluationResult> {
  const response = await client.get<EvaluationResult>("/evaluate/results");
  return response.data;
}

export async function getEvaluationHistory(): Promise<any[]> {
  const response = await client.get<any[]>("/evaluate/results/history");
  return response.data;
}

// --- Config APIs ---
export async function getRoutingConfig(): Promise<any> {
  const response = await client.get("/config/routing");
  return response.data;
}

export async function updateRoutingConfig(routingTable: Record<string, string>): Promise<any> {
  const response = await client.put("/config/routing", { routing_table: routingTable });
  return response.data;
}

export async function getThresholds(): Promise<any> {
  const response = await client.get("/config/thresholds");
  return response.data;
}

export async function updateThresholds(thresholds: Record<string, any>): Promise<any> {
  const response = await client.put("/config/thresholds", thresholds);
  return response.data;
}

export async function testRouting(query: string): Promise<any> {
  const response = await client.post("/config/test-routing", { query });
  return response.data;
}
