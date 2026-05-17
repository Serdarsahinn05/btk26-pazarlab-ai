import axios from "axios";
import { InputAnalysisResponse, ProductLinkReadResponse, SimulationRequest, SimulationResponse } from "@/types";

// Default mock response based on the specification
export const mockSimulationResponse: SimulationResponse = {
  overallScore: 68,
  marketBreadthScore: 74,
  intentConversionScore: 63,
  problemSolutionFit: 45,
  simulatedConsumers: 500,
  estimatedBuyers: 341,
  decisionDistribution: {
    buy: 341,
    watch: 96,
    skip: 63,
  },
  topPersonas: [
    {
      name: "Trend Takipçisi",
      purchaseProbability: 0.82,
      reason: "Oversize stil ve renk seçenekleri bu persona için güçlü.",
      advice: "TikTok ve Instagram Reels odaklı kısa kombin videoları önerilir."
    },
    {
      name: "Fiyat Hassas Genç",
      purchaseProbability: 0.65,
      reason: "Su geçirmezlik özelliği dikkat çekiyor ancak fiyat limiti zorluyor.",
      advice: "Öğrenci veya ilk alışveriş indirimleri kurgulanabilir."
    },
    {
      name: "Kalite Odaklı Alıcı",
      purchaseProbability: 0.55,
      reason: "Detaylı malzeme bilgisi arıyor, güven unsurları eksik.",
      advice: "Garanti süresi ve kumaş kalitesi detayları ön plana çıkarılmalı."
    }
  ],
  allPersonas: [
    {
      name: "Trend Takipçisi",
      purchaseProbability: 0.82,
      reason: "Oversize stil ve renk seçenekleri bu persona için güçlü.",
      advice: "TikTok ve Instagram Reels odaklı kısa kombin videoları önerilir.",
      rank: 1,
      buyerCount: 37,
      sampleSize: 42,
      decision: "buy",
      decisionLabel: "ALDI",
      microFeedback: "Trend ve görsel çekicilik bu grubu hızlı ikna ediyor."
    },
    {
      name: "Fiyat Hassas Genç",
      purchaseProbability: 0.65,
      reason: "Su geçirmezlik özelliği dikkat çekiyor ancak fiyat limiti zorluyor.",
      advice: "Öğrenci veya ilk alışveriş indirimleri kurgulanabilir.",
      rank: 2,
      buyerCount: 29,
      sampleSize: 42,
      decision: "buy",
      decisionLabel: "ALDI",
      microFeedback: "Kupon veya ücretsiz kargo ile niyet güçlenir."
    },
    {
      name: "Kalite Odaklı Alıcı",
      purchaseProbability: 0.55,
      reason: "Detaylı malzeme bilgisi arıyor, güven unsurları eksik.",
      advice: "Garanti süresi ve kumaş kalitesi detayları ön plana çıkarılmalı.",
      rank: 3,
      buyerCount: 24,
      sampleSize: 42,
      decision: "buy",
      decisionLabel: "ALDI",
      microFeedback: "Kalite kanıtı netleşirse fiyat bariyeri düşer."
    },
    {
      name: "Premium Alıcı",
      purchaseProbability: 0.52,
      reason: "Premium sunum var ama marka kanıtı zayıf.",
      advice: "Garanti, paketleme ve marka hikayesini öne çıkar.",
      rank: 4,
      buyerCount: 21,
      sampleSize: 41,
      decision: "watch",
      decisionLabel: "KARARSIZ",
      microFeedback: "Marka güveni ve garanti kanıtı bekler."
    },
    {
      name: "Kararsız Sepet Bekletici",
      purchaseProbability: 0.46,
      reason: "İade ve fiyat bilgisi netleşmeden bekler.",
      advice: "Kısa süreli kampanya ve kolay iade mesajı ekle.",
      rank: 5,
      buyerCount: 18,
      sampleSize: 41,
      decision: "watch",
      decisionLabel: "KARARSIZ",
      microFeedback: "Güven sinyaliyle tekrar hedeflenebilir."
    }
  ],
  weaknesses: [
    "Marka güveni düşük.",
    "Garanti bilgisi eksik."
  ],
  normalizedProduct: {
    priceFit: 0.70,
    priceRisk: 0.30,
    qualityScore: 0.76,
    trendFit: 0.81,
    brandTrust: 0.42,
    descriptionCompleteness: 0.73,
    visualAppeal: 0.84,
    seasonFit: 0.92,
    shippingReturnScore: 0.66,
    targetAudienceFit: 0.80,
    differentiationScore: 0.58
  },
  aiInsights: {
    summary: "Ürün özellikle genç ve trend odaklı kullanıcılar için güçlü potansiyel taşıyor.",
    productTypeInsight: "Bu ürün trend odaklı bir stil ürünüdür. Geniş kitleye hitap eder, sosyal medya reklamlarıyla yüksek erişim sağlar.",
    salesRecipe: [
      "Ürün başlığında su geçirmez ve oversize ifadeleri öne çıkarılmalı.",
      "Açıklamaya kumaş türü, beden kalıbı ve iade bilgisi eklenmeli."
    ],
    marketingAdvice: "Instagram Reels ve TikTok odaklı kampanya önerilir.",
    descriptionAdvice: "Kumaş, beden ve iade bilgisi açıklamaya eklenmeli.",
    pricingAdvice: "1800TL premium algıyı koruyor ancak fiyat hassas kullanıcılar için kampanya gerekebilir.",
    seasonAdvice: "Kış sezonu için yüksek uyum var. Yaz döneminde sezon sonu indirimi olarak konumlandırılabilir.",
    channelRecommendation: ["Instagram", "TikTok", "YouTube Shorts"],
    improvedDescription: "Su geçirmez dış yüzeyi ve oversize kesimiyle soğuk ve yağışlı havalarda günlük kullanım için tasarlanmış modern kışlık mont...",
    personaFeedback: [
      {
        name: "Trend Takipçisi",
        feedback: "Trend ve görsel çekicilik satın alma niyetini yükseltiyor.",
        action: "Kısa video kreatifleriyle hedefle."
      },
      {
        name: "Premium Alıcı",
        feedback: "Marka güveni eksik olduğu için karar yavaşlıyor.",
        action: "Garanti ve premium paketleme göster."
      }
    ]
  }
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// For development, we'll use mock data to ensure frontend works independently
const USE_MOCK = false;

export const simulateProduct = async (data: SimulationRequest): Promise<SimulationResponse> => {
  if (USE_MOCK) {
    // Simulate network delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockSimulationResponse);
      }, 3000); // 3 second delay to show the loading screen effectively
    });
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/api/simulate`, data);
    return response.data;
  } catch (error) {
    console.error("Simulation API Error:", error);
    throw error;
  }
};

export const analyzeProductInput = async (data: SimulationRequest): Promise<InputAnalysisResponse> => {
  const response = await axios.post(`${API_BASE_URL}/api/analyze-input`, data);
  return response.data;
};

export const readProductLink = async (url: string): Promise<ProductLinkReadResponse> => {
  const response = await axios.post(`${API_BASE_URL}/api/read-product-link`, { url });
  return response.data;
};

export const checkHealth = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health`);
    return response.data;
  } catch (error) {
    console.error("Health check failed:", error);
    return { status: "error", message: "Backend is unreachable" };
  }
};
