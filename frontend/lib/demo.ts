import { assetUrl } from "./assets";
import { validateTrace } from "./traceValidation";

/** One catalog shared by the first-use route and trace gallery. */
export const DEMO_TRACES = [
  {
    id: "hello-world",
    title: "Inside a real forward pass",
    description:
      "Follow a recorded Qwen generation, inspect its predictions, then explore captured attention.",
    model: "Qwen/Qwen2.5-0.5B-Instruct",
    architecture: "qwen2",
    tokenCount: 16,
    traceType: "Recorded causal LM / greedy decode",
    source: "TokenPrint Demo",
    traceId: "demo:hello-world",
    tags: ["recorded", "greedy", "qwen2"],
    filePath: "/demo/hello-world.json",
  },
];

export async function fetchDemo(id: string, signal?: AbortSignal) {
  const demo = DEMO_TRACES.find((item) => item.id === id);
  if (!demo)
    throw new Error("Unknown demo. Choose an example from the trace gallery.");
  const response = await fetch(assetUrl(demo.filePath), { signal });
  if (!response.ok)
    throw new Error(`Demo download failed (${response.status}). Please retry.`);
  return validateTrace(await response.json());
}
