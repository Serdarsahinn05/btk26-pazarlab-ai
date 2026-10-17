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

test("the result bar marks the section you are at, down to the last one", async ({ page, request }) => {
  const id = await createSimulation(request);
  await page.goto(`/dashboard?r=${id}`);
  await expect(page.getByRole("heading", { name: "Ağızdan ağıza" })).toBeVisible();
  const bar = page.getByRole("navigation", { name: "Sonuç bölümleri" });
  const current = bar.locator('[aria-current="location"]');

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(current).toHaveText("Parametreler");

  // A clicked link stays current even when its section cannot scroll up to the top.
  await page.evaluate(() => window.scrollTo(0, 0));
  await bar.getByRole("link", { name: "Açıklama" }).click();
  await page.waitForTimeout(1500);
  await expect(current).toHaveText("Açıklama");
});

test("a resident card opens a chat with that resident, who answers in their own words", async ({ page, request }) => {
  const id = await createSimulation(request);
  await page.goto(`/dashboard?r=${id}`);
  const card = page.locator("article", { has: page.getByRole("link", { name: /ile konuş$/ }) }).first();
  const name = (await card.locator("h3").textContent())!.trim();
  const cardAvatar = await card.locator("img").first().getAttribute("src");

  await card.getByRole("link", { name: `${name} ile konuş` }).click();
  await expect(page).toHaveURL(/view=debate.*chat=r\d{3}/);
  await expect(page.getByRole("heading", { name: "Sakine sor" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Kiminle konuşulacağını seçin" })).toContainText(name);

  await page.getByRole("button", { name: "Neden bu kararı verdin?" }).click();
  const answer = page.locator("ol li").last();
  await expect(answer).toContainText(/^.*(Aldım|Almadım|Sepete ekledim)/, { timeout: 15_000 });
  await expect(answer).toContainText(name);
  await expect(answer.getByText("kural tabanlı")).toBeVisible();
  // Same drawing (next/image only asks for another size).
  const drawing = (src: string | null) => decodeURIComponent(src ?? "").match(/pp_icons\/\d+\.jpeg/)?.[0];
  expect(drawing(await answer.locator("img").getAttribute("src"))).toBe(drawing(cardAvatar));
});
