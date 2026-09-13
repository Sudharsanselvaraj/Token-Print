import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCallout from "@/components/docs/DocsCallout";

export const metadata: Metadata = {
  title: "Your First Trace",
  description: "Step-by-step guide to running and reading your first TokenPrint trace.",
};

export default function YourFirstTracePage() {
  return (
    <>
      <DocsBreadcrumb slug="your-first-trace" title="Your First Trace" />
      <h1>Your First Trace</h1>
      <p className="docs-meta">Getting Started</p>

      <p>
        A <strong>trace</strong> is a full record of a single forward pass — every operation in
        every layer, in order. TokenPrint records traces in real time as the model runs and
        replays them as 3D animations.
      </p>

      <hr />

      <h2 id="what-a-trace-contains">What a trace contains</h2>

      <p>Each trace frame records:</p>

      <ul>
        <li>The current operation name (e.g., <code>attn.q_proj</code>)</li>
        <li>The layer index (0–23 for the reference model)</li>
        <li>The KV cache phase (<code>prefill</code> or <code>decode</code>)</li>
        <li>Timing metadata (host-side, not GPU-synchronized)</li>
        <li>A reference to the tensor being produced</li>
      </ul>

      <p>
        The op catalog for the reference model contains <strong>243 operations</strong> in a single
        forward pass.
      </p>

      <hr />

      <h2 id="reading-the-animation">Reading the animation</h2>

      <p>
        In Generation mode, the 3D model animates as the trace plays. The component currently
        executing is highlighted. The right panel shows the operation name, layer, input/output
        shapes, and parameter count.
      </p>

      <p>The operation order within each layer follows the actual computation graph:</p>

      <ol>
        <li>Input RMSNorm (<code>input_layernorm</code>)</li>
        <li>Q projection (<code>attn.q_proj</code>)</li>
        <li>K projection (<code>attn.k_proj</code>)</li>
        <li>V projection (<code>attn.v_proj</code>)</li>
        <li>Attention (<code>attention</code>)</li>
        <li>Output projection (<code>attn.o_proj</code>)</li>
        <li>Post-attention RMSNorm (<code>post_attention_layernorm</code>)</li>
        <li>MLP gate projection (<code>mlp.gate_proj</code>)</li>
        <li>MLP up projection (<code>mlp.up_proj</code>)</li>
        <li>MLP down projection (<code>mlp.down_proj</code>)</li>
      </ol>

      <DocsCallout variant="note">
        <p>
          This order is not configurable — it reflects the actual PyTorch execution order captured
          by <code>register_forward_hook</code> on each module.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="kv-cache-phases">KV cache phases</h2>

      <p>
        The trace distinguishes two phases, shown as a badge in the transport bar:
      </p>

      <table>
        <thead>
          <tr>
            <th>Phase</th>
            <th>What happens</th>
            <th>Positions computed</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>prefill</code></td>
            <td>The full prompt is processed in one pass. The KV cache is built.</td>
            <td>All prompt tokens (e.g., 39 for a 39-token prompt)</td>
          </tr>
          <tr>
            <td><code>decode</code></td>
            <td>
              One new token is generated per step. Only the new token position is computed; all
              prior KV pairs are read from cache.
            </td>
            <td>1 (the new token)</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2 id="replay-and-branching">Replay and branching</h2>

      <p>
        Completed traces are saved and can be replayed from the Debugger mode. The trace branching
        panel lets you re-run a trace with a different prompt or model configuration and compare the
        two side by side.
      </p>

      <DocsPrevNext slug="your-first-trace" />
    </>
  );
}
