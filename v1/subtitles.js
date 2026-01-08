window.attachSubtitlesFromSRT = async function (video, srtUrl) {
  try {
    const res = await fetch(srtUrl);
    const srt = await res.text();

    const vtt =
      "WEBVTT\n\n" +
      srt
        .replace(/\r+/g, "")
        .replace(/(\d+):(\d+):(\d+),(\d+)/g, "$1:$2:$3.$4");

    const blob = new Blob([vtt], { type: "text/vtt" });
    const url = URL.createObjectURL(blob);

    const track = document.createElement("track");
    track.kind = "subtitles";
    track.label = "English";
    track.srclang = "en";
    track.src = url;
    track.mode = "hidden";

    video.appendChild(track);
  } catch (e) {
    console.warn("Subtitles: failed to load", srtUrl, e);
  }
};

window.attachSubtitles = function (video, src) {
  if (!src) return;

  const clean = src.split("?")[0].toLowerCase();

  if (clean.endsWith(".vtt")) {
    const track = document.createElement("track");
    track.kind = "subtitles";
    track.label = "English";
    track.srclang = "en";
    track.src = src;
    track.mode = "hidden";
    video.appendChild(track);
  }

  if (clean.endsWith(".srt")) {
    window.attachSubtitlesFromSRT(video, src);
  }
};

(() => {
  const videos = document.querySelectorAll("video[data-subtitles-src]");

  videos.forEach(video => {
    attachSubtitles(video, video.dataset.subtitlesSrc);
  });
})();
