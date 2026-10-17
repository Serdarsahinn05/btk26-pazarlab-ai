/* What travels from the extension to the site: /dashboard#import=<base64url JSON {v: 1, r}>.
   Decoded and re-validated by frontend/lib/extensionImport.ts. */

const FIELDS = ["url", "title", "description", "price", "currency", "image", "images", "brand", "category", "features",
  "warnings", "category_confidence", "rating", "review_count"];

export function encodeImport(result) {
  const r = {};
  for (const key of FIELDS) if (result[key] !== null && result[key] !== undefined) r[key] = result[key];
  if (Array.isArray(r.images)) r.images = r.images.slice(0, 6);
  const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, r }));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Site address + /dashboard + the hand-off fragment. */
export function importUrl(siteUrl, result) {
  return `${siteUrl.replace(/\/+$/, "")}/dashboard#import=${encodeImport(result)}`;
}
