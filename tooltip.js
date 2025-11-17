/* 1️⃣ LIGHTBOX PLAYERS */
document.querySelectorAll("[data-video-lightbox]").forEach((box) => {
  new VideoPlayer(box, {
    autoplay: false,
    muted: false,
    autoresume: false,
    clickToPlay: true,
  });
});

/* 2️⃣ HERO VIDEO */
new VideoPlayer("[data-video-hero]", {
  autoplay: true,
  muted: true,
  loop: true,
  autoresume: true,
  aspectInitial: "16:7",
  aspectInitialMobile: "9:10",
  clickToPlay: {
    aspectActive: "16:9",
    aspectActiveMobile: "16:9",
  },
});

/* 3️⃣ BIG VIDEO */
new VideoPlayer("[data-video-big]", {
  autoplay: true,
  muted: true,
  loop: true,
  autoresume: true,
});

/* 4️⃣ SMALL LOOP VIDEOS */
document.querySelectorAll("[data-video-small]").forEach((el) => {
  new VideoPlayer(el, {
    autoplay: true,
    muted: true,
    loop: true,
    autoresume: true,
    aspectInitial: "1:1",
  });
});
