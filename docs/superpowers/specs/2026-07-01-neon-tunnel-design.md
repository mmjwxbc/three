# Neon Tunnel Video Portal Design

## Goal

Build a standalone Three.js demo where the camera starts at one end of a neon tunnel and steadily travels down the corridor toward a single framed `test.mp4` portal fixed at the opposite end.

## Scope

The implementation remains a realtime browser demo. The entire scene timeline is driven by the actual duration of `test.mp4`, and the camera must end on a held close-up when the video reaches its last frame.

## Scene Design

- A long modular tunnel made from repeated panel sections.
- Cyan and magenta emissive strips distributed across walls, ceiling, and floor.
- Fast streak particles and light energy that reinforce forward motion.
- A single large framed video surface placed near the far end of the tunnel.
- A camera that begins at the near end of the corridor and physically moves down the center line toward the far-end video frame.

## Rendering Design

- Use Three.js with a perspective camera and a dark fogged scene.
- Use emissive materials for tunnel lights and the portal rim.
- Use bloom post-processing for the neon glow.
- Use a lightweight custom shader pass for mild chromatic distortion.
- Use `THREE.VideoTexture` for `test.mp4`.

## Content Approach

- Use procedural geometry for the tunnel, frame, and streaks.
- Use `test.mp4` as the only hero content in the scene.

## Interaction

- Keep the experience autoplay-only.
- Support resize and device pixel ratio changes.
- When the video ends, pause motion and hold on the final near-frame composition rather than looping.

## Testing

- Add unit tests for deterministic helper logic that converts video time into normalized scene progress and camera motion.
- Verify production readiness with `npm run test` and `npm run build`.
