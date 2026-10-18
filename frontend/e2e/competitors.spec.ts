import { createSimulation, expect, noHorizontalOverflow, test } from "./fixtures";

// Faz 21: the town chooses between the seller's product, typed-in rivals and none; the rivals stay with the result.
test("rivals get an estimated share that a shared link shows again", async ({ page, request }) => {
  const id = await createSimulation(request);
  await page.goto(`/dashboard?view=benchmark&r=${id}`);
  await expect(page.getByRole("heading", { name: "Rakiplerle yarıştır" })).toBeVisible();

  const first = page.getByRole("group", { name: "Rakip 1" });
  await first.getByLabel("Ürün adı").fill("Ucuz rakip tişört");
  await first.getByLabel("Fiyat (TL)").fill("249,90");
  await page.getByRole("button", { name: "+ Rakip ekle" }).click();
  const second = page.getByRole("group", { name: "Rakip 2" });
  await second.getByLabel("Ürün adı").fill("Garantili rakip tişört");
  await second.getByLabel("Fiyat (TL)").fill("399");
  await second.getByText("Ayrıntılar").click();
  await second.getByLabel("Garanti").selectOption("yes");
  await page.getByRole("button", { name: "Payı hesapla" }).click();

  const shares = page.getByRole("figure").filter({ hasText: "Tahmini pay" });
  await expect(shares.getByText("Senin ürünün")).toBeVisible({ timeout: 20_000 });
  await expect(shares.getByText("Hiçbirini almadı")).toBeVisible();
  await expect(page.getByText("eşit kalite varsayımıyla")).toBeVisible(); // rival 1: name and price only
  await expect(page.getByText(/Senin ürününle aynı varsayıldı: .*kargo süresi/)).toBeVisible(); // rival 2
  await page.getByRole("button", { name: "Hangi persona kime gidiyor?" }).click();
  await expect(page.getByRole("columnheader", { name: "Rakip 2" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("group", { name: "Rakip 2" }).getByLabel("Ürün adı")).toHaveValue("Garantili rakip tişört");
  await expect(page.getByRole("figure").filter({ hasText: "Tahmini pay" })).toBeVisible();

  await page.setViewportSize({ width: 375, height: 800 });
  await noHorizontalOverflow(page);
});
