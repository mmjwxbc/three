import "./styles.css";
import { NeonTunnelApp } from "./app/neon-tunnel-app.js";
import { createPlaybackButtonState } from "./lib/playback-state.js";
import { mountTimelinePanel } from "./ui/TimelinePanel.jsx";

const app = document.querySelector("#app");

if (app) {
  app.innerHTML = `
    <div class="scene-shell">
      <div class="export-panel">
        <label class="upload-button" for="video-upload">Upload Video</label>
        <input class="upload-input" id="video-upload" type="file" accept="video/*" />
        <button class="playback-button" type="button" id="playback-button" aria-pressed="false">Pause</button>
        <button class="export-button" type="button" id="export-button">Export 2K WebM</button>
        <span class="export-status" id="export-status" aria-live="polite"></span>
      </div>
      <div class="scene-root" id="scene-root"></div>
      <div class="timeline-root" id="timeline-root"></div>
    </div>
  `;

  const sceneRoot = app.querySelector("#scene-root");
  const timelineRoot = app.querySelector("#timeline-root");
  if (sceneRoot) {
    const neonTunnelApp = new NeonTunnelApp(sceneRoot);
    const playbackButton = app.querySelector("#playback-button");
    const exportButton = app.querySelector("#export-button");
    const exportStatus = app.querySelector("#export-status");
    const uploadInput = app.querySelector("#video-upload");
    const syncPlaybackButton = () => {
      if (!playbackButton) {
        return;
      }

      const state = createPlaybackButtonState(neonTunnelApp.isPaused());
      playbackButton.textContent = state.label;
      playbackButton.setAttribute("aria-pressed", String(state.pressed));
    };

    playbackButton?.addEventListener("click", async () => {
      playbackButton.disabled = true;

      try {
        await neonTunnelApp.togglePlayback();
      } finally {
        syncPlaybackButton();
        playbackButton.disabled = false;
      }
    });

    uploadInput?.addEventListener("change", async (event) => {
      const [file] = event.target.files || [];
      if (!file) {
        return;
      }

      exportStatus.textContent = "Loading video...";
      exportButton.disabled = true;
      if (playbackButton) {
        playbackButton.disabled = true;
      }

      try {
        await neonTunnelApp.loadVideoFile(file, {
          onStatus: (status) => {
            exportStatus.textContent = status;
          },
        });
      } catch (error) {
        exportStatus.textContent = error instanceof Error ? error.message : "Video upload failed";
      } finally {
        exportButton.disabled = false;
        if (playbackButton) {
          syncPlaybackButton();
          playbackButton.disabled = false;
        }
        window.setTimeout(() => {
          exportStatus.textContent = "";
        }, 2800);
      }
    });

    exportButton?.addEventListener("click", async () => {
      exportButton.disabled = true;
      if (playbackButton) {
        playbackButton.disabled = true;
      }
      exportStatus.textContent = "Preparing...";

      try {
        await neonTunnelApp.exportRecording({
          onStatus: (status) => {
            exportStatus.textContent = status;
          },
        });
      } catch (error) {
        exportStatus.textContent = error instanceof Error ? error.message : "Export failed";
      } finally {
        exportButton.disabled = false;
        if (playbackButton) {
          syncPlaybackButton();
          playbackButton.disabled = false;
        }
        window.setTimeout(() => {
          exportStatus.textContent = "";
        }, 2400);
      }
    });

    syncPlaybackButton();

    if (timelineRoot) {
      mountTimelinePanel(timelineRoot, {
        onChange: (rows) => neonTunnelApp.setTimelineRows(rows),
        onPreviewSettingsChange: (settings) => neonTunnelApp.setPreviewSettings(settings),
        onSeek: (time) => neonTunnelApp.seekPreview(time),
        getCurrentTime: () => neonTunnelApp.getCurrentTime(),
        getDuration: () => neonTunnelApp.getDuration(),
      });
    }
  }
}
