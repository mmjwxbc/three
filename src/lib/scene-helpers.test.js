import { describe, expect, it } from "vitest";
import {
  createCameraPose,
  createOrbitRotation,
  createPreviewCameraPose,
  createTunnelDepths,
  createVideoGridCell,
  getVideoProgress,
  wrapDepth,
} from "./scene-helpers.js";

describe("wrapDepth", () => {
  it("recycles values that move past the camera back into the tunnel range", () => {
    expect(wrapDepth(10, { min: -180, max: 6 })).toBe(-176);
  });

  it("keeps values that are still inside the tunnel range unchanged", () => {
    expect(wrapDepth(-42, { min: -180, max: 6 })).toBe(-42);
  });
});

describe("createTunnelDepths", () => {
  it("creates evenly spaced module depths", () => {
    expect(createTunnelDepths({ count: 4, spacing: 12, start: 0 })).toEqual([
      0,
      -12,
      -24,
      -36,
    ]);
  });
});

describe("getVideoProgress", () => {
  it("clamps progress into the 0 to 1 range", () => {
    expect(getVideoProgress({ currentTime: 3, duration: 12 })).toBe(0.25);
    expect(getVideoProgress({ currentTime: 99, duration: 12 })).toBe(1);
    expect(getVideoProgress({ currentTime: -4, duration: 12 })).toBe(0);
  });

  it("returns zero when metadata is not ready yet", () => {
    expect(getVideoProgress({ currentTime: 4, duration: 0 })).toBe(0);
  });
});

describe("createCameraPose", () => {
  it("starts on the wide tunnel framing", () => {
    expect(
      createCameraPose(0, {
        start: { x: 0, y: 0.25, z: 16 },
        end: { x: 0, y: 0.02, z: -45.8 },
      }),
    ).toEqual({
      x: 0,
      y: 0.25,
      z: 16,
    });
  });

  it("ends on the close framing when progress completes", () => {
    expect(
      createCameraPose(1, {
        start: { x: 0, y: 0.25, z: 16 },
        end: { x: 0, y: 0.02, z: -45.8 },
      }),
    ).toEqual({
      x: 0,
      y: 0.02,
      z: -45.8,
    });
  });
});

describe("createOrbitRotation", () => {
  it("returns zero when auto rotation is disabled", () => {
    expect(createOrbitRotation(10, false)).toBe(0);
  });

  it("returns a stable rotation speed when enabled", () => {
    expect(createOrbitRotation(4, true)).toBe(1.4);
  });
});

describe("createPreviewCameraPose", () => {
  it("keeps the camera front-on so zero tilt renders without accidental perspective skew", () => {
    expect(createPreviewCameraPose()).toEqual({ x: 0, y: 0, z: 680 });
  });
});

describe("createVideoGridCell", () => {
  it("maps a grid coordinate to the same tile position and UV window as the video cube demo", () => {
    expect(
      createVideoGridCell({
        column: 3,
        row: 2,
        xgrid: 20,
        ygrid: 10,
        sourceWidth: 480,
        sourceHeight: 204,
      }),
    ).toEqual({
      width: 24,
      height: 20.4,
      depth: 24,
      x: -168,
      y: -61.199999999999996,
      uv: {
        unitX: 0.05,
        unitY: 0.1,
        offsetX: 3,
        offsetY: 2,
      },
      hue: 0.15,
      saturation: 0.8,
    });
  });
});
