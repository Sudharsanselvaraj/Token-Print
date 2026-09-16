/**
 * ui-baseline.spec.ts
 *
 * v2 baseline: the default explorer view renders the real Qwen architecture
 * returned by the live backend (sidebar model card metrics + tensor list) with
 * no fatal JS errors. Cross-checks the rendered numbers against GET /architecture.
 *
 * Requires: backend running on :8000, frontend on :3000.
 */
import { test, expect, type Page } from "@playwright/test";

const ARCH_API = "http://localhost:8000/architecture";

async function metricValue(page: Page, label: string): Promise<string> {
  // The Metric component renders: <div><div>{label}</div><div>{value}</div></div>
  const el = page.locator(".left-sidebar div").filter({ hasText: new RegExp(`^${label}$`) }).first();
  const container = el.locator("xpath=..");
  const valueDiv = container.locator("div").last();
  return ((await valueDiv.textContent()) ?? "").trim();
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

    await page.goto("/app", { waitUntil: "load" });
    await page.waitForSelector(".tensor-row", { timeout: 60_000 });
    // Model name is rendered as an h1 in the sidebar ModelSummaryCard.
    await page.waitForSelector(".left-sidebar h1", { timeout: 10_000 });

    // Model name matches the live backend metadata.
    const h1 = await page.locator(".left-sidebar h1").first().textContent();
    expect(h1?.trim()).toBe(arch.metadata.name);

    // Metric grid shows the true layer/head counts.
    expect(await metricValue(page, "LAYERS")).toBe(String(arch.metadata.num_layers));
    expect(await metricValue(page, "HEADS")).toBe(String(arch.metadata.num_heads));

    // Tensor list reflects the backend's full tensor inventory.
    expect(await page.locator(".tensor-row").count()).toBe(
      arch.tensor_count
    );

    // All four workspace mode links are present in the header; Architecture is active.
    for (const label of ["Architecture", "Generation", "Walkthrough", "Debugger"]) {
      await expect(
        page.locator(".landing-nav-item", { hasText: label }).first()
      ).toBeVisible();
    }
    await expect(
      page.locator(".landing-nav-item.active", { hasText: "Architecture" })
    ).toBeVisible();

    // Screenshot for visual diff baseline.
    await expect(page).toHaveScreenshot("ui-baseline.png");
    expect(errors).toHaveLength(0);
  });
});
