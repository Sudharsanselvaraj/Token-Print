import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
test("real generation can be exported, imported, replayed and verified", async ({
  page,
}) => {
  test.skip(
    process.env.TOKENPRINT_LIVE_EXPERIMENTS !== "1",
    "Requires the updated live backend",
  );
  await page.goto("/app?mode=generation");
  await page.getByLabel("Maximum new tokens").fill("3");
  await page
    .getByPlaceholder("Prompt for the model to generate from…")
    .fill("Name a primary color.");
  await page.getByRole("button", { name: "GENERATE →", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Export trace", exact: true }),
  ).toBeVisible();
  await page.locator(".landing-nav-item", { hasText: "Debugger" }).click();
  await page
    .getByRole("button", { name: "Experiments experiments", exact: true })
    .click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save current generation", exact: true })
    .click();
  const download = await pending;
  const raw = await fs.readFile((await download.path())!, "utf8");
  const bundle = JSON.parse(raw);
  expect(bundle.experiment.model.revision).toMatch(/^[a-f0-9]{40}$/);
  expect(bundle.experiment.input.prompt).toBe("Name a primary color.");
  expect(bundle.experiment.input.options.seed).toBe(0);
  await page
    .getByLabel("Import experiment", { exact: true })
    .setInputFiles({
      name: "roundtrip.experiment.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    });
  await expect(page.getByText(/Integrity check passed/)).toBeVisible();
  await page.getByRole("button", { name: "Replay saved results" }).click();
  await expect(
    page.getByText("RECORDED REPLAY", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Re-run and verify", exact: true })
    .click();
  await expect(
    page.getByText(/Verified: model revision and measured predictions match/),
  ).toBeVisible();
  bundle.experiment.model.revision = "0".repeat(40);
  // Integrity protection also covers model metadata.
  await page
    .getByLabel("Import experiment", { exact: true })
    .setInputFiles({
      name: "tampered.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(bundle)),
    });
  await expect(page.getByText(/Integrity check failed/)).toBeVisible();
});
test("real activation patch saves its parameters and verifies its layer predictions", async ({
  page,
}) => {
  test.skip(
    process.env.TOKENPRINT_LIVE_EXPERIMENTS !== "1",
    "Requires the updated live backend",
  );
  await page.goto("/app?mode=debugger");
  await page
    .getByText("Connect backend / capture analysis", { exact: true })
    .click();
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Run analysis", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", {
      name: "Activation Patching activation_patching",
      exact: true,
    })
    .click();
  await page.getByLabel("Patch layers", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Run patch", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Run patch", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Experiments experiments", exact: true })
    .click();
  await page.getByRole("button", { name: /^patch ·/ }).click();
  await page
    .getByRole("button", { name: "Re-run and verify", exact: true })
    .click();
  await expect(
    page.getByText(/Verified: model revision and measured predictions match/),
  ).toBeVisible();
});
