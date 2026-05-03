# AltPool

Application interne de gestion de billard avec système Elo, réservations, matchs et gestion multi-sites.

## Stack

- **Backend** : Java 17, Spring Boot 3, Spring Security (JWT), JPA/Hibernate, Maven
- **Base** : PostgreSQL 16
- **Frontend** : React 18, DevExtreme, Flaticon UIcons, Axios, React Router
- **Docs API** : Swagger / Springdoc OpenAPI
- **Conteneurs** : Docker + docker-compose

## Arborescence

```
AltPool/
├── backend/                 # Spring Boot
│   ├── Dockerfile
│   ├── docker-compose.yml   # postgres + backend
│   └── sql/init.sql         # Schéma + seed
└── frontend/                # React + DevExtreme
```

## Lancement rapide

### 1. Backend + Postgres (Docker)

Depuis le dossier `backend/` :

```bash
cd backend
docker-compose up --build
```

- API : http://localhost:8080
- Swagger : http://localhost:8080/swagger-ui.html
- Postgres : localhost:5432 (altpool / altpool / altpool)

Comptes seed (créés au démarrage) :
- `admin` / `admin` → rôle ADMIN
- `user`  / `user`  → rôle USER

### 2. Frontend (local)

```bash
cd frontend
npm install
npm start
```

Frontend sur http://localhost:3000 (proxy vers le backend sur 8080).

## Endpoints principaux

| Méthode | URL                           | Auth     |
|---------|-------------------------------|----------|
| POST    | /auth/login                   | public   |
| POST    | /auth/register                | public   |
| GET     | /locations                    | user     |
| POST    | /locations                    | admin    |
| GET     | /billards                     | user     |
| POST    | /billards                     | admin    |
| GET     | /reservations                 | user     |
| POST    | /reservations                 | user     |
| GET     | /players                      | user     |
| POST    | /players                      | user     |
| GET     | /matches                      | user     |
| POST    | /matches                      | user     |
| POST    | /matches/{id}/validate        | loser/admin |
| POST    | /matches/{id}/reject          | loser/admin |
| GET     | /leaderboard                  | user     |

## Logique métier

- **Réservations** : conflit bloqué si chevauchement sur un même billard ; un utilisateur ne peut réserver qu'un billard de sa location.
- **Matchs** : créés en `PENDING`, doivent être validés par le perdant (ou un ADMIN) pour appliquer l'Elo ; `REJECTED` = aucun changement.
- **Elo** : valeur initiale 1000, K-factor 32, formule standard.

## Variables d'environnement backend

| Variable       | Défaut                                   |
|----------------|------------------------------------------|
| DB_URL         | jdbc:postgresql://localhost:5432/altpool |
| DB_USER        | altpool                                  |
| DB_PASSWORD    | altpool                                  |
| JWT_SECRET     | (valeur par défaut en base64, à changer en prod) |
