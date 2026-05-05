# 📊 Système Elo d'AltPool

> Comment se calcule le gain ou la perte de points Elo d'un joueur après un match
> ou un tournoi. Le code de référence est dans
> [`backend/src/main/java/com/altpool/service/EloService.java`](../backend/src/main/java/com/altpool/service/EloService.java)
> et [`TournamentService.applyTournamentElo()`](../backend/src/main/java/com/altpool/service/TournamentService.java).

## Sommaire

1. [Constantes du système](#constantes-du-système)
2. [Match individuel classé (RANKED)](#1-match-individuel-classé)
   - 1.1 [Formule Elo de base](#11-formule-elo-de-base)
   - 1.2 [Le K-factor variable](#12-le-k-factor-variable)
   - 1.3 [Effet du best-of (BO)](#13-effet-du-best-of-bo)
   - 1.4 [Effet des billes restantes](#14-effet-des-billes-restantes)
   - 1.5 [La bille noire](#15-la-bille-noire)
3. [Match amical (FRIENDLY)](#2-match-amical-friendly)
4. [Tournoi classé](#3-tournoi-classé)
   - 3.1 [Pourquoi pas un calcul match par match ?](#31-pourquoi-pas-un-calcul-match-par-match-)
   - 3.2 [Base par position finale](#32-base-par-position-finale)
   - 3.3 [Modulation par les billes du tournoi](#33-modulation-par-les-billes-du-tournoi)
   - 3.4 [Forfait](#34-forfait)
5. [Exemples concrets chiffrés](#4-exemples-concrets)
6. [Tableau de référence rapide](#5-tableau-de-référence-rapide)

---

## Constantes du système

| Constante | Valeur | Signification |
|---|---|---|
| `INITIAL_ELO` | **1000** | Score Elo de départ d'un nouveau joueur |
| `K_BASE` | **32** | K-factor de base avant modulation |
| `MAX_BALLS` | **7** | Nombre max de billes restantes "potables" hors blanche |

Source : [`EloService.java`](../backend/src/main/java/com/altpool/service/EloService.java#L11-L14)

---

## 1. Match individuel classé

Quand un match `RANKED` est validé par le perdant (ou par un admin), le système
calcule le delta Elo et l'applique aux 2 joueurs **immédiatement**.

### 1.1 Formule Elo de base

C'est l'Elo classique :

```
E_winner = 1 / (1 + 10^((Elo_loser − Elo_winner) / 400))
E_loser  = 1 / (1 + 10^((Elo_winner − Elo_loser) / 400))

ΔWinner = K × (1 − E_winner)
ΔLoser  = K × (0 − E_loser)
```

`E` est la "probabilité attendue" que le joueur gagne. Si tu bats quelqu'un de plus
fort, `E_winner` est petit donc `1 − E_winner` est grand → tu gagnes beaucoup
de points. Et inversement.

### 1.2 Le K-factor variable

Plutôt que d'utiliser un K fixe à 32, on le **module entre 32 et 48** selon la
qualité de la victoire.

```
quality = 0.5 × frame_margin + 0.5 × ball_score
K = round(32 × (1 + 0.5 × quality))
```

`quality` est un nombre entre 0 et 1.

- `quality = 0` (victoire tout juste, frames serrées, table pleine) → **K = 32**
- `quality = 1` (sweep parfait sur table propre) → **K = 48**

→ Une domination totale rapporte **+50 % de points** par rapport à une victoire
de justesse.

### 1.3 Effet du best-of (BO)

Le `frame_margin` mesure à quel point tu as "écrasé" l'adversaire en nombre de
frames :

```
frame_margin = (frames_won − frames_lost) / best_of
```

Borné entre 0 et 1.

Exemples :

| Match | frames_won | frames_lost | best_of | frame_margin |
|---|---|---|---|---|
| BO1 (1-0) | 1 | 0 | 1 | **1.00** |
| BO3 sweep (2-0) | 2 | 0 | 3 | **0.67** |
| BO3 serré (2-1) | 2 | 1 | 3 | **0.33** |
| BO5 sweep (3-0) | 3 | 0 | 5 | **0.60** |
| BO5 serré (3-2) | 3 | 2 | 5 | **0.20** |
| BO7 sweep (4-0) | 4 | 0 | 7 | **0.57** |
| BO7 dramatique (4-3) | 4 | 3 | 7 | **0.14** |

> 👉 **Plus le BO est long, plus le frame_margin a du potentiel haut** mais aussi
> plus il est dur d'atteindre le maximum (faut un sweep parfait).

### 1.4 Effet des billes restantes

Pour chaque frame que le winner a gagnée, on calcule un score de domination basé
sur le nombre de billes laissées au perdant à la fin de cette frame :

```
frame_ball_score = (7 − balls_remaining) / 7
```

Puis on fait la **moyenne sur toutes les frames gagnées** :

```
ball_score = moyenne des frame_ball_score sur les frames gagnées par le winner
```

Borné entre 0 et 1.

| balls_remaining (au perdant) | frame_ball_score | Interprétation |
|---|---|---|
| 0 | 1.00 | Table propre — domination parfaite |
| 1 | 0.86 | Quasi-clean |
| 3 | 0.57 | Demi-table |
| 5 | 0.29 | Frame disputée jusqu'au bout |
| 7 | 0.00 | Le perdant n'a rien rentré — gagné sur faute / 8-ball précoce |

> ⚠️ **Important** : seules les frames **gagnées** par le winner sont prises
> en compte. Les frames perdues (en BO3+) ne baissent pas le `ball_score`,
> elles n'ont aucun impact direct (ce sont les `frames_lost` du `frame_margin`
> qui les capturent).

### 1.5 La bille noire

Le drapeau `ended_on_black` est **enregistré** sur chaque frame mais
**n'intervient pas dans le calcul Elo**.

Il sert uniquement aux **statistiques** futures (ex : ratio de victoires sur la
noire par joueur). On a fait ce choix pour deux raisons :

1. La domination est déjà capturée par les billes restantes
   (gagner sur la noire avec 0 bille restante au perdant = max ball_score)
2. Garder la formule Elo simple et explicable

Si tu veux le réintégrer plus tard, c'est une ligne dans `EloService.java`.

---

## 2. Match amical (FRIENDLY)

Aucun impact Elo. `eloChangeWinner = 0` et `eloChangeLoser = 0`. Le match est
quand même enregistré avec ses frames pour les statistiques (win rate amical,
H2H amical, etc.).

```java
// MatchService.validate(), si match.type == FRIENDLY
m.setEloChangeWinner(0);
m.setEloChangeLoser(0);
```

---

## 3. Tournoi classé

### 3.1 Pourquoi pas un calcul match par match ?

Tous les matchs **à l'intérieur d'un tournoi** sont créés en `FRIENDLY`. Donc
**aucun Elo n'est appliqué pendant le tournoi**.

À la fin du tournoi (= finale + match 3e place validés), le système calcule un
**delta Elo unique par participant**, basé sur sa **position finale** et sa
**performance globale en billes**.

C'est volontaire :
- Évite qu'un joueur "monte" pendant un tournoi puis retombe en finale
- Le classement final compte plus que chaque rencontre individuelle
- Récompense le parcours global (cumul de billes through poules + bracket)

Source : [`TournamentService.applyTournamentElo()`](../backend/src/main/java/com/altpool/service/TournamentService.java)

### 3.2 Base par position finale

La base de gain dépend de la position finale du joueur :

```java
BASE_ELO_BY_POSITION = { 50, 30, 20, 10, 5, 5, 0, 0 }
```

| Position finale | Base Elo |
|---|---|
| 🥇 1ère (CHAMPION) | **+50** |
| 🥈 2ème (RUNNER_UP) | **+30** |
| 🥉 3ème (THIRD_PLACE) | **+20** |
| 4ème (FOURTH_PLACE) | **+10** |
| 5ème, 6ème | +5 |
| 7ème, 8ème | 0 |
| 9ème et + | **-10** |

→ Le **seuil de neutralité** est autour de la 7ᵉ-8ᵉ place. Les joueurs sortis
  tôt **perdent** 10 points pour ne pas que le classement gonfle artificiellement.

### 3.3 Modulation par les billes du tournoi

La performance en billes module la base par ±50 % :

```
totalBallsFor     = ∑ billes laissées aux adversaires (poule + bracket)
totalBallsAgainst = ∑ billes laissées par lui aux adversaires (en sa défaveur)

ball_score = (totalBallsFor − totalBallsAgainst) / (totalBallsFor + totalBallsAgainst)
            ↑ entre −1 (toujours dominé) et +1 (toujours dominant)

delta = round(base + base × 0.5 × ball_score)
```

Exemples :

| Position | Base | ball_score | Delta |
|---|---|---|---|
| 🥇 (CHAMPION) | +50 | +1.0 (domine partout) | **+75** |
| 🥇 (CHAMPION) | +50 | +0.0 (équilibré) | +50 |
| 🥇 (CHAMPION) | +50 | -0.5 (a souffert) | +37 |
| 🥈 (RUNNER_UP) | +30 | +0.5 | +37 |
| 🥉 (THIRD_PLACE) | +20 | +0.0 | +20 |
| 9ème | -10 | +0.5 (combatif malgré la défaite) | -7 |
| 9ème | -10 | -0.5 (a peu rentré) | -12 |

→ Un **champion qui a survolé** prend **+75 Elo** (50 + 25). Un champion qui a
  galéré jusqu'au bout en gagnant 3-2 partout en finissant chaque frame avec 5
  billes au tapis prendra **+37 Elo** seulement.

### 3.4 Forfait

Si un participant est marqué `FORFEITED` (deadline ratée et le gérant a déclenché
le double forfait), il prend un malus fixe :

```
delta = -25
```

Indépendamment de sa position et de son historique de billes.

---

## 4. Exemples concrets

### Exemple 1 — Match BO5 dominé : Alice (1200) bat Bob (1100) en 3-0

Frames :
1. Alice gagne, balls_remaining = 0 (table propre)
2. Alice gagne, balls_remaining = 1
3. Alice gagne, balls_remaining = 0

**Calcul** :
- frame_margin = (3 − 0) / 5 = **0.60**
- ball_scores frame par frame : 1.0, 6/7=0.857, 1.0
- ball_score moyen = (1.0 + 0.857 + 1.0) / 3 = **0.952**
- quality = 0.5 × 0.60 + 0.5 × 0.952 = **0.776**
- K = 32 × (1 + 0.5 × 0.776) = 32 × 1.388 = **44.4** → arrondi à **44**
- E_alice = 1 / (1 + 10^((1100 − 1200)/400)) = 1 / (1 + 10^-0.25) = 1 / (1 + 0.562) = **0.640**
- ΔAlice = 44 × (1 − 0.640) = 44 × 0.360 = **+15.8** → **+16**
- ΔBob = 44 × (0 − 0.360) = **-16**

**Résultat** : Alice gagne 16 points, Bob en perd 16.

### Exemple 2 — Match BO3 serré : Alice (1200) bat Bob (1100) en 2-1

Frames :
1. Alice gagne, balls_remaining = 5
2. Bob gagne (peu importe les balls)
3. Alice gagne, balls_remaining = 4

**Calcul** :
- frame_margin = (2 − 1) / 3 = **0.333**
- ball_scores des frames d'Alice : (7-5)/7=0.286, (7-4)/7=0.428
- ball_score moyen = (0.286 + 0.428) / 2 = **0.357**
- quality = 0.5 × 0.333 + 0.5 × 0.357 = **0.345**
- K = 32 × (1 + 0.5 × 0.345) = 32 × 1.172 = **37.5** → **38**
- ΔAlice = 38 × 0.360 = **+13.7** → **+14**
- ΔBob = **-14**

→ Match plus serré → moins de points (16 vs 14, écart faible mais notable).

### Exemple 3 — BO1 fluke : Bob (1100) bat Alice (1200), gagné sur faute (balls=7)

Frames :
1. Bob gagne, balls_remaining = 7 (Alice n'a rentré que 1 bille)

**Calcul** :
- frame_margin = (1 − 0) / 1 = **1.00** (max, c'est un BO1)
- ball_score = (7 − 7) / 7 = **0.00** (Bob n'a rien dominé, juste gagné sur une faute)
- quality = 0.5 × 1.00 + 0.5 × 0.00 = **0.50**
- K = 32 × (1 + 0.5 × 0.50) = **40**
- E_bob = 1 / (1 + 10^((1200−1100)/400)) = 1 / (1 + 10^0.25) = 1 / (1 + 1.778) = **0.360**
- ΔBob = 40 × (1 − 0.360) = **+25.6** → **+26**
- ΔAlice = -26

→ L'upset rapporte gros à cause de l'écart Elo, mais moins qu'une vraie domination.

### Exemple 4 — Tournoi à 8 joueurs : Alice termine 1ère sans perdre une frame

Tournoi POOL_AND_BRACKET, 2 poules de 4, top 2 qualifiés :
- Poule : Alice 3W-0L, total billes_for=18, billes_against=2
- Bracket : QF gagné 2-0 (balls 1, 0), Demi 2-0 (balls 0, 1), Finale BO5 gagnée 3-0 (balls 0, 0, 1)

**Cumul** :
- totalBallsFor = 18 (poule) + 1+0 + 0+1 + 0+0+1 = **21**
- totalBallsAgainst = 2

**Calcul** :
- Position : 1ère → base = **+50**
- ball_score = (21 − 2) / (21 + 2) = 19 / 23 = **+0.826**
- delta = round(50 + 50 × 0.5 × 0.826) = round(50 + 20.6) = **+71**

→ Alice prend **+71 Elo** sur ce tournoi.

### Exemple 5 — Tournoi : Bob termine 5ème

- Position 5 → base = +5
- ball_score = +0.2 (un peu dominant)
- delta = round(5 + 5 × 0.5 × 0.2) = round(5 + 0.5) = **+5** (l'arrondi mange la
  modulation pour les petites bases)

→ Bob prend **+5 Elo**, modeste mais récompense quand même la participation.

---

## 5. Tableau de référence rapide

### Match individuel — combien de points en moyenne ?

Pour un match RANKED entre 2 joueurs d'Elo similaire (~1100 vs ~1100) :

| Type de victoire | K effectif | Δ approximatif |
|---|---|---|
| BO1 sur faute (0 dom) | ~40 | ±20 |
| BO1 table propre | ~48 | ±24 |
| BO3 serré (2-1, billes moyennes) | ~38 | ±19 |
| BO3 propre (2-0, billes faibles adverses) | ~44 | ±22 |
| BO5 sweep parfait (3-0, table propre) | ~46 | ±23 |
| BO5 dramatique (3-2 long) | ~36 | ±18 |
| BO7 sweep | ~46 | ±23 |
| BO7 jusqu'au bout (4-3 lutté) | ~34 | ±17 |

### Tournoi — récap des deltas par position

(En supposant un ball_score modéré de +0.3)

| Position | Base | Avec modulation +15% | Score mini ball_score=−1 |
|---|---|---|---|
| 🥇 1ère | +50 | **+57** | +25 |
| 🥈 2ème | +30 | +34 | +15 |
| 🥉 3ème | +20 | +23 | +10 |
| 4ème | +10 | +11 | +5 |
| 5-6ème | +5 | +5-6 | +2-3 |
| 7-8ème | 0 | 0 | 0 |
| 9+ ème | -10 | -11-12 | -15 |
| Forfait | **-25** (fixe) | -25 | -25 |

---

## Évolution future possible

- **Réintégrer la bille noire** dans le calcul (bonus +5% si gagné sur la noire)
- **Plafonner les pertes** en cas d'écart Elo très grand (anti "tilt")
- **Décay** Elo : un joueur inactif depuis X mois redescend doucement
- **Saisons** : reset partiel chaque trimestre/année

Toute modification se fait dans **un seul endroit** :
[`EloService.computeWithFrames`](../backend/src/main/java/com/altpool/service/EloService.java)
ou [`TournamentService.applyTournamentElo`](../backend/src/main/java/com/altpool/service/TournamentService.java).
