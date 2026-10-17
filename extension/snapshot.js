/**
 * Runs inside the product page (chrome.scripting.executeScript `func`), so it must stay self-contained.
 * Returns the rendered page (prices filled in by the shop's own scripts included) without what the
 * reader never uses, kept under the API limit: { html, url } or { error }.
 */
export function snapshotPage(maxChars) {
  const root = document.documentElement.cloneNode(true);
  root.querySelectorAll("style, svg, noscript, iframe, link, video, audio, canvas, template, picture source").forEach((el) => el.remove());
  root.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
  // External scripts carry no data. Inline ones may hold the product (JSON-LD, __NEXT_DATA__, window.__STATE__ = {...}).
  root.querySelectorAll("script[src]").forEach((el) => el.remove());

  const size = () => root.outerHTML.length;
  if (size() > maxChars) {
    // Drop plain inline scripts first (biggest first), then JSON blobs; JSON-LD always stays.
    const isJson = (el) => /json/i.test(el.type || "");
    const scripts = [...root.querySelectorAll("script")]
      .filter((el) => !/ld\+json/i.test(el.type || ""))
      .sort((a, b) => isJson(a) - isJson(b) || b.textContent.length - a.textContent.length);
    for (const el of scripts) {
      if (size() <= maxChars) break;
      el.remove();
    }
  }
  const html = "<!doctype html>" + root.outerHTML;
  if (html.length > maxChars) return { error: "too_large" };
  return { html, url: location.href };
}
