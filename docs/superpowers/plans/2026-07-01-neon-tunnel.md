# Neon Tunnel Video Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Three.js neon tunnel demo where `test.mp4` plays inside a glowing portal frame while the camera pushes from a wide corridor shot into a held final close-up over the exact duration of the video.

**Architecture:** Keep a small Vite app with a single `NeonTunnelApp` scene controller plus pure helper modules for deterministic time mapping and camera interpolation. Render the base scene through `EffectComposer` with bloom and a subtle chromatic aberration shader while `test.mp4` drives the master timeline.

**Tech Stack:** Vite, Three.js, Vitest

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/styles.css`

- [ ] Add the minimal Vite project files.
- [ ] Install runtime and test dependencies.

### Task 2: Testable Helpers

**Files:**
- Create: `src/lib/scene-helpers.js`
- Create: `src/lib/scene-helpers.test.js`

- [ ] Write failing tests for depth wrapping, video-time progress mapping, and camera interpolation.
- [ ] Implement only enough helper logic to make those tests pass.

### Task 3: Scene Assembly

**Files:**
- Create: `src/app/neon-tunnel-app.js`
- Modify: `src/main.js`

- [ ] Build the scene, renderer, camera, fog, tunnel modules, streak particles, and a single framed video portal.
- [ ] Replace generated art cards with a `VideoTexture` sourced from `test.mp4`.

### Task 4: Post Processing and Motion

**Files:**
- Modify: `src/app/neon-tunnel-app.js`

- [ ] Add bloom and a custom chromatic aberration pass.
- [ ] Bind camera push-in, tunnel energy, and streak motion to normalized video progress and stop on the last frame.

### Task 5: Verification

**Files:**
- Modify: `README.md`

- [ ] Document how to run the demo locally.
- [ ] Verify with `npm run test` and `npm run build`.
