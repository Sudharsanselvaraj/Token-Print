import { test, expect, type Page } from "@playwright/test";
async function camera(page: Page): Promise<number[]> {
  return page.evaluate(
    () => (window as unknown as { __ns: { camPos: number[] } }).__ns.camPos,
  );
}
test("overview, layer and operation frame consistently and manual orbit stays put", async ({
  page,
}) => {
  await page.goto("/app?mode=generation&demo=hello-world");
  await expect(
    page.getByText("RECORDED REPLAY", { exact: true }),
  ).toBeVisible();
  await page.waitForFunction(
    () => !!(window as unknown as { __ns?: unknown }).__ns,
  );
  await page.getByRole("button", { name: "OVERVIEW", exact: true }).click();
  await expect.poll(async () => (await camera(page))[2]).toBeGreaterThan(80);
  await page.getByRole("button", { name: "LAYER", exact: true }).click();
  await expect.poll(async () => (await camera(page))[2]).toBeLessThan(20);
  await page.getByRole("button", { name: "OP", exact: true }).click();
  await expect.poll(async () => (await camera(page))[2]).toBeLessThan(11);
  const canvas = page.locator("canvas").first();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6, {
    steps: 10,
  });
  await page.mouse.up();
  await page.waitForTimeout(1500);
  const before = await camera(page);
  await page.waitForTimeout(2500);
  const after = await camera(page);
  expect(Math.hypot(...after.map((v, i) => v - before[i]))).toBeLessThan(0.15);
  await page.getByRole("button", { name: "OVERVIEW", exact: true }).click();
  await expect.poll(async () => (await camera(page))[2]).toBeGreaterThan(80);
});
