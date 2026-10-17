import { expect, noHorizontalOverflow, test } from "./fixtures";

test("landing renders and the theme toggle flips the theme", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: "Karanlık temaya geç" }).click();
  await expect(html).toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: "Aydınlık temaya geç" })).toBeVisible();
});

test("landing fits a 375 px phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await noHorizontalOverflow(page);
});
