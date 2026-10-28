"use strict";

// Paste your Google Sheet's "Publish to web" CSV link here (see the setup steps).
// Leave it empty and the events section simply stays hidden.
const SHEET_CSV_URL = "";

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
   INSTAGRAM FALLBACK
   Instagram's script swaps the blockquote in index.html for the post.
   If no Instagram frame has appeared after 8 seconds, show the fallback
   link so a blank white box doesn't look like a bug.
============================================================ */
function watchInstagram() {
  const bq = document.querySelector("blockquote.instagram-media");
  if (!bq) return;
  setTimeout(() => {
    if (!document.querySelector('iframe[src*="instagram.com"]')) bq.classList.add("ig-failed");
  }, 8000);
}

/* ============================================================
   START
============================================================ */
if (typeof document !== "undefined") {
  loadEvents();
  watchInstagram();
}
