import type { Features, PurchaseMotivation, SimulationRequest } from "@/types";
import type { FormField } from "@/lib/categories";

/* Form state of the product entry screen (Faz 13b): plain values keyed by input name,
   converted to a SimulationRequest on submit and to a lenient draft for the live check. */

export type Values = Record<string, string | boolean>;

export const EMPTY_VALUES: Values = {
  productUrl: "",
  productName: "",
  price: "",
  marketPrice: "",
  rating: "",
  reviewCount: "",
  description: "",
  // Honest defaults: "everyone" sends no targeting; only the seller's own choices narrow the town.
  ageRange: "genel",
  gender: "unisex",
  incomeLevel: "middle",
  shippingDays: "3",
  returnAvailable: true,
  warranty: false,
};

/** Positive number from a typed value ("1.299,90" is not supported; the inputs are type=number). */
function toNumber(value: string | boolean | undefined): number | undefined {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function text(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function featuresFrom(values: Values, fields: FormField[]): Features {
  const features: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.name];
    if (field.type === "checkbox") features[field.name] = value === true;
    else if (field.name === "colorsText") features.colors = text(value)?.split(",").map((c) => c.trim()).filter(Boolean);
    else features[field.name] = text(value);
  }
  return features as Features;
}

/** Rating 0–5 and a whole count; anything else is left out rather than sent and rejected. */
function socialProof(values: Values): { rating?: number; reviewCount?: number } {
  const rating = Number(String(values.rating ?? "").replace(",", "."));
  const count = Number(String(values.reviewCount ?? "").replace(/[.\s]/g, ""));
  const hasRating = String(values.rating ?? "").trim() !== "" && rating >= 0 && rating <= 5;
  return {
    rating: hasRating ? rating : undefined,
    reviewCount: hasRating && Number.isInteger(count) && count >= 0 && String(values.reviewCount ?? "").trim() !== "" ? count : undefined,
  };
}

function audienceAndCommerce(values: Values) {
  return {
    targetAudience: {
      ageRange: text(values.ageRange) ?? "genel",
      gender: text(values.gender) ?? "unisex",
      incomeLevel: text(values.incomeLevel) ?? "middle",
    },
    commerce: {
      shippingDays: Math.min(60, Math.max(0, Math.round(Number(values.shippingDays) || 0))),
      returnAvailable: values.returnAvailable === true,
      warranty: values.warranty === true,
    },
  };
}

export function toRequest(
  category: string, motivation: PurchaseMotivation, values: Values, fields: FormField[], images: string[],
): SimulationRequest {
  return {
    category,
    purchaseMotivation: motivation,
    productName: String(values.productName ?? "").trim(),
    productUrl: text(values.productUrl),
    price: toNumber(values.price) ?? 0,
    marketPrice: toNumber(values.marketPrice),
    ...socialProof(values),
    description: String(values.description ?? "").trim(),
    features: featuresFrom(values, fields),
    ...audienceAndCommerce(values),
    images,
  };
}

/** Body for POST /api/draft-check: same shape, but nothing is required yet. */
export function toDraft(category: string, motivation: PurchaseMotivation, values: Values, fields: FormField[]) {
  return {
    category,
    purchaseMotivation: motivation,
    productName: String(values.productName ?? "").slice(0, 120),
    price: toNumber(values.price),
    marketPrice: toNumber(values.marketPrice),
    ...socialProof(values),
    description: String(values.description ?? "").slice(0, 4000),
    features: featuresFrom(values, fields),
    ...audienceAndCommerce(values),
  };
}

/** Values of an earlier request, for "start from a previous product". */
export function fromRequest(request: SimulationRequest): Values {
  const values: Values = { ...EMPTY_VALUES };
  values.productName = request.productName ?? "";
  values.productUrl = request.productUrl ?? "";
  values.price = request.price ? String(request.price) : "";
  values.marketPrice = request.marketPrice ? String(request.marketPrice) : "";
  values.description = request.description ?? "";
  values.rating = request.rating != null ? String(request.rating) : "";
  values.reviewCount = request.reviewCount != null ? String(request.reviewCount) : "";
  values.ageRange = request.targetAudience?.ageRange || "genel";
  values.gender = request.targetAudience?.gender || "unisex";
  values.incomeLevel = request.targetAudience?.incomeLevel || "middle";
  values.shippingDays = String(request.commerce?.shippingDays ?? 3);
  values.returnAvailable = !!request.commerce?.returnAvailable;
  values.warranty = !!request.commerce?.warranty;
  for (const [key, value] of Object.entries(request.features ?? {})) {
    if (key === "colors" && Array.isArray(value)) values.colorsText = value.join(", ");
    else if (typeof value === "string" || typeof value === "boolean") values[key] = value;
  }
  return values;
}

/** Labels of the required inputs that are still empty or too short. */
export function missingRequired(values: Values, fields: FormField[]): string[] {
  const missing: string[] = [];
  if (String(values.productName ?? "").trim().length < 4) missing.push("Ürün adı");
  if (!toNumber(values.price)) missing.push("Fiyat");
  if (String(values.description ?? "").trim().length < 40) missing.push("Açıklama (en az 40 karakter)");
  for (const field of fields) {
    if (field.required && !text(values[field.name])) missing.push(field.label);
  }
  return missing;
}

/* ---------------------------------------------------------------- draft in this browser */

export interface SavedDraft {
  category: string;
  motivation: PurchaseMotivation;
  values: Values;
  /** Only web links: uploaded photos are data URLs of several hundred KB each. */
  images: string[];
  savedAt: number;
}

const DRAFT_KEY = "pazarlab-draft-v1";

export function loadDraft(): SavedDraft | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "null");
    return parsed && typeof parsed.category === "string" && parsed.values ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Omit<SavedDraft, "savedAt">): number | null {
  const savedAt = Date.now();
  try {
    const images = draft.images.filter((url) => /^https?:\/\//.test(url));
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, images, savedAt }));
    return savedAt;
  } catch {
    return null; // private mode or full storage: the form still works, it just is not kept
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** A draft worth restoring: the seller typed something of their own. */
export function hasContent(values: Values): boolean {
  return ["productName", "price", "description", "productUrl"].some((key) => String(values[key] ?? "").trim());
}
