window.RichTextVideoPlayer = {
  initVideoRichText() {
    const rtf = document.querySelector("[data-richtext]");
    if (!rtf) return;

    // Extended parser: supports arbitrary attributes
    rtf.innerHTML = rtf.innerHTML.replace(
      /\[\[video\s+([^]+?)\]\]/g,
      (m, attrString) => {
        // extract key="value" pairs
        const attrs = Object.fromEntries(
          [...attrString.matchAll(/(\w+)="([^"]*)"/g)].map(x => [x[1], x[2]])
        );

        const {
          src = "",
          poster = "",
          autoplay = null,
          sound = null
        } = attrs;

        return `
          <div data-video-token
               data-video-src="${src}"
               data-video-poster="${poster}"
               data-video-autoplay="${autoplay}"
               data-video-sound="${sound}">
          </div>`;
      }
    );

    this.initRichTextVideos();
  },

  async initRichTextVideos() {
    const tokens = document.querySelectorAll("[data-video-token]");
    if (!tokens.length) return;

    const reference = document.querySelector("[data-video-wrapper]");
    if (!reference) return;

    tokens.forEach(async token => {
      if (token._built) return;
      token._built = true;

      const src = token.dataset.videoSrc;
      const poster = token.dataset.videoPoster;
      const autoplayAttr = token.dataset.videoAutoplay;
      const soundAttr = token.dataset.videoSound;

      // convert attributes to booleans if present
      const autoplay = autoplayAttr === "true";
      const soundEnabled = soundAttr === "true";   // sound="true" means WITH sound
      const soundDisabled = soundAttr === "false"; // sound="false" means NO audio

      const player = reference.cloneNode(true);
      const video = player.querySelector("[data-video-el]");
      const source = player.querySelector("source");

      if (source) source.setAttribute("src", src);

      // Poster handling
      if (poster) {
        video.setAttribute("poster", poster);
      } else {
        const autoPoster = await this.generatePoster(video, src);
        video.setAttribute("poster", autoPoster);
      }

      // REMOVE MUTE BUTTON if sound="false"
      if (soundDisabled) {
        const muteBtn = player.querySelector("[data-video-mute]");
        muteBtn?.remove();
      }

      // REPLACE TOKEN WITH PLAYER
      token.replaceWith(player);

      // Overlay auto-open for autoplay
      const overlay = player.querySelector("[data-video-activate]");
      if (autoplay && overlay) {
        overlay.remove();
        video.muted = true; // autoplay must be muted
        video.play().catch(() => {});
      }

      // Config merged with global default
      const individualConfig = {
        ...window.RichTextVideoConfig,

        // AUTOPLAY CONTROL
        autoplay: autoplayAttr !== null ? autoplay : window.RichTextVideoConfig.autoplay,

        // SOUND
        muted: soundDisabled ? true : (window.RichTextVideoConfig.muted ?? true),

        // CLICK-TO-PLAY LOGIC
        clickToPlay:
          autoplay ? false : window.RichTextVideoConfig.clickToPlay,

        // Preserve loop, autoresume, aspect configs etc.
      };

      const initPlayer = () =>
        new VideoPlayer(player, individualConfig);

      if (video.readyState >= 1) {
        initPlayer();
      } else {
        video.addEventListener("loadedmetadata", initPlayer, { once: true });
      }
    });
  },

  generatePoster(videoEl, src) {
    return new Promise(resolve => {
      const temp = document.createElement("video");
      temp.src = src;
      temp.muted = true;
      temp.playsInline = true;
      temp.currentTime = 0;

      temp.addEventListener("loadeddata", () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = temp.videoWidth;
        canvas.height = temp.videoHeight;

        ctx.drawImage(temp, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.85));
      });
    });
  }
};
