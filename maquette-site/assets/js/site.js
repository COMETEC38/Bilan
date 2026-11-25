/* =========================================================
   COMETEC — interactions du site (maquette)
   ========================================================= */
(function () {
  "use strict";
  var doc = document, win = window;
  var calme = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var racine = doc.body.getAttribute("data-racine") || "";
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var norm = function (s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); };
  var echap = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  /* ---------- Index des appareils ---------- */
  var APPAREILS = [];
  /* Liens entre pages : fichiers séparés (site final) ou routes internes (aperçu en un seul fichier) */
  function url(chemin, ancre) {
    if (win.ROUTEUR) return win.ROUTEUR.lien(chemin || "", ancre || "");
    return racine + (chemin || "index.html") + (ancre ? "#" + ancre : "");
  }
  var CATALOGUE = "appareils/index.html";
  function slugDe(nom) { return norm(nom).replace(/ /g, "-"); }
  function lienApp(it) { return it[2] ? url(it[2]) : url(CATALOGUE, "a-" + slugDe(it[0])); }
  function img(nom) { return (win.IMAGES_INTEGREES && win.IMAGES_INTEGREES[nom]) || racine + "assets/img/appareils/" + nom + ".webp"; }
  (win.FAMILLES || []).forEach(function (f) {
    f.groupes.forEach(function (g) {
      g.items.forEach(function (it) {
        APPAREILS.push({ nom: it[0], type: it[1], url: lienApp(it), fiche: !!it[2], slug: slugDe(it[0]), famille: f.nom, familleId: f.id, groupe: g.nom });
      });
    });
  });
  var parNom = {};
  APPAREILS.forEach(function (a) { parNom[a.nom] = a; });

  /* ---------- Secteurs ---------- */
  var depVersSecteur = {};
  (win.SECTEURS || []).forEach(function (s) {
    if (s.deps !== "*") s.deps.split(" ").forEach(function (d) { depVersSecteur[d] = s; });
  });
  var secteurDefaut = (win.SECTEURS || []).filter(function (s) { return s.deps === "*"; })[0];
  function secteurDe(dep) {
    if (!dep) return null;
    var d = String(dep).trim().toUpperCase();
    if (/^\d$/.test(d)) d = "0" + d;
    if (/^97\d$/.test(d)) return { s: secteurDefaut, d: d };
    if (!/^(\d{2}|2A|2B)$/.test(d)) return null;
    if (d === "20") return null;
    var n = parseInt(d, 10);
    if (!isNaN(n) && (n < 1 || n > 95)) return null;
    return { s: depVersSecteur[d] || secteurDefaut, d: d };
  }

  /* ---------- En-tête ---------- */
  var entete = $(".entete");
  function surDefile() { if (entete) entete.classList.toggle("pose", win.scrollY > 4); doc.body.classList.toggle("en-haut", win.scrollY <= 4); }
  win.addEventListener("scroll", surDefile, { passive: true }); surDefile();

  /* Méga-menus générés depuis les données */
  var megaApp = $("#mega-appareils .mega-in");
  if (megaApp) {
    /* Colonnes équilibrées : les débitmètres sur deux sous-colonnes, les petites familles empilées */
    var parId = {}; win.FAMILLES.forEach(function (f) { parId[f.id] = f; });
    var colonnes = (win.MEGA_COLONNES || win.FAMILLES.map(function (f) { return [f.id]; }));
    var famille = function (f) {
      var large = f.groupes.length > 3;
      return '<div class="mega-fam' + (large ? " mega-large" : "") + '"><h3><a href="' + url(CATALOGUE, f.id) + '">' + echap(f.nom) + "</a></h3>" +
        (large ? '<div class="mega-groupes">' : "") + f.groupes.map(function (g) {
        return '<div class="mega-groupe">' + (f.groupes.length > 1 ? "<h4>" + echap(g.nom) + "</h4>" : "") + "<ul>" + g.items.map(function (it) {
          return '<li><a href="' + lienApp(it) + '">' + echap(it[0]) + "</a></li>";
        }).join("") + "</ul></div>";
      }).join("") + (large ? "</div>" : "") + "</div>";
    };
    megaApp.innerHTML = colonnes.map(function (col) {
      var fams = col.map(function (id) { return parId[id]; }).filter(Boolean);
      var large = fams.some(function (f) { return f.groupes.length > 3; });
      return '<div class="mega-col' + (large ? " mega-col-large" : "") + '">' + fams.map(famille).join("") + "</div>";
    }).join("");
  }
  var megaTer = $("#mega-applications .mega-in");
  if (megaTer) {
    var ordreMenu = win.TERRAINS_MENU || [];
    megaTer.innerHTML = win.TERRAINS.slice().sort(function (a, b) { return ordreMenu.indexOf(a.id) - ordreMenu.indexOf(b.id); }).map(function (t) {
      return '<a class="mega-app" href="' + url("", "parcours") + '"><span style="background-image:url(' + win.PHOTO(t.photo, 300) + ')"></span><div><b>' + echap(t.nom) + "</b><em>" + echap(t.texte.split(".")[0]) + ".</em></div></a>";
    }).join("");
  }
  var boutonsMega = $$("[data-mega]");
  var minuteur;
  function fermerMegas(sauf) {
    boutonsMega.forEach(function (b) {
      if (b === sauf) return;
      b.setAttribute("aria-expanded", "false");
      var p = doc.getElementById(b.getAttribute("data-mega")); if (p) p.classList.remove("ouvert");
    });
  }
  function ouvrirMega(b) {
    fermerMegas(b);
    b.setAttribute("aria-expanded", "true");
    doc.getElementById(b.getAttribute("data-mega")).classList.add("ouvert");
  }
  boutonsMega.forEach(function (b) {
    var p = doc.getElementById(b.getAttribute("data-mega"));
    b.addEventListener("click", function () {
      if (b.tagName === "A") return; /* « Appareils » mène à la page catalogue ; le menu s'ouvre au survol */
      if (b.getAttribute("aria-expanded") === "true") fermerMegas(); else ouvrirMega(b);
    });
    if (win.matchMedia("(hover:hover)").matches) {
      /* Ouverture après un court survol (évite les ouvertures en traversant l'en-tête),
         fermeture rapide dès que la souris quitte le bouton ou le panneau */
      b.addEventListener("mouseenter", function () {
        clearTimeout(minuteur);
        minuteur = setTimeout(function () { ouvrirMega(b); }, $(".mega.ouvert") ? 0 : 90);
      });
      p.addEventListener("mouseenter", function () { clearTimeout(minuteur); });
      [b, p].forEach(function (el) {
        el.addEventListener("mouseleave", function (e) {
          clearTimeout(minuteur);
          /* du bouton vers son panneau : on laisse le temps de descendre */
          var versPanneau = el === b && e.clientY > b.getBoundingClientRect().bottom - 2;
          minuteur = setTimeout(fermerMegas, versPanneau ? 160 : 60);
        });
      });
    }
  });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") { fermerMegas(); fermerTiroir(); etat.fermerDevis(); } });
  doc.addEventListener("click", function (e) { if (!e.target.closest(".mega,[data-mega]")) fermerMegas(); });
  doc.documentElement.addEventListener("mouseleave", function () { clearTimeout(minuteur); fermerMegas(); });
  var yMega = 0;
  win.addEventListener("scroll", function () { if (Math.abs(win.scrollY - yMega) > 60) { yMega = win.scrollY; if ($(".mega.ouvert")) fermerMegas(); } }, { passive: true });

  /* Entrée de menu de la page courante (site en fichiers séparés) */
  if (!win.ROUTEUR) {
    var ici = win.location.href.split("#")[0].replace(/index\.html$/, "");
    $$(".nav a, .tiroir a").forEach(function (a) {
      var h = a.href.split("#")[0].replace(/index\.html$/, "");
      if (a.getAttribute("href").charAt(0) !== "#" && h === ici && ici.replace(/\/$/, "") !== racineAbs()) a.setAttribute("aria-current", "page");
      if (/\/appareils\//.test(ici) && /\/appareils\/$/.test(h)) a.setAttribute("aria-current", "page");
      if (/\/services\//.test(ici) && /#service$/.test(a.getAttribute("href"))) a.setAttribute("aria-current", "page");
    });
  }
  function racineAbs() { var r = doc.createElement("a"); r.href = racine || "./"; return r.href.replace(/\/$/, ""); }

  /* Menu mobile */
  var burger = $(".burger"), tiroir = $(".tiroir");
  function fermerTiroir() { if (tiroir) { tiroir.classList.remove("ouvert"); burger.setAttribute("aria-expanded", "false"); burger.textContent = "Menu"; } }
  if (burger && tiroir) {
    burger.addEventListener("click", function () {
      var o = tiroir.classList.toggle("ouvert");
      burger.setAttribute("aria-expanded", o); burger.textContent = o ? "Fermer" : "Menu";
    });
    tiroir.addEventListener("click", function (e) { if (e.target.tagName === "A") fermerTiroir(); });
  }

  var etat = { fermerDevis: function () {} };

  /* ---------- « Ma demande » : lignes de devis gardées d'une fiche à l'autre ---------- */
  var CLE = "cometec-demande";
  function lireDemande() { try { return JSON.parse(win.localStorage.getItem(CLE)) || []; } catch (e) { return etat.demande || []; } }
  function ecrireDemande(l) { etat.demande = l; try { win.localStorage.setItem(CLE, JSON.stringify(l)); } catch (e) {} majBadge(); majFin(); }
  var badge = null;
  if (entete) {
    var zone = $(".entete-actions");
    if (zone) {
      zone.insertAdjacentHTML("afterbegin", '<button class="ma-demande" type="button" data-ouvrir-demande hidden aria-label="Ma demande de devis"><span class="lib">Ma demande</span><b>0</b></button>');
      badge = $(".ma-demande", zone);
    }
  }
  function majBadge() {
    var n = lireDemande().length;
    if (badge) { badge.hidden = n === 0; $("b", badge).textContent = n; }
    $$(".devis-panier").forEach(function (p) { p.hidden = n === 0; $(".nb-demande", p).textContent = n; });
  }
  /* ---------- Financement : achat, leasing ou les deux (un seul choix pour toute la demande) ---------- */
  var CLE_FIN = "cometec-financement";
  var LEASING = win.LEASING || { durees: [3, 4, 5], page: "services/leasing.html", partenaire: "notre partenaire financier" };
  var MODES = [["Achat", "Achat"], ["Leasing", "Leasing"], ["Achat et leasing", "Les deux"]];
  function lireFin() {
    var f = null; try { f = JSON.parse(win.localStorage.getItem(CLE_FIN)); } catch (e) {}
    f = f || etat.fin || {};
    var d = LEASING.durees.indexOf(+f.duree) > -1 ? +f.duree : LEASING.durees[0];
    return { mode: f.mode || "Achat", duree: d };
  }
  function ecrireFin(f) { etat.fin = f; try { win.localStorage.setItem(CLE_FIN, JSON.stringify(f)); } catch (e) {} majFin(); }
  function texteFin(f) { return f.mode === "Achat" ? "achat" : (f.mode === "Leasing" ? "leasing" : "achat et leasing") + " sur " + f.duree + "\u00a0ans"; }
  var nFin = 0;
  function htmlFin(lieu) {
    var k = ++nFin, idB = "bulle-leasing-" + k;
    return '<fieldset class="financement" data-lieu="' + lieu + '">' +
      '<legend>Financement<button type="button" class="info-leasing" aria-expanded="false" aria-controls="' + idB + '" title="Le leasing, en bref"><span aria-hidden="true">?</span><span class="sr">Le leasing, en bref</span></button></legend>' +
      '<div class="segment" role="radiogroup" aria-label="Mode de financement">' +
      MODES.map(function (m) { return '<label><input type="radio" name="fin-' + k + '" value="' + m[0] + '"><span>' + m[1] + "</span></label>"; }).join("") + "</div>" +
      '<div class="duree" hidden><span class="duree-lib" id="lib-duree-' + k + '">Durée souhaitée</span><div class="segment petit" role="radiogroup" aria-labelledby="lib-duree-' + k + '">' +
      LEASING.durees.map(function (a) { return '<label><input type="radio" name="duree-' + k + '" value="' + a + '"><span>' + a + "\u00a0ans</span></label>"; }).join("") + "</div></div>" +
      '<p class="financement-note" aria-live="polite"></p>' +
      '<div class="bulle-leasing" id="' + idB + '" hidden>' +
        '<p class="bulle-titre">Le leasing, en bref</p>' +
        "<p>Vous utilisez l’appareil dès sa livraison et le réglez par mensualités, avec notre partenaire financier " + echap(LEASING.partenaire) + ".</p>" +
        "<ul><li>Trésorerie préservée : pas de gros décaissement à la commande</li><li>Mensualité connue dès le devis</li><li>Pour une entreprise, des loyers en charges</li></ul>" +
        "<p>Au terme du contrat : du matériel neuf en gardant votre mensualité, ou le rachat de l’appareil pour 1\u00a0% de son prix neuf.</p>" +
        '<a class="lien" href="' + url(LEASING.page) + '">Tout savoir sur le leasing</a>' +
      "</div></fieldset>";
  }
  function noteFin(f) {
    if (f.mode === "Achat") return "Votre devis indiquera le prix d’achat.";
    if (f.mode === "Leasing") return "Votre devis indiquera la mensualité sur " + f.duree + "\u00a0ans.";
    return "Votre devis indiquera le prix d’achat et la mensualité sur " + f.duree + "\u00a0ans, pour comparer.";
  }
  function majFin() {
    var f = lireFin();
    $$(".financement").forEach(function (fs) {
      $$(".segment:not(.petit) input", fs).forEach(function (i) { i.checked = i.value === f.mode; });
      $$(".petit input", fs).forEach(function (i) { i.checked = +i.value === f.duree; });
      $(".duree", fs).hidden = f.mode === "Achat";
      $(".financement-note", fs).textContent = noteFin(f) + (lireDemande().length && fs.getAttribute("data-lieu") === "composeur" ? " Ce choix vaut pour toute votre demande." : "");
      fs.classList.toggle("en-leasing", f.mode !== "Achat");
    });
  }
  function basculerBulle(b, ouvrir) {
    var bulle = doc.getElementById(b.getAttribute("aria-controls"));
    if (!bulle) return;
    b.setAttribute("aria-expanded", ouvrir ? "true" : "false"); bulle.hidden = !ouvrir;
  }
  doc.addEventListener("change", function (e) {
    var fs = e.target.closest && e.target.closest(".financement");
    if (!fs || e.target.type !== "radio") return;
    var f = lireFin(), avant = f.mode;
    if (e.target.closest(".petit")) f.duree = +e.target.value; else f.mode = e.target.value;
    ecrireFin(f);
    /* Premier passage au leasing : la bulle d'explication s'ouvre d'elle-même */
    if (avant === "Achat" && f.mode !== "Achat" && !fs.getAttribute("data-bulle-vue")) {
      fs.setAttribute("data-bulle-vue", "1"); basculerBulle($(".info-leasing", fs), true);
    }
  });
  doc.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".info-leasing");
    if (b) { e.preventDefault(); b.closest(".financement").setAttribute("data-bulle-vue", "1"); basculerBulle(b, b.getAttribute("aria-expanded") !== "true"); }
  });

  doc.body.insertAdjacentHTML("beforeend",
    '<div class="voile voile-demande" role="dialog" aria-modal="true" aria-labelledby="t-demande"><div class="fenetre">' +
    '<div class="fenetre-tete"><div><h2 id="t-demande">Ma demande de devis</h2><p style="color:var(--encre-2);margin-top:6px">Elle est transmise au technico-commercial du département de votre site.</p></div><button class="fermer" type="button" aria-label="Fermer">×</button></div>' +
    '<div class="recap-lignes"></div>' +
    '<div class="recap-fin">' + htmlFin("recap") + '</div>' +
    '<form class="formulaire" novalidate>' +
    '<div class="champ"><label for="d-nom">Nom</label><input id="d-nom" autocomplete="name" required></div>' +
    '<div class="champ"><label for="d-org">Société ou collectivité</label><input id="d-org" autocomplete="organization" required></div>' +
    '<div class="champ"><label for="d-mail">E-mail</label><input id="d-mail" type="email" autocomplete="email" required></div>' +
    '<div class="champ"><label for="d-tel">Téléphone</label><input id="d-tel" type="tel" autocomplete="tel"></div>' +
    '<div class="champ"><label for="d-dep">Département du site</label><input id="d-dep" maxlength="3" required></div>' +
    '<div class="champ"><label for="d-delai">Échéance</label><select id="d-delai"><option>Sans urgence</option><option>Sous un mois</option><option>Projet chiffré pour un marché</option></select></div>' +
    '<div class="champ large"><label for="d-msg">Précisions</label><textarea id="d-msg" placeholder="Point de mesure, accès, alimentation disponible…"></textarea></div>' +
    '<p class="retour" aria-live="polite"></p>' +
    '<button class="btn btn-rouge" type="submit">Envoyer la demande</button></form></div></div>');
  var voileD = $(".voile-demande"), dernierD = null;
  function dessinerRecap() {
    var l = lireDemande(), zoneL = $(".recap-lignes", voileD);
    zoneL.innerHTML = l.length ? l.map(function (x, i) {
      return '<div class="recap-ligne"><div><b>' + echap(x.produit) + "</b><span>" + echap(x.details.join(" · ")) + '</span></div><em>× ' + x.qte + '</em><button type="button" data-retirer="' + i + '" aria-label="Retirer ' + echap(x.produit) + '">×</button></div>';
    }).join("") : '<p class="recap-vide">Votre demande est vide. Composez-la depuis la fiche d’un appareil.</p>';
  }
  function ouvrirDemande(dep) {
    dessinerRecap(); majFin(); dernierD = doc.activeElement; voileD.classList.add("ouvert");
    var dd = $("#d-dep", voileD); if (dep && !dd.value) dd.value = dep;
    setTimeout(function () { var c = $("#d-nom", voileD); if (c) c.focus(); }, 60);
  }
  function fermerDemande() { if (voileD.classList.contains("ouvert")) { voileD.classList.remove("ouvert"); if (dernierD) dernierD.focus(); } }
  doc.addEventListener("click", function (e) {
    var b = e.target.closest("[data-ouvrir-demande]");
    if (b) { e.preventDefault(); var dep = $("#dep-fiche"); ouvrirDemande(dep && dep.value); }
  });
  voileD.addEventListener("click", function (e) {
    if (e.target === voileD || e.target.closest(".fermer")) fermerDemande();
    var r = e.target.closest("[data-retirer]");
    if (r) { var l = lireDemande(); l.splice(+r.getAttribute("data-retirer"), 1); ecrireDemande(l); dessinerRecap(); }
  });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") fermerDemande(); });
  $("form", voileD).addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, retour = $(".retour", f);
    if (!lireDemande().length) { retour.textContent = "Ajoutez d’abord un appareil depuis sa fiche."; return; }
    var manque = $$("[required]", f).filter(function (c) { return !c.value.trim() || !c.checkValidity(); })[0];
    if (manque) { retour.textContent = "Renseignez le champ «\u00a0" + $("label[for=" + manque.id + "]", f).textContent + "\u00a0»."; manque.focus(); return; }
    var r = secteurDe($("#d-dep", f).value);
    retour.textContent = "Demande prête (" + texteFin(lireFin()) + ")" + (r ? ", elle sera transmise à " + r.s.nom + " (" + r.s.zone + ")" : "") + ". Sur cette maquette, l’envoi n’est pas encore branché.";
  });
  majBadge();
  $$("[data-annee]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* Aller à un élément de la page (ancre), sous l'en-tête fixe */
  function allerA(id, doux) {
    var cible = id && doc.getElementById(id);
    if (!cible) return false;
    cible.scrollIntoView({ behavior: doux && !calme ? "smooth" : "auto", block: "start" });
    if (cible.classList.contains("app-carte")) {
      $$(".app-carte.repere").forEach(function (c) { c.classList.remove("repere"); });
      cible.classList.add("repere");
    }
    return true;
  }

  /* =========================================================
     Contenu de la page (relancé à chaque changement de page
     dans l'aperçu en un seul fichier)
     ========================================================= */
  function initPage(signal) {
  var O = signal ? { signal: signal } : {};
  var OP = signal ? { signal: signal, passive: true } : { passive: true };
  function finir(fn) { if (signal) signal.addEventListener("abort", fn); }

  /* ---------- Recherche d'appareil ---------- */
  $$(".recherche").forEach(function (bloc) {
    var champ = $("input", bloc), liste = $(".resultats", bloc), choix = -1, trouves = [];
    if (!liste) return;
    function afficher() {
      var q = norm(champ.value);
      if (q.length < 2) { liste.classList.remove("ouvert"); champ.setAttribute("aria-expanded", "false"); return; }
      var mots = q.split(" ");
      trouves = APPAREILS.filter(function (a) {
        var h = norm(a.nom + " " + a.type + " " + a.famille + " " + a.groupe);
        return mots.every(function (m) { return h.indexOf(m) > -1; });
      }).slice(0, 8);
      choix = -1;
      liste.innerHTML = trouves.length ? trouves.map(function (a, i) {
        return '<a role="option" id="res-' + i + '" href="' + a.url + '"><b>' + echap(a.nom) + "</b><span>" + echap(a.type) + "</span></a>";
      }).join("") : "<p>Aucun appareil ne correspond. Votre interlocuteur peut vous orienter : " + echap(win.CONTACT.tel) + ".</p>";
      liste.classList.add("ouvert"); champ.setAttribute("aria-expanded", "true");
    }
    function marquer() {
      $$("a", liste).forEach(function (a, i) { a.setAttribute("aria-selected", i === choix); });
      champ.setAttribute("aria-activedescendant", choix > -1 ? "res-" + choix : "");
    }
    champ.addEventListener("input", afficher);
    champ.addEventListener("focus", afficher);
    champ.addEventListener("keydown", function (e) {
      if (!liste.classList.contains("ouvert") || !trouves.length) return;
      if (e.key === "ArrowDown") { choix = Math.min(choix + 1, trouves.length - 1); marquer(); e.preventDefault(); }
      if (e.key === "ArrowUp") { choix = Math.max(choix - 1, 0); marquer(); e.preventDefault(); }
      if (e.key === "Enter" && choix > -1) { win.location.href = trouves[choix].url; e.preventDefault(); }
    });
    bloc.addEventListener("submit", function (e) {
      e.preventDefault();
      if (trouves[0]) win.location.href = trouves[Math.max(choix, 0)].url;
    });
    doc.addEventListener("click", function (e) { if (!bloc.contains(e.target)) liste.classList.remove("ouvert"); }, O);
  });

  /* ---------- Familles (accueil) : schémas de principe animés quand ils sont à l'écran ---------- */
  var listesTech = $$(".techs");
  if (listesTech.length) {
    if ("IntersectionObserver" in win && !calme) {
      var ioT = new IntersectionObserver(function (en) {
        en.forEach(function (x) { x.target.classList.toggle("anim", x.isIntersecting); });
      }, { rootMargin: "60px 0px" });
      listesTech.forEach(function (l) { ioT.observe(l); });
      finir(function () { ioT.disconnect(); });
    }
  }

  /* ---------- Le parcours de l'eau (accueil) ---------- */
  var parcours = $(".parcours");
  if (parcours) {
    var piste = $(".piste", parcours), epingle = $(".parcours-epingle", parcours);
    piste.innerHTML = win.TERRAINS.map(function (t, i) {
      return '<article class="terrain" id="t-' + t.id + '">' +
        '<div class="terrain-photo"><img src="' + win.PHOTO(t.photo, 1400) + '" alt="" loading="' + (i < 2 ? "eager" : "lazy") + '"></div>' +
        '<div class="terrain-texte">' + (t.badge ? '<p class="terrain-badge">' + echap(t.badge) + "</p>" : "") + "<h3>" + echap(t.nom) + "</h3><p>" + echap(t.texte) + "</p><ul>" +
        t.appareils.map(function (n) { var a = parNom[n]; return '<li><a href="' + (a ? a.url : "#") + '">' + echap(n) + "</a></li>"; }).join("") +
        '</ul><a class="lien" href="' + url(CATALOGUE) + '">Tous les appareils</a></div></article>';
    }).join("") + '<div class="piste-fin" aria-hidden="true"></div>';
    var etapes = $(".etapes-eau", parcours);
    etapes.innerHTML = win.TERRAINS.map(function (t, i) { return '<button type="button" data-i="' + i + '">' + echap(t.court) + "</button>"; }).join("") +
      '<span class="boucle" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M15 6.5A6.5 6.5 0 1 0 16.5 11"/><path d="M15.5 2.5v4h-4"/></svg>Retour au réseau</span>';
    var cheminFond = $(".ligne-eau .fond", parcours), cheminPlein = $(".ligne-eau .plein", parcours), bouee = $(".ligne-eau .bouee", parcours), svgLigne = $(".ligne-eau svg", parcours);
    var terrains = $$(".terrain", piste), boutons = $$("button", etapes);
    var decalageMax = 0, longueur = 0, actifPrec = -1, horizontal = false;

    function dessinerLigne() {
      var w = svgLigne.clientWidth || 1000, h = 48, n = 7, d = "M0 " + h / 2;
      for (var i = 0; i < n; i++) {
        var x0 = w * i / n, x1 = w * (i + 1) / n, xm = (x0 + x1) / 2;
        d += " Q" + (x0 + (xm - x0) / 2) + " " + (h / 2 - 10) + " " + xm + " " + h / 2 + " T" + x1 + " " + h / 2;
      }
      svgLigne.setAttribute("viewBox", "0 0 " + w + " " + h);
      cheminFond.setAttribute("d", d); cheminPlein.setAttribute("d", d);
      longueur = cheminPlein.getTotalLength();
      cheminPlein.style.strokeDasharray = longueur;
    }
    function mesurer() {
      horizontal = !win.matchMedia("(max-width:900px),(max-height:560px),(prefers-reduced-motion:reduce)").matches;
      if (!horizontal) { parcours.style.height = ""; piste.style.transform = ""; terrains.forEach(function (t) { t.classList.add("actif"); }); return; }
      decalageMax = Math.max(0, piste.scrollWidth - win.innerWidth);
      parcours.style.height = (epingle.offsetHeight + decalageMax) + "px";
      dessinerLigne(); maj();
    }
    function progression() {
      var haut = parcours.getBoundingClientRect().top + win.scrollY - (entete ? entete.offsetHeight : 0);
      var p = (win.scrollY - haut) / Math.max(1, decalageMax);
      return Math.min(1, Math.max(0, p));
    }
    function maj() {
      if (!horizontal) return;
      var p = progression();
      piste.style.transform = "translate3d(" + (-p * decalageMax).toFixed(1) + "px,0,0)";
      cheminPlein.style.strokeDashoffset = longueur * (1 - p);
      var pt = cheminPlein.getPointAtLength(longueur * p);
      bouee.setAttribute("cx", pt.x); bouee.setAttribute("cy", pt.y);
      var actif = Math.min(terrains.length - 1, Math.round(p * (terrains.length - 1)));
      if (actif !== actifPrec) {
        terrains.forEach(function (t, i) { t.classList.toggle("actif", i === actif); });
        boutons.forEach(function (b, i) { b.classList.toggle("actif", i === actif); });
        actifPrec = actif;
      }
    }
    boutons.forEach(function (b) {
      b.addEventListener("click", function () {
        var i = +b.getAttribute("data-i");
        var haut = parcours.getBoundingClientRect().top + win.scrollY - (entete ? entete.offsetHeight : 0);
        win.scrollTo({ top: haut + decalageMax * i / (terrains.length - 1), behavior: calme ? "auto" : "smooth" });
      });
    });
    var enAttente = false;
    win.addEventListener("scroll", function () { if (!enAttente) { enAttente = true; requestAnimationFrame(function () { enAttente = false; maj(); }); } }, OP);
    win.addEventListener("resize", mesurer, O);
    win.addEventListener("load", mesurer, O);
    mesurer(); setTimeout(mesurer, 400);
  }

  /* ---------- Héros : l'eau en mouvement (WebGL) ---------- */
  var heros = $(".heros-media");
  if (heros && !calme) {
    var imgHeros = $("img", heros), toile = $("canvas", heros);
    var gl = toile.getContext("webgl", { premultipliedAlpha: false, antialias: false });
    if (gl) {
      var source = new Image(); source.crossOrigin = "anonymous"; source.src = imgHeros.currentSrc || imgHeros.src;
      source.onload = function () { if (signal && signal.aborted) return; try { demarrerGL(source); } catch (e) { /* image non autorisée ou WebGL indisponible : la photo fixe reste */ if (win.console) console.warn("Héros animé désactivé :", e.message); } };
    }
  }
  function demarrerGL(image) {
    function shader(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var vs = "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
    var fs = [
      "precision mediump float;",
      "uniform sampler2D tx;uniform vec2 r;uniform vec2 ir;uniform float tm;uniform vec2 m;uniform float mi;varying vec2 v;",
      "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
      "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}",
      "vec2 cover(vec2 uv){float ra=r.x/r.y,ia=ir.x/ir.y;vec2 s=ra>ia?vec2(1.,ia/ra):vec2(ra/ia,1.);return (uv-.5)*s/1.04+.5;}",
      "void main(){",
      " vec2 c=cover(v);float t=tm*.11;",
      " vec3 base=texture2D(tx,c).rgb;float lum=dot(base,vec3(.299,.587,.114));float masque=mix(.25,1.,smoothstep(.35,.85,lum));",
      " vec2 q=vec2(n(c*vec2(9.,3.5)+vec2(0.,-t*2.2)),n(c*vec2(9.,3.5)+vec2(5.2,-t*2.2+1.7)));",
      " vec2 q2=vec2(n(c*vec2(22.,8.)+vec2(0.,-t*4.)),n(c*vec2(22.,8.)+vec2(3.1,-t*4.)));",
      " vec2 d=((q-.5)*.009+(q2-.5)*.004)*masque;",
      " vec2 dm=(c-m)*vec2(r.x/r.y,1.);float l=length(dm);",
      " d+=normalize(dm+1e-5)*sin(l*70.-tm*5.)*exp(-l*10.)*.005*mi;",
      " gl_FragColor=vec4(texture2D(tx,c+d).rgb,1.);",
      "}"
    ].join("\n");
    var prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog); gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); });
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    var U = {}; ["r", "ir", "tm", "m", "mi"].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
    gl.uniform2f(U.ir, image.naturalWidth, image.naturalHeight);
    var toile = $(".heros-media canvas"), zone = $(".heros");
    var mx = .5, my = .5, cible = 0, inten = 0, visible = true, t0 = performance.now();
    function taille() {
      var dpr = Math.min(win.devicePixelRatio || 1, 1.75);
      toile.width = Math.round(toile.clientWidth * dpr); toile.height = Math.round(toile.clientHeight * dpr);
      gl.viewport(0, 0, toile.width, toile.height); gl.uniform2f(U.r, toile.width, toile.height);
    }
    taille(); win.addEventListener("resize", taille, O);
    zone.addEventListener("pointermove", function (e) {
      var b = toile.getBoundingClientRect(); mx = (e.clientX - b.left) / b.width; my = 1 - (e.clientY - b.top) / b.height; cible = 1;
    });
    zone.addEventListener("pointerleave", function () { cible = 0; });
    var ioGL = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }); ioGL.observe(zone);
    var arret = false;
    finir(function () { arret = true; ioGL.disconnect(); var ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); });
    function image_() {
      if (arret) return;
      if (visible) {
        inten += (cible - inten) * .05;
        gl.uniform1f(U.tm, (performance.now() - t0) / 1000);
        gl.uniform2f(U.m, mx, my); gl.uniform1f(U.mi, inten);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      requestAnimationFrame(image_);
    }
    image_(); toile.classList.add("pret");
  }

  /* ---------- Apparitions au défilement ---------- */
  if ("IntersectionObserver" in win && !calme) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("vu"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".leve").forEach(function (el) { io.observe(el); });
    finir(function () { io.disconnect(); });
  } else { $$(".leve").forEach(function (el) { el.classList.add("vu"); }); }

  /* ---------- Carte des secteurs ---------- */
  var carte = $("#carte");
  var listeSecteurs = $("#secteurs");
  var icone = {
    tel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    rdv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'
  };
  function lienContact(s) {
    return '<a href="' + win.CONTACT.telLien + '" aria-label="Appeler ' + echap(s.nom) + '">' + icone.tel + "</a>" +
      '<a href="mailto:' + win.CONTACT.mail + "?subject=" + encodeURIComponent("Demande pour " + s.nom) + '" aria-label="Écrire à ' + echap(s.nom) + '">' + icone.mail + "</a>" +
      '<a href="' + win.CONTACT.rdv + '" target="_blank" rel="noopener" aria-label="Prendre rendez-vous en visio">' + icone.rdv + "</a>";
  }
  if (listeSecteurs) {
    listeSecteurs.innerHTML = win.SECTEURS.map(function (s) {
      return '<li class="secteur" data-s="' + s.id + '"><i style="background:' + s.couleur + '"></i><div><b>' + echap(s.nom) + "</b><span>" + echap(s.zone) + '</span></div><div class="actions">' + lienContact(s) + "</div></li>";
    }).join("");
  }
  var bulle = $(".bulle");
  function choisirSecteur(r) {
    var svg = carte && $("svg", carte);
    $$(".secteur").forEach(function (li) { li.classList.toggle("choisi", !!r && li.getAttribute("data-s") === r.s.id); });
    if (svg) {
      svg.classList.toggle("focus", !!r);
      $$("path", svg).forEach(function (p) {
        p.classList.toggle("on", !!r && p.classList.contains("s-" + r.s.id));
        p.classList.toggle("dep-sel", !!r && p.getAttribute("data-dep") === r.d);
      });
    }
    var msg = $("#dep-message");
    if (msg) msg.textContent = r ? "Département " + r.d + " : " + r.s.nom + ", " + r.s.zone + "." : "";
  }
  if (carte && win.FRANCE) {
    var F = win.FRANCE;
    carte.insertAdjacentHTML("afterbegin", '<svg viewBox="0 0 ' + F.w + " " + F.h + '" role="img" aria-label="Carte des secteurs commerciaux COMETEC par département">' +
      Object.keys(F.d).map(function (code) {
        var s = (depVersSecteur[code] || secteurDefaut);
        return '<path class="s-' + s.id + '" data-dep="' + code + '" d="' + F.d[code].p + '"><title>' + code + " " + echap(F.d[code].n) + " : " + echap(s.nom) + "</title></path>";
      }).join("") + "</svg>");
    var svgC = $("svg", carte);
    svgC.addEventListener("mousemove", function (e) {
      var p = e.target.closest("path"); if (!p) { bulle.classList.remove("vu"); return; }
      var code = p.getAttribute("data-dep"), s = depVersSecteur[code] || secteurDefaut, b = carte.getBoundingClientRect();
      bulle.innerHTML = "<b>" + code + " " + echap(F.d[code].n) + "</b><br>" + echap(s.nom);
      bulle.style.left = (e.clientX - b.left) + "px"; bulle.style.top = (e.clientY - b.top) + "px"; bulle.classList.add("vu");
    });
    svgC.addEventListener("mouseleave", function () { bulle.classList.remove("vu"); });
    svgC.addEventListener("click", function (e) {
      var p = e.target.closest("path"); if (!p) return;
      var r = secteurDe(p.getAttribute("data-dep")); choisirSecteur(r);
      var champ = $("#dep"); if (champ) champ.value = r.d;
    });
  }
  $$("[data-dep-champ]").forEach(function (champ) {
    var cible = champ.getAttribute("data-dep-champ");
    champ.addEventListener("input", function () {
      var r = secteurDe(champ.value);
      if (cible === "carte") choisirSecteur(r);
      else majInterloc(r);
    });
  });

  /* Bloc interlocuteur de la fiche appareil */
  function majInterloc(r) {
    var res = $("#interloc-res"); if (!res) return;
    res.innerHTML = r ? "<b>" + echap(r.s.nom) + "</b><span>Technico-commercial " + echap(r.s.zone) + "</span>" +
      '<div class="actions"><a class="btn btn-clair" href="' + win.CONTACT.telLien + '">Appeler</a><a class="btn btn-trait" href="' + win.CONTACT.rdv + '" target="_blank" rel="noopener">Rendez-vous en visio</a></div>'
      : "<span>Saisissez le numéro de département de votre site.</span>";
  }

  /* ---------- Sous-navigation de la fiche ---------- */
  var sousNav = $$(".sous-nav a[href^='#'], .onglets a[href^='#']");
  if (sousNav.length && "IntersectionObserver" in win) {
    var parId = {}; sousNav.forEach(function (a) { parId[a.getAttribute("href").slice(1)] = a; });
    var ioNav = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (e.isIntersecting) { sousNav.forEach(function (a) { a.classList.remove("actif"); }); var a = parId[e.target.id]; if (a) a.classList.add("actif"); }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    Object.keys(parId).forEach(function (id) { var s = doc.getElementById(id); if (s) ioNav.observe(s); });
    finir(function () { ioNav.disconnect(); });
  }

  /* ---------- Demande de devis ---------- */
  var voile = $(".voile:not(.voile-demande):not(.voile-acces)");
  etat.fermerDevis = fermerDevis;
  function fermerDevis() { if (voile && voile.classList.contains("ouvert")) { voile.classList.remove("ouvert"); if (dernierFocus) dernierFocus.focus(); } }
  var dernierFocus = null;
  var composeur = $(".composeur");
  $$("[data-financement]").forEach(function (z) { if (!z.firstChild) z.innerHTML = htmlFin(z.getAttribute("data-financement")); });
  majFin();
  if (composeur) {
    var qte = $("#c-qte", composeur), retourC = $(".composeur-retour", composeur);
    $$("[data-qte]", composeur).forEach(function (b) {
      b.addEventListener("click", function () { qte.value = Math.max(1, (parseInt(qte.value, 10) || 1) + (+b.getAttribute("data-qte"))); });
    });
    composeur.addEventListener("submit", function (e) {
      e.preventDefault();
      var vide = $$("select", composeur).filter(function (s) { return !s.value; })[0];
      if (vide) { retourC.textContent = "Choisissez : " + $("label[for=" + vide.id + "]", composeur).textContent.toLowerCase() + "."; vide.focus(); return; }
      var details = $$("select", composeur).map(function (s) { return s.value; });
      $$("input[type=checkbox]:checked", composeur).forEach(function (c) { details.push(c.value); });
      var l = lireDemande();
      l.push({ produit: composeur.getAttribute("data-produit"), details: details, qte: Math.max(1, parseInt(qte.value, 10) || 1) });
      ecrireDemande(l);
      retourC.textContent = "Ajouté à votre demande.";
      setTimeout(function () { retourC.textContent = ""; }, 2600);
    });
    majBadge();
    var barre = $(".barre-devis"), panneauD = doc.getElementById("devis");
    if (barre && panneauD && "IntersectionObserver" in win) {
      var ioB = new IntersectionObserver(function (en) { barre.classList.toggle("cachee", en[0].isIntersecting); }, { threshold: .15 });
      ioB.observe(panneauD); finir(function () { ioB.disconnect(); });
    }
  }
  $$("[data-devis]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      if (!voile) {
        var panneau = doc.getElementById("devis");
        if (panneau) { panneau.scrollIntoView({ behavior: calme ? "auto" : "smooth", block: "start" }); var c = $("select, input", panneau); if (c) setTimeout(function () { c.focus({ preventScroll: true }); }, 400); }
        return;
      }
      dernierFocus = b; voile.classList.add("ouvert");
      setTimeout(function () { var c = $("input,select", voile); if (c) c.focus(); }, 60);
    });
  });
  if (voile) {
    voile.addEventListener("click", function (e) { if (e.target === voile || e.target.closest(".fermer")) fermerDevis(); });
    var form = $("form", voile);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var retour = $(".retour", form), manque = $$("[required]", form).filter(function (c) { return !c.value.trim() || !c.checkValidity(); })[0];
      if (manque) { retour.textContent = "Renseignez le champ « " + $("label[for=" + manque.id + "]", form).textContent + " »."; manque.focus(); return; }
      var r = secteurDe($("#f-dep", form).value);
      retour.textContent = "Demande prête (" + texteFin(lireFin()) + ")" + (r ? ", elle sera transmise à " + r.s.nom + " (" + r.s.zone + ")" : "") + ". Sur cette maquette, l’envoi n’est pas encore branché.";
    });
  }


  /* ---------- Fiche TORPEE-MAG : votre conduite ---------- */
  var curseur = $("#dn");
  if (curseur) {
    var svgDn = $(".dn-coupe svg"), tuyau = $(".tuyau", svgDn), isos = $$(".iso", svgDn), canne = $(".canne", svgDn), groupe = $(".elecs", svgDn), txt = $(".dn-txt", svgDn), cote = $(".cote", svgDn);
    var res = $("#dn-res"), val = $("#dn-val");
    function paires15(dn) { return dn <= 150 ? 2 : dn <= 250 ? 3 : dn <= 1500 ? 5 : 0; }
    function paires2(dn) { return dn < 1000 ? 0 : dn <= 1450 ? 5 : 7; }
    function majDn() {
      var dn = +curseur.value, p15 = paires15(dn), p2 = paires2(dn);
      var r = 46 + 124 * Math.log(dn / 100) / Math.log(25);
      val.textContent = dn;
      curseur.style.setProperty("--p", ((dn - 100) / 2400 * 100) + "%");
      tuyau.setAttribute("r", r);
      isos.forEach(function (c, i) { c.setAttribute("r", r * (0.75 - i * 0.25)); });
      canne.setAttribute("y", -r - 36); canne.setAttribute("height", 2 * r + 36 - r * 0.06);
      cote.setAttribute("x1", -r); cote.setAttribute("x2", r); cote.setAttribute("y1", r + 22); cote.setAttribute("y2", r + 22);
      txt.setAttribute("y", r + 42); txt.textContent = "DN " + dn;
      var n = dn > 1000 && dn <= 1500 ? p15 : (p15 || p2), lignes = "";
      var html = "";
      for (var i = 0; i < n; i++) {
        var y = -r * 0.84 + (1.68 * r) * (i + .5) / n;
        html += '<circle class="elec" cx="0" cy="' + y.toFixed(1) + '" r="5.5"/>';
      }
      groupe.innerHTML = html;
      if (dn <= 1000) {
        lignes += "<div><dt>Sonde</dt><dd>1½″</dd></div><div><dt>Paires d’électrodes</dt><dd>" + p15 + "</dd></div><div><dt>Vanne</dt><dd>1½″, sur piquage</dd></div>";
      } else if (dn <= 1500) {
        lignes += "<div><dt>Sonde</dt><dd>1½″<em>2″ si les vitesses sont élevées</em></dd></div><div><dt>Paires d’électrodes</dt><dd>" + p15 + " en 1½″<em>" + p2 + " en 2″</em></dd></div><div><dt>Vanne</dt><dd>1½″ ou 2″ selon la sonde, sur piquage</dd></div>";
      } else {
        lignes += "<div><dt>Sonde</dt><dd>2″</dd></div><div><dt>Paires d’électrodes</dt><dd>" + p2 + "</dd></div><div><dt>Vanne</dt><dd>2″, sur piquage</dd></div>";
      }
      res.innerHTML = lignes;
    }
    curseur.addEventListener("input", majDn); majDn();
  }
  var choixDn = $("#f-dn");
  if (choixDn) { for (var d = 100; d <= 2500; d += 50) choixDn.insertAdjacentHTML("beforeend", "<option>DN " + d + "</option>"); choixDn.insertAdjacentHTML("beforeend", "<option>Au-delà du DN 2500</option>"); }


  /* ---------- Page Appareils (catalogue) ---------- */
  var catalogue = $("#catalogue");
  if (catalogue) {
    var picto = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="8" y="12" width="32" height="26" rx="3"/><circle cx="24" cy="25" r="7"/><path d="M17 12l3-5h8l3 5"/></svg>';
    var parTerrain = {};
    (win.TERRAINS || []).forEach(function (t) { t.appareils.forEach(function (n) { (parTerrain[n] = parTerrain[n] || []).push(t.id); }); });
    catalogue.innerHTML = win.FAMILLES.map(function (f) {
      var n = 0; f.groupes.forEach(function (g) { n += g.items.length; });
      return '<section class="cat-famille" id="' + f.id + '" data-famille="' + f.id + '"><div class="conteneur">' +
        '<div class="cat-famille-tete"><h2>' + echap(f.nom) + "<small>" + n + "\u00a0appareil" + (n > 1 ? "s" : "") + "</small></h2><p>" + echap(f.desc) + "</p></div>" +
        f.groupes.map(function (g) {
          return '<div class="cat-groupe">' + (f.groupes.length > 1 ? "<h3>" + echap(g.nom) + "</h3>" : "") + '<div class="grille-app">' +
            g.items.map(function (it) {
              var v = win.VISUELS && win.VISUELS[it[0]], slug = slugDe(it[0]);
              var visuel = v
                ? '<div class="app-visuel"><img class="produit" src="' + img(v[0]) + '" alt="' + echap(it[0]) + '" loading="lazy">' +
                  (v[1] ? '<img class="situ" src="' + img(v[0] + "-situ") + '" alt="" loading="lazy"><span class="situ-etiquette">Sur le terrain</span>' : "") + "</div>"
                : '<div class="app-visuel attente"><div>' + picto + "Photo à venir</div></div>";
              return '<a class="app-carte' + (v && !v[1] ? " sans-situ" : "") + '" id="a-' + slug + '" href="' + (it[2] ? url(it[2]) : "#a-" + slug) + '" data-app="' + echap(it[0]) + '" data-nom="' + echap(norm(it[0] + " " + it[1] + " " + g.nom + " " + f.nom)) + '" data-terrains="' + (parTerrain[it[0]] || []).join(" ") + '">' +
                visuel + '<div class="app-texte"><b>' + echap(it[0]) + "</b><span>" + echap(it[1]) + "</span>" + (it[2] ? "<em>Voir la fiche</em>" : "") + '<i aria-hidden="true">→</i></div></a>';
            }).join("") + "</div></div>";
        }).join("") + "</div></section>";
    }).join("") + '<div class="conteneur"><p class="cat-vide" hidden>Aucun appareil ne correspond. Votre interlocuteur peut vous orienter\u00a0: ' + echap(win.CONTACT.tel) + ".</p></div>";

    var filtreFam = "tous", filtreTer = "", texte = "", principe = null;
    /* Arrivée depuis l'accueil par un principe de mesure : appareils/index.html?principe=radar */
    try {
      var pid = new URLSearchParams(win.location.search).get("principe");
      if (pid && win.PRINCIPES && win.PRINCIPES[pid]) { principe = win.PRINCIPES[pid]; filtreFam = principe.famille; }
    } catch (e) {}
    var bandeauP = null;
    function majBandeauPrincipe() {
      if (bandeauP) { bandeauP.remove(); bandeauP = null; }
      if (!principe) return;
      catalogue.insertAdjacentHTML("beforebegin", '<div class="conteneur principe-actif-cont"><div class="principe-actif" role="status"><span>Principe de mesure</span><b>' + echap(principe.nom) + '</b><button type="button">Voir toute la famille</button></div></div>');
      bandeauP = catalogue.previousElementSibling;
      $("button", bandeauP).addEventListener("click", function () {
        principe = null; majBandeauPrincipe(); appliquer();
        try { win.history.replaceState(null, "", win.location.pathname + win.location.hash); } catch (e) {}
      });
    }
    var champCat = $("#q-cat"), compte = $(".filtre-compte");
    function appliquer() {
      var mots = norm(texte).split(" ").filter(Boolean), total = 0;
      $$(".cat-famille", catalogue).forEach(function (sec) {
        var visFam = filtreFam === "tous" || sec.getAttribute("data-famille") === filtreFam, nSec = 0;
        $$(".cat-groupe", sec).forEach(function (gr) {
          var nGr = 0;
          $$(".app-carte", gr).forEach(function (c) {
            var ok = visFam && (!principe || principe.appareils.indexOf(c.getAttribute("data-app")) > -1) && (!filtreTer || (" " + c.getAttribute("data-terrains") + " ").indexOf(" " + filtreTer + " ") > -1) &&
              mots.every(function (m) { return c.getAttribute("data-nom").indexOf(m) > -1; });
            c.hidden = !ok; if (ok) nGr++;
          });
          gr.hidden = nGr === 0; nSec += nGr;
        });
        sec.hidden = nSec === 0; total += nSec;
      });
      if (compte) compte.textContent = total + "\u00a0appareil" + (total > 1 ? "s" : "");
      $(".cat-vide", catalogue).hidden = total > 0;
    }
    $$(".filtre[data-famille]").forEach(function (b) {
      b.addEventListener("click", function () {
        filtreFam = b.getAttribute("data-famille");
        $$(".filtre[data-famille]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
        if (principe) { principe = null; majBandeauPrincipe(); }
        appliquer();
      });
    });
    var selTer = $("#f-terrain");
    if (selTer) selTer.addEventListener("change", function () { filtreTer = selTer.value; selTer.classList.toggle("actif", !!filtreTer); appliquer(); });
    if (champCat) champCat.addEventListener("input", function () { texte = champCat.value; appliquer(); });
    var formCat = champCat && champCat.closest("form");
    if (formCat) formCat.addEventListener("submit", function (e) { e.preventDefault(); });
    if (principe) {
      $$(".filtre[data-famille]").forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-famille") === filtreFam); });
      majBandeauPrincipe();
    }
    appliquer();
    /* Arrivée par une ancre (site en fichiers séparés) : famille ou appareil */
    if (!win.ROUTEUR) {
      var ancre = decodeURIComponent((win.location.hash || "").slice(1));
      if (ancre) setTimeout(function () { allerA(ancre); }, 60);
    }
  }

  /* ---------- Page Leasing : schéma achat / leasing selon la durée ---------- */
  var schemaFin = $(".fin-schema");
  if (schemaFin) {
    var zoneD = $("[data-fin-durees]", schemaFin), barresL = $(".fin-leasing", schemaFin);
    zoneD.innerHTML = LEASING.durees.map(function (a, i) {
      return '<label><input type="radio" name="fin-schema" value="' + a + '"' + (i === 0 ? " checked" : "") + "><span>" + a + "\u00a0ans</span></label>";
    }).join("");
    var dessinerFin = function (ans) {
      var n = ans * 12, h = Math.round(36 / n * 30 * 10) / 10, barres = "";
      for (var i = 0; i < n; i++) barres += '<i style="--i:' + i + '"></i>';
      barresL.style.setProperty("--h", h + "%");
      barresL.innerHTML = barres;
      $(".fin-n", schemaFin).textContent = n + "\u00a0mensualités";
      $(".fin-terme", schemaFin).textContent = "Fin du contrat · " + ans + "\u00a0ans";
      schemaFin.classList.remove("trace"); void schemaFin.offsetWidth; schemaFin.classList.add("trace");
    };
    zoneD.addEventListener("change", function (e) { dessinerFin(+e.target.value); }, O);
    dessinerFin(LEASING.durees[0]);
  }

  /* ---------- Fiche : galerie ---------- */
  $$(".galerie").forEach(function (gal) {
    var images = $$(".galerie-scene img", gal), legende = $(".galerie-scene figcaption", gal);
    $$(".galerie-vignettes button", gal).forEach(function (b, i) {
      b.addEventListener("click", function () {
        images.forEach(function (im, k) { im.classList.toggle("vu", k === i); });
        $$(".galerie-vignettes button", gal).forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
        if (legende) legende.textContent = b.getAttribute("data-legende") || "";
      });
    });
  });

  /* ---------- Fiche RAVEN-EYE : section mouillée et débit ---------- */
  var outil = $("#outil-section");
  if (outil) {
    var selD = $("#o-diam", outil), rH = $("#o-h", outil), rV = $("#o-v", outil);
    var eau = $(".eau", outil), surf = $(".surface", outil), cotH = $(".cote-h", outil), txtH = $(".txt-h", outil), coupe = $(".coupe-radar", outil);
    var R = 120, CX = 200, CY = 210;
    var fmt = function (x, d) { return x.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }); };
    function majOutil() {
      var D = +selD.value / 1000, ratio = +rH.value / 100, v = +rV.value / 100;
      var r = D / 2, h = Math.min(D, Math.max(0, ratio * D));
      var A = r * r * Math.acos((r - h) / r) - (r - h) * Math.sqrt(Math.max(0, 2 * r * h - h * h));
      var Q = A * v;
      $("#o-h-val", outil).textContent = fmt(h * 1000, 0) + "\u00a0mm";
      $("#o-v-val", outil).textContent = fmt(v, 2) + "\u00a0m/s";
      rH.style.setProperty("--p", (+rH.value) + "%"); rV.style.setProperty("--p", ((+rV.value - +rV.min) / (+rV.max - +rV.min) * 100) + "%");
      $("#o-a", outil).textContent = fmt(A, 3) + "\u00a0m²";
      $("#o-q", outil).textContent = fmt(Q * 1000, 1) + "\u00a0l/s";
      $("#o-qh", outil).textContent = fmt(Q * 3600, 0) + "\u00a0m³/h";
      /* dessin : segment d'eau dans le cercle */
      var y = CY + R - ratio * 2 * R, dx = Math.sqrt(Math.max(0, R * R - (y - CY) * (y - CY)));
      var grand = ratio > .5 ? 1 : 0;
      eau.setAttribute("d", ratio <= 0 ? "" : ratio >= 1 ? "M" + (CX - R) + " " + CY + "a" + R + " " + R + " 0 1 0 " + 2 * R + " 0a" + R + " " + R + " 0 1 0 -" + 2 * R + " 0Z"
        : "M" + (CX - dx) + " " + y + "A" + R + " " + R + " 0 " + grand + " 0 " + (CX + dx) + " " + y + "Z");
      surf.setAttribute("x1", CX - dx); surf.setAttribute("x2", CX + dx); surf.setAttribute("y1", y); surf.setAttribute("y2", y);
      cotH.setAttribute("y1", y); txtH.setAttribute("y", (y + CY + R) / 2 + 4);
      var faisceau = $(".faisceau", outil);
      faisceau.setAttribute("points", "184,58 216,58 " + (CX + Math.min(dx, 60)) + "," + y + " " + (CX - Math.min(dx, 60)) + "," + y);
      var plein = ratio >= .9;
      outil.classList.toggle("en-charge", plein); coupe.classList.toggle("en-charge", plein);
    }
    [selD, rH, rV].forEach(function (el) { el.addEventListener("input", majOutil); });
    majOutil();
  }

  /* ---------- Fiche RAVEN-EYE : montages ---------- */
  var onglets = $$(".montages-onglets [role=tab]");
  onglets.forEach(function (b) {
    b.addEventListener("click", function () {
      onglets.forEach(function (x) {
        var sel = x === b; x.setAttribute("aria-selected", sel); x.tabIndex = sel ? 0 : -1;
        doc.getElementById(x.getAttribute("aria-controls")).hidden = !sel;
      });
    });
    b.addEventListener("keydown", function (e) {
      var i = onglets.indexOf(b);
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { onglets[(i + 1) % onglets.length].click(); onglets[(i + 1) % onglets.length].focus(); e.preventDefault(); }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") { onglets[(i - 1 + onglets.length) % onglets.length].click(); onglets[(i - 1 + onglets.length) % onglets.length].focus(); e.preventDefault(); }
    });
  });


  /* ---------- Page Application : accès au téléchargement ---------- */
  var voileA = $(".voile-acces");
  if (voileA) {
    var formA = $("#acces-form", voileA), liensA = $("#acces-liens", voileA), etiquette = $(".acces-plateforme", voileA), dernierA = null;
    var dejaInscrit = false;
    try { dejaInscrit = !!win.localStorage.getItem("cometec-appli-acces"); } catch (e) {}
    function ouvrirA(plateforme) {
      dernierA = doc.activeElement;
      etiquette.textContent = plateforme ? "Version choisie : " + plateforme : "";
      etiquette.hidden = !plateforme;
      formA.hidden = dejaInscrit; liensA.hidden = !dejaInscrit;
      voileA.classList.add("ouvert");
      setTimeout(function () { var c = dejaInscrit ? $("a", liensA) : $("input", formA); if (c) c.focus(); }, 60);
    }
    function fermerA() { if (voileA.classList.contains("ouvert")) { voileA.classList.remove("ouvert"); if (dernierA) dernierA.focus(); } }
    $$("[data-acces]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); ouvrirA(b.getAttribute("data-acces")); });
    });
    voileA.addEventListener("click", function (e) { if (e.target === voileA || e.target.closest(".fermer")) fermerA(); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") fermerA(); }, O);
    formA.addEventListener("submit", function (e) {
      e.preventDefault();
      var retour = $(".retour", formA);
      var manque = $$("input[required]", formA).filter(function (c) { return c.type === "checkbox" ? !c.checked : (!c.value.trim() || !c.checkValidity()); })[0];
      if (manque) {
        retour.textContent = manque.type === "checkbox" ? "Cochez l’accord pour accéder au téléchargement." : "Renseignez le champ « " + $("label[for=" + manque.id + "]", formA).textContent + " ».";
        manque.focus(); return;
      }
      try { win.localStorage.setItem("cometec-appli-acces", "1"); } catch (e2) {}
      dejaInscrit = true;
      formA.hidden = true; liensA.hidden = false;
      var l = $("a", liensA); if (l) l.focus();
    });
  }
  } /* fin initPage */

  if (win.ROUTEUR) win.ROUTEUR.demarrer(function (signal) { fermerMegas(); fermerTiroir(); initPage(signal); }, allerA);
  else initPage(null);
})();
