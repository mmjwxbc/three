export function createUploadedVideoSource(file, { createObjectURL = URL.createObjectURL } = {}) {
  if (!file || !file.type?.startsWith("video/")) {
    throw new Error("Please choose a video file.");
  }

  return {
    name: file.name || "Uploaded video",
    url: createObjectURL(file),
  };
}
