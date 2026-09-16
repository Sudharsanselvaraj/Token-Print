/**
 * modal-layers.spec.ts
 *
 * Regression tests for the global layering contract:
 *   - every true modal renders into a global #modal-root portal at the end
 *     of <body>, pinned over the full viewport at the modal layer;
 *   - the 3D scene's DOM overlays (drei <Html> labels via SceneHtml) are
 *     clamped so they can never paint above the modal root;
 *   - pointer/element coverage is still guaranteed while a modal is open.
 *
 * Known bug this guards: drei <Html> assigns near-camera labels inline
 * z-indexes up to ~16.7M, which used to paint operation/token labels above
 * the backdrop. Requires backend on :8000, frontend on :3000.
 */
import { test, expect, type Page } from "@playwright/test";

/** Every element with an effective z-index strictly above the modal root's,
 *  ignoring anything already inside the modal portal. */
async function offendersAboveModalRoot(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const root = document.getElementById("modal-root");
    const modalZ = root ? Number(getComputedStyle(root).zIndex) : 0;
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll("*")) as HTMLElement[]) {
      if (root && root.contains(el)) continue;
      const inline = Number(el.style.zIndex);
      const computed = Number(getComputedStyle(el).zIndex || "0");
      const effective = Number.isFinite(inline) && inline !== 0 ? inline : computed;
      if (Number.isFinite(effective) && effective > modalZ) {
        bad.push(`${el.tagName} class=${String(el.className)} z=${effective}`);
      }
    }
    return bad;
  });
}

async function expectModalCoversViewport(
  page: Page,
  backdrop: string
): Promise<void> {
  // Snap any enter animation to its final frame (e.g. fadeInModal's scale)
  // so the fixed backdrop measures at full viewport coverage.
  await page
    .locator(backdrop)
    .evaluate((el) => {
      el.getAnimations().forEach((a) => a.finish());
    })
    .catch(() => undefined);
  const box = await page.locator(backdrop).boundingBox();
  expect(box).not.toBeNull();
  const vw = page.viewportSize()?.width ?? 0;
  const vh = page.viewportSize()?.height ?? 0;
  expect(box!.x).toBeLessThanOrEqual(0);
  expect(box!.y).toBeLessThanOrEqual(0);
  expect(box!.width).toBeGreaterThanOrEqual(vw);
  expect(box!.height).toBeGreaterThanOrEqual(vh);
}

test.describe("Global layering contract — modals always above the 3D scene", () => {
  test("modal root is the last child of <body>, pinned at the modal layer", async ({ page }) => {
    await page.goto("/app", { waitUntil: "load" });
    await page.waitForSelector("#modal-root", { timeout: 30_000 });

    const info = await page.evaluate(() => {
      const root = document.getElementById("modal-root")!;
      const app = document.querySelector(".app") ?? document.querySelector("main");
      const style = getComputedStyle(root);
      return {
        parentIsBody: root.parentElement === document.body,
        mountedAfterWorkspace:
          app == null ||
          Boolean(app.compareDocumentPosition(root) & Node.DOCUMENT_POSITION_FOLLOWING),
        z: Number(style.zIndex),
        position: style.position,
        pointer: style.pointerEvents,
      };
    });

    expect(info.parentIsBody).toBe(true);
    expect(info.mountedAfterWorkspace).toBe(true);
    expect(info.position).toBe("fixed");
    expect(info.z).toBeGreaterThan(0);
    expect(info.pointer).toBe("none");
  });

  test("scene <Html> labels stay below the modal root while a modal is open", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/app", { waitUntil: "load" });
    await page.waitForSelector(".tensor-row", { timeout: 60_000 });

    // Start the computational journey — this is what mounts the active
    // operation label (drei <Html>) that previously escaped above modals.
    await page.getByTitle(/Play Computational Journey/).first().click();
    await page.waitForTimeout(2200);

    // Sanity check: a scene label is actually in the DOM before we open it.
    const sceneZ = await page.evaluate(() => {
      const zs: number[] = [];
      for (const el of Array.from(document.querySelectorAll("div")) as HTMLElement[]) {
        const zi = Number(el.style.zIndex);
        if (Number.isFinite(zi)) zs.push(zi);
      }
      return Math.max(...zs, 0);
    });
    expect(sceneZ).toBeGreaterThan(0);

    await page.getByRole("button", { name: "HF Models" }).first().click();
    await page.waitForSelector(".hf-explorer-backdrop");

    await expectModalCoversViewport(page, ".hf-explorer-backdrop");
    expect(await offendersAboveModalRoot(page)).toEqual([]);
    expect(errors).toHaveLength(0);

    await expect(page).toHaveScreenshot("modal-over-running-scene.png");
  });

  test("every true modal (HF picker, contributors, trace gallery) portals into #modal-root", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/app", { waitUntil: "load" });
    await page.waitForSelector(".tensor-row", { timeout: 60_000 });

    const modals: Array<{
      name: string;
      open: () => Promise<void>;
      backdrop: string;
      panel: string;
    }> = [
      {
        name: "HF Model Explorer",
        open: async () => page.getByRole("button", { name: "HF Models" }).first().click(),
        backdrop: ".hf-explorer-backdrop",
        panel: ".hf-explorer-panel",
      },
      {
        name: "Contributor Drawer",
        open: async () => page.getByRole("button", { name: "Contribute" }).first().click(),
        backdrop: "[aria-label='Community & Open Source']",
        panel: "[aria-label='Community & Open Source']",
      },
      {
        name: "Trace Gallery",
        open: async () => page.getByTitle(/Inspect or download execution trace/).first().click(),
        backdrop: "[aria-label='Community Trace Gallery']",
        panel: "[aria-label='Community Trace Gallery']",
      },
    ];

    for (const m of modals) {
      await test.step(m.name, async () => {
        await m.open();
        await page.waitForSelector(m.backdrop, { timeout: 30_000 });

        // The dialog mounts inside the global modal root, not where it was
        // defined in the component tree.
        const inPortal = await page
          .locator(m.backdrop)
          .evaluate((el) => !!el.closest("#modal-root"));
        expect(inPortal).toBe(true);

        await expectModalCoversViewport(page, m.backdrop);
        await expect(page.locator(m.panel)).toBeVisible();
        expect(await offendersAboveModalRoot(page)).toEqual([]);

        // Close via Escape, same as a user.
        await page.keyboard.press("Escape");
        await page.waitForSelector(m.backdrop, { state: "detached", timeout: 30_000 });
      });
    }

    expect(errors).toHaveLength(0);
  });
});