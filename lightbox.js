/* LIGHTBOX POPUP SYSTEM */
const modal = document.querySelector('[data-video-popup]');
const modalVideo = modal?.querySelector('[data-video-el]');
const closeBtn = modal?.querySelector('[data-popup-close]');

/* OPEN LIGHTBOX */
document.querySelectorAll('.video_lightbox-wr').forEach((item) => {
  item.addEventListener('click', () => {
    const src = item.dataset.videoSrc;
    if (!src || !modalVideo) return;
    modalVideo.src = src;
    modal.classList.add('is-active');
    modalVideo.play().catch(() => {});
  });
});

/* CLOSE LIGHTBOX */
const closeLightbox = () => {
  if (!modalVideo) return;
  modalVideo.pause();
  modalVideo.removeAttribute('src');
  modal.classList.remove('is-active');
};

closeBtn?.addEventListener('click', closeLightbox);

modal?.addEventListener('click', (e) => {
  if (!e.target.closest('[data-video-lightbox]')) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});
