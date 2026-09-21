# Camera System

## Overview

The Camera System manages the viewport in the 3D canvas, transitioning smoothly between free-roam orbit mode and programmatic follow mode.

## Why it matters

Navigating a 24-layer transformer stack manually via scrolling is tedious and disorienting. A smart camera system acts like a director, automatically framing the relevant mathematical operation so the user can focus on the data.

## How TokenPrint implements it

TokenPrint uses the R3F `<PerspectiveCamera>` paired with `drei`'s `<OrbitControls>`, driven by a **unified camera control bar** shared across Architecture, Generation, Walkthrough, and Debugger modes (with camera bookmarks for quick framing).

> **Desktop gate:** the interactive 3D workspace is gated behind a desktop-only check (min ~1024px width). On smaller screens, panels and debug views still work but the 3D viewport is replaced with a friendly notice.

### The Glider
During Live Inference and Walkthrough chapters, the camera relies on a custom easing function.
1. `playback.ts` calculates a `Vector3` anchor coordinate for every layer in the stack based on the known geometric heights.
2. When the `activeOp` advances to a new layer, the `targetAnchor` updates.
3. Inside a `useFrame` loop, the camera's position and look-at target are mathematically interpolated (using `damp` or `lerp`) towards the new anchor.

### Breaking the Glide
If the user clicks and drags the canvas, an event fires that sets `userOrbiting = true`. This instantly disables the easing function, yielding full control to the user. The UI displays a "Recenter" button to re-engage the Follow mode.

## Diagram

```mermaid
flowchart TD
    Tick[activeOp updates] --> Math[Calculate target Y coordinate]
    Math --> Lerp[useFrame: lerp(current, target, 0.1)]
    Lerp --> Cam[Update Camera Position]
    
    User[Mouse Drag Event] --> Lock[Set userOrbiting = true]
    Lock -.->|Disables| Lerp
```

## Related pages
- [Camera Controls](User-Guide-Camera-Controls)
- [Scene Navigation](User-Guide-Scene-Navigation)

## Further reading
- [Frontend Architecture](../docs/architecture.md)

## Navigation
| Previous | Home | Next |
| --- | --- | --- |
| [Color Mapping](Visualization-System-Color-Mapping) | [Home](Home) | [Interaction Model](Visualization-System-Interaction-Model) |
