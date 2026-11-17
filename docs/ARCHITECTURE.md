# Architecture et feuille de route

## Choix techniques

| Choix | Raison |
| ----- | ------ |
| **TypeScript** | Code vérifié à la compilation, indispensable pour un projet qui doit vivre plusieurs années. |
| **Phaser 3** | Moteur 2D mature (WebGL, particules, tweens, entrées tactiles), bien supporté par les navigateurs intégrés (Facebook). |
| **Vite** | Démarrage instantané en développement, build optimisé, chemins relatifs compatibles GitHub Pages. |
| **Interface en HTML/CSS, sans React** | Les menus sont simples : du HTML/CSS natif donne une typographie nette et un poids minimal. React n'apporterait rien ici. |
| **Textures et sons procéduraux** | Boules, canon, particules et effets sonores sont générés au démarrage : aucun téléchargement, rendu net à toute résolution, 100 % originaux. |
| **Supabase (à venir)** | Comptes, sauvegarde et classements avec validation côté serveur. |

## Organisation du code

```
src/
  config/gameConfig.ts     Constantes : dimensions, couleurs, scores
  data/levels.ts           ★ Configuration centrale des niveaux et des photos
  core/                    Règles du jeu, SANS rendu (testées automatiquement)
    HexGrid.ts               grille hexagonale, groupes, boules détachées
    trajectory.ts            tir, rebonds, collision, accrochage
    LevelGenerator.ts        disposition des boules d'un niveau
  render/                  Effets visuels
    FogReveal.ts             ★ brouillard et révélation de la photo
    BubbleTextures.ts        sphères cristal, canon, particules
  scenes/GameScene.ts      Scène de jeu Phaser (orchestration)
  audio/Sfx.ts             Effets sonores synthétisés (Web Audio)
  services/                Photos (seul module qui connaît leurs chemins), sauvegarde
  ui/Hud.ts                Interface HTML : accueil, barre d'état, écrans de fin
  ui/LevelMap.ts           Carte des niveaux (générée depuis data/levels.ts)
  app/                     Bus d'événements jeu ↔ interface, dimensions de vue
public/assets/             Photos, miniatures, audio, interface, polices
tests/                     Tests du moteur
```

Règle : `core/` ne dépend jamais de Phaser ; la scène et l'interface ne
communiquent que par le bus d'événements (`app/bus.ts`).

## La révélation photographique

- La photo (carrée) est affichée **en entier** sur toute la largeur, sans
  recadrage ni déformation ; le reste de l'écran reçoit un fond flou et
  assombri tiré de la même image.
- Le pourcentage révélé se mesure uniquement sur la zone de la photo.
- Le brouillard est un champ de valeurs basse résolution (180 px de large)
  agrandi avec lissage : très léger pour un smartphone.
- Chaque boule détruite lance une « bouffée » animée (dégradé radial qui
  s'étend + lobes secondaires décalés), bien plus large que la boule.
- Les valeurs s'additionnent : les zones fusionnent naturellement et restent
  acquises.
- Un bruit procédural animé déforme les contours (irréguliers, organiques).
- Trois états : opaque, voile partiel, totalement dissipé.
- Les boules détachées percent le brouillard en tombant jusqu'en bas : la
  partie basse de la photo se révèle aussi.
- Victoire : objectif de révélation atteint (ou plateau vidé) → dissipation totale.

## Feuille de route

- [x] **Phase 1 – Conception** : architecture, mécaniques.
- [x] **Phase 2 – Prototype jouable** : canon, visée, rebonds, collisions,
      combinaisons, chutes, révélation, victoire / défaite, 3 niveaux.
- [x] **Phase 3 – Progression** : carte des niveaux (terminés / disponible /
      verrouillés, étoiles), 12 niveaux, 6 formes de disposition, équilibrage
      par parties simulées, navigation accueil ↔ carte ↔ jeu.
- [x] **Murs incassables** : barres à rebonds (core/walls.ts) placées dans la
      partie haute, de 1 mur au niveau 3 à 8 murs au niveau 12 ; changement automatique de la
      boule après 3 secondes ; canon redessiné.
- [ ] **Phase 3 bis** : boules spéciales, récompenses d'étape, réglages graphiques.
- [ ] **Phase 4 – Polish graphique** : affinage des sphères, du canon, des transitions.
- [ ] **Phase 5 – Sound design** : musiques (ambiance, victoire, défaite),
      réglages séparés musique / effets / volume général.
- [ ] **Phase 6 – Collection et communauté** : galerie, défis quotidiens,
      profil, classement Supabase, partage (Web Share + image de partage).
- [ ] **Phase 7 – Tests** sur vrais smartphones et navigateur intégré Facebook.
- [ ] **Phase 8 – Finalisation** : PWA, mise en ligne.

## Limites connues du prototype

- Le son se limite aux effets ; pas encore de musique ni de réglages de volume.
- Testé dans un navigateur de bureau (format mobile simulé), pas encore sur
  de vrais téléphones ni dans le navigateur intégré de Facebook.
- La progression est enregistrée sur l'appareil uniquement.
