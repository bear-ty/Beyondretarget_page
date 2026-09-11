const sideNav = document.querySelector(".side-nav");
const navLinks = Array.from(document.querySelectorAll(".side-nav a"));
const observedSections = ["top", "abstract", "method", "results", "citation"]
  .map((id) => document.getElementById(id))
  .filter(Boolean);

function setActiveSection(id) {
  const isTop = id === "top";
  sideNav?.classList.toggle("is-hidden", isTop);
  navLinks.forEach((link) => {
    link.classList.toggle("active", !isTop && link.dataset.section === id);
  });
}

function syncNavigationAtEdges() {
  const atTop = window.scrollY <= 12;
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 12;
  if (atTop) {
    setActiveSection("top");
  } else if (atBottom) {
    setActiveSection("citation");
  }
}

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length) {
        setActiveSection(visible[0].target.id);
        syncNavigationAtEdges();
      }
    },
    { rootMargin: "-20% 0px -54% 0px", threshold: [0.12, 0.28, 0.55] }
  );
  observedSections.forEach((section) => sectionObserver.observe(section));
}

window.addEventListener("scroll", syncNavigationAtEdges, { passive: true });
window.addEventListener("resize", syncNavigationAtEdges);
setActiveSection(window.scrollY <= 12 ? "top" : "abstract");

const speedOptions = [0.5, 1, 2];

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const roundedSeconds = Math.floor(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

document.querySelectorAll("[data-custom-video-player]").forEach((player) => {
  const video = player.querySelector("video");
  const playButton = player.querySelector('[data-video-action="play"]');
  const speedButton = player.querySelector('[data-video-action="speed"]');
  const restartButton = player.querySelector('[data-video-action="restart"]');
  const progress = player.querySelector("[data-video-progress]");
  const timeDisplay = player.querySelector("[data-video-time]");

  if (!video || !playButton || !speedButton || !restartButton || !progress || !timeDisplay) return;

  function syncLabels() {
    playButton.textContent = video.paused ? "Play" : "Pause";
    playButton.classList.toggle("is-active", !video.paused);
    speedButton.textContent = `Speed: ${video.playbackRate}x`;
  }

  function syncProgress() {
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      progress.value = "0";
      progress.style.setProperty("--progress", "0%");
      timeDisplay.textContent = `${formatTime(video.currentTime)} / 00:00`;
      return;
    }
    const percentage = (video.currentTime / video.duration) * 100;
    progress.value = String(percentage);
    progress.style.setProperty("--progress", `${percentage}%`);
    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
  }

  playButton.addEventListener("click", () => {
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });

  speedButton.addEventListener("click", () => {
    const currentIndex = speedOptions.indexOf(video.playbackRate);
    const nextIndex = (currentIndex + 1 + speedOptions.length) % speedOptions.length;
    video.playbackRate = speedOptions[nextIndex];
    syncLabels();
  });

  restartButton.addEventListener("click", () => {
    video.currentTime = 0;
    video.play().catch(() => {});
  });

  progress.addEventListener("input", () => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    video.currentTime = (Number(progress.value) / 100) * video.duration;
    syncProgress();
  });

  video.addEventListener("play", syncLabels);
  video.addEventListener("pause", syncLabels);
  video.addEventListener("ratechange", syncLabels);
  video.addEventListener("timeupdate", syncProgress);
  video.addEventListener("loadedmetadata", syncProgress);
  syncLabels();
  syncProgress();
});

document.querySelectorAll("[data-video-carousel]").forEach((carousel) => {
  const video = carousel.querySelector("video");
  const caption = carousel.querySelector("[data-carousel-caption]");
  const position = carousel.querySelector("[data-carousel-position]");
  const dots = Array.from(carousel.querySelectorAll("[data-carousel-index]"));
  const arrows = Array.from(carousel.querySelectorAll("[data-carousel-direction]"));
  const progress = carousel.querySelector("[data-video-progress]");
  const timeDisplay = carousel.querySelector("[data-video-time]");

  if (!video || !caption || !position || !dots.length) return;

  let activeIndex = Math.max(0, dots.findIndex((dot) => dot.classList.contains("is-active")));

  function showSlide(index) {
    const normalizedIndex = (index + dots.length) % dots.length;
    const slide = dots[normalizedIndex];
    const wasPlaying = !video.paused;
    const playbackRate = video.playbackRate;

    video.pause();
    video.src = slide.dataset.videoSrc;
    video.poster = slide.dataset.videoPoster || "";
    video.load();
    video.playbackRate = playbackRate;

    caption.textContent = slide.dataset.videoCaption || "";
    position.textContent = `${normalizedIndex + 1} / ${dots.length}`;
    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === normalizedIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", String(isActive));
    });

    if (progress) {
      progress.value = "0";
      progress.style.setProperty("--progress", "0%");
    }
    if (timeDisplay) timeDisplay.textContent = "00:00 / 00:00";

    activeIndex = normalizedIndex;
    if (wasPlaying) video.play().catch(() => {});
  }

  dots.forEach((dot, index) => dot.addEventListener("click", () => showSlide(index)));
  arrows.forEach((arrow) => {
    arrow.addEventListener("click", () => showSlide(activeIndex + Number(arrow.dataset.carouselDirection)));
  });

  carousel.addEventListener("keydown", (event) => {
    if (event.target.closest("button, input")) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showSlide(activeIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showSlide(activeIndex + 1);
    }
  });
});

document.querySelectorAll("[data-comparison-table]").forEach((table) => {
  const referenceRow = table.querySelector("tbody .ours-row");
  if (!referenceRow) return;

  const referenceCells = Array.from(referenceRow.cells);
  const metricStartIndex = 1;
  const higherIsBetterOffsets = new Set([8]);

  function parseMetric(cell) {
    const value = Number.parseFloat(cell.textContent.replace(/,/g, "").replace(/%/g, ""));
    return Number.isFinite(value) ? value : null;
  }

  const referenceValues = referenceCells.slice(metricStartIndex).map(parseMetric);

  referenceCells.slice(metricStartIndex).forEach((cell) => {
    const value = document.createElement("span");
    value.className = "metric-value";
    while (cell.firstChild) value.appendChild(cell.firstChild);

    const comparison = document.createElement("span");
    comparison.className = "metric-comparison-cell";
    comparison.append(value);
    cell.appendChild(comparison);
  });

  Array.from(table.tBodies[0]?.rows || []).forEach((row) => {
    if (row === referenceRow) return;

    row.tabIndex = 0;
    row.setAttribute("aria-label", `${row.cells[0]?.textContent.trim() || "Baseline"}: comparison against BeyondRetarget`);

    Array.from(row.cells).slice(metricStartIndex).forEach((cell, offset) => {
      const referenceValue = referenceValues[offset];
      const baselineValue = parseMetric(cell);
      if (referenceValue === null || baselineValue === null) return;

      const value = document.createElement("span");
      value.className = "metric-value";
      while (cell.firstChild) value.appendChild(cell.firstChild);

      const delta = document.createElement("span");
      delta.className = "metric-delta";

      if (baselineValue === 0) {
        delta.textContent = referenceValue === 0 ? "same" : "n/a";
        delta.classList.add("is-neutral");
        delta.title = referenceValue === 0
          ? "BeyondRetarget matches this zero-error baseline."
          : "Percentage change is undefined because the baseline value is zero.";
      } else {
        const higherIsBetter = higherIsBetterOffsets.has(offset);
        const improvement = higherIsBetter
          ? ((referenceValue - baselineValue) / Math.abs(baselineValue)) * 100
          : ((baselineValue - referenceValue) / Math.abs(baselineValue)) * 100;
        const magnitude = Math.abs(improvement).toFixed(1);

        if (improvement > 0.05) {
          delta.textContent = `${higherIsBetter ? "↑" : "↓"}${magnitude}%`;
          delta.classList.add("is-positive");
          delta.title = `BeyondRetarget improves this metric by ${magnitude}% versus the hovered baseline. ${higherIsBetter ? "Higher" : "Lower"} is better.`;
        } else if (improvement < -0.05) {
          delta.textContent = `${higherIsBetter ? "↓" : "↑"}${magnitude}%`;
          delta.classList.add("is-negative");
          delta.title = `BeyondRetarget is worse on this metric by ${magnitude}% versus the hovered baseline. ${higherIsBetter ? "Higher" : "Lower"} is better.`;
        } else {
          delta.textContent = "same";
          delta.classList.add("is-neutral");
          delta.title = "BeyondRetarget and this baseline are effectively equal on this metric.";
        }
      }

      const comparison = document.createElement("span");
      comparison.className = "metric-comparison-cell";
      comparison.append(value, delta);
      cell.appendChild(comparison);
    });
  });
});
