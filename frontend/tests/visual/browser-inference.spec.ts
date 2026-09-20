import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import reference from "../fixtures/browser-gpt2-reference.json";
for (const device of ["wasm", "webgpu"])
  test(`pinned GPT-2 ${device} matches independent ONNX CPU reference`, async ({
    page,
  }) => {
    test.skip(
      process.env.TOKENPRINT_BROWSER_INFERENCE !== "1",
      "Downloads the real 500 MB model",
    );
    test.setTimeout(600000);
    await page.goto("/app?mode=generation");
    await page.getByLabel("Inference engine").selectOption(device);
    await page.getByLabel("Maximum new tokens").fill("1");
    for (const example of reference.examples) {
      await page
        .getByPlaceholder("Prompt for the model to generate from…")
        .fill(example.prompt);
      await page
        .getByRole("button", { name: "GENERATE →", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Export trace", exact: true }),
      ).toBeVisible({ timeout: 300000 });
      const pending = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Export trace", exact: true })
        .click();
      const download = await pending;
      const trace = JSON.parse(
        await fs.readFile((await download.path())!, "utf8"),
      );
      expect(trace.meta.model_revision).toBe(reference.revision);
      expect(trace.meta.device).toBe(device);
      expect(trace.meta.source).toBe("browser");
      expect(trace.meta.uses_kv_cache).toBe(false);
      expect(trace.frames[0].layer_stats).toEqual([]);
      expect(trace.frames[0].chosen.id).toBe(example.topk[0].id);
      expect(
        trace.frames[0].topk.slice(0, 5).map((x: { id: number }) => x.id),
      ).toEqual(example.topk.map((x) => x.id));
      for (let i = 0; i < 5; i++)
        expect(
          Math.abs(trace.frames[0].topk[i].prob - example.topk[i].prob),
        ).toBeLessThan(0.0001);
    }
  });
