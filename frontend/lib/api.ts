import axios from "axios";
import { HealthStatus, InputAnalysisResponse, ProductLinkReadResponse, SimulationRequest, SimulationResponse } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: API_BASE_URL,
  // A full simulation makes up to four LLM calls (30-60 s cap each) when Gemini is slow.
  timeout: 180_000,
});

/** Turn any API failure into one short Turkish sentence the user can act on. */
export function apiErrorMessage(error: unknown): string {
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
  if (detail) return detail + requestId;
  return `Sunucu hatası${requestId}.`;
}

export const simulateProduct = async (data: SimulationRequest): Promise<SimulationResponse> => {
  const response = await client.post("/api/simulate", data);
  return response.data;
};

export const analyzeProductInput = async (data: SimulationRequest): Promise<InputAnalysisResponse> => {
  const response = await client.post("/api/analyze-input", data, { timeout: 40_000 });
  return response.data;
};

export const readProductLink = async (url: string): Promise<ProductLinkReadResponse> => {
  const response = await client.post("/api/read-product-link", { url }, { timeout: 60_000 });
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
