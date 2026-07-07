import { describe, expect, it } from "vitest";
import { createPlaybackButtonState } from "./playback-state.js";

describe("createPlaybackButtonState", () => {
  it("shows Pause while the preview is playing", () => {
    expect(createPlaybackButtonState(false)).toEqual({
      label: "Pause",
      pressed: false,
    });
  });

  it("shows Play while the preview is paused", () => {
    expect(createPlaybackButtonState(true)).toEqual({
      label: "Play",
      pressed: true,
    });
  });
});
