"use client";
// Copy into frontend/components/ui/ and register it as described in docs/contributor-examples.md.
import { useStore } from "@/lib/store";
export default function TokenProbabilityPanel() {
  const frame = useStore((s) => s.genFrames[Math.max(s.playIndex, 0)]);
  if (!frame?.topk.length)
    return (
      <p>
        No token probabilities recorded. Open the trace gallery or generate a
        token.
      </p>
    );
  return (
    <table>
      <caption>Captured next-token probabilities (top-k subset)</caption>
      <thead>
        <tr>
          <th>Token</th>
          <th>Probability</th>
        </tr>
      </thead>
      <tbody>
        {frame.topk.map((token) => (
          <tr key={token.id}>
            <td>{JSON.stringify(token.text)}</td>
            <td>{(token.prob * 100).toFixed(2)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
