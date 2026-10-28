"use strict";

window.addEventListener("DOMContentLoaded", () => {

  const transmission = document.getElementById("begin-transmission");
  const music = document.getElementById("music-content");

  transmission.addEventListener("click", () => {

    transmission.style.display = "none";

    music.classList.add("visible");

  });

});
