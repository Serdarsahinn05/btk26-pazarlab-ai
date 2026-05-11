export type PurchaseMotivation = 
  | "stil_begeni" 
  | "ihtiyac" 
  | "problem_cozme" 
  | "yedek_parca_tamir" 
  | "hediye" 
  | "trend" 
  | "profesyonel_kullanim";

export interface TargetAudience {
  ageRange: string;
  gender: string;
  incomeLevel: string;
}

export interface Features {
  fabric?: string;
  innerFilling?: string;
  waterproof?: boolean;
  windproof?: boolean;
  season?: string;
  colors?: string[];
  sizes?: string[];
  
  // Electronics
  brand?: string;
  ram?: string;
  storage?: string;
  processor?: string;
  camera?: string;
  battery?: string;
  refreshRate?: string;
  
  // Accessories & Home
  material?: string;
  style?: string;
  fit?: string;
  useCase?: string;
  
  // Spare parts / Problem solving
  compatibleModel?: string;
  dimensions?: string;
  installationEase?: string;
}

export interface Commerce {
  shippingDays: number;
  returnAvailable: boolean;
  warranty: boolean;
  warrantyMonths?: number;
}

export interface SimulationRequest {
  category: string;
  purchaseMotivation: PurchaseMotivation;
  productName: string;
  price: number;
  description: string;
  targetAudience: TargetAudience;
  features: Features;
  commerce: Commerce;
}

export interface Persona {
  name: string;
  purchaseProbability: number;
  reason: string;
  advice: string;
}

export interface NormalizedProduct {
  priceFit: number;
  priceRisk: number;
  qualityScore: number;
  trendFit: number;
  brandTrust: number;
  descriptionCompleteness: number;
  visualAppeal: number;
  seasonFit: number;
  shippingReturnScore: number;
  targetAudienceFit: number;
  differentiationScore: number;
}

export interface AiInsights {
  summary: string;
  productTypeInsight: string;
  salesRecipe: string[];
  marketingAdvice: string;
  descriptionAdvice: string;
  pricingAdvice: string;
  seasonAdvice: string;
  channelRecommendation: string[];
  improvedDescription: string;
}

export interface SimulationResponse {
  overallScore: number;
  marketBreadthScore: number;
  intentConversionScore: number;
  problemSolutionFit: number;
  simulatedConsumers: number;
  estimatedBuyers: number;
  topPersonas: Persona[];
  weaknesses: string[];
  normalizedProduct: NormalizedProduct;
  aiInsights: AiInsights;
}
