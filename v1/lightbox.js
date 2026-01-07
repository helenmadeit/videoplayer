(() => {
  const modal = document.querySelector("[data-video-popup]");
  if (!modal) return;

  const modalVideo = modal.querySelector("[data-video-el]");
  const closeBtn = modal.querySelector("[data-popup-close]");
  const triggers = document.querySelectorAll("[data-video-lightbox-trigger]");

  let isOpen = false;

  const open = (src) => {
    if (!modalVideo || isOpen) return;

    isOpen = true;

    if (src) {
      modalVideo.src = src;
      modalVideo.load();
    }

    modal.classList.add("is-active");

    // let layout update before play (iOS-safe)
    requestAnimationFrame(() => {
      modalVideo.play().catch(() => {});
    });
  };

  const close = () => {
    if (!modalVideo || !isOpen) return;

    isOpen = false;
    modalVideo.pause();
    modalVideo.removeAttribute("src");
    modal.classList.remove("is-active");
  };

  triggers.forEach((item) => {
    item.addEventListener("click", () => {
      const src = item.dataset.videoSrc;
      open(src);
    });
  });

  closeBtn?.addEventListener("click", close);

  modal.addEventListener("click", (e) => {
    if (!e.target.closest("[data-video-lightbox]")) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
})();
