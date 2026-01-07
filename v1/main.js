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

    /* progress internals */
    this.progressTrack = this.progress?.querySelector("[data-video-progress-track]");
    this.progressPlayed = this.progress?.querySelector("[data-video-progress-played]");
    this.progressBuffer = this.progress?.querySelector("[data-video-progress-buffer]");

    this._isScrubbing = false;
    this._wasPlayingBeforeScrub = false;

    this.playIcon = this.playBtn?.querySelector('[data-video-icon="play"]');
    this.pauseIcon = this.playBtn?.querySelector('[data-video-icon="pause"]');
    this.muteIcon = this.muteBtn?.querySelector('[data-video-icon="mute"]');
    this.unmuteIcon = this.muteBtn?.querySelector('[data-video-icon="unmute"]');
    this.fsEnterIcon = this.fullscreenBtn?.querySelector('[data-video-icon="enter-fullscreen"]');
    this.fsExitIcon = this.fullscreenBtn?.querySelector('[data-video-icon="exit-fullscreen"]');

    /* click feedback */
    this.clickFeedback = this.wrapper.querySelector(".video_click-feedback");
    this.clickFeedbackIcons = this.clickFeedback?.querySelectorAll("[data-icon]");

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

    const updateDuration = () => {
      if (!isFinite(this.video.duration)) return;
      if (this.durationEl)
        this.durationEl.textContent = this.formatTime(this.video.duration);
    };

    this.video.addEventListener("loadedmetadata", updateDuration);
    this.video.addEventListener("durationchange", updateDuration);
    this.video.addEventListener("playing", updateDuration);
    this.video.addEventListener("play", updateDuration);

    this.video.addEventListener("timeupdate", this.syncProgressUI);
    this.video.addEventListener("progress", this.syncBufferUI);
    this.video.addEventListener("loadedmetadata", this.syncProgressUI);

    if (this.progress && this.progressTrack) {
      this.progress.addEventListener("pointerdown", this.onProgressPointerDown);
      window.addEventListener("pointermove", this.onProgressPointerMove);
      window.addEventListener("pointerup", this.onProgressPointerUp);
      window.addEventListener("pointercancel", this.onProgressPointerUp);
    }
  }

  /* ---------- PROGRESS ---------- */

  onProgressPointerDown = (e) => {
    if (!isFinite(this.video.duration)) return;

    e.preventDefault();
    this._isScrubbing = true;
    this.progress.setPointerCapture(e.pointerId);

    this._wasPlayingBeforeScrub = !this.video.paused;
    this.video.pause();

    this.scrubToClientX(e.clientX);
  };

  onProgressPointerMove = (e) => {
    if (!this._isScrubbing) return;
    this.scrubToClientX(e.clientX);
  };

  onProgressPointerUp = () => {
    if (!this._isScrubbing) return;

    this._isScrubbing = false;
    if (this._wasPlayingBeforeScrub) {
      this.video.play().catch(() => {});
    }
  };

  scrubToClientX(clientX) {
    const rect = this.progressTrack.getBoundingClientRect();
    let percent = (clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));

    this.video.currentTime = percent * this.video.duration;
    this.renderPlayed(percent);
  }

  syncProgressUI = () => {
    if (!this.progressPlayed || !isFinite(this.video.duration)) return;

    const percent = this.video.currentTime / this.video.duration;
    this.renderPlayed(percent);

    if (this.currentTimeEl)
      this.currentTimeEl.textContent = this.formatTime(this.video.currentTime);
  };

  syncBufferUI = () => {
    if (!this.progressBuffer || !this.video.buffered.length || !isFinite(this.video.duration)) return;

    const end = this.video.buffered.end(this.video.buffered.length - 1);
    const percent = end / this.video.duration;

    this.progressBuffer.style.width = percent * 100 + "%";
  };

  renderPlayed(percent) {
    this.progressPlayed.style.width = percent * 100 + "%";
  }

  /* ---------- FEEDBACK ---------- */

  showClickFeedback(state) {
    if (!this.clickFeedback || !this.clickFeedbackIcons) return;

    this.clickFeedbackIcons.forEach(icon => {
      icon.style.display = icon.dataset.icon === state ? "block" : "none";
    });

    this.clickFeedback.classList.remove("is-visible");
    void this.clickFeedback.offsetWidth;
    this.clickFeedback.classList.add("is-visible");

    clearTimeout(this._fb);
    this._fb = setTimeout(() => {
      this.clickFeedback.classList.remove("is-visible");
    }, 500);
  }

  /* ---------- CORE ---------- */

  handleUserActivate() {
    if (this._userActivated) return;
    this._userActivated = true;

    const overlay = this.wrapper.querySelector("[data-video-activate]");
    if (overlay) overlay.remove();

    this.video.muted = false;
    this.video.play().catch(() => {}); // iOS fix

    this.wrapper.classList.add("is-active");
    this.updateAspect();
    this.updateIcons();
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
    return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2,"0")}`;
  }
}
