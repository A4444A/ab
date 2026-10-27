"use strict";

/* ============================================================
   SETTINGS
============================================================ */

// Paste your Google Sheet's "Publish to web" CSV link here (see the setup steps).
// Leave it empty and the events section simply stays hidden.
const SHEET_CSV_URL = "";

// Which plant goes where. kind: "fern" | "herb" | "grass"
// Change a seed number to grow a different-looking plant of the same kind.
// dur = seconds for one slow sway, delay = start offset so they don't move in sync.
const PLANTS = [
  { slot: "tl", kind: "herb",  seed: 14, dur: 13, delay: -2 },
  { slot: "tr", kind: "fern",  seed: 27, dur: 15, delay: -7 },
  { slot: "bl", kind: "grass", seed: 5,  dur: 12, delay: -4 },
  { slot: "br", kind: "herb",  seed: 41, dur: 14, delay: -9 },
  { slot: "el", kind: "fern",  seed: 63, dur: 16, delay: -5 },
  { slot: "er", kind: "grass", seed: 88, dur: 13, delay: -11 }
];

/* ============================================================
   PLANT GENERATOR
   Draws each plant once, as SVG, from a seeded random number
   generator: same seed, same plant, every visit. After that the
   only thing that moves is a CSS animation (see style.css).
============================================================ */

const STEM  = ["#5f7a52", "#6f8a5a"];
const LEAF  = ["#9caf88", "#86a074", "#b3c19e", "#7a946a"];
const BLOOM = ["#b48a95", "#c9a3ad", "#d2b676", "#eee5cf", "#b9785b"];
const CENTER = ["#d2b676", "#7a5a3a"];
const WHEAT = ["#d2b676", "#c4a561"];

// Small seeded random number generator (mulberry32). Returns a function giving 0 to 1.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => +n.toFixed(1);
const rad = (d) => (d * Math.PI) / 180;
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

// A leaf pointing "up" at ang = 0, rotated clockwise by ang degrees.
function leaf(x, y, ang, len, wid, fill, opacity) {
  return `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})" ` +
    `d="M0 0Q${f(wid)} ${f(-len * 0.5)} 0 ${f(-len)}Q${f(-wid)} ${f(-len * 0.5)} 0 0Z" ` +
    `fill="${fill}"${opacity ? ` opacity="${opacity}"` : ""}/>`;
}

function stem(d, width, colour) {
  return `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(width)}" stroke-linecap="round"/>`;
}

function bloom(x, y, r, out, scale) {
  const petals = 5 + Math.floor(r() * 3);
  const colour = pick(r, BLOOM);
  const len = (9 + r() * 5) * scale;
  const spin = r() * 360;
  for (let i = 0; i < petals; i++) {
    out.push(leaf(x, y, spin + (i * 360) / petals, len, len * 0.55, colour, 0.95));
  }
  out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(2.2 * scale)}" fill="${pick(r, CENTER)}"/>`);
}

// A curved central stalk with paired leaflets, shrinking toward the tip.
function fern(r, out) {
  const x0 = 100, y0 = 296;
  const lean = (r() - 0.5) * 70;
  const length = 210 + r() * 50;
  const cx = x0 + lean * 0.6, cy = y0 - length * 0.55;
  const x2 = x0 + lean, y2 = y0 - length;
  out.push(stem(`M${x0} ${y0}Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)}`, 2.4, STEM[0]));

  const n = 14 + Math.floor(r() * 5);
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1), mt = 1 - t;
    const px = mt * mt * x0 + 2 * mt * t * cx + t * t * x2;
    const py = mt * mt * y0 + 2 * mt * t * cy + t * t * y2;
    const tx = 2 * mt * (cx - x0) + 2 * t * (x2 - cx);
    const ty = 2 * mt * (cy - y0) + 2 * t * (y2 - cy);
    const ang = (Math.atan2(tx, -ty) * 180) / Math.PI;
    const size = (22 * (1 - t * 0.75) + 4) * (0.85 + r() * 0.3);
    out.push(leaf(px, py, ang - 62, size, size * 0.42, pick(r, LEAF)));
    out.push(leaf(px, py, ang + 62, size, size * 0.42, pick(r, LEAF)));
  }
  out.push(leaf(x2, y2, (Math.atan2(x2 - cx, -(y2 - cy)) * 180) / Math.PI, 14, 6, pick(r, LEAF)));
}

// A branching herb: forks a few times, leaves along each stem, blooms at some tips.
function herb(r, out) {
  function branch(x, y, ang, len, depth, w) {
    const a2 = ang + (r() - 0.5) * 28;
    const mx = x + Math.sin(rad(ang)) * len * 0.5;
    const my = y - Math.cos(rad(ang)) * len * 0.5;
    const ex = x + Math.sin(rad(a2)) * len;
    const ey = y - Math.cos(rad(a2)) * len;
    out.push(stem(`M${f(x)} ${f(y)}Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}`, w, pick(r, STEM)));

    [0.4, 0.72].forEach((t) => {
      const lx = x + (ex - x) * t, ly = y + (ey - y) * t;
      const size = 11 + r() * 7;
      out.push(leaf(lx, ly, a2 - 52, size, size * 0.5, pick(r, LEAF)));
      out.push(leaf(lx, ly, a2 + 52, size, size * 0.5, pick(r, LEAF)));
    });

    if (depth > 0) {
      branch(ex, ey, a2 - (14 + r() * 14), len * 0.72, depth - 1, w * 0.72);
      branch(ex, ey, a2 + (14 + r() * 14), len * 0.72, depth - 1, w * 0.72);
      if (r() < 0.6) {
        const side = r() < 0.5 ? -1 : 1;
        branch((x + ex) / 2, (y + ey) / 2, ang + side * (35 + r() * 15), len * 0.55, depth - 1, w * 0.6);
      }
    } else if (r() < 0.65) {
      bloom(ex, ey, r, out, 1);
    } else {
      out.push(leaf(ex, ey, a2, 10 + r() * 6, 5, pick(r, LEAF)));
    }
  }
  branch(100, 296, (r() - 0.5) * 16, 76, 3, 3.2);
}

// Tapering blades plus a few wheat-like stems with ears.
function grass(r, out) {
  for (let k = 0; k < 3; k++) {
    const x0 = 100 + (r() - 0.5) * 30;
    const lean = (r() - 0.5) * 60;
    const h = 190 + r() * 70;
    const xt = x0 + lean, yt = 296 - h;
    const cx = x0 + lean * 0.15, cy = 296 - h * 0.55;
    out.push(stem(`M${f(x0)} 296Q${f(cx)} ${f(cy)} ${f(xt)} ${f(yt)}`, 1.6, STEM[0]));
    const ang = (Math.atan2(xt - cx, -(yt - cy)) * 180) / Math.PI;
    for (let j = 0; j < 7; j++) {
      const t = j * 7;
      const px = xt - Math.sin(rad(ang)) * t;
      const py = yt + Math.cos(rad(ang)) * t;
      const size = 12 - j * 0.5;
      out.push(leaf(px, py, ang - 28, size, 4, pick(r, WHEAT)));
      out.push(leaf(px, py, ang + 28, size, 4, pick(r, WHEAT)));
    }
    out.push(leaf(xt, yt, ang, 12, 4, pick(r, WHEAT)));
  }

  const blades = 6 + Math.floor(r() * 3);
  for (let i = 0; i < blades; i++) {
    const lean = (i / (blades - 1) - 0.5) * 80 + (r() - 0.5) * 14;
    const h = 120 + r() * 100;
    const x0 = 100 + (r() - 0.5) * 16;
    const xt = x0 + lean, yt = 296 - h;
    const cx = x0 + lean * 0.2, cy = 296 - h * 0.6;
    const w = 3.2 + r() * 1.6;
    out.push(
      `<path d="M${f(x0 - w)} 296Q${f(cx - w)} ${f(cy)} ${f(xt)} ${f(yt)}Q${f(cx + w)} ${f(cy + 8)} ${f(x0 + w)} 296Z" ` +
      `fill="${pick(r, LEAF)}"/>`
    );
  }
}

const KINDS = { fern, herb, grass };

// Returns an SVG string. The base of the plant sits at the bottom centre of the viewBox.
function buildPlantSVG(kind, seed) {
  const r = mulberry32(seed);
  const out = [];
  KINDS[kind](r, out);
  return `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" focusable="false">${out.join("")}</svg>`;
}

function mountPlants() {
  const host = document.getElementById("plants");
  if (!host) return;
  PLANTS.forEach((p) => {
    const slot = document.createElement("div");
    slot.className = `slot slot-${p.slot}`;
    const plant = document.createElement("div");
    plant.className = "plant";
    plant.style.setProperty("--dur", `${p.dur}s`);
    plant.style.setProperty("--delay", `${p.delay}s`);
    plant.innerHTML = buildPlantSVG(p.kind, p.seed); // string built above from our own code, no outside data
    slot.appendChild(plant);
    host.appendChild(slot);
  });
}

/* ============================================================
   EVENTS FROM A GOOGLE SHEET
   Expected columns (first row = headers, any order):
     date   title   location   link
   - date must look like 2026-11-14 (year-month-day)
   - location and link are optional
   Past events are dropped automatically.
============================================================ */

// Minimal CSV parser that handles quoted cells, commas inside quotes and line breaks.
function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; }
      } else { cell += c; }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(cell); cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = ""; rows.push(row); row = [];
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function rowsToEvents(rows) {
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name) => head.indexOf(name);
  const iDate = col("date"), iTitle = col("title"), iPlace = col("location"), iLink = col("link");
  if (iDate < 0 || iTitle < 0) return [];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const events = [];

  rows.slice(1).forEach((r) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((r[iDate] || "").trim());
    const title = (r[iTitle] || "").trim();
    if (!m || !title) return;
    const date = new Date(+m[1], +m[2] - 1, +m[3]);
    if (date < today) return;
    events.push({
      date,
      title,
      place: iPlace >= 0 ? (r[iPlace] || "").trim() : "",
      link: iLink >= 0 ? (r[iLink] || "").trim() : ""
    });
  });

  return events.sort((a, b) => a.date - b.date);
}

function safeLink(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch (e) {
    return "";
  }
}

function renderEvents(events) {
  const section = document.getElementById("events");
  const list = document.getElementById("event-list");
  if (!section || !list || events.length === 0) return;

  const thisYear = new Date().getFullYear();
  events.forEach((ev) => {
    const href = safeLink(ev.link);
    const li = document.createElement("li");
    const item = document.createElement(href ? "a" : "div");
    item.className = "event";
    if (href) {
      item.href = href;
      item.target = "_blank";
      item.rel = "noopener noreferrer";
    }

    const date = document.createElement("span");
    date.className = "event-date";
    date.textContent = ev.date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: ev.date.getFullYear() === thisYear ? undefined : "numeric"
    });

    const title = document.createElement("span");
    title.className = "event-title";
    title.textContent = ev.title;

    item.append(date, title);

    if (ev.place) {
      const place = document.createElement("span");
      place.className = "event-place";
      place.textContent = ev.place;
      item.append(place);
    }

    li.appendChild(item);
    list.appendChild(li);
  });

  section.hidden = false;
}

async function loadEvents() {
  // Only accept Google Sheets links; anything else is ignored.
  if (!SHEET_CSV_URL.startsWith("https://docs.google.com/")) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(SHEET_CSV_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    renderEvents(rowsToEvents(parseCSV(await res.text())));
  } catch (err) {
    // Any failure (offline, blocked, sheet unpublished): leave the section hidden.
    console.warn("Events not loaded:", err);
  } finally {
    clearTimeout(timer);
  }
}

/* ============================================================
   START
============================================================ */
if (typeof document !== "undefined") {
  mountPlants();
  loadEvents();
}
