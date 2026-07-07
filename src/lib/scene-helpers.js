export function wrapDepth(value, range) {
  const span = range.max - range.min;

  if (value <= range.max) {
    return value;
  }

  return range.min + ((value - range.max) % span);
}

export function createTunnelDepths({ count, spacing, start = 0 }) {
  return Array.from({ length: count }, (_, index) => start - index * spacing);
}

export function getVideoProgress({ currentTime, duration }) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  const raw = currentTime / duration;
  return Math.min(1, Math.max(0, raw));
}

export function createCameraPose(progress, { start, end }) {
  const clamped = Math.min(1, Math.max(0, progress));

  if (clamped === 0) {
    return { ...start };
  }

  if (clamped === 1) {
    return { ...end };
  }

  const t = smoothstep(clamped);

  return {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
    z: lerp(start.z, end.z, t),
  };
}

export function createOrbitRotation(elapsedTime, enabled = true) {
  if (!enabled) {
    return 0;
  }

  return elapsedTime * 0.35;
}

export function createPreviewCameraPose() {
  return {
    x: 0,
    y: 0,
    z: 680,
  };
}

export function createVideoGridCell({
  column,
  row,
  xgrid,
  ygrid,
  sourceWidth,
  sourceHeight,
}) {
  const width = sourceWidth / xgrid;
  const height = sourceHeight / ygrid;

  return {
    width,
    height,
    depth: width,
    x: (column - xgrid / 2) * width,
    y: (row - ygrid / 2) * height,
    uv: {
      unitX: 1 / xgrid,
      unitY: 1 / ygrid,
      offsetX: column,
      offsetY: row,
    },
    hue: column / xgrid,
    saturation: 1 - row / ygrid,
  };
}

function lerp(start, end, alpha) {
  return start + (end - start) * alpha;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}
