window.RichTextVideoPlayer = {
  initVideoRichText() {
    const rtf = document.querySelector("[data-richtext]");
    if (!rtf) return;

    rtf.innerHTML = rtf.innerHTML.replace(
      /\[\[video\s+src="([^"]+)"\s+poster="([^"]+)"\s*\]\]/g,
      (m, src, poster) => `
        <div data-video-token
             data-video-src="${src}"
             data-video-poster="${poster}">
        </div>`
    );

    this.initRichTextVideos();
  },

  initRichTextVideos() {
    const tokens = document.querySelectorAll("[data-video-token]");
    if (!tokens.length) return;

    // matches your actual template element
    const reference = document.querySelector("[data-video-wrapper]");
    if (!reference) return;

    tokens.forEach(token => {
      if (token._built) return;
      token._built = true;

      const src = token.dataset.videoSrc;
      const poster = token.dataset.videoPoster;

      // clone full block
      const player = reference.cloneNode(true);

      const video = player.querySelector("[data-video-el]");
      const source = player.querySelector("source");

      if (video) video.setAttribute("poster", poster);
      if (source) source.setAttribute("src", src);

      token.replaceWith(player);

      const overlay = player.querySelector("[data-video-activate]");
      if (overlay && video) {
        overlay.addEventListener("click", () => {
          if (video.paused) {
            video.muted = false;
            video.play();
            overlay.remove();
          } else {
            video.muted = !video.muted;
          }
        });
      }

      new VideoPlayer(player, window.RichTextVideoConfig || {});
    });
  }
};
