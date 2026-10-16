import axios from "axios";
import { SseError, postSse } from "@/lib/sse";
import {
  CompareResponse,
  HealthStatus,
  PriceSweepResponse,
  InputAnalysisResponse,
  ProductLinkReadResponse,
  SimulationRequest,
  SimulationResponse,
  StoredSimulation,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: API_BASE_URL,
  // A full simulation makes up to four LLM calls (30-60 s cap each) when Gemini is slow.
  timeout: 180_000,
});

/** Turn any API failure into one short Turkish sentence the user can act on. */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof SseError) return error.message;
  if (!axios.isAxiosError(error)) return "Beklenmeyen bir hata oluştu.";
  if (error.code === "ECONNABORTED") return "Sunucu zamanında yanıt vermedi. Lütfen tekrar deneyin.";
  if (!error.response) return "Sunucuya ulaşılamıyor. Backend çalışıyor mu?";

  const { status, data, headers } = error.response;
  const detail = typeof data?.detail === "string" ? data.detail : null;
  const requestId = data?.requestId ? ` (kod: ${data.requestId})` : "";

  if (status === 429) {
    const wait = Number(headers["retry-after"]);
    return wait ? `Çok fazla istek gönderildi. ${wait} sn sonra tekrar deneyin.` : "Çok fazla istek gönderildi. Biraz bekleyin.";
  }
  if (status === 422) {
    const first = Array.isArray(data?.detail) ? data.detail[0] : null;
    const field = first?.loc?.filter((part: unknown) => typeof part === "string" && part !== "body").join(" › ");
    return field ? `Form alanı geçersiz: ${field}.` : "Form bilgileri geçersiz.";
  }
  if (status === 413) return "Gönderilen veri çok büyük. Daha az veya daha küçük görsel deneyin.";
  if (status === 404 && detail) return detail;
  if (detail) return detail + requestId;
  return `Sunucu hatası${requestId}.`;
}

export const simulateProduct = async (data: SimulationRequest): Promise<SimulationResponse> => {
  const response = await client.post("/api/simulate", data);
  return response.data;
};

/**
 * Simulation with live progress: onStep(nodeId) fires as each backend step finishes.
 * Falls back to the plain endpoint if the stream breaks before any progress arrived.
 */
export const simulateProductStream = async (data: SimulationRequest, onStep: (step: string) => void): Promise<SimulationResponse> => {
  let result: SimulationResponse | null = null;
  let sawEvent = false;
  try {
    await postSse("/api/simulate/stream", data, (event, payload) => {
      sawEvent = true;
      if (event === "step") onStep((payload as { step: string }).step);
      if (event === "result") result = payload as SimulationResponse;
    });
  } catch (err) {
    if (err instanceof SseError && err.status) throw err; // a real 4xx/5xx: same answer from the plain endpoint
    if (sawEvent) throw err;
    return simulateProduct(data);
  }
  if (!result) throw new SseError("Simülasyon sonucu alınamadı.");
  return result;
};

export const analyzeProductInput = async (data: SimulationRequest): Promise<InputAnalysisResponse> => {
  const response = await client.post("/api/analyze-input", data, { timeout: 40_000 });
  return response.data;
};

export const readProductLink = async (url: string): Promise<ProductLinkReadResponse> => {
  const response = await client.post("/api/read-product-link", { url }, { timeout: 60_000 });
  return response.data;
};

export const priceSweep = async (data: SimulationRequest): Promise<PriceSweepResponse> => {
  const response = await client.post("/api/price-sweep", data, { timeout: 20_000 });
  return response.data;
};

export const compareVariants = async (base: SimulationRequest, variant: SimulationRequest): Promise<CompareResponse> => {
  const response = await client.post("/api/compare", { base, variant }, { timeout: 20_000 });
  return response.data;
};

export const getSimulation = async (id: string): Promise<StoredSimulation> => {
  const response = await client.get(`/api/simulations/${encodeURIComponent(id)}`, { timeout: 15_000 });
  return response.data;
};

export const checkHealth = async (): Promise<HealthStatus | null> => {
  try {
    const response = await client.get("/api/health", { timeout: 5_000 });
    return response.data;
  } catch {
    return null;
  }
};
