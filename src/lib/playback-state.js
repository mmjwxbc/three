export function createPlaybackButtonState(isPaused) {
  return isPaused
    ? { label: "Play", pressed: true }
    : { label: "Pause", pressed: false };
}
