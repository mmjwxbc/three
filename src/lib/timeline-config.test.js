import { describe, expect, it } from "vitest";
import {
  createCenteredTimelineAction,
  getTimelineState,
  getTimelineScaleWidth,
  normalizeTimelineRows,
  removeTimelineAction,
  updateTimelineActionParams,
} from "./timeline-config.js";

describe("normalizeTimelineRows", () => {
  it("keeps editable rows while sorting actions and preventing zero-duration clips", () => {
    const rows = [
      {
        id: "scatter",
        actions: [
          { id: "late", start: 6, end: 7, effectId: "scatter-strong" },
          { id: "early", start: 2, end: 2, effectId: "scatter-soft" },
        ],
      },
    ];

    expect(normalizeTimelineRows(rows)).toEqual([
      {
        id: "scatter",
        actions: [
          { id: "early", start: 2, end: 2.1, effectId: "scatter-soft" },
          { id: "late", start: 6, end: 7, effectId: "scatter-strong" },
        ],
      },
    ]);
  });
});

describe("getTimelineScaleWidth", () => {
  it("maps zoom to scale width while clamping extremes", () => {
    expect(getTimelineScaleWidth(1)).toBe(74);
    expect(getTimelineScaleWidth(2)).toBe(148);
    expect(getTimelineScaleWidth(0.1)).toBe(37);
    expect(getTimelineScaleWidth(5)).toBe(222);
  });
});

describe("getTimelineState", () => {
  it("returns the default clean state when no action is active", () => {
    expect(getTimelineState(0, [])).toMatchObject({
      scatter: 0,
      filter: "clean",
    });
  });

  it("uses global preview settings when there is no active clip override", () => {
    expect(
      getTimelineState(0, [], {
        filter: "none",
        twist: 0.35,
      }),
    ).toMatchObject({
      filter: "clean",
      filterEnabled: false,
      twist: 0.35,
    });
  });

  it("peaks scatter strength in the middle of an active scatter action", () => {
    const rows = [
      {
        id: "scatter",
        actions: [{ id: "burst", start: 2, end: 4, effectId: "scatter-strong" }],
      },
    ];

    expect(getTimelineState(3, rows).scatter).toBeCloseTo(1.35);
    expect(getTimelineState(4.5, rows).scatter).toBe(0);
  });

  it("uses the active filter action at the requested time", () => {
    const rows = [
      {
        id: "filter",
        actions: [
          { id: "cyan", start: 0, end: 3, effectId: "filter-cyan" },
          { id: "magenta", start: 3, end: 6, effectId: "filter-magenta" },
        ],
      },
    ];

    expect(getTimelineState(1.5, rows).filter).toBe("cyan");
    expect(getTimelineState(3.2, rows).filter).toBe("magenta");
  });

  it("treats transition actions as scatter bursts", () => {
    const rows = [
      {
        id: "transition",
        actions: [{ id: "transition", start: 4, end: 6, effectId: "transition-scatter" }],
      },
    ];

    expect(getTimelineState(5, rows).scatter).toBeCloseTo(1.6);
  });

  it("uses per-action tilt and filter settings instead of a unified effect", () => {
    const rows = [
      {
        id: "transition",
        actions: [
          {
            id: "custom",
            start: 1,
            end: 3,
            effectId: "transition-scatter",
            params: {
              tiltX: -6,
              tiltY: 18,
              tiltZ: 3,
              filter: "none",
            },
          },
        ],
      },
    ];

    expect(getTimelineState(2, rows)).toMatchObject({
      filterEnabled: false,
      filter: "clean",
      tilt: {
        x: -6,
        y: 18,
        z: 3,
      },
    });
  });
});

describe("createCenteredTimelineAction", () => {
  it("creates a transition action centered on the current playhead", () => {
    expect(
      createCenteredTimelineAction({
        currentTime: 5,
        duration: 12,
        effectId: "transition-scatter",
        length: 1.4,
        id: "manual-id",
      }),
    ).toEqual({
      id: "manual-id",
      start: 4.3,
      end: 5.7,
      effectId: "transition-scatter",
    });
  });

  it("keeps centered actions inside the source duration", () => {
    expect(
      createCenteredTimelineAction({
        currentTime: 0.2,
        duration: 1,
        effectId: "transition-scatter",
        length: 1.4,
        id: "manual-id",
      }),
    ).toEqual({
      id: "manual-id",
      start: 0,
      end: 1,
      effectId: "transition-scatter",
    });
  });
});

describe("removeTimelineAction", () => {
  it("removes an action by id without deleting the track row", () => {
    const rows = [
      {
        id: "transition",
        actions: [
          { id: "keep", start: 0, end: 1, effectId: "transition-scatter" },
          { id: "delete-me", start: 2, end: 3, effectId: "transition-scatter" },
        ],
      },
      {
        id: "filter",
        actions: [{ id: "filter-1", start: 0, end: 2, effectId: "filter-cyan" }],
      },
    ];

    expect(removeTimelineAction(rows, "delete-me")).toEqual([
      {
        id: "transition",
        actions: [{ id: "keep", start: 0, end: 1, effectId: "transition-scatter" }],
      },
      {
        id: "filter",
        actions: [{ id: "filter-1", start: 0, end: 2, effectId: "filter-cyan" }],
      },
    ]);
  });
});

describe("updateTimelineActionParams", () => {
  it("stores custom settings on one action without changing sibling clips", () => {
    const rows = [
      {
        id: "transition",
        actions: [
          { id: "custom", start: 0, end: 1, effectId: "transition-scatter" },
          { id: "other", start: 2, end: 3, effectId: "transition-scatter" },
        ],
      },
    ];

    expect(updateTimelineActionParams(rows, "custom", { tiltY: 22, filter: "none" })).toEqual([
      {
        id: "transition",
        actions: [
          {
            id: "custom",
            start: 0,
            end: 1,
            effectId: "transition-scatter",
            params: { tiltY: 22, filter: "none" },
          },
          { id: "other", start: 2, end: 3, effectId: "transition-scatter" },
        ],
      },
    ]);
  });
});
