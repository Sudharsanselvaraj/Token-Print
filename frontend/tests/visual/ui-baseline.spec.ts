/**
 * ui-baseline.spec.ts
 *
 * v2 baseline: the default explorer view renders the real Qwen architecture
 * returned by the live backend (top-bar stats + tensor list) with no fatal
 * JS errors. Cross-checks the rendered numbers against GET /architecture.
 *
 * Requires: backend running on :8000, frontend on :3000.
 */
import { test, expect, type Page } from "@playwright/test";

const ARCH_API = "http://localhost:8000/architecture";

async function textOf(page: Page, selector: string): Promise<string> {
  const el = await page.$(selector);
  return ((await el?.textContent()) ?? "").trim();
}

test.describe("UI baseline — real backend data percolates to the DOM", () => {
  test("top bar and tensor list reflect live /architecture metadata", async ({
    page,
  }) => {
    // Ground truth straight from the backend.
    const arch = await fetch(ARCH_API).then((r) => {
      if (!r.ok) throw new Error(`/architecture failed: ${r.status}`);
      return r.json() as Promise<{
        metadata: {
          name: string;
          num_layers: number;
          num_heads: string | number;
        };
        tensor_count: number;
      }>;
    });
    console.log(
      `backend: ${arch.metadata.name} · ${arch.metadata.num_layers}×${arch.metadata.num_heads} · ${arch.tensor_count} tensors`
    );

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (
        m.type() === "error" &&
        !/favicon|Failed to load resource/i.test(m.text())
      ) {
        errors.push(m.text());
      }
    });

    await page.goto("/", { waitUntil: "load" });
    await page.waitForSelector(".tensor-row", { timeout: 60_000 });
    await page.waitForSelector(".tstat.name", { timeout: 10_000 });

    // Top bar shows the real model name and the true layer/head counts.
    const name = await textOf(page, ".tstat.name");
    expect(name).toBe(arch.metadata.name);
    expect(await textOf(page, ".tstat:has-text('layers')")).toContain(
      String(arch.metadata.num_layers)
    );
    expect(await textOf(page, ".tstat:has-text('heads')")).toContain(
      String(arch.metadata.num_heads)
    );

    // Tensor list reflects the backend's full tensor inventory.
    expect(await page.locator(".tensor-row").count()).toBe(
      arch.tensor_count
    );

    // All four mode tabs are present; explorer is active by default.
    expect(await page.locator(".mode-tab").count()).toBe(4);
    await expect(page.locator(".mode-tab.active")).toHaveText("Architecture");

    // Screenshot for visual diff baseline.
    await expect(page).toHaveScreenshot("ui-baseline.png");
    expect(errors).toHaveLength(0);
  });
});