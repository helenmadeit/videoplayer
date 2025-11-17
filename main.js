class VideoPlayer {
  constructor(wrapper, config = {}) {
    this.wrapper = typeof wrapper === "string"
      ? document.querySelector(wrapper)
      : wrapper;

    this.video = this.wrapper?.querySelector("[data-video-el]");
    if (!this.wrapper || !this.video) {
      console.warn("VideoPlayer: missing wrapper or video", wrapper);
      return;
    }

    this.config = Object.assign(
      {
        autoplay: false,
        loop: false,
        muted: true,
        autoresume: true,
        clickToPlay: true,
        aspectInitial: null,
        aspectInitialMobile: null,
      },
      config
    );

    this._clickToPlayConfig =
      this.config.clickToPlay && typeof this.config.clickToPlay === "object"
        ? this.config.clickToPlay
        : null;

    this._clickToPlayEnabled =
      this.config.clickToPlay === true || !!this._clickToPlayConfig;

    this.controls = this.wrapper.querySelector("[data-video-controls]");
    this.activateBtn = this.wrapper.querySelector("[data-video-activate]");
    this.playBtn = this.wrapper.querySelector("[data-video-play]");
    this.muteBtn = this.wrapper.querySelector("[data-video-mute]");
    this.restartBtn = this.wrapper.querySelector("[data-video-restart]");
    this.fullscreenBtn = this.wrapper.querySelector("[data-video-fullscreen]");
    this.ccBtn = this.wrapper.querySelector("[data-video-cc]");
    this.progress = this.wrapper.querySelector("[data-video-progress]");
    this.currentTimeEl = this.wrapper.querySelector("[data-video-current]");
    this.durationEl = this.wrapper.querySelector("[data-video-duration]");

    this.playIcon = this.playBtn?.querySelector('[data-video-icon="play"]');
    this.pauseIcon = this.playBtn?.querySelector('[data-video-icon="pause"]');
    this.muteIcon = this.muteBtn?.querySelector('[data-video-icon="mute"]');
    this.unmuteIcon = this.muteBtn?.querySelector('[data-video-icon="unmute"]');
    this.fsEnterIcon = this.fullscreenBtn?.querySelector('[data-video-icon="enter-fullscreen"]');
    this.fsExitIcon = this.fullscreenBtn?.querySelector('[data-video-icon="exit-fullscreen"]');

    this._userActivated = false;

    this.init();
  }

  init() {
    this.applyInitialSettings();
    this.bindEvents();
    this.observeVisibility();
    this.updateIcons();
  }

  applyInitialSettings() {
    const isMobile = matchMedia("(max-width:767px)").matches;

    const aspectInitial = isMobile
      ? this.config.aspectInitialMobile
      : this.config.aspectInitial;

    this.video.muted = this.config.muted;
    this.video.loop = this.config.loop;
    this.video.playsInline = true;

    if (aspectInitial) {
      this.wrapper.style.aspectRatio = aspectInitial.replace(":", "/");
    }

    if (this.config.autoplay) {
      this.video.play().catch(() => {});
      this.wrapper.classList.add("is-active");
    }
  }

  bindEvents() {
    this.wrapper.addEventListener("click", (e) => {
      if (e.target.closest("[data-video-controls]")) return;

      const overlay = this.wrapper.querySelector("[data-video-activate]");
      if (overlay) {
        this.handleUserActivate();
        return;
      }

      if (!this._clickToPlayEnabled) return;

      const wasPaused = this.video.paused;
      this.video[wasPaused ? "play" : "pause"]();
      this.updateIcons();
      this.showClickFeedback(wasPaused ? "play" : "pause");
    });

    this.activateBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.handleUserActivate();
    });

    this.playBtn?.addEventListener("click", () => {
      this.handleUserActivate();
      const wasPaused = this.video.paused;
      this.video[wasPaused ? "play" : "pause"]();
      this.updateIcons();
    });

    this.muteBtn?.addEventListener("click", () => {
      this.video.muted = !this.video.muted;
      this.updateIcons();
    });

    this.restartBtn?.addEventListener("click", () => {
      this.video.currentTime = 0;
      this.video.play();
      this.updateIcons();
    });

    if (this.fullscreenBtn) {
      this.fullscreenBtn.addEventListener("click", () => this.toggleFullscreen());
      document.addEventListener("fullscreenchange", () => this.updateIcons());
      document.addEventListener("webkitfullscreenchange", () => this.updateIcons());
    }

    this.ccBtn?.addEventListener("click", () => {
      const track = this.video.textTracks[0];
      if (track) track.mode = track.mode === "showing" ? "hidden" : "showing";
    });

    /** 🔥 ALWAYS-CORRECT DURATION FIX */
    const updateDuration = () => {
      if (!isFinite(this.video.duration)) return;

      if (this.progress) this.progress.max = this.video.duration;
      if (this.durationEl)
        this.durationEl.textContent = this.formatTime(this.video.duration);
    };

    this.video.addEventListener("loadedmetadata", updateDuration);
    this.video.addEventListener("durationchange", updateDuration);
    this.video.addEventListener("playing", updateDuration);
    this.video.addEventListener("play", updateDuration);

    /** ⏱ UPDATE TIME + SCRUBBER VISUAL */
    this.video.addEventListener("timeupdate", () => {
      if (this.currentTimeEl)
        this.currentTimeEl.textContent = this.formatTime(this.video.currentTime);

      if (!this.progress || !isFinite(this.video.duration)) return;

      this.progress.value = this.video.currentTime;

      const percent = (this.video.currentTime / this.video.duration) * 100;
      this.progress.style.setProperty("--progress", percent + "%");
    });

    /** 🖐 SCRUBBING + VISUAL FEEDBACK */
    this.progress?.addEventListener("input", () => {
      if (!isFinite(this.video.duration)) return;

      this.video.currentTime = this.progress.value;
      const percent = (this.progress.value / this.progress.max) * 100;
      this.progress.style.setProperty("--progress", percent + "%");
    });
  }

  handleUserActivate() {
    if (this._userActivated) return;
    this._userActivated = true;

    const overlay = this.wrapper.querySelector("[data-video-activate]");
    if (overlay) overlay.remove();

    this.video.muted = false;
    this.wrapper.classList.add("is-active");

    this.updateAspect();
    this.updateIcons();
  }

  showClickFeedback(state) {
    const el = this.wrapper.querySelector(".video_click-feedback");
    if (!el) return;

    el.dataset.state = "";
    void el.offsetWidth;
    el.dataset.state = state;
    el.classList.add("is-visible");

    clearTimeout(this._fb);
    this._fb = setTimeout(() => el.classList.remove("is-visible"), 500);
  }

  updateAspect() {
    const isMobile = matchMedia("(max-width:767px)").matches;

    const active = this._clickToPlayConfig
      ? (isMobile
          ? this._clickToPlayConfig.aspectActiveMobile
          : this._clickToPlayConfig.aspectActive)
      : null;

    const initial = isMobile
      ? this.config.aspectInitialMobile
      : this.config.aspectInitial;

    const aspect = active || initial;
    if (!aspect) return;

    this.wrapper.style.aspectRatio = aspect.replace(":", "/");
  }

  observeVisibility() {
    if (!this.config.autoresume) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            if (!this.video.paused) {
              this.video.dataset.autoresume = "true";
              this.video.pause();
            } else {
              this.video.dataset.autoresume = "false";
            }
          } else {
            if (this.video.dataset.autoresume === "true") {
              this.video.play().catch(() => {});
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    obs.observe(this.wrapper);
  }

  toggleFullscreen() {
    const el = this.wrapper;
    const doc = document;
    const isFS = doc.fullscreenElement || doc.webkitFullscreenElement;

    const isiPhone = /iPhone|iPod/.test(navigator.userAgent);
    if (isiPhone && this.video.webkitEnterFullscreen) {
      this.video.webkitEnterFullscreen();
      return;
    }

    if (!isFS) {
      el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.();
    } else {
      doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.();
    }
  }

  updateIcons() {
    const playing = !this.video.paused;
    const muted = this.video.muted;
    const fs = document.fullscreenElement === this.wrapper;

    this.playIcon && (this.playIcon.style.display = playing ? "none" : "block");
    this.pauseIcon && (this.pauseIcon.style.display = playing ? "block" : "none");

    this.muteIcon && (this.muteIcon.style.display = muted ? "block" : "none");
    this.unmuteIcon && (this.unmuteIcon.style.display = muted ? "none" : "block");

    this.fsEnterIcon && (this.fsEnterIcon.style.display = fs ? "none" : "block");
    this.fsExitIcon && (this.fsExitIcon.style.display = fs ? "block" : "none");
  }

  formatTime(sec) {
    return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(
      2,
      "0"
    )}`;
  }
}
