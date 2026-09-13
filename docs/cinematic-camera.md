# Cinematic Camera Choreography in Generation Mode

This document explains how **TokenPrint's Generation mode** turns raw transformer execution trace streams into continuous, data-driven 3D camera choreography.

---

## 1. How the Shot List is Built from the Real Op Trace

During live token generation or trace replay, the model produces a sequence of operations (`op_catalog`) for every forward pass step.

Each operation is mapped to a 3D target coordinate and camera shot preset based on its execution role:
- **Input Embeddings (`op_key: embed`)**: Top-down angled overview ($Y = 0$) of the input token volume.
- **RMSNorm Waists (`op_key: norm1`, `norm2`)**: Tight perspective close-up on the pinched cylinder neck and learnable gain collar ($\gamma$).
- **GQA Attention Projections (`op_key: attn_q`, `attn_k`, `attn_v`)**: Side-angled framing aligned with the Grouped-Query Attention blade ring.
- **Rotary Position Encoding (`op_key: rope`)**: Close-up tracking focused on the helical position spiral ($X = 3.6$).
- **Softmax Attention (`op_key: softmax`, `attn_scores`)**: Focused surface shot framing the attention matrix.
- **SwiGLU MLP Funnel (`op_key: mlp_gate`, `mlp_up`, `swiglu`, `mlp_down`)**: Low-angle side shot framing the gate $\times$ up junction and wide activation belly.
- **Residual Stream (`op_key: res_add1`, `res_add2`)**: Side angle aligned with the continuous residual spine.
- **Sampling Reveal Shot (`op_key: lm_head`, `output`)**: Ground-level reveal shot settled directly on the real top-$k$ probability skyline.

---

## 2. Real Trace Metrics Driving Framing & Dwell Time

No camera decision uses arbitrary hardcoded guesses. All dynamic framing and timing adjustments are derived directly from real backend trace fields:

1. **Activation Magnitude (`layer_stats` $\rightarrow$ `statNorm`)**:
   - `statNorm` is the normalized mean $|activation|$ at the active layer (`frame.layer_stats[activeLayer] / max(layer_stats)`).
   - **Dynamic Push-in**: Ops with high activation magnitude ($\text{statNorm} > 0.5$) trigger a subtle camera push-in ($\text{zoomFactor} = 1.0 - 0.15 \times (\text{statNorm} - 0.5)$).
   - **Dynamic Dwell Time**: High-activation ops adjust the lerp damping speed (`baseSpeed = 6.2 + 2.0 * (1.0 - statNorm)`), giving key computational moments a longer, smoother hold.

2. **Top-1 Token Probability (`topk` $\rightarrow$ `top1Prob`)**:
   - At the LM Head sampling reveal step, the camera evaluates `top1Prob` (`frame.topk[0].prob`).
   - **High Confidence ($\ge 75\%$)**: The camera zooms in close ($Z = 8.5$) directly on the winning token bar.
   - **Low Confidence / Distributed Logits ($< 75\%$)**: The camera pulls back ($Z = 12.5$) to frame the competing top-$k$ candidate bars side-by-side.

3. **Per-Layer Execution Latency (`layer_timings_ms`)**:
   - Where real per-layer execution timing is provided by PyTorch CUDA events, the playback pace reflects actual compute time spent in each block.

---

## 3. Autoplay Engine Clock Integration

Cinematic movement hooks directly into the existing `PlaybackEngine.tsx` driver:
- Autoplay ticks advance `opIndex` or `playIndex` based on `playSpeed` ($0.5\times$ to $4\times$).
- Per-frame camera position calculations are memoized using React's `useMemo` so $0$ allocations occur inside the 60fps render loop.
- `CameraDirector.tsx` interpolates `camera.position` and `controls.target` continuously using frame deltas (`useFrame`).

---

## 4. `Follow` Toggle Mechanics & OrbitControls Ownership

The **`Follow`** toggle in the transport bar switches camera ownership:
- **`Follow: ON` (`CINEMATIC_CAMERA`)**: The `CameraDirector` owns the camera 100%, gliding smoothly through the model in sync with generation autoplay.
- **`Follow: OFF` (`MANUAL_CAMERA`)**: `OrbitControls` owns the camera completely, allowing full manual rotation, panning, and zooming.
- **Interactive Interruption**: If the user clicks and drags the 3D scene while `Follow` is `ON`, `OrbitControls` temporarily takes over (`userOrbiting = true`). As soon as the user releases the mouse, `Follow` mode seamlessly resumes cinematic tracking.
- **2D Mode Parity**: Toggling `2D View` locks camera position to $[0, \text{stationY}, 13]$, maintaining exact vertical position and active stage indicator parity without losing execution context.
