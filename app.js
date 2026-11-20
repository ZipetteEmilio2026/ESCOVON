
document.addEventListener("DOMContentLoaded", function () {
  console.log("ESCOVON est prêt !");

  // Navigation entre les pages
  const navigationButtons = document.querySelectorAll("nav button[data-page]");
  const pageButtons = document.querySelectorAll("[data-page]");

  function showPage(pageId) {
    const selectedPage = document.getElementById(pageId);

    if (!selectedPage || !selectedPage.classList.contains("panel")) {
      return;
    }

    document.querySelectorAll(".panel").forEach(function (panel) {
      panel.classList.remove("active");
    });

    selectedPage.classList.add("active");

    navigationButtons.forEach(function (button) {
      button.classList.toggle(
        "active",
        button.dataset.page === pageId
      );
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  pageButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      showPage(button.dataset.page);
    });
  });

  // Vérification du formulaire d'inscription
  const registerForm = document.getElementById("registerForm");

  if (registerForm) {
    registerForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const password = document.getElementById("password").value;
      const confirmation = document.getElementById("confirmPassword").value;
      const message = document.getElementById("registerMessage");

      message.hidden = false;

      if (password !== confirmation) {
        message.className = "notice error";
        message.textContent = "Les deux mots de passe ne correspondent pas.";
        return;
      }

      message.className = "notice";
      message.textContent =
        "Formulaire vérifié. La création réelle du compte sera activée après la connexion au serveur.";
    });
  }

  // Formulaire de connexion provisoire
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const message = document.getElementById("loginMessage");

      message.hidden = false;
      message.className = "notice";
      message.textContent =
        "La connexion réelle sera disponible après l'installation du système de comptes.";
    });
  }

  // Affichage des commissions de démonstration
  document.querySelectorAll(".commission").forEach(function (element) {
    element.textContent = "0 FCFA";
  });
});

