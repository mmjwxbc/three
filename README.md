# Video Cube Grid

A standalone Three.js scene inspired by the official `webgl_materials_video` example. It lets users upload a video, then slices it across a 20x10 grid of animated video-textured cubes.

## Run

```bash
npm install
npm run dev
```

Upload a video in the browser to start playback. Each cube receives one UV tile from the same `VideoTexture`, and the cube colors drift through HSL like the upstream demo.

The repository may contain a local `test.mp4` for development, but the app does not import it during build. This keeps Cloudflare Pages output under the 25 MiB per-file asset limit.

## Verify

```bash
npm test
npm run build
```
