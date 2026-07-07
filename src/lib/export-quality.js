export function getExportProfile() {
  return {
    width: 1440,
    height: 2560,
    videoBitsPerSecond: 32_000_000,
    audioBitsPerSecond: 192_000,
  };
}

export function createRecorderOptions(mimeType, profile = getExportProfile()) {
  return {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: profile.videoBitsPerSecond,
    audioBitsPerSecond: profile.audioBitsPerSecond,
  };
}
