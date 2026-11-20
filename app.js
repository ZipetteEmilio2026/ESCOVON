
document.addEventListener("DOMContentLoaded", function () {
  console.log("ESCOVON est prêt !");

  const titre = document.querySelector("header h1");

  if (titre) {
    titre.addEventListener("click", function () {
      alert("Bienvenue dans la famille ESCOVON !");
    });
  }

  // Affichage de la commission
  const commissions = document.querySelectorAll(".commission");

  commissions.forEach(function (commission) {
    commission.textContent = "0 FCFA";
  });
});
