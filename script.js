"use strict";

window.addEventListener("DOMContentLoaded", () => {
  const transmission = document.getElementById("begin-transmission");
  const intro = document.getElementById("intro-container");
  const music = document.getElementById("music-content");

  setTimeout(() => {
    transmission.classList.add("visible");
  }, 8000);

  transmission.addEventListener("click", () => {
    transmission.classList.remove("visible");

    intro.classList.add("fade-out");

    music.classList.add("visible");
  });
});