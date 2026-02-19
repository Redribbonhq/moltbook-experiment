// ====== CONFIG (set these when you have them) ======
const TWITTER_URL = "https://x.com/Moltbookexperi";     // your X account
const MOLTHOOK_URL = "about:blank";                      // your Moltbook thread URL (set later)
// ====================================================

// Wire quick links + iframe
document.getElementById("linkTwitter").href = TWITTER_URL;
document.getElementById("linkMoltbook").href = MOLTHOOK_URL;
document.getElementById("moltIframe").src = MOLTHOOK_URL;

// Tabs (Home/About)
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

// ====== Chart setup (clean futuristic) ======
const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d", { alpha: true });

function setCanvasSizeForDPI() {
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const cssW = canvas.clientWidth || 900;
  const cssH = canvas.clientHeight || 360;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", () => {
  setCanvasSizeForDPI();
  drawDeviationChart();
});

// ====== Data model (capped for performance) ======
const MAX_POINTS = 240;      // deviation trace window
const MAX_STRIP_ITEMS = 60;  // DOM cap to prevent lag

let flips = [];              // stores 0/1
let ones = 0;                // running total of ones (overall)
let flipId = 0;

// Keep a rolling trace series for chart (derived from flips window)
let chartSeries = [];        // deviation % for window

function nowHHMM() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatFlipId(n) {
  return String(n).padStart(6, "0");
}

// ====== Chart drawing ======
function drawGrid(w, h, pad) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // panel background subtle
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(0, 0, w, h);

  // outer frame
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

  // grid
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;

  const vLines = 8;
  const hLines = 6;

  for (let i = 1; i < vLines; i++) {
    const x = pad + (i / vLines) * innerW;
    ctx.beginPath();
    ctx.moveTo(x, pad);
    ctx.lineTo(x, pad + innerH);
    ctx.stroke();
  }

  for (let i = 1; i < hLines; i++) {
    const y = pad + (i / hLines) * innerH;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(pad + innerW, y);
    ctx.stroke();
  }

  // zero line
  const midY = pad + innerH / 2;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(pad, midY);
  ctx.lineTo(pad + innerW, midY);
  ctx.stroke();

  // label
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Deviation (%)", pad + 10, pad + 18);

  ctx.restore();
}

function drawGlowLine(points, pad, w, h) {
  if (points.length < 2) return;

  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  // Clamp y range tighter for readability
  const minY = -15;
  const maxY = 15;

  const xOf = (i) => pad + (i / (points.length - 1)) * innerW;
  const yOf = (v) => {
    const t = (v - minY) / (maxY - minY);
    const clamped = Math.min(1, Math.max(0, t));
    return pad + (1 - clamped) * innerH;
  };

  // glow pass
  ctx.save();
  ctx.strokeStyle = "rgba(0,215,255,0.22)";
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const x = xOf(i);
    const y = yOf(points[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  // core line
  ctx.save();
  ctx.strokeStyle = "rgba(0,215,255,0.95)";
  ctx.lineWidth = 2.25;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const x = xOf(i);
    const y = yOf(points[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  // latest dot
  const lastI = points.length - 1;
  const lx = xOf(lastI);
  const ly = yOf(points[lastI]);

  ctx.save();
  ctx.fillStyle = "rgba(0,215,255,1)";
  ctx.shadowColor = "rgba(0,215,255,0.55)";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(lx, ly, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDeviationChart() {
  const w = canvas.clientWidth || 900;
  const h = canvas.clientHeight || 360;
  const pad = 16;

  drawGrid(w, h, pad);
  drawGlowLine(chartSeries, pad, w, h);
}

// ====== Performance safe DOM updates ======
function prependStripItem(v, tsLabel, idLabel) {
  const item = document.createElement("div");
  item.className = "token";

  const bit = document.createElement("div");
  bit.className = "bit";
  bit.textContent = String(v);
  bit.style.color = (v === 1) ? "var(--green)" : "var(--red)";

  const t = document.createElement("div");
  t.className = "t";
  t.textContent = `${idLabel} · ${tsLabel}`;

  item.appendChild(bit);
  item.appendChild(t);

  strip.insertBefore(item, strip.firstChild);

  while (strip.children.length > MAX_STRIP_ITEMS) {
    strip.removeChild(strip.lastChild);
  }
}

// ====== Update counters ======
function updateStatsUI(total, onesCount) {
  const zerosCount = total - onesCount;
  const deviation = total > 0 ? ((onesCount / total) - 0.5) * 100 : 0;

  cTotal.textContent = String(total);
  cOnes.textContent = String(onesCount);
  cZeros.textContent = String(zerosCount);
  cDev.textContent = `${deviation >= 0 ? "+" : ""}${deviation.toFixed(2)}%`;
}

// ====== Flip generator (frontend demo mode) ======
function computeDeviationSeriesFromWindow(windowFlips) {
  let o = 0;
  const series = new Array(windowFlips.length);
  for (let i = 0; i < windowFlips.length; i++) {
    if (windowFlips[i] === 1) o++;
    const t = i + 1;
    series[i] = ((o / t) - 0.5) * 100;
  }
  return series;
}

function addFlip(v) {
  flipId += 1;
  flips.push(v);
  if (v === 1) ones += 1;

  // cap raw flips memory (still keep totals via ones + flipId)
  if (flips.length > MAX_POINTS) {
    // when dropping old points, we only drop from chart window; totals remain via ones/flipId.
    flips.shift();
  }

  // Big display
  big.textContent = String(v);
  big.style.color = (v === 1) ? "var(--green)" : "var(--red)";
  subline.textContent = `Flip ${formatFlipId(flipId)} · ${nowHHMM()}`;

  // Feed strip
  prependStripItem(v, nowHHMM(), formatFlipId(flipId));

  // Stats
  updateStatsUI(flipId, ones);

  // Chart window series
  chartSeries = computeDeviationSeriesFromWindow(flips);
  drawDeviationChart();
}

// ====== Countdown (visual only) ======
const INTERVAL_SECONDS = 300; // 5 minutes

function updateCountdown() {
  const now = Date.now();
  const intervalMs = INTERVAL_SECONDS * 1000;
  const next = Math.ceil(now / intervalMs) * intervalMs;
  const diff = Math.max(0, next - now);

  const s = Math.ceil(diff / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  pillNext.textContent = `Next flip ${mm}:${ss}`;
}

function startCountdown() {
  updateCountdown();
  setInterval(updateCountdown, 250);
}

// ====== Init ======
function seedInitial(n = 80) {
  for (let i = 0; i < n; i++) {
    addFlip(Math.random() < 0.5 ? 0 : 1);
  }
}

setCanvasSizeForDPI();
seedInitial(60);
startCountdown();

// Demo updates kept light (NOT spammy) to avoid lag.
// This is only for aesthetics. Backend will drive real 5-minute flips later.
setInterval(() => {
  addFlip(Math.random() < 0.5 ? 0 : 1);

}, 2500);
async function fetchFlip() {
  try {
    const res = await fetch("/api/post");
    const data = await res.json();

    if (data.flip === 0 || data.flip === 1) {
      addFlip(data.flip);
    }

  } catch (err) {
    console.error("Fetch failed", err);
  }
}

// Run every 5 minutes
setInterval(fetchFlip, 300000);

// Also run once on load
fetchFlip();
