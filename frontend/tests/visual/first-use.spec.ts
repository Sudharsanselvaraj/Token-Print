import { test, expect } from "@playwright/test";
test("recorded demo works with no backend and completes the guided tour", async ({
  page,
}) => {
  let backendRequests = 0;
  await page.route("http://localhost:8000/**", (route) => {
    backendRequests++;
    return route.abort();
  });
  await page.goto("/");
  await page
    .getByRole("link", { name: "Try a recorded demo", exact: true })
    .first()
    .click();
  const guide = page.getByRole("complementary", {
    name: "Recorded demo guide",
  });
  await expect(guide.getByText("RECORDED REPLAY")).toBeVisible();
  await expect(guide.getByText("1. Follow a token")).toBeVisible();
  await guide.getByRole("button", { name: "Next step" }).click();
  await expect(guide.getByText("2. Inspect a layer")).toBeVisible();
  await guide.getByRole("button", { name: "Next step" }).click();
  await expect(
    page.locator('[data-dbg-tool="attention_analysis"]'),
  ).toBeVisible();
  await expect(page.locator(".hg-empty")).toHaveCount(0);
  await guide.getByRole("button", { name: "Finish tour" }).click();
  await expect(
    guide.getByText("Captured model data · no live inference"),
  ).toBeVisible();
  expect(backendRequests).toBe(0);
  await page.screenshot({ path: "/tmp/tokenprint-recorded-demo.png" });
});
test("recorded interventions show a requirement instead of making live requests", async ({
  page,
}) => {
  await page.route("http://localhost:8000/**", (route) => route.abort());
  await page.goto("/app?mode=generation&demo=hello-world");
  await expect(
    page.getByText("RECORDED REPLAY", { exact: true }),
  ).toBeVisible();
  await page.locator(".landing-nav-item", { hasText: "Debugger" }).click();
  await page
    .getByRole("button", { name: "Head Ablation head_ablation", exact: true })
    .click();
  await expect(
    page.getByText("This tool runs a new instrumented forward pass.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Run \(/ })).toHaveCount(0);
});
