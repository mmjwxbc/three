export const TIMELINE_EFFECTS = {
  "scatter-soft": {
    id: "scatter-soft",
    name: "Soft scatter",
    meta: { type: "scatter", strength: 0.72, color: "#62d5ff" },
  },
  "scatter-strong": {
    id: "scatter-strong",
    name: "Strong scatter",
    meta: { type: "scatter", strength: 1.35, color: "#ff61cf" },
  },
  "transition-scatter": {
    id: "transition-scatter",
    name: "Scatter transition",
    meta: { type: "transition", strength: 1.6, color: "#f7fbff" },
  },
  "filter-cyan": {
    id: "filter-cyan",
    name: "Cyan bloom",
    meta: { type: "filter", filter: "cyan", color: "#42d8ff" },
  },
  "filter-magenta": {
    id: "filter-magenta",
    name: "Magenta pulse",
    meta: { type: "filter", filter: "magenta", color: "#ff4fcf" },
  },
};

export const DEFAULT_TIMELINE_ROWS = [
  {
    id: "transition",
    title: "Transition",
    actions: [
      { id: "transition-1", start: 2.6, end: 4.0, effectId: "transition-scatter" },
    ],
  },
  {
    id: "scatter",
    title: "Scatter",
    actions: [
      { id: "scatter-1", start: 1.4, end: 3.6, effectId: "scatter-soft" },
      { id: "scatter-2", start: 5.4, end: 7.2, effectId: "scatter-strong" },
    ],
  },
  {
    id: "filter",
    title: "Filter",
    actions: [
      { id: "filter-1", start: 0, end: 4.2, effectId: "filter-cyan" },
      { id: "filter-2", start: 4.2, end: 8.4, effectId: "filter-magenta" },
    ],
  },
];

const MIN_ACTION_DURATION = 0.1;
const BASE_SCALE_WIDTH = 74;
const MIN_TIMELINE_ZOOM = 0.5;
const MAX_TIMELINE_ZOOM = 3;

export function normalizeTimelineRows(rows) {
  return rows.map((row) => ({
    ...row,
    actions: [...(row.actions || [])]
      .map((action) => {
        const start = Math.max(0, Number(action.start) || 0);
        const rawEnd = Math.max(0, Number(action.end) || 0);
        const end = Math.max(rawEnd, start + MIN_ACTION_DURATION);

        return {
          ...action,
          start: roundTime(start),
          end: roundTime(end),
        };
      })
      .sort((a, b) => a.start - b.start),
  }));
}

export function getTimelineScaleWidth(zoom) {
  const safeZoom = Math.min(MAX_TIMELINE_ZOOM, Math.max(MIN_TIMELINE_ZOOM, Number(zoom) || 1));
  return Math.round(BASE_SCALE_WIDTH * safeZoom);
}

export function getTimelineState(time, rows = DEFAULT_TIMELINE_ROWS, settings = {}) {
  const activeTime = Math.max(0, Number(time) || 0);
  const normalizedRows = normalizeTimelineRows(rows);
  const state = {
    scatter: 0,
    filter: "clean",
    filterEnabled: true,
    bloom: 1.3,
    hueBoost: 0,
    twist: toNumber(settings.twist, 1),
    tilt: {
      x: 0,
      y: 0,
      z: 0,
    },
  };

  applyFilterSetting(state, settings.filter);

  normalizedRows.forEach((row) => {
    row.actions.forEach((action) => {
      if (activeTime < action.start || activeTime >= action.end) {
        return;
      }

      const effect = TIMELINE_EFFECTS[action.effectId];
      const meta = effect?.meta;

      if (!meta) {
        return;
      }

      if (meta.type === "scatter" || meta.type === "transition") {
        state.scatter = Math.max(
          state.scatter,
          meta.strength * createEnvelope(activeTime, action.start, action.end),
        );
      }

      if (meta.type === "filter") {
        state.filter = meta.filter;
        state.bloom = meta.filter === "magenta" ? 1.55 : 1.25;
        state.hueBoost = meta.filter === "magenta" ? 0.14 : -0.08;
      }

      applyActionParams(state, action.params);
    });
  });

  return state;
}

export function createCenteredTimelineAction({
  currentTime,
  duration,
  effectId,
  length,
  id = `${effectId}-${Date.now()}`,
}) {
  const safeDuration = Math.max(MIN_ACTION_DURATION, Number(duration) || MIN_ACTION_DURATION);
  const safeLength = Math.min(safeDuration, Math.max(MIN_ACTION_DURATION, Number(length) || 1));
  const center = Math.min(safeDuration, Math.max(0, Number(currentTime) || 0));
  const start = Math.min(Math.max(0, center - safeLength / 2), Math.max(0, safeDuration - safeLength));
  const end = Math.min(safeDuration, start + safeLength);

  return {
    id,
    start: roundTime(start),
    end: roundTime(end),
    effectId,
  };
}

export function removeTimelineAction(rows, actionId) {
  return rows.map((row) => ({
    ...row,
    actions: (row.actions || []).filter((action) => action.id !== actionId),
  }));
}

export function updateTimelineActionParams(rows, actionId, params) {
  return rows.map((row) => ({
    ...row,
    actions: (row.actions || []).map((action) => {
      if (action.id !== actionId) {
        return action;
      }

      return {
        ...action,
        params: {
          ...(action.params || {}),
          ...params,
        },
      };
    }),
  }));
}

function applyActionParams(state, params = {}) {
  state.tilt = {
    x: toNumber(params.tiltX, state.tilt.x),
    y: toNumber(params.tiltY, state.tilt.y),
    z: toNumber(params.tiltZ, state.tilt.z),
  };

  applyFilterSetting(state, params.filter);
}

function applyFilterSetting(state, filter) {
  if (filter === "none") {
    state.filter = "clean";
    state.filterEnabled = false;
    state.bloom = 1.05;
    state.hueBoost = 0;
  }

  if (filter === "cyan" || filter === "magenta") {
    state.filter = filter;
    state.filterEnabled = true;
    state.bloom = filter === "magenta" ? 1.55 : 1.25;
    state.hueBoost = filter === "magenta" ? 0.14 : -0.08;
  }
}

function createEnvelope(time, start, end) {
  const duration = Math.max(MIN_ACTION_DURATION, end - start);
  const progress = Math.min(1, Math.max(0, (time - start) / duration));

  return Math.sin(progress * Math.PI);
}

function roundTime(value) {
  return Math.round(value * 1000) / 1000;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
