
document.addEventListener("DOMContentLoaded", function () {
  console.log("Bienvenue sur ESCOVON !");

  const titre = document.querySelector("header h1");

  if (titre) {
    titre.addEventListener("click", function () {
      alert("Bienvenue dans la famille ESCOVON !");
    });
  }
});
