import { test, expect } from "@playwright/test";
import { cameraOverviewForMode } from "../../components/scenes/ArchitectureLayout";
import { validateTrace } from "../../lib/traceValidation";
import {
  checksum,
  importExperiment,
  generationExperiment,
  compareNumbers,
} from "../../lib/experiments";
import trace from "../../public/demo/hello-world.json";
test("complete recorded fixture and invalid numeric payloads are checked", () => {
  expect(validateTrace(trace).meta.op_catalog!.length).toBeGreaterThan(100);
  expect(trace.analysis.attention.length).toBe(24);
  const broken = structuredClone(trace);
  broken.frames[0].topk[0].prob = 2;
  expect(() => validateTrace(broken)).toThrow("malformed");
  expect(() => validateTrace(null)).toThrow("Invalid trace");
});
test("overview includes full model bounds at narrow and wide aspect ratios", () => {
  for (const mode of ["explorer", "generation", "walkthrough"])
    for (const layers of [1, 12, 24, 80])
      for (const aspect of [0.4, 1, 2]) {
        const view = cameraOverviewForMode(mode, layers, 48, aspect);
        const gap =
          mode === "explorer" ? 14 : mode === "generation" ? 2.6 : 3.4;
        const top = mode === "explorer" ? 13 : 6;
        const bottom =
          mode === "explorer" ? -(layers - 1) * gap - 14 : -(layers + 2) * gap;
        const halfHeight = view.position[2] * Math.tan((48 * Math.PI) / 360);
        expect(view.target[1] + halfHeight).toBeGreaterThan(top);
        expect(view.target[1] - halfHeight).toBeLessThan(bottom);
        expect(halfHeight * aspect).toBeGreaterThanOrEqual(13);
      }
});
test("experiment round trip detects tampering and numerical mismatches", async () => {
  const experiment = generationExperiment(validateTrace(trace));
  const file = { experiment, sha256: await checksum(experiment) };
  const restored = await importExperiment(
    new File([JSON.stringify(file)], "test.json"),
  );
  expect(restored.input.prompt).toBe(trace.meta.prompt);
  file.experiment.input.prompt = "tampered";
  await expect(
    importExperiment(new File([JSON.stringify(file)], "test.json")),
  ).rejects.toThrow("Integrity check");
  expect(compareNumbers([1, 2], [1.00001, 2])).toBeTruthy();
  expect(compareNumbers([1, 2], [1, 3])).toBeFalsy();
});

test("verification never tolerates a nearby but different token identity", () => {
  expect(
    compareNumbers(
      { chosen: { id: 50000, text: "�", logprob: -1 } },
      { chosen: { id: 50001, text: "�", logprob: -1 } },
    ),
  ).toBeFalsy();
  expect(
    compareNumbers(
      [{ token_id: 50000, prob: 0.2 }],
      [{ token_id: 50001, prob: 0.2 }],
    ),
  ).toBeFalsy();
});
