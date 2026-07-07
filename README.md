# Video Cube Grid

A standalone Three.js scene inspired by the official `webgl_materials_video` example. It slices `test.mp4` across a 20x10 grid of animated video-textured cubes.

## Run

```bash
npm install
npm run dev
```

The video starts immediately, each cube receives one UV tile from the same `VideoTexture`, and the cube colors drift through HSL like the upstream demo. Run `npm run dev` to view it locally.

## Verify

```bash
npm test
npm run build
```
