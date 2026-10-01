# Monaco-dashboard

Dashboard interactif des besoins IT / datacenter de Monaco à l'horizon 2035, construit à partir de
`Monaco_Besoins_IT_v2.xlsx`. Le modèle Excel est réécrit en TypeScript (`src/model.ts`) et testé
contre les valeurs de l'Excel (`npm test`).

- **Curseurs** : toutes les hypothèses de l'onglet `1_Inputs&Hyp` (lignes 34-68, colonnes F/G/H = Bas/Central/Haut).
- **Graphiques** : KPI, scénarios, trajectoire, par bloc, cascade, tornade de sensibilité, camembert, taux adressable, tableau.
- **Éditable** : « Modifier la mise en page » → déplacer / redimensionner, ⚙ titre, couleurs, scénario, légende ; ajouter / supprimer des widgets ; thème et palette dans « Options ».
- La configuration est sauvegardée dans le navigateur ; export / import JSON.

## Développement
```
npm install
npm run dev      # http://localhost:5173/Monaco-dashboard/
npm test
npm run build
```

## Déploiement
GitHub Pages via `.github/workflows/deploy.yml` (Settings → Pages → Source : GitHub Actions), à chaque push sur `main`.

## Points d'attention sur l'Excel
- Le « surcroît métier santé » CHPG (ligne 68) n'a aucun effet : `I63 = H13*H63*G63 + G13*F63*G63` avec `H13 = 0`.
  Option « Corriger CHPG » dans le dashboard pour l'appliquer au besoin métier.
- La baseline 2026 utilise toujours la colonne « Bas » des W IT / utilisateur (lignes 43-45) : ces curseurs sont donc uniques.
- La trajectoire annuelle 2026→2035 est une interpolation ajoutée par le dashboard (le 2035 est identique à l'Excel).
