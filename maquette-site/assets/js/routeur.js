/* =========================================================
   COMETEC — routeur de l'aperçu en un seul fichier
   Chaque page est rangée dans un <template id="page-…"> ;
   l'adresse #/appareils/raven-eye:montage affiche la page
   « appareils/raven-eye » et descend jusqu'à #montage.
   Le site final, lui, garde un fichier par page (sans ce script).
   ========================================================= */
(function () {
  "use strict";
  var doc = document, win = window;
  var PAGES = win.PAGES_SITE || {};
  var lancer = null, allerA = null, courant = null, ctrl = null;

  function versRoute(chemin) {
    chemin = (chemin || "").replace(/^\.?\//, "");
    if (chemin === "" || chemin === "index.html") return "";
    return chemin.replace(/\/index\.html$/, "").replace(/\.html$/, "");
  }
  function lien(chemin, ancre) {
    return "#/" + versRoute(chemin) + (ancre ? ":" + ancre : "");
  }
  function lire() {
    var h = win.location.hash || "";
    if (h.indexOf("#/") !== 0) return { route: "", ancre: "" };
    var s = decodeURIComponent(h.slice(2)), i = s.indexOf(":");
    return { route: i < 0 ? s : s.slice(0, i), ancre: i < 0 ? "" : s.slice(i + 1) };
  }

  function afficher() {
    var r = lire();
    if (!PAGES[r.route]) r = { route: "", ancre: r.ancre };
    if (courant === r.route) { if (r.ancre) allerA(r.ancre, true); else win.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (ctrl) ctrl.abort();
    ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var page = PAGES[r.route], main = doc.getElementById("contenu");
    var modele = doc.getElementById(page.modele);
    main.innerHTML = "";
    main.appendChild(modele.content.cloneNode(true));
    /* photos intégrées au fichier */
    Array.prototype.forEach.call(main.querySelectorAll("img[data-img]"), function (im) {
      var src = win.IMAGES_INTEGREES && win.IMAGES_INTEGREES[im.getAttribute("data-img")];
      if (src) im.src = src;
    });
    doc.title = page.titre;
    /* entrée de menu active */
    Array.prototype.forEach.call(doc.querySelectorAll(".nav a, .tiroir a"), function (a) {
      var h = a.getAttribute("href") || "", cible = h.indexOf("#/") === 0 ? h.slice(2).split(":")[0] : null;
      var actif = cible !== null && cible !== "" && (r.route === cible || r.route.indexOf(cible + "/") === 0);
      if (actif) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    courant = r.route;
    win.scrollTo(0, 0);
    main.classList.remove("entree"); void main.offsetWidth; main.classList.add("entree");
    lancer(ctrl ? ctrl.signal : null);
    if (r.ancre) setTimeout(function () { allerA(r.ancre, false); }, 120);
  }

  /* Ancres dans la page (#montage, #contact…) : défilement sans changer de page */
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    var h = a.getAttribute("href");
    if (h.indexOf("#/") === 0) {
      /* même adresse que l'actuelle : le navigateur ne signale rien, on redescend à l'ancre ou en haut */
      if (h === win.location.hash) { e.preventDefault(); var anc = h.slice(2).split(":")[1]; if (anc) allerA(decodeURIComponent(anc), true); else win.scrollTo({ top: 0, behavior: "smooth" }); }
      return;
    }
    e.preventDefault();
    if (h.length > 1) allerA(decodeURIComponent(h.slice(1)), true);
  });

  win.ROUTEUR = {
    lien: lien,
    demarrer: function (fnLancer, fnAllerA) {
      lancer = fnLancer; allerA = fnAllerA;
      win.addEventListener("hashchange", afficher);
      afficher();
    }
  };
})();
