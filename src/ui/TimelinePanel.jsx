import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Timeline } from "@xzdarcy/react-timeline-editor";
import "@xzdarcy/react-timeline-editor/dist/react-timeline-editor.css";
import {
  DEFAULT_TIMELINE_ROWS,
  TIMELINE_EFFECTS,
  createCenteredTimelineAction,
  getTimelineScaleWidth,
  normalizeTimelineRows,
  removeTimelineAction,
  updateTimelineActionParams,
} from "../lib/timeline-config.js";

const TRACK_LABELS = {
  transition: "Transition",
  scatter: "Scatter",
  filter: "Filter",
};

export function mountTimelinePanel(container, options) {
  const root = createRoot(container);
  root.render(<TimelinePanel {...options} />);

  return () => root.unmount();
}

function TimelinePanel({ onChange, onPreviewSettingsChange, onSeek, getCurrentTime, getDuration }) {
  const timelineRef = useRef(null);
  const [rows, setRows] = useState(() => normalizeTimelineRows(DEFAULT_TIMELINE_ROWS));
  const [cursorTime, setCursorTime] = useState(0);
  const [duration, setDuration] = useState(10);
  const [selectedActionId, setSelectedActionId] = useState(null);
  const [previewSettings, setPreviewSettings] = useState({ filter: "inherit", twist: 1 });
  const [timelineZoom, setTimelineZoom] = useState(1);

  const scaleCount = useMemo(() => Math.max(10, Math.ceil(duration)), [duration]);
  const scaleWidth = useMemo(() => getTimelineScaleWidth(timelineZoom), [timelineZoom]);
  const selectedAction = useMemo(() => findAction(rows, selectedActionId), [rows, selectedActionId]);

  useEffect(() => {
    onChange?.(rows);
  }, [onChange, rows]);

  useEffect(() => {
    onPreviewSettingsChange?.(previewSettings);
  }, [onPreviewSettingsChange, previewSettings]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextDuration = getDuration?.();
      if (Number.isFinite(nextDuration) && nextDuration > 0) {
        setDuration(nextDuration);
      }

      const nextTime = getCurrentTime?.();
      if (Number.isFinite(nextTime)) {
        setCursorTime(nextTime);
        timelineRef.current?.setTime(nextTime);
      }
    }, 200);

    return () => window.clearInterval(intervalId);
  }, [getCurrentTime, getDuration]);

  const handleRowsChange = (nextRows) => {
    setRows(normalizeTimelineRows(nextRows));
  };

  const handleSeek = (time) => {
    const clamped = Math.max(0, Math.min(duration, time));
    setCursorTime(clamped);
    timelineRef.current?.setTime(clamped);
    onSeek?.(clamped);
  };

  const addAction = (rowId, effectId) => {
    const length = getDefaultActionLength(rowId);
    const action =
      rowId === "transition"
        ? createCenteredTimelineAction({
            currentTime: cursorTime,
            duration,
            effectId,
            length,
          })
        : createTimelineAction({
            currentTime: cursorTime,
            duration,
            effectId,
            length,
          });

    setRows((currentRows) =>
      normalizeTimelineRows(
        currentRows.map((row) => {
          if (row.id !== rowId) {
            return row;
          }

          return {
            ...row,
            actions: [...row.actions, action],
          };
        }),
      ),
    );
  };

  const deleteAction = (actionId) => {
    setRows((currentRows) => normalizeTimelineRows(removeTimelineAction(currentRows, actionId)));
    if (selectedActionId === actionId) {
      setSelectedActionId(null);
    }
  };

  const updateSelectedActionParams = (params) => {
    if (!selectedActionId) {
      return;
    }

    setRows((currentRows) =>
      normalizeTimelineRows(updateTimelineActionParams(currentRows, selectedActionId, params)),
    );
  };

  return (
    <section className="timeline-panel" aria-label="Effect timeline editor">
      <div className="timeline-toolbar">
        <div>
          <p className="timeline-kicker">Timeline Tracks</p>
          <h2>多时间点效果控制</h2>
        </div>
        <TimelineZoomControl zoom={timelineZoom} onChange={setTimelineZoom} />
        <div className="timeline-actions" aria-label="Add timeline clips">
          <button
            className="timeline-actions-primary"
            type="button"
            onClick={() => addAction("transition", "transition-scatter")}
          >
            + 散开转场
          </button>
          <button type="button" onClick={() => addAction("scatter", "scatter-soft")}>
            + Soft Scatter
          </button>
          <button type="button" onClick={() => addAction("scatter", "scatter-strong")}>
            + Strong Scatter
          </button>
          <button type="button" onClick={() => addAction("filter", "filter-cyan")}>
            + Cyan
          </button>
          <button type="button" onClick={() => addAction("filter", "filter-magenta")}>
            + Magenta
          </button>
        </div>
      </div>

      <div className="timeline-workbench">
        <div className="timeline-track-labels" aria-hidden="true">
          {rows.map((row) => (
            <span key={row.id}>{TRACK_LABELS[row.id] || row.id}</span>
          ))}
        </div>
        <Timeline
          ref={timelineRef}
          editorData={rows}
          effects={TIMELINE_EFFECTS}
          scale={1}
          scaleWidth={scaleWidth}
          minScaleCount={scaleCount}
          maxScaleCount={Math.max(scaleCount, 180)}
          startLeft={16}
          rowHeight={40}
          gridSnap
          dragLine
          autoScroll
          onChange={handleRowsChange}
          onClickTimeArea={(time) => {
            handleSeek(time);
            return true;
          }}
          onCursorDrag={handleSeek}
          onClickActionOnly={(event, { action }) => {
            event.stopPropagation();
            setSelectedActionId(action.id);
          }}
          onContextMenuAction={(event, { action }) => {
            event.preventDefault();
            deleteAction(action.id);
          }}
          getActionRender={(action) => (
            <ActionClip
              action={action}
              isSelected={action.id === selectedActionId}
              onDelete={deleteAction}
              onSelect={setSelectedActionId}
            />
          )}
          style={{ width: "100%", height: 162 }}
        />
      </div>
      <GlobalSettingsPanel settings={previewSettings} onChange={setPreviewSettings} />
      <ClipSettingsPanel action={selectedAction} onChange={updateSelectedActionParams} />
    </section>
  );
}

function TimelineZoomControl({ zoom, onChange }) {
  const setZoom = (nextZoom) => {
    onChange(Math.min(3, Math.max(0.5, Math.round(nextZoom * 100) / 100)));
  };

  return (
    <div className="timeline-zoom" aria-label="Timeline zoom control">
      <button type="button" onClick={() => setZoom(zoom - 0.25)} aria-label="Zoom out timeline">
        -
      </button>
      <label>
        <span>Zoom</span>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.05"
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
        />
      </label>
      <output>{zoom.toFixed(2)}x</output>
      <button type="button" onClick={() => setZoom(zoom + 0.25)} aria-label="Zoom in timeline">
        +
      </button>
    </div>
  );
}

function ActionClip({ action, isSelected, onDelete, onSelect }) {
  const effect = TIMELINE_EFFECTS[action.effectId];
  const color = effect?.meta?.color || "#ffffff";
  const type = effect?.meta?.type || "effect";
  const clipClassName = `timeline-clip${isSelected ? " timeline-clip-selected" : ""}`;
  const handleDelete = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onDelete(action.id);
  };

  if (type === "transition") {
    return (
      <div
        className={`${clipClassName} timeline-clip-transition`}
        style={{ "--clip-color": color }}
        onClick={() => onSelect(action.id)}
      >
        <button className="timeline-clip-delete" type="button" aria-label="删除散开转场" onClick={handleDelete}>
          ×
        </button>
        <span className="transition-icon" aria-hidden="true" />
        <span className="transition-label">散开转场</span>
      </div>
    );
  }

  return (
    <div className={clipClassName} style={{ "--clip-color": color }} onClick={() => onSelect(action.id)}>
      <button className="timeline-clip-delete" type="button" aria-label={`删除 ${effect?.name || action.effectId}`} onClick={handleDelete}>
        ×
      </button>
      <span>{effect?.name || action.effectId}</span>
    </div>
  );
}

function ClipSettingsPanel({ action, onChange }) {
  if (!action) {
    return (
      <div className="clip-settings clip-settings-empty">
        选中一个时间线片段后，可以单独覆盖倾斜角度和滤镜。
      </div>
    );
  }

  const params = action.params || {};

  return (
    <div className="clip-settings">
      <div>
        <p className="timeline-kicker">Selected Clip Settings</p>
        <strong>{TIMELINE_EFFECTS[action.effectId]?.name || action.effectId}</strong>
      </div>
      <SettingRange
        label="Tilt X"
        value={params.tiltX || 0}
        min={-35}
        max={35}
        onChange={(value) => onChange({ tiltX: value })}
      />
      <SettingRange
        label="Tilt Y"
        value={params.tiltY || 0}
        min={-45}
        max={45}
        onChange={(value) => onChange({ tiltY: value })}
      />
      <SettingRange
        label="Tilt Z"
        value={params.tiltZ || 0}
        min={-25}
        max={25}
        onChange={(value) => onChange({ tiltZ: value })}
      />
      <label className="clip-setting-select">
        <span>Filter</span>
        <select value={params.filter || "inherit"} onChange={(event) => onChange({ filter: event.target.value })}>
          <option value="inherit">Inherit</option>
          <option value="none">No filter</option>
          <option value="cyan">Cyan bloom</option>
          <option value="magenta">Magenta pulse</option>
        </select>
      </label>
    </div>
  );
}

function GlobalSettingsPanel({ settings, onChange }) {
  return (
    <div className="clip-settings global-settings">
      <div>
        <p className="timeline-kicker">Global Preview Settings</p>
        <strong>默认预览效果</strong>
      </div>
      <SettingRange
        label="Twist"
        value={settings.twist}
        min={0}
        max={3}
        step={0.05}
        suffix="x"
        onChange={(value) => onChange((current) => ({ ...current, twist: value }))}
      />
      <label className="clip-setting-select">
        <span>Default Filter</span>
        <select
          value={settings.filter}
          onChange={(event) => onChange((current) => ({ ...current, filter: event.target.value }))}
        >
          <option value="inherit">Rainbow default</option>
          <option value="none">No filter</option>
          <option value="cyan">Cyan bloom</option>
          <option value="magenta">Magenta pulse</option>
        </select>
      </label>
    </div>
  );
}

function SettingRange({ label, value, min, max, step = 1, suffix = "°", onChange }) {
  return (
    <label className="clip-setting-range">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>
        {Number(value).toFixed(step < 1 ? 2 : 0)}
        {suffix}
      </output>
    </label>
  );
}

function createTimelineAction({ currentTime, duration, effectId, length }) {
  const safeLength = Math.max(0.1, length);
  const start = Math.min(Math.max(0, currentTime), Math.max(0, duration - safeLength));
  const end = Math.min(duration, start + safeLength);

  return {
    id: `${effectId}-${Date.now()}`,
    start,
    end,
    effectId,
  };
}

function getDefaultActionLength(rowId) {
  if (rowId === "transition") {
    return 1.4;
  }

  return rowId === "scatter" ? 1.6 : 2.4;
}

function findAction(rows, actionId) {
  if (!actionId) {
    return null;
  }

  return rows.flatMap((row) => row.actions || []).find((action) => action.id === actionId) || null;
}
