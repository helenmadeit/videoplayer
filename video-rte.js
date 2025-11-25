window.RichTextVideoPlayer = {
  initVideoRichText() {
    const rtf = document.querySelector("[data-richtext]");
    if (!rtf) return;

    // allow poster="" with * instead of +
    rtf.innerHTML = rtf.innerHTML.replace(
      /\[\[video\s+src="([^"]+)"\s+poster="([^"]*)"\s*\]\]/g,
      (m, src, poster) => `
        <div data-video-token
             data-video-src="${src}"
             data-video-poster="${poster}">
        </div>`
    );

    this.initRichTextVideos();
  },

  async initRichTextVideos() {
    const tokens = document.querySelectorAll("[data-video-token]");
    if (!tokens.length) return;

    // your template: [data-video-wrapper]
    const reference = document.querySelector("[data-video-wrapper]");
    if (!reference) return;

    tokens.forEach(async token => {
      if (token._built) return;
      token._built = true;

      const src = token.dataset.videoSrc;
      const poster = token.dataset.videoPoster;

      // clone wrapper
      const player = reference.cloneNode(true);
      const video = player.querySelector("[data-video-el]");
      const source = player.querySelector("source");

      if (source) source.setAttribute("src", src);

      // apply poster or generate from first frame
      if (poster) {
        video.setAttribute("poster", poster);
      } else {
        const autoPoster = await this.generatePoster(video, src);
        video.setAttribute("poster", autoPoster);
      }

      token.replaceWith(player);

      // simple overlay logic
      const overlay = player.querySelector("[data-video-activate]");
      if (overlay) {
        overlay.addEventListener("click", () => {
          video.muted = false;
          video.play();
          overlay.remove();
        });
      }

      // initialize AFTER metadata is available
      const initPlayer = () =>
        new VideoPlayer(player, window.RichTextVideoConfig || {});

      if (video.readyState >= 1) {
        initPlayer();
      } else {
        video.addEventListener("loadedmetadata", initPlayer, { once: true });
      }
    });
  },

  // automatically generate poster from first frame
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
