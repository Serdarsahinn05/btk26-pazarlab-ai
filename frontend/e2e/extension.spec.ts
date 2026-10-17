import fs from "node:fs";
import path from "node:path";
import { importUrl } from "../../extension/handoff.js";
import { snapshotPage } from "../../extension/snapshot.js";
import { API, expect, test } from "./fixtures";

// The extension's own pieces, minus the chrome.* glue: page snapshot → real API → #import → form.
const FIXTURES = path.join(__dirname, "..", "..", "backend", "tests", "fixtures", "links");
const page_ = (name: string) => fs.readFileSync(path.join(FIXTURES, name), "utf8");
const snapshot = (limit: number) => `(${snapshotPage.toString()})(${limit})`;
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

// Product photos point at made-up shop hosts; answer them instead of failing DNS (a console error).
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/(img|www|cdn)\.example(\.com)?(\.tr)?\//, (route) =>
    route.request().resourceType() === "script"
      ? route.fulfill({ contentType: "text/javascript", body: "" })
      : route.fulfill({ contentType: "image/png", body: PIXEL }),
  );
});

test("a product page sent by the extension opens as a filled form", async ({ page, request }) => {
  // The shop page as the browser rendered it, plus the kind of noise the snapshot drops.
  const html = page_("jsonld_marketplace.html").replace("</body>", '<script src="https://cdn.example/app.js"></script><style>p{}</style></body>');
  await page.route("https://magaza.example/**", (route) => route.fulfill({ contentType: "text/html; charset=utf-8", body: html }));
  await page.goto("https://magaza.example/saten-midi-elbise-p-123");

  const snap = (await page.evaluate(snapshot(2_900_000))) as { html: string; url: string };
  expect(snap.url).toBe("https://magaza.example/saten-midi-elbise-p-123");
  expect(snap.html).toContain("application/ld+json");
  expect(snap.html).not.toContain("cdn.example/app.js");
  expect(snap.html).not.toContain("<style");

  const res = await request.post(`${API}/api/read-product-page`, { data: snap });
  expect(res.ok()).toBeTruthy();
  const result = await res.json();

  await page.goto(importUrl("http://localhost:3000", result));
  await expect(page.locator("#productName")).toHaveValue("Saten Midi Elbise Siyah");
  await expect(page.locator("#price")).toHaveValue("1299.9");
  await expect(page.locator("#productUrl")).toHaveValue("https://magaza.example/saten-midi-elbise-p-123");
  await expect(page.getByText(/\d+ alan dolduruldu/)).toBeVisible();
  await expect(page.getByText("Kategori sayfanın kendi kategorisinden okundu", { exact: false })).toBeVisible();
  // The hand-off is used once: the fragment is gone, a reload keeps the (saved) draft instead.
  expect(new URL(page.url()).hash).toBe("");
});

test("an oversized page drops its biggest inline scripts but keeps structured data", async ({ page }) => {
  const filler = `<script>window.__BIG__ = "${"x".repeat(50_000)}";</script>`;
  const html = page_("app_json.html").replace("</body>", `${filler}${filler}</body>`);
  await page.route("https://magaza.example/**", (route) => route.fulfill({ contentType: "text/html; charset=utf-8", body: html }));
  await page.goto("https://magaza.example/kiwi-airfryer");

  const snap = (await page.evaluate(snapshot(40_000))) as { html: string };
  expect(snap.html.length).toBeLessThanOrEqual(40_000);
  expect(snap.html).toContain("__NEXT_DATA__");
  expect(snap.html).not.toContain("__BIG__");
  // Below even the bare page: the popup says the page is too large instead of sending a cut page.
  expect(await page.evaluate(snapshot(50))).toEqual({ error: "too_large" });
});

test("a forged import link is cleaned up", async ({ page }) => {
  const forged = {
    category: "tisort", url: "javascript:alert(1)", title: "x".repeat(1000), price: -5, images: ["javascript:alert(1)", "https://img.example/a.jpg"],
    features: { fabric: "Pamuk", "bad key!": "y", nested: { a: 1 } }, rating: 99,
  };
  await page.goto(importUrl("http://localhost:3000", forged));
  await expect(page.locator("#productName")).toHaveValue("x".repeat(120));
  await expect(page.locator("#price")).toHaveValue("");
  await expect(page.locator("#productUrl")).toHaveValue("");
  await expect(page.locator("#fabric")).toHaveValue("Pamuk");
});

test("a broken import link is ignored", async ({ page }) => {
  await page.goto("/dashboard#import=not-base64-json");
  await expect(page.locator("#productName")).toBeVisible();
  await expect(page.locator("#productName")).toHaveValue("");
});
