import { createSimulation, expect, noHorizontalOverflow, test } from "./fixtures";

test("a shared result opens from the server, with town cards and folded tools", async ({ page, request }) => {
  const id = await createSimulation(request);
  const sweeps: string[] = [];
  page.on("request", (r) => r.url().endsWith("/api/price-sweep") && sweeps.push(r.method()));

  await page.goto(`/dashboard?r=${id}`);
  await expect(page.getByRole("heading", { name: "Ağızdan ağıza" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kim alıyor?" })).toBeVisible();

  // "Ne olur?" is folded: nothing is computed until it is opened.
  const whatIf = page.getByRole("button", { name: /Ne olur\?/ });
  await expect(whatIf).toHaveAttribute("aria-expanded", "false");
  expect(sweeps).toEqual([]);
  await whatIf.click();
  await expect(page.getByText("En çok ciro").first()).toBeVisible({ timeout: 20_000 });
  expect(sweeps.filter((m) => m === "POST")).toHaveLength(1);
});

test("debate reveals messages one by one, and at once with reduced motion", async ({ page, request }) => {
  const id = await createSimulation(request);
  await page.goto(`/dashboard?view=debate&r=${id}`);
  const showAll = page.getByRole("button", { name: /Tümünü göster/ });
  await expect(showAll).toBeVisible();
  const before = await page.locator("ol > li").count();
  await showAll.click();
  await expect(showAll).toBeHidden();
  expect(await page.locator("ol > li").count()).toBeGreaterThan(before);

  // Every persona speaker has a drawn avatar, and no two speakers share one.
  const speakers = await page.locator("ol > li").evaluateAll((items) =>
    items.map((li) => [li.querySelector("b")?.textContent, li.querySelector("img")?.getAttribute("src")] as const),
  );
  const avatarBySpeaker = new Map(speakers.filter(([name]) => name !== "Sistem"));
  expect(avatarBySpeaker.size).toBeGreaterThan(1);
  expect([...avatarBySpeaker.values()].every((src) => src?.includes("pp_icons"))).toBeTruthy();
  expect(new Set(avatarBySpeaker.values()).size).toBe(avatarBySpeaker.size);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("ol > li").first()).toBeVisible();
  await expect(showAll).toBeHidden();
});

test("an unknown result id shows an error instead of a blank page", async ({ page, consoleErrors }) => {
  await page.goto("/dashboard?r=doesnotexist1");
  await expect(page.getByText("Bu sonuç bulunamadı ya da süresi doldu.")).toBeVisible();
  // The failed 404 fetch is logged by the browser; that one is expected.
  consoleErrors.splice(0, consoleErrors.length, ...consoleErrors.filter((e) => !e.includes("404")));
});

test("result fits a 375 px phone", async ({ page, request }) => {
  const id = await createSimulation(request);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/dashboard?r=${id}`);
  await expect(page.getByRole("heading", { name: "Ağızdan ağıza" })).toBeVisible();
  await noHorizontalOverflow(page);
});
