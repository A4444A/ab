window.addEventListener("DOMContentLoaded", () => {

  const transmission = document.getElementById("begin-transmission");
  const music = document.getElementById("music-content");

  setTimeout(() => {
    transmission.style.display = "block";
  }, 5000);

  transmission.addEventListener("click", () => {
    transmission.style.display = "none";
    music.classList.add("visible");
  });

});
