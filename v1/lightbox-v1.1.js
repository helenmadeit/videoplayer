(() => {
  const modal = document.querySelector("[data-video-popup]");
  if (!modal) return;

  const modalVideo = modal.querySelector("[data-video-el]");
  const closeBtn = modal.querySelector("[data-popup-close]");
  const triggers = document.querySelectorAll("[data-video-src]");
  const ccBtn = modal.querySelector("[data-video-cc]");

  if (!modalVideo || !triggers.length) return;

  let isOpen = false;

  /* ---------- utils ---------- */

  const clearTracks = (video) => {
    video.querySelectorAll("track").forEach(t => t.remove());
  };

  const updateCC = () => {
    if (!ccBtn) return;
    const hasTracks = modalVideo.textTracks && modalVideo.textTracks.length > 0;
    ccBtn.style.display = hasTracks ? "" : "none";
  };

  /* ---------- track observers ---------- */

  if (modalVideo.textTracks) {
    modalVideo.textTracks.addEventListener("addtrack", updateCC);
    modalVideo.textTracks.addEventListener("removetrack", updateCC);
  }

  /* ---------- core ---------- */

  const open = (trigger) => {
    if (isOpen) return;
    isOpen = true;

    const src = trigger.dataset.videoSrc;
    const track = trigger.dataset.videoTrack;

    modalVideo.src = src;
    modalVideo.load();

    clearTracks(modalVideo);
    updateCC();

    if (track && window.attachSubtitles) {
      window.attachSubtitles(modalVideo, track);
    }

    modal.classList.add("is-active");

    requestAnimationFrame(() => {
      modalVideo.play().catch(() => {});
    });
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;

    modalVideo.pause();
    modalVideo.removeAttribute("src");
    clearTracks(modalVideo);
    updateCC();

    modal.classList.remove("is-active");
  };

  /* ---------- events ---------- */

  triggers.forEach((item) => {
    item.addEventListener("click", () => open(item));
  });

  closeBtn?.addEventListener("click", close);

  modal.addEventListener("click", (e) => {
    if (!e.target.closest("[data-video-lightbox]")) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
})();
