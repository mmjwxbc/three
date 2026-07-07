import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BloomPass } from "three/addons/postprocessing/BloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createRecorderOptions, getExportProfile } from "../lib/export-quality.js";
import { createPreviewCameraPose, createVideoGridCell } from "../lib/scene-helpers.js";
import { DEFAULT_TIMELINE_ROWS, getTimelineState, normalizeTimelineRows } from "../lib/timeline-config.js";
import { createUploadedVideoSource } from "../lib/video-source.js";

const GRID = {
  x: 10,
  y: 20,
  sourceWidth: 270,
  sourceHeight: 480,
};

export class NeonTunnelApp {
  constructor(container) {
    this.container = container;
    this.meshes = [];
    this.materials = [];
    this.timelineRows = normalizeTimelineRows(DEFAULT_TIMELINE_ROWS);
    this.previewSettings = {
      filter: "inherit",
      twist: 1,
    };
    this.activeVideoSourceName = "uploaded video";
    this.hasVideoSource = false;
    this.uploadedVideoObjectUrl = null;
    this.previewPaused = false;
    this.isRecording = false;
    this.counter = 1;
    this.mouseX = 0;
    this.mouseY = 0;
    this.windowHalfX = window.innerWidth / 2;
    this.windowHalfY = window.innerHeight / 2;

    this.camera = new THREE.PerspectiveCamera(40, 1, 1, 10000);
    const cameraPose = createPreviewCameraPose();
    this.camera.position.set(cameraPose.x, cameraPose.y, cameraPose.z);

    this.scene = new THREE.Scene();
    this.videoGroup = new THREE.Group();
    this.scene.add(this.videoGroup);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = false;

    this.video = this.createVideoElement();
    this.texture = new THREE.VideoTexture(this.video);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);
    this.buildScene();
    this.setupPostProcessing();
    this.onResize();
    this.bindEvents();

    this.renderer.setAnimationLoop(() => this.render());
  }

  createVideoElement() {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.volume = 1;
    video.playsInline = true;
    video.preload = "metadata";
    return video;
  }

  bindEvents() {
    this.video.addEventListener("loadeddata", () => {
      if (this.previewPaused) {
        return;
      }

      const playPromise = this.video.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          this.video.muted = true;
          this.video.play().catch(() => {});
        });
      }
    });

    this.handleResize = () => this.onResize();

    window.addEventListener("resize", this.handleResize);
  }

  buildScene() {
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(0.5, 1, 1).normalize();
    this.scene.add(light);

    let cubeIndex = 0;

    for (let column = 0; column < GRID.x; column += 1) {
      for (let row = 0; row < GRID.y; row += 1) {
        const cell = createVideoGridCell({
          column,
          row,
          xgrid: GRID.x,
          ygrid: GRID.y,
          sourceWidth: GRID.sourceWidth,
          sourceHeight: GRID.sourceHeight,
        });

        const geometry = new THREE.BoxGeometry(cell.width, cell.height, cell.depth);
        this.applyTileUvs(geometry, cell.uv);

        const material = new THREE.MeshLambertMaterial({
          color: 0xffffff,
          map: this.texture,
        });
        material.userData.hue = cell.hue;
        material.userData.saturation = cell.saturation;
        material.color.setHSL(cell.hue, cell.saturation, 0.5);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(cell.x, cell.y, 0);
        mesh.userData.dx = 0.001 * (0.5 - this.seededRandom(cubeIndex, 1));
        mesh.userData.dy = 0.001 * (0.5 - this.seededRandom(cubeIndex, 2));
        mesh.userData.initial = {
          x: mesh.position.x,
          y: mesh.position.y,
          z: mesh.position.z,
          dx: mesh.userData.dx,
          dy: mesh.userData.dy,
        };
        mesh.userData.scatter = {
          x: (this.seededRandom(cubeIndex, 3) - 0.5) * 520,
          y: (this.seededRandom(cubeIndex, 4) - 0.5) * 760,
          z: (this.seededRandom(cubeIndex, 5) - 0.5) * 820,
          rx: (this.seededRandom(cubeIndex, 6) - 0.5) * Math.PI * 2.4,
          ry: (this.seededRandom(cubeIndex, 7) - 0.5) * Math.PI * 2.4,
        };

        this.videoGroup.add(mesh);
        this.meshes.push(mesh);
        this.materials.push(material);
        cubeIndex += 1;
      }
    }
  }

  applyTileUvs(geometry, tile) {
    const uvs = geometry.attributes.uv.array;

    for (let index = 0; index < uvs.length; index += 2) {
      uvs[index] = (uvs[index] + tile.offsetX) * tile.unitX;
      uvs[index + 1] = (uvs[index + 1] + tile.offsetY) * tile.unitY;
    }

    geometry.attributes.uv.needsUpdate = true;
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new BloomPass(1.3);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
  }

  onMouseMove(event) {
    this.mouseX = event.clientX - this.windowHalfX;
    this.mouseY = (event.clientY - this.windowHalfY) * 0.3;
  }

  onResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.windowHalfX = width / 2;
    this.windowHalfY = height / 2;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  render() {
    const time = Date.now() * 0.00005;
    const timelineState = getTimelineState(this.video.currentTime, this.timelineRows, this.previewSettings);

    const cameraPose = createPreviewCameraPose();
    this.camera.position.set(cameraPose.x, cameraPose.y, cameraPose.z);
    this.camera.lookAt(this.scene.position);

    this.materials.forEach((material) => {
      if (!timelineState.filterEnabled) {
        material.color.setRGB(1, 1, 1);
        return;
      }

      const hue = (360 * (material.userData.hue + timelineState.hueBoost + time) % 360) / 360;
      const saturation =
        timelineState.filter === "clean" ? material.userData.saturation : Math.min(1, material.userData.saturation + 0.22);
      material.color.setHSL(hue, saturation, timelineState.filter === "magenta" ? 0.58 : 0.5);
    });

    this.applyTimelineScatter(timelineState.scatter, time);
    this.applyTimelineTilt(timelineState.tilt);
    this.bloomPass.combineUniforms.strength.value = timelineState.bloom;

    this.counter += 1;

    this.renderer.clear();
    this.composer.render();
  }

  applyTimelineTilt(tilt) {
    this.videoGroup.rotation.set(
      THREE.MathUtils.degToRad(tilt.x),
      THREE.MathUtils.degToRad(tilt.y),
      THREE.MathUtils.degToRad(tilt.z),
    );
  }

  applyTimelineScatter(scatter, time) {
    this.meshes.forEach((mesh, index) => {
      const initial = mesh.userData.initial;
      const target = mesh.userData.scatter;
      const idle = Math.sin(time * 220 + index * 0.37) * 2.5 * this.previewSettings.twist;

      mesh.position.set(
        initial.x + target.x * scatter + idle,
        initial.y + target.y * scatter - idle * 0.6,
        initial.z + target.z * scatter,
      );
      mesh.rotation.set(target.rx * scatter + idle * 0.003, target.ry * scatter - idle * 0.003, 0);
    });
  }

  setTimelineRows(rows) {
    this.timelineRows = normalizeTimelineRows(rows);
  }

  setPreviewSettings(settings) {
    this.previewSettings = {
      ...this.previewSettings,
      ...settings,
    };
  }

  seekPreview(time) {
    this.seekVideo(time)
      .then(() => this.syncPreviewPlayback())
      .catch(() => {});
  }

  getCurrentTime() {
    return this.video.currentTime || 0;
  }

  getDuration() {
    return this.video.duration || 0;
  }

  hasVideo() {
    return this.hasVideoSource;
  }

  isPaused() {
    return this.previewPaused;
  }

  async togglePlayback() {
    if (!this.hasVideoSource) {
      return this.previewPaused;
    }

    if (this.previewPaused) {
      await this.playPreview();
    } else {
      this.pausePreview();
    }

    return this.previewPaused;
  }

  async playPreview() {
    if (!this.hasVideoSource) {
      return;
    }

    this.previewPaused = false;
    await this.video.play();
  }

  pausePreview() {
    this.previewPaused = true;
    this.video.pause();
  }

  syncPreviewPlayback() {
    if (!this.hasVideoSource) {
      return Promise.resolve();
    }

    if (this.previewPaused) {
      this.video.pause();
      return Promise.resolve();
    }

    return this.video.play().catch(() => {});
  }

  async loadVideoFile(file, { onStatus } = {}) {
    const source = createUploadedVideoSource(file);
    const previousObjectUrl = this.uploadedVideoObjectUrl;
    const previousSourceName = this.activeVideoSourceName;
    const previousHadVideoSource = this.hasVideoSource;
    const previousSrc = this.video.currentSrc || this.video.src;

    this.uploadedVideoObjectUrl = source.url;
    this.activeVideoSourceName = source.name;
    this.hasVideoSource = true;
    onStatus?.(`Loading ${source.name}...`);

    try {
      this.video.pause();
      this.video.loop = true;
      this.video.muted = true;
      this.video.src = source.url;
      this.video.load();
      await this.ensureVideoMetadata();
      await this.seekVideo(0);
      this.resetAnimationState();
      this.texture.needsUpdate = true;
      await this.syncPreviewPlayback();
      onStatus?.(`Using ${source.name}`);
    } catch (error) {
      URL.revokeObjectURL(source.url);
      this.uploadedVideoObjectUrl = previousObjectUrl;
      this.activeVideoSourceName = previousSourceName;
      this.hasVideoSource = previousHadVideoSource;
      if (previousSrc) {
        this.video.src = previousSrc;
      } else {
        this.video.removeAttribute("src");
      }
      this.video.load();
      this.syncPreviewPlayback();
      throw error;
    }

    if (previousObjectUrl) {
      URL.revokeObjectURL(previousObjectUrl);
    }
  }

  async exportRecording({ onStatus } = {}) {
    if (this.isRecording) {
      return;
    }

    if (!("MediaRecorder" in window)) {
      throw new Error("MediaRecorder is not supported in this browser.");
    }

    if (!this.hasVideoSource) {
      throw new Error("Upload a video before exporting.");
    }

    this.isRecording = true;
    const wasPreviewPaused = this.previewPaused;
    onStatus?.("Preparing export...");

    let stream;

    try {
      await this.ensureVideoMetadata();
      this.video.loop = false;
      this.video.muted = false;
      this.video.volume = 1;
      await this.seekVideo(0);
      this.resetAnimationState();
      const exportProfile = getExportProfile();
      this.applyExportSize(exportProfile);

      stream = this.createRecordingStream();
      const mimeType = this.getSupportedRecordingMimeType();
      const recorder = new MediaRecorder(stream, createRecorderOptions(mimeType, exportProfile));
      const chunks = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });

      const stopped = new Promise((resolve) => {
        recorder.addEventListener("stop", resolve, { once: true });
      });

      recorder.start(250);
      onStatus?.(`Recording ${exportProfile.width}x${exportProfile.height}...`);
      await this.video.play();

      const durationMs = Math.max(1000, this.video.duration * 1000);
      await new Promise((resolve) => {
        const timeout = window.setTimeout(resolve, durationMs);
        this.video.addEventListener(
          "ended",
          () => {
            window.clearTimeout(timeout);
            resolve();
          },
          { once: true },
        );
      });

      this.video.pause();
      recorder.stop();
      await stopped;

      const blob = new Blob(chunks, {
        type: recorder.mimeType || "video/webm",
      });

      this.downloadBlob(blob, "three-video-grid-export.webm");
      onStatus?.("Exported");
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      this.video.loop = true;
      this.video.muted = true;
      this.restorePreviewSize();
      await this.seekVideo(0);
      this.previewPaused = wasPreviewPaused;
      this.syncPreviewPlayback();
      this.isRecording = false;
    }
  }

  createRecordingStream() {
    const canvasStream = this.renderer.domElement.captureStream(60);
    const recordingStream = new MediaStream();

    canvasStream.getVideoTracks().forEach((track) => {
      recordingStream.addTrack(track);
    });

    const mediaStream = this.getVideoCaptureStream();
    const audioTracks = mediaStream.getAudioTracks();

    audioTracks.forEach((track) => {
      recordingStream.addTrack(track);
    });

    return recordingStream;
  }

  getVideoCaptureStream() {
    const captureStream = this.video.captureStream || this.video.mozCaptureStream;

    if (!captureStream) {
      throw new Error("This browser cannot capture audio from the video element.");
    }

    return captureStream.call(this.video);
  }

  applyExportSize(exportProfile = getExportProfile()) {
    this.renderer.setPixelRatio(1);
    this.camera.aspect = exportProfile.width / exportProfile.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(exportProfile.width, exportProfile.height, false);
    this.composer.setSize(exportProfile.width, exportProfile.height);
  }

  restorePreviewSize() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.onResize();
  }

  ensureVideoMetadata() {
    if (!this.hasVideoSource) {
      return Promise.reject(new Error("Upload a video first."));
    }

    if (Number.isFinite(this.video.duration) && this.video.duration > 0) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.video.addEventListener("loadedmetadata", resolve, { once: true });
      this.video.addEventListener(
        "error",
        () => reject(new Error(`Could not load ${this.activeVideoSourceName}.`)),
        { once: true },
      );
    });
  }

  seekVideo(time) {
    if (!this.hasVideoSource) {
      return new Promise((resolve) => requestAnimationFrame(resolve));
    }

    if (Math.abs(this.video.currentTime - time) < 0.01) {
      return new Promise((resolve) => requestAnimationFrame(resolve));
    }

    return new Promise((resolve) => {
      const onSeeked = () => resolve();
      this.video.addEventListener("seeked", onSeeked, { once: true });
      this.video.currentTime = time;
    });
  }

  resetAnimationState() {
    this.counter = 1;
    this.mouseX = 0;
    this.mouseY = 0;
    const cameraPose = createPreviewCameraPose();
    this.camera.position.set(cameraPose.x, cameraPose.y, cameraPose.z);
    this.camera.lookAt(this.scene.position);
    this.videoGroup.rotation.set(0, 0, 0);

    this.meshes.forEach((mesh) => {
      mesh.position.set(mesh.userData.initial.x, mesh.userData.initial.y, mesh.userData.initial.z);
      mesh.rotation.set(0, 0, 0);
      mesh.userData.dx = mesh.userData.initial.dx;
      mesh.userData.dy = mesh.userData.initial.dy;
    });
  }

  getSupportedRecordingMimeType() {
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  seededRandom(index, salt) {
    const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  destroy() {
    window.removeEventListener("resize", this.handleResize);
    this.renderer.setAnimationLoop(null);

    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();
    if (this.uploadedVideoObjectUrl) {
      URL.revokeObjectURL(this.uploadedVideoObjectUrl);
      this.uploadedVideoObjectUrl = null;
    }

    this.meshes.forEach((mesh) => {
      mesh.geometry.dispose();
    });
    this.materials.forEach((material) => {
      material.dispose();
    });
    this.texture.dispose();
    this.renderer.dispose();
    this.container.innerHTML = "";
  }
}
