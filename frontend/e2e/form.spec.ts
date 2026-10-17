import { expect, noHorizontalOverflow, test } from "./fixtures";

const readiness = (page: import("@playwright/test").Page) => page.locator("#readiness");

test("readiness panel estimates while typing and the draft survives a reload", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(readiness(page)).toContainText("Fiyatı girince tahmin başlar.");

  await page.locator("#productName").fill("Basic Pamuklu Tişört");
  await page.locator("#price").fill("349.9");
  await page.locator("#description").fill("Yüzde yüz pamuk, nefes alan kumaş, regular kesim, günlük kullanım için basic tişört; yıkamada çekmez.");
  await expect(readiness(page)).toContainText("Aynı 500 kişiyle", { timeout: 15_000 });
  await expect(readiness(page).getByText("En çok kazandıracaklar")).toBeVisible();

  // A suggested field scrolls to and focuses its input.
  const firstGain = readiness(page).locator("li button").first();
  await firstGain.click();
  await expect(page.locator("form :focus")).toHaveCount(1);

  await page.reload();
  await expect(page.locator("#productName")).toHaveValue("Basic Pamuklu Tişört");
  await expect(readiness(page)).toContainText("Kaldığın yerden devam ediyorsun");
});

test("reading a link fills the form and the simulation opens the result", async ({ page }) => {
  // The link reader would fetch a real shop page; answer it here instead.
  await page.route("**/api/read-product-link", async (route) => {
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    await route.fulfill({
      status: 200,
      headers: cors,
      json: {
        url: "https://example.com/p", title: "Philips Airfryer XXL Essential 6,2 L",
        description: "2000 W güç, 6,2 litre hazne, yapışmaz kaplama ve dijital ekran ile yağsız pişirme imkânı sunan sıcak hava fritözü; 7 hazır program.",
        price: 4999, images: [], brand: "Philips", category: "airfryer", category_confidence: "high", category_source: "breadcrumb",
        features: { power: "2000 W" }, variants: [], source: "json_ld", warnings: [],
      },
    });
  });

  await page.goto("/dashboard");
  await page.locator("#productUrl").fill("https://example.com/p");
  await page.locator("#productUrl").press("Enter");
  await expect(page.getByText(/\d+ alan dolduruldu/)).toBeVisible();
  await expect(page.locator("#productName")).toHaveValue("Philips Airfryer XXL Essential 6,2 L");
  await expect(page.getByText("linkten").first()).toBeVisible();

  await readiness(page).getByRole("button", { name: "Simülasyonu başlat" }).click();
  await expect(page.getByRole("heading", { name: "Ağızdan ağıza" })).toBeVisible({ timeout: 60_000 });
  await expect(page).toHaveURL(/[?&]r=/);
});

test("form fits a 375 px phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/dashboard");
  await expect(page.locator("#productName")).toBeVisible();
  await noHorizontalOverflow(page);
});
