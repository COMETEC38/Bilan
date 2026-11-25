/* =========================================================
   COMETEC — données du site (maquette)
   Un seul endroit pour le catalogue, les terrains et les secteurs.
   En production, ces données seront des fichiers par appareil.
   ========================================================= */

/* Photos d'illustration provisoires : Unsplash, licence libre (usage commercial, sans attribution).
   À remplacer par les photos COMETEC et à héberger sur le serveur du site avant la mise en ligne. */
window.PHOTO = function (id, w) {
  return "https://images.unsplash.com/" + id + "?auto=format&fit=crop&w=" + (w || 1600) + "&q=72";
};

window.FAMILLES = [
  {
    id: "debitmetres", nom: "Débitmètres", desc: "Surface libre, canal de comptage, conduite en charge et cours d’eau.",
    photo: "photo-1585793451936-e321aa5efb24",
    groupes: [
      { nom: "Hauteur-vitesse", items: [
        ["RAVEN-EYE", "Débitmètre hauteur-vitesse radar sans contact", "appareils/raven-eye.html"],
        ["BELUGA", "Débitmètre Doppler hauteur-vitesse", "appareils/beluga.html"],
        ["BELUGA A/V", "Débitmètre Doppler hauteur-vitesse", "appareils/beluga-av.html"],
        ["LOG’R", "Débitmètre hauteur-vitesse portable autonome", "appareils/logr.html"],
        ["Solutions autonomes", "Hauteur-vitesse sur enregistreur autonome", "appareils/solutions-autonomes.html"] ] },
      { nom: "Canal de comptage", items: [
        ["DEBULLE", "Débitmètre bulle à bulle, poste fixe", "appareils/debulle.html"],
        ["BUL’R2", "Débitmètre bulle à bulle portable", "appareils/bulr2.html"],
        ["OC90", "Afficheur-transmetteur de débit pour canal", "appareils/oc90.html"],
        ["Canal Venturi AMV", "Canal de mesure ISO 4359", "appareils/canal-venturi-amv.html"],
        ["Canal Palmer-Bowlus", "Canal de mesure", "appareils/canal-palmer-bowlus.html"] ] },
      { nom: "Conduite en charge", items: [
        ["TORPEE-MAG", "Débitmètre électromagnétique multipoint à insertion, DN 100 à 2500", "appareils/torpee-mag.html"],
        ["TORPEE-Z", "Débitmètre électromagnétique multipoint à insertion, DN 100 à 300"],
        ["KF100", "Débitmètre à ultrasons à temps de transit, poste fixe", "appareils/kf100.html"],
        ["KF200", "Débitmètre à ultrasons à temps de transit, portable", "appareils/kf200.html"],
        ["KF210", "Débitmètre à ultrasons à temps de transit, en mallette", "appareils/kf210.html"] ] },
      { nom: "Rivière et jaugeage", items: [
        ["FLUVIA", "Courantomètre électromagnétique", "appareils/fluvia.html"],
        ["FloStick", "Courantomètre compact", "appareils/flostick.html"],
        ["RADAR-MATE 2", "Radar de vitesse portable", "appareils/radar-mate-2.html"],
        ["PHOENIX", "Débitmètre radar pour rivière", "appareils/phoenix.html"],
        ["EASYFLOW", "Débitmètre par traçage au sel", "appareils/easyflow.html"] ] }
    ]
  },
  {
    id: "preleveurs", nom: "Préleveurs", desc: "Fixes ou portables, réfrigérés, péristaltiques, version ATEX.",
    photo: "photo-1674578745937-c73f81bdda07",
    groupes: [
      { nom: "Fixes", items: [
        ["SP5 DK", "Préleveur pour conduites en charge", "appareils/sp5-dk.html"],
        ["SP5 ATEX", "Préleveur fixe réfrigéré ATEX"],
        ["SP5C", "Préleveur fixe réfrigéré compact", "appareils/sp5c.html"],
        ["SP5B", "Préleveur fixe réfrigéré péristaltique", "appareils/sp5b.html"],
        ["TP5 W", "Préleveur mural monoflacon", "appareils/tp5-w.html"] ] },
      { nom: "Portables", items: [
        ["MicroMAXX", "Pompe de prélèvement"],
        ["MAXX P6", "Préleveur portable compact", "appareils/maxx-p6.html"],
        ["TP5 P", "Préleveur portable réfrigéré", "appareils/tp5-p.html"],
        ["TP5 C", "Préleveur portable réfrigéré péristaltique", "appareils/tp5-c.html"] ] }
    ]
  },
  {
    id: "qualite", nom: "Qualité de l’eau", desc: "Sondes physico-chimiques, voile de boue et matières en suspension.",
    photo: "photo-1671250973481-252cca9c9c51",
    groupes: [
      { nom: "Physico-chimie", items: [
        ["Sondes et transmetteurs", "pH, oxygène dissous, redox, température, conductivité, MES, turbidité, chlore", "appareils/sondes-transmetteurs.html"] ] },
      { nom: "Boues et MES", items: [
        ["DTR01", "Détecteur de niveau de boue", "appareils/dtr01.html"],
        ["DTR02", "Détecteur de niveau de boue"],
        ["R812", "MESmètre portable", "appareils/r812.html"] ] }
    ]
  },
  {
    id: "niveau", nom: "Niveau", desc: "Ultrasons, radar, détection de surverse et piézométrie.",
    photo: "photo-1774031052552-86e96d08c202",
    groupes: [
      { nom: "Niveau et surverse", items: [
        ["ULS02", "Capteur de niveau à ultrasons 4-20 mA"],
        ["ULS06", "Capteur de niveau à ultrasons 4-20 mA"],
        ["R60", "Capteur de niveau radar"],
        ["DTS01", "Détecteur de surverse", "appareils/dts01.html"],
        ["Sondes lumineuses BF", "Sondes piézométriques", "appareils/sondes-lumineuses-bf.html"] ] }
    ]
  },
  {
    id: "hydrocarbures", nom: "Hydrocarbures", desc: "Détection sans contact, HAP dissous et contrôle manuel d’interface.",
    photo: "photo-1767274714714-dda4c25c6376",
    groupes: [
      { nom: "Hydrocarbures", items: [
        ["LDI ROW", "Détecteur d’hydrocarbures sans contact", "appareils/ldi-row.html"],
        ["EnviroFlu", "Sonde HAP dissous", "appareils/enviroflu.html"],
        ["SOLINST 122", "Détecteur manuel d’interface"] ] }
    ]
  },
  {
    id: "pluviometrie", nom: "Pluviométrie", desc: "Pluviomètres pour l’autosurveillance et le suivi des bassins versants.",
    photo: "photo-1776837048959-b7439cd9fdf7",
    groupes: [
      { nom: "Pluviomètres", items: [
        ["Pluviomètre professionnel", "Pluviomètre sans alimentation, sortie contact", "appareils/pluviometre-professionnel.html"],
        ["Pluviomètre météo", "Pluviomètre", "appareils/pluviometre-meteo.html"] ] }
    ]
  }
];

/* Le cycle de l'eau : les pages Applications. Ordre de la frise = trajet de l'eau, à partir du réseau (choix de Hugo, 24/11/2026).
   Le menu Applications suit, lui, l'ordre de priorité : window.TERRAINS_MENU. */
window.TERRAINS = [
  { id: "reseaux", nom: "Réseaux d’assainissement", court: "Réseaux", badge: "Cœur de métier",
    photo: "photo-1551516116-27394c95a55f",
    texte: "Points d’autosurveillance, déversoirs d’orage, diagnostic permanent : mesurer le débit là où il n’y a ni place ni alimentation.",
    appareils: ["RAVEN-EYE", "BELUGA", "LOG’R", "Solutions autonomes", "DTS01", "TP5 P"] },
  { id: "step", nom: "Station d’épuration", court: "Station",
    photo: "photo-1622322977767-2c71d1787205",
    texte: "Comptage en entrée et en sortie, bilans 24 h asservis au débit, voile de boue et paramètres de traitement.",
    appareils: ["DEBULLE", "OC90", "Canal Venturi AMV", "SP5B", "DTR02", "Sondes et transmetteurs"] },
  { id: "rivieres", nom: "Rivières et milieu naturel", court: "Rivières",
    photo: "photo-1543503484-ba590cb1f903",
    texte: "Jaugeage, hauteur d’eau et débit en cours d’eau, pluie sur le bassin versant. Des appareils portables pour les campagnes, fixes pour les stations.",
    appareils: ["FLUVIA", "PHOENIX", "RADAR-MATE 2", "EASYFLOW", "FloStick", "Pluviomètre professionnel"] },
  { id: "souterraines", nom: "Eaux souterraines", court: "Nappes",
    photo: "photo-1786327319386-762e16cf32f1",
    texte: "Suivi du niveau des nappes et de leur qualité, en poste fixe ou en campagne de relevés.",
    appareils: ["Sondes lumineuses BF", "Sondes et transmetteurs", "MicroMAXX"] },
  { id: "eau-potable", nom: "Eau potable", court: "Eau potable",
    photo: "photo-1495647688236-ed6ef40cb28b",
    texte: "Comptage sur les conduites en charge, du DN 100 au DN 2500, posé sans coupure d’eau.",
    appareils: ["TORPEE-MAG", "TORPEE-Z", "KF100", "KF200", "KF210", "Sondes et transmetteurs"] },
  { id: "industrie", nom: "Industrie et process", court: "Industrie",
    photo: "photo-1765218933298-dc55fdfb517a",
    texte: "Détection d’hydrocarbures avant rejet, débit en conduite de process, contrôle des effluents.",
    appareils: ["LDI ROW", "EnviroFlu", "KF200", "TORPEE-MAG", "SP5 ATEX"] }
];
window.TERRAINS_MENU = ["reseaux", "step", "eau-potable", "rivieres", "souterraines", "industrie"];

/* Secteurs commerciaux (carte des secteurs COMETEC, octobre 2026) */
window.SECTEURS = [
  { id: "nord-ouest", nom: "Benoît Paris", zone: "Nord-Ouest et Île-de-France", couleur: "#5E8C8B",
    deps: "02 14 18 22 27 28 29 35 36 37 41 44 45 49 50 53 56 59 60 61 62 72 75 76 77 78 80 91 92 93 94 95" },
  { id: "est", nom: "Hugo Saccani", zone: "Rhône-Alpes et Grand Est", couleur: "#1A4D4D",
    deps: "01 03 08 10 21 25 38 39 42 51 52 54 55 57 58 63 67 68 69 70 71 73 74 88 89 90" },
  { id: "sud-ouest", nom: "Alexis Crozatier", zone: "Sud-Ouest et Outre-mer", couleur: "#9DBDBB",
    deps: "*" /* tous les autres départements de métropole, et l'outre-mer */ },
  { id: "sud-est", nom: "Olivier Paillard", zone: "Sud-Est et Export", couleur: "#0F3637",
    deps: "04 05 06 07 11 12 13 15 26 30 34 43 48 66 83 84 2A 2B" }
];

window.CONTACT = {
  tel: "01 48 90 40 79", telLien: "tel:+33148904079",
  mail: "contact@cometec.fr",
  rdv: "https://bookings.cloud.microsoft/book/COMETEC1@cometec.fr/"
};

/* Leasing de matériel (partenaire financier : All In Finance).
   Durées proposées dans « Composer votre devis », en années : provisoires, durée maximale à confirmer par COMETEC. */
window.LEASING = {
  partenaire: "All In Finance",
  durees: [3, 4, 5],
  page: "services/leasing.html"
};

/* Visuels du catalogue : photo détourée (assets/img/appareils/<nom>.webp)
   et, quand elle existe, une photo de terrain affichée au survol (<nom>-situ.webp).
   Source : documentations des appareils. À remplacer par les photos HD quand elles arrivent. */
window.VISUELS = {
  "RAVEN-EYE": ["raven-eye", 1], "BELUGA": ["beluga", 1], "BELUGA A/V": ["beluga-av", 1], "LOG’R": ["logr", 1],
  "DEBULLE": ["debulle", 1], "BUL’R2": ["bulr2", 1], "Canal Venturi AMV": ["venturi-amv", 1], "Canal Palmer-Bowlus": ["palmer-bowlus", 1],
  "TORPEE-MAG": ["torpee-mag", 1], "KF100": ["kf100", 0], "KF210": ["kf210", 0],
  "FLUVIA": ["fluvia", 1], "FloStick": ["flostick", 1], "RADAR-MATE 2": ["radar-mate-2", 1], "PHOENIX": ["phoenix", 1], "EASYFLOW": ["easyflow", 1],
  "SP5C": ["sp5c", 1], "TP5 W": ["tp5-w", 1], "MAXX P6": ["maxx-p6", 1], "TP5 P": ["tp5-p", 1], "TP5 C": ["tp5-c", 1],
  "Sondes et transmetteurs": ["sondes-transmetteurs", 1], "R812": ["r812", 0], "DTR01": ["dtr01", 0],
  "DTS01": ["dts01", 0], "Sondes lumineuses BF": ["sondes-bf", 1],
  "LDI ROW": ["ldi-row", 1], "EnviroFlu": ["enviroflu", 1],
  "Pluviomètre professionnel": ["pluvio-pro", 1], "Pluviomètre météo": ["pluvio-meteo", 1]
};

/* principes:debut (généré par principes.py) */
window.PRINCIPES = {
 "radar": {
  "nom": "Radar sans contact",
  "famille": "debitmetres",
  "appareils": [
   "RAVEN-EYE",
   "PHOENIX",
   "RADAR-MATE 2"
  ]
 },
 "doppler": {
  "nom": "Doppler immergé",
  "famille": "debitmetres",
  "appareils": [
   "BELUGA",
   "BELUGA A/V",
   "LOG’R",
   "Solutions autonomes"
  ]
 },
 "bulle": {
  "nom": "Bulle à bulle",
  "famille": "debitmetres",
  "appareils": [
   "DEBULLE",
   "BUL’R2"
  ]
 },
 "canal": {
  "nom": "Canal jaugeur",
  "famille": "debitmetres",
  "appareils": [
   "Canal Venturi AMV",
   "Canal Palmer-Bowlus",
   "OC90"
  ]
 },
 "em-insertion": {
  "nom": "Électromagnétique multipoint à insertion",
  "famille": "debitmetres",
  "appareils": [
   "TORPEE-MAG",
   "TORPEE-Z"
  ]
 },
 "transit": {
  "nom": "Ultrasons à temps de transit",
  "famille": "debitmetres",
  "appareils": [
   "KF100",
   "KF200",
   "KF210"
  ]
 },
 "courantometre": {
  "nom": "Courantomètre électromagnétique",
  "famille": "debitmetres",
  "appareils": [
   "FLUVIA",
   "FloStick"
  ]
 },
 "tracage": {
  "nom": "Traçage au sel",
  "famille": "debitmetres",
  "appareils": [
   "EASYFLOW"
  ]
 },
 "vide": {
  "nom": "Pompe à vide",
  "famille": "preleveurs",
  "appareils": [
   "SP5C",
   "TP5 P",
   "MAXX P6"
  ]
 },
 "peristaltique": {
  "nom": "Pompe péristaltique",
  "famille": "preleveurs",
  "appareils": [
   "SP5B",
   "TP5 C",
   "TP5 W",
   "MAXX P6"
  ]
 },
 "charge": {
  "nom": "Sur conduite en charge",
  "famille": "preleveurs",
  "appareils": [
   "SP5 DK"
  ]
 },
 "asservi": {
  "nom": "Asservi au débit",
  "famille": "preleveurs",
  "appareils": [
   "SP5C",
   "SP5B",
   "SP5 DK",
   "TP5 P",
   "TP5 C",
   "TP5 W",
   "MAXX P6"
  ]
 },
 "electrochimie": {
  "nom": "pH, redox, conductivité",
  "famille": "qualite",
  "appareils": [
   "Sondes et transmetteurs",
   "R812"
  ]
 },
 "oxygene": {
  "nom": "Oxygène dissous",
  "famille": "qualite",
  "appareils": [
   "Sondes et transmetteurs",
   "R812"
  ]
 },
 "optique": {
  "nom": "Turbidité, MES, voile de boue",
  "famille": "qualite",
  "appareils": [
   "Sondes et transmetteurs",
   "R812",
   "DTR01",
   "DTR02"
  ]
 },
 "chlore": {
  "nom": "Chlore",
  "famille": "qualite",
  "appareils": [
   "Sondes et transmetteurs"
  ]
 },
 "ultrasons": {
  "nom": "Ultrasons",
  "famille": "niveau",
  "appareils": [
   "ULS02",
   "ULS06"
  ]
 },
 "radar-niveau": {
  "nom": "Radar",
  "famille": "niveau",
  "appareils": [
   "R60"
  ]
 },
 "surverse": {
  "nom": "Détection de surverse",
  "famille": "niveau",
  "appareils": [
   "DTS01"
  ]
 },
 "piezo": {
  "nom": "Piézométrie",
  "famille": "niveau",
  "appareils": [
   "Sondes lumineuses BF"
  ]
 },
 "film": {
  "nom": "Film en surface",
  "famille": "hydrocarbures",
  "appareils": [
   "LDI ROW"
  ]
 },
 "hap": {
  "nom": "HAP dissous",
  "famille": "hydrocarbures",
  "appareils": [
   "EnviroFlu"
  ]
 },
 "interface": {
  "nom": "Interface hydrocarbure / eau",
  "famille": "hydrocarbures",
  "appareils": [
   "SOLINST 122"
  ]
 },
 "auget": {
  "nom": "Auget basculant",
  "famille": "pluviometrie",
  "appareils": [
   "Pluviomètre professionnel",
   "Pluviomètre météo"
  ]
 }
};
/* principes:fin */

/* Méga-menu « Appareils » : familles par colonne (débitmètres sur deux sous-colonnes, petites familles empilées) */
window.MEGA_COLONNES = [["debitmetres"], ["preleveurs"], ["qualite", "pluviometrie"], ["niveau", "hydrocarbures"]];

/* Page LinkedIn COMETEC : adresse à fournir par Hugo (un seul endroit pour tout le site) */
window.LINKEDIN = "";
