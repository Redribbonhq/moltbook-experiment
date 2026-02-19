document.addEventListener("DOMContentLoaded", function () {

  // ====== CONFIG ======
  const TWITTER_URL = "https://x.com/Moltbookexperi";

  const twitterLink = document.getElementById("linkTwitter");
  if (twitterLink) {
    twitterLink.href = TWITTER_URL;
  }

  // everything else stays below here...

// ====== Tabs ======
const tabs = document.querySelectorAll(".tab");
const pages = {
  home: document.getElementById("page-home"),
  about: document.getElementById("page-about"),
};

tabs.forEach((t) => {
  t.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    const page = t.dataset.page;
    Object.values(pages).forEach((p) => p.classList.remove("show"));
    pages[page].classList.add("show");
  });
});

// ====== UI refs ======
const pillNext = document.getElementById("pillNext");
const big = document.getElementById("bigValue");
const subline = document.getElementById("subline");
const cTotal = document.getElementById("cTotal");
const cOnes = document.getElementById("cOnes");
const cZeros = document.getElementById("cZeros");
const cDev = document.getElementById("cDev");
const strip = document.getElementById("stripRow");

const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d", { alpha: true });

// ====== DATA ======
let flips = [];
let ones = 0;
let flipId = 0;
let chartSeries = [];
let lastTimestamp = null;

const MAX_POINTS = 240;
const MAX_STRIP_ITEMS = 60;
const INTERVAL_MS = 300000; // 5 minutes

// ====== Helpers ======
function nowHHMM() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatFlipId(n) {
  return String(n).padStart(6, "0");
}

// ====== Chart Setup ======
function setCanvasSizeForDPI() {
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function computeDeviationSeries(windowFlips) {
  let o = 0;
  const series = [];
  for (let i = 0; i < windowFlips.length; i++) {
    if (windowFlips[i] === 1) o++;
    series.push(((o / (i + 1)) - 0.5) * 100);
  }
  return series;
}

function drawChart() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (chartSeries.length < 2) return;

  const pad = 16;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  ctx.strokeStyle = "rgba(0,215,255,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();

  chartSeries.forEach((v, i) => {
    const x = pad + (i / (chartSeries.length - 1)) * innerW;
    const y = pad + innerH / 2 - (v / 15) * (innerH / 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

// ====== Add Flip ======
function addFlip(v) {
  flipId++;
  flips.push(v);
  if (v === 1) ones++;

  if (flips.length > MAX_POINTS) flips.shift();

  big.textContent = v;
  big.style.color = v === 1 ? "var(--green)" : "var(--red)";
  subline.textContent = `Flip ${formatFlipId(flipId)} · ${nowHHMM()}`;

  const token = document.createElement("div");
  token.className = "token";
  token.innerHTML = `
    <div class="bit" style="color:${v === 1 ? "var(--green)" : "var(--red)"}">${v}</div>
    <div class="t">${formatFlipId(flipId)} · ${nowHHMM()}</div>
  `;

  strip.insertBefore(token, strip.firstChild);

  while (strip.children.length > MAX_STRIP_ITEMS) {
    strip.removeChild(strip.lastChild);
  }

  const zeros = flipId - ones;
  const deviation = ((ones / flipId) - 0.5) * 100;

  cTotal.textContent = flipId;
  cOnes.textContent = ones;
  cZeros.textContent = zeros;
  cDev.textContent = `${deviation >= 0 ? "+" : ""}${deviation.toFixed(2)}%`;

  chartSeries = computeDeviationSeries(flips);
  drawChart();
}

// ====== Backend Poll ======
async function fetchFlip() {
  try {
    const res = await fetch("/api/post");
    const data = await res.json();

    if (
      (data.flip === 0 || data.flip === 1) &&
      data.timestamp !== lastTimestamp
    ) {
      lastTimestamp = data.timestamp;
      addFlip(data.flip);
    }

  } catch (err) {
    console.error("Fetch failed", err);
  }
}

// ====== Countdown ======
function startCountdown() {
  setInterval(() => {
    const now = Date.now();
    const next = Math.ceil(now / INTERVAL_MS) * INTERVAL_MS;
    const diff = next - now;
    const s = Math.ceil(diff / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    pillNext.textContent = `Next flip ${mm}:${ss}`;
  }, 250);
}

// ====== INIT ======
setCanvasSizeForDPI();
window.addEventListener("resize", setCanvasSizeForDPI);

startCountdown();
fetchFlip();
setInterval(fetchFlip, 10000); // poll every 10s

});
