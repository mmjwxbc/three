import { describe, expect, it } from "vitest";
import { createRecorderOptions, getExportProfile } from "./export-quality.js";

describe("getExportProfile", () => {
  it("uses a sharper 9:16 export profile by default", () => {
    expect(getExportProfile()).toEqual({
      width: 1440,
      height: 2560,
      videoBitsPerSecond: 32_000_000,
      audioBitsPerSecond: 192_000,
    });
  });
});

describe("createRecorderOptions", () => {
  it("adds explicit bitrate settings when a mime type is available", () => {
    expect(createRecorderOptions("video/webm", getExportProfile())).toEqual({
      mimeType: "video/webm",
      videoBitsPerSecond: 32_000_000,
      audioBitsPerSecond: 192_000,
    });
  });

  it("keeps bitrate settings even when the browser chooses the mime type", () => {
    expect(createRecorderOptions("", getExportProfile())).toEqual({
      videoBitsPerSecond: 32_000_000,
      audioBitsPerSecond: 192_000,
    });
  });
});
