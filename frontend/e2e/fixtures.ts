import { test as base, expect, type APIRequestContext } from "@playwright/test";

export const API = "http://127.0.0.1:8000";

export const PRODUCT = {
  category: "tisort",
  purchaseMotivation: "stil_begeni",
  productName: "Basic Pamuklu Tişört",
  price: 349.9,
  description: "Yüzde yüz pamuk, nefes alan kumaş, regular kesim, günlük kullanım için basic tişört; yıkamada çekmez.",
  targetAudience: { ageRange: "18-34", gender: "unisex", incomeLevel: "middle" },
  features: { fabric: "pamuk", colors: ["siyah", "beyaz"] },
  commerce: { shippingDays: 2, returnAvailable: true, warranty: false },
  images: [],
};

/** A saved result to open with /dashboard?r=<id>. */
export async function createSimulation(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API}/api/simulate`, { data: PRODUCT });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.simulationId).toBeTruthy();
  return body.simulationId;
}

/** Every test fails on uncaught page errors and console errors (hydration warnings included). */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      await use(errors);
      expect(errors, "console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export async function noHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "horizontal overflow (px)").toBeLessThanOrEqual(0);
}

export { expect };
