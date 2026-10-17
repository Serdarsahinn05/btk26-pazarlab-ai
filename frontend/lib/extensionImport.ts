import type { ProductLinkReadResponse } from "@/types";

/* Hand-off from the browser extension (Faz 18): it reads the open product page through
   /api/read-product-page and opens /dashboard#import=<base64url JSON {v: 1, r: result}>.
   The fragment never reaches a server. Anyone can craft such a link, so everything is
   re-validated and clipped here; the result only pre-fills the form for the seller to check. */

const PREFIX = "#import=";
const MAX_HASH = 64_000;

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.slice(0, max) : null);
const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null);
const httpUrl = (v: unknown) => (typeof v === "string" && /^https?:\/\//i.test(v) && v.length <= 2048 ? v : null);

function decodeBase64Url(text: string): string {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

/** The product read by the extension, or null if the hash is not a (valid) import. */
export function readImportHash(hash: string): ProductLinkReadResponse | null {
  if (!hash.startsWith(PREFIX) || hash.length > MAX_HASH) return null;
  let r: Record<string, unknown>;
  try {
    const data = JSON.parse(decodeBase64Url(hash.slice(PREFIX.length)));
    if (data?.v !== 1 || typeof data.r !== "object" || data.r === null) return null;
    r = data.r;
  } catch {
    return null;
  }

  const features: Record<string, string | number> = {};
  if (r.features && typeof r.features === "object") {
    for (const [key, value] of Object.entries(r.features).slice(0, 40)) {
      if (/^[A-Za-z]{1,40}$/.test(key) && (typeof value === "string" || typeof value === "number")) features[key] = typeof value === "string" ? value.slice(0, 200) : value;
    }
  }
  const images = (Array.isArray(r.images) ? r.images : []).map(httpUrl).filter((u): u is string => !!u).slice(0, 6);
  const confidence = ["high", "medium", "low"].includes(r.category_confidence as string) ? (r.category_confidence as "high" | "medium" | "low") : null;

  return {
    url: httpUrl(r.url) ?? "",
    title: str(r.title, 300),
    description: str(r.description, 4000),
    price: num(r.price, 0.01, 10_000_000),
    currency: str(r.currency, 8),
    image: httpUrl(r.image),
    images,
    brand: str(r.brand, 200),
    category: str(r.category, 60),
    features,
    variants: [],
    source: "extension",
    warnings: (Array.isArray(r.warnings) ? r.warnings : []).map((w) => str(w, 300)).filter((w): w is string => !!w).slice(0, 3),
    category_confidence: confidence,
    category_source: null,
    rating: num(r.rating, 0, 5),
    review_count: num(r.review_count, 0, 100_000_000),
  };
}
