# Sources de COMETEC Bilan

- `src.html` : page, styles et panneaux de l'interface.
- `app.js` : toute la logique (lecture des fichiers BUL'R2, corrections, loi H/Q, diagnostic, charges polluantes, exports Excel et PDF).
- `build.py` : assemble l'application. `npm install` puis `python3 build.py` produit `dist/web/` (version en ligne) et `dist/COMETEC_Bilan.html` (version hors ligne en un seul fichier).
- Bibliothèques : ECharts 5.5.1, ExcelJS 4.4.0, JSZip 3.10.1, jsPDF 2.5.1 (versions figées dans `package.json`).

Pour publier une nouvelle version : reconstruire, copier le contenu de `dist/web/` à la racine du dépôt, puis pousser sur `main`. GitHub Pages met le site à jour en une minute, et les applications installées récupèrent la nouvelle version à leur prochaine ouverture.

Aucune donnée de client n'est stockée dans ce dépôt.
