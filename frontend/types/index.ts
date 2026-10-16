export type PurchaseMotivation = 
  | "stil_begeni" 
  | "ihtiyac" 
  | "problem_cozme" 
  | "yedek_parca_tamir" 
  | "hediye" 
  | "trend" 
  | "profesyonel_kullanim";

/** Must match `Category` in backend/app/models/product.py. */
export const CATEGORIES = [
  "tisort", "pantolon", "mont", "elbise", "etek",
  "telefon", "laptop", "kulaklik", "tablet", "akilli_saat",
  "ayakkabi", "canta", "kozmetik",
] as const;
export type Category = (typeof CATEGORIES)[number];

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
  sizeRange?: string;
  printType?: string;
  collarType?: string;
  sleeveLength?: string;
  waistType?: string;
  legType?: string;
  stretch?: boolean;
  hood?: boolean;
  pocketCount?: string;
  
  // Electronics
  brand?: string;
  ram?: string;
  storage?: string;
  processor?: string;
  camera?: string;
  battery?: string;
  refreshRate?: string;
  screenSize?: string;
  displayType?: string;
  gpu?: string;
  weight?: string;
  operatingSystem?: string;
  connectivity?: string;
  sensors?: string;
  connectionType?: string;
  noiseCancellation?: boolean;
  microphone?: string;
  waterResistance?: string;
  latency?: string;
  
  // Accessories & Home
  material?: string;
  style?: string;
  fit?: string;
  useCase?: string;
  upholstery?: string;
  frameMaterial?: string;
  loadCapacity?: string;
  
  // Spare parts / Problem solving
  compatibleModel?: string;
  dimensions?: string;
  installationEase?: string;

  // Shoes, bags, cosmetics
  soleMaterial?: string;
  heelHeight?: string;
  compartments?: string;
  strapType?: string;
  skinType?: string;
  ingredients?: string;
  volume?: string;
  certifications?: string;
}

export interface Commerce {
  shippingDays: number;
  returnAvailable: boolean;
  warranty: boolean;
  warrantyMonths?: number;
}

export interface InputQualitySignals {
  plausibility: number;
  categoryFit: number;
  brandTrust: number;
  descriptionCompleteness: number;
  specCompleteness: number;
  qualitySignal: number;
  visualAppealSignal: number;
  targetFitSignal: number;
}

export interface InputAnalysisResponse {
  aiUsed: boolean;
  shouldWarn: boolean;
  confidence: number;
  warnings: string[];
  suggestions: string[];
  suspectedCategory?: string | null;
  correctedProductName?: string | null;
  signals: InputQualitySignals;
}

export interface SimulationRequest {
  category: Category;
  purchaseMotivation: PurchaseMotivation;
  productName: string;
  productUrl?: string;
  price: number;
  description: string;
  targetAudience: TargetAudience;
  features: Features;
  commerce: Commerce;
  images?: string[];
  inputAnalysis?: InputAnalysisResponse;
}

export interface Persona {
  name: string;
  purchaseProbability: number;
  reason: string;
  advice: string;
  rank?: number;
  buyerCount?: number;
  sampleSize?: number;
  decision?: "buy" | "watch" | "skip" | string;
  decisionLabel?: string;
  microFeedback?: string;
  aiComment?: string | null;
  personalityType?: string | null;
  personalityTraits?: Record<string, unknown>;
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
  personaFeedback?: PersonaFeedback[];
  /** false when the backend used its rule-based fallback instead of the LLM */
  aiGenerated?: boolean;
  /** why the fallback was used: this visitor's daily AI calls ran out, or the AI is down */
  aiFallbackReason?: "quota" | "unavailable" | null;
}

export interface PersonaFeedback {
  name: string;
  feedback: string;
  action?: string;
}

export interface DebateLog {
  name: string;
  text: string;
}

export interface DecisionDistribution {
  buy: number;
  watch: number;
  skip: number;
}

export interface SimulationResponse {
  overallScore: number;
  marketBreadthScore: number;
  intentConversionScore: number;
  problemSolutionFit: number;
  simulatedConsumers: number;
  estimatedBuyers: number;
  decisionDistribution?: DecisionDistribution;
  topPersonas: Persona[];
  allPersonas?: Persona[];
  weaknesses: string[];
  weaknessSignals?: string[];
  normalizedProduct: NormalizedProduct;
  aiInsights: AiInsights;
  debateLogs?: DebateLog[];
  benchmarkAnalysis?: string;
  images?: string[];
  inputAnalysis?: InputAnalysisResponse;
  /** Share id; null when the backend could not save the result. */
  simulationId?: string | null;
}

/** GET /api/simulations/{id} */
export interface StoredSimulation {
  id: string;
  createdAt: number; // unix seconds
  productName: string;
  category: string;
  response: SimulationResponse;
  request?: SimulationRequest | null; // images stripped; null for rows saved before v2
}

/** POST /api/price-sweep */
export interface SweepPoint {
  factor: number;
  price: number;
  estimatedBuyers: number;
  buyRate: number;
  overallScore: number;
  revenue: number;
}

export interface PriceSweepResponse {
  points: SweepPoint[];
  bestRevenue: SweepPoint;
  bestBuyers: SweepPoint;
}

/** POST /api/compare */
export interface CoreMetrics {
  price: number;
  overallScore: number;
  estimatedBuyers: number;
  simulatedConsumers: number;
  decisionDistribution: DecisionDistribution;
  marketBreadthScore: number;
  intentConversionScore: number;
  problemSolutionFit: number;
  topPersona?: string | null;
  weaknesses: string[];
}

export interface CompareResponse {
  base: CoreMetrics;
  variant: CoreMetrics;
}

export interface HealthStatus {
  status: string;
  ai: { configured: boolean; model: string | null };
  research: { configured: boolean };
}

export interface ProductVariant {
  name?: string | null;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  price?: number | null;
  currency?: string | null;
  availability?: string | null;
  sku?: string | null;
}

export interface ProductLinkReadResponse {
  url: string;
  title?: string | null;
  description?: string | null;
  price?: number | null;
  original_price?: number | null;
  currency?: string | null;
  image?: string | null;
  images: string[];
  brand?: string | null;
  category?: string | null;
  features: Record<string, string | number | null>;
  availability?: string | null;
  sku?: string | null;
  mpn?: string | null;
  gtin?: string | null;
  variants: ProductVariant[];
  source: string;
  warnings: string[];
}
