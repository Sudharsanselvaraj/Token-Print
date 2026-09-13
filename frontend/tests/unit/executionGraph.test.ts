import assert from "node:assert/strict";
import test from "node:test";
import { EXECUTION_GRAPH, buildExecutionGraph } from "../../lib/executionGraph";

test("execution graph builds deterministic nodes and edges for 24 layers", () => {
  const { nodes, edges, timeline } = buildExecutionGraph(24);
  assert.ok(nodes.size > 100);
  assert.ok(edges.size > 100);
  assert.ok(timeline.length > 100);
  assert.equal(timeline[0].stage, "INPUT");
  assert.equal(timeline[timeline.length - 1].stage, "PREDICTION");
});

test("timeline steps include deterministic camera shots and semantic packet types", () => {
  const norm1Step = EXECUTION_GRAPH.timeline.find((t) => t.stage === "NORM_1");
  assert.ok(norm1Step);
  assert.equal(norm1Step?.packetType, "RESIDUAL");
  assert.ok(["APPROACH", "FOCUS", "FOLLOW", "TRANSITION", "PULLBACK"].includes(norm1Step.cameraShot));
});

test("execution edges have 3D route points", () => {
  for (const [, edge] of EXECUTION_GRAPH.edges) {
    assert.equal(edge.route.length, 3);
    assert.ok(edge.semanticType);
  }
});
