import { describe, expect, it, vi } from "vitest";
import { createUploadedVideoSource } from "./video-source.js";

describe("createUploadedVideoSource", () => {
  it("creates an object URL for a valid uploaded video file", () => {
    const file = new File(["fake"], "demo.mp4", { type: "video/mp4" });
    const createObjectURL = vi.fn(() => "blob:demo-video");

    expect(createUploadedVideoSource(file, { createObjectURL })).toEqual({
      name: "demo.mp4",
      url: "blob:demo-video",
    });
    expect(createObjectURL).toHaveBeenCalledWith(file);
  });

  it("rejects non-video files before they reach the renderer", () => {
    const file = new File(["fake"], "notes.txt", { type: "text/plain" });

    expect(() => createUploadedVideoSource(file, { createObjectURL: vi.fn() })).toThrow(
      "Please choose a video file.",
    );
  });
});
