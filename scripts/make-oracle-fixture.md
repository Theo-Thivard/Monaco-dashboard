# Jeu de test « moteur de formules contre un autre moteur de calcul »

`src/test/fixtures/modified.xlsx` est le classeur v3 modifié (valeurs d'entrée changées + formules `IF`, `ROUND`, `MAX`, `MIN`, `×1,1` ajoutées),
enregistré sans valeurs calculées. `modified.expected.json` contient les valeurs calculées pour chaque formule par **LibreOffice** (moteur de calcul
indépendant ; `XLOOKUP` y est remplacé par `INDEX/MATCH` équivalent car LibreOffice 24.2 ne connaît pas `XLOOKUP`).
Le test `src/core/xl/oracle.test.ts` vérifie que l'évaluateur du dashboard retrouve ces valeurs.

Régénérer : modifier le classeur avec openpyxl, convertir avec `soffice --headless --calc --convert-to xlsx`, puis exporter les valeurs des cellules à formule.
