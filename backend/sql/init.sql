-- =====================================================================
-- AltPool — schéma complet + seed
-- Modèle :
--   - 3 rôles : ADMIN, GERANT, JOUEUR
--   - Un GERANT peut gérer plusieurs CLUBS, un CLUB peut avoir plusieurs GERANTS (M2M)
--   - Un JOUEUR a 1 club principal + N clubs de jeu (M2M player_clubs)
--   - Un JOUEUR garde un seul Elo qui le suit dans tous ses clubs
--   - PasswordResetRequest : table de notif pour les gérants
-- =====================================================================

DROP TABLE IF EXISTS user_avatars CASCADE;
DROP TABLE IF EXISTS password_reset_requests CASCADE;
DROP TABLE IF EXISTS tournament_matches CASCADE;
DROP TABLE IF EXISTS tournament_rounds CASCADE;
DROP TABLE IF EXISTS tournament_participants CASCADE;
DROP TABLE IF EXISTS tournament_pools CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS frames CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS player_clubs CASCADE;
DROP TABLE IF EXISTS user_clubs CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS billiard_tables CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;

-- ---------- Tables de base ------------------------------------------

CREATE TABLE clubs (
    id   BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE users (
    id       BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role     VARCHAR(32)  NOT NULL CHECK (role IN ('ADMIN', 'GERANT', 'JOUEUR'))
);

-- M2M : un GERANT gère N clubs, un CLUB a N gérants
CREATE TABLE user_clubs (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    club_id BIGINT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, club_id)
);
CREATE INDEX idx_user_clubs_club ON user_clubs(club_id);

CREATE TABLE billiard_tables (
    id      BIGSERIAL PRIMARY KEY,
    name    VARCHAR(255) NOT NULL,
    club_id BIGINT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE
);
CREATE INDEX idx_billiard_club ON billiard_tables(club_id);

CREATE TABLE players (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    elo             INTEGER      NOT NULL DEFAULT 1000,
    user_id         BIGINT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    primary_club_id BIGINT NOT NULL REFERENCES clubs(id) ON DELETE RESTRICT
);
CREATE INDEX idx_players_primary_club ON players(primary_club_id);
CREATE INDEX idx_players_elo ON players(elo DESC);

-- M2M : un JOUEUR peut jouer dans N clubs, un CLUB a N joueurs
CREATE TABLE player_clubs (
    player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    club_id   BIGINT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    PRIMARY KEY (player_id, club_id)
);
CREATE INDEX idx_player_clubs_club ON player_clubs(club_id);

CREATE TABLE reservations (
    id          BIGSERIAL PRIMARY KEY,
    billiard_id BIGINT NOT NULL REFERENCES billiard_tables(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time  TIMESTAMP NOT NULL,
    end_time    TIMESTAMP NOT NULL
);
CREATE INDEX idx_reservations_billiard ON reservations(billiard_id);
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_window ON reservations(billiard_id, start_time, end_time);

CREATE TABLE matches (
    id                   BIGSERIAL PRIMARY KEY,
    type                 VARCHAR(16) NOT NULL
                         CHECK (type IN ('RANKED', 'FRIENDLY')),
    best_of              INT NOT NULL CHECK (best_of >= 1),
    player1_id           BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    player2_id           BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    club_id              BIGINT REFERENCES clubs(id) ON DELETE SET NULL,
    reservation_id       BIGINT REFERENCES reservations(id) ON DELETE SET NULL,
    status               VARCHAR(24) NOT NULL DEFAULT 'IN_PROGRESS'
                         CHECK (status IN ('IN_PROGRESS', 'PENDING_VALIDATION', 'VALIDATED', 'REJECTED')),
    winner_id            BIGINT REFERENCES players(id) ON DELETE SET NULL,
    score_p1             INT NOT NULL DEFAULT 0,
    score_p2             INT NOT NULL DEFAULT 0,
    elo_change_winner    INT,
    elo_change_loser     INT,
    created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    validated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at          TIMESTAMP,
    validated_at         TIMESTAMP
);
CREATE INDEX idx_matches_player1 ON matches(player1_id);
CREATE INDEX idx_matches_player2 ON matches(player2_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_type ON matches(type);

CREATE TABLE frames (
    id              BIGSERIAL PRIMARY KEY,
    match_id        BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    frame_number    INT NOT NULL,
    winner_id       BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    loser_id        BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    ended_on_black  BOOLEAN NOT NULL DEFAULT FALSE,
    balls_remaining INT NOT NULL DEFAULT 0
                    CHECK (balls_remaining >= 0 AND balls_remaining <= 7),
    foul_finish     BOOLEAN NOT NULL DEFAULT FALSE,
    duration_sec    INT,
    played_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (match_id, frame_number)
);
CREATE INDEX idx_frames_match ON frames(match_id);
CREATE INDEX idx_frames_winner ON frames(winner_id);

-- ---------- Tournois -------------------------------------------------

CREATE TABLE tournaments (
    id                       BIGSERIAL PRIMARY KEY,
    name                     VARCHAR(255) NOT NULL,
    description              TEXT,
    club_id                  BIGINT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    created_by_user_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
    type                     VARCHAR(32) NOT NULL
                             CHECK (type IN ('BRACKET_ONLY', 'POOL_AND_BRACKET', 'POOL_ONLY')),
    status                   VARCHAR(32) NOT NULL DEFAULT 'REGISTRATION'
                             CHECK (status IN ('DRAFT', 'REGISTRATION', 'READY_TO_START',
                                               'IN_PROGRESS', 'FINISHED', 'CANCELLED')),
    ranked                   BOOLEAN NOT NULL DEFAULT TRUE,
    pool_best_of             INT NOT NULL DEFAULT 1 CHECK (pool_best_of >= 1),
    bracket_best_of          INT NOT NULL DEFAULT 3 CHECK (bracket_best_of >= 1),
    final_best_of            INT NOT NULL DEFAULT 5 CHECK (final_best_of >= 1),
    pool_size                INT,                     -- nb de joueurs par poule (4 par défaut)
    qualifiers_per_pool      INT,                     -- top N de chaque poule qui passe
    max_participants         INT,
    match_deadline_hours     INT,                     -- temps avant deadline pour chaque match
    registration_deadline    TIMESTAMP,
    starts_at                TIMESTAMP,
    winner_player_id         BIGINT REFERENCES players(id) ON DELETE SET NULL,
    created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at               TIMESTAMP,
    finished_at              TIMESTAMP
);
CREATE INDEX idx_tournaments_club ON tournaments(club_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);

CREATE TABLE tournament_pools (
    id              BIGSERIAL PRIMARY KEY,
    tournament_id   BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name            VARCHAR(32) NOT NULL    -- "Poule A", "Poule B", …
);
CREATE INDEX idx_tournament_pools_tournament ON tournament_pools(tournament_id);

CREATE TABLE tournament_participants (
    id                BIGSERIAL PRIMARY KEY,
    tournament_id     BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id         BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    pool_id           BIGINT REFERENCES tournament_pools(id) ON DELETE SET NULL,
    seed              INT,                       -- attribué au démarrage
    status            VARCHAR(24) NOT NULL DEFAULT 'REGISTERED'
                      CHECK (status IN ('REGISTERED', 'IN_TOURNAMENT', 'ELIMINATED',
                                        'FORFEITED', 'CHAMPION', 'RUNNER_UP',
                                        'THIRD_PLACE', 'FOURTH_PLACE')),
    final_position    INT,                       -- 1, 2, 3, 4, … attribué à la fin
    pool_points       INT NOT NULL DEFAULT 0,
    pool_wins         INT NOT NULL DEFAULT 0,
    pool_losses       INT NOT NULL DEFAULT 0,
    pool_draws        INT NOT NULL DEFAULT 0,
    pool_balls_for    INT NOT NULL DEFAULT 0,    -- billes laissées à mes adversaires (à mon avantage)
    pool_balls_against INT NOT NULL DEFAULT 0,   -- billes que j'ai laissées (en ma défaveur, tie-break)
    elo_change        INT,                       -- snapshot du delta Elo final
    registered_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tournament_id, player_id)
);
CREATE INDEX idx_tparticipants_tournament ON tournament_participants(tournament_id);
CREATE INDEX idx_tparticipants_player ON tournament_participants(player_id);
CREATE INDEX idx_tparticipants_pool ON tournament_participants(pool_id);

CREATE TABLE tournament_rounds (
    id              BIGSERIAL PRIMARY KEY,
    tournament_id   BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    phase           VARCHAR(24) NOT NULL
                    CHECK (phase IN ('POOL', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTERFINAL',
                                     'SEMIFINAL', 'THIRD_PLACE', 'FINAL')),
    round_number    INT NOT NULL,            -- ordre logique : 1=poule, 2=R32, 3=R16, …
    best_of         INT NOT NULL,
    deadline        TIMESTAMP,
    status          VARCHAR(24) NOT NULL DEFAULT 'WAITING'
                    CHECK (status IN ('WAITING', 'IN_PROGRESS', 'COMPLETED'))
);
CREATE INDEX idx_trounds_tournament ON tournament_rounds(tournament_id);

CREATE TABLE tournament_matches (
    id                  BIGSERIAL PRIMARY KEY,
    tournament_id       BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round_id            BIGINT NOT NULL REFERENCES tournament_rounds(id) ON DELETE CASCADE,
    pool_id             BIGINT REFERENCES tournament_pools(id) ON DELETE SET NULL,
    match_id            BIGINT REFERENCES matches(id) ON DELETE SET NULL, -- créé quand les 2 joueurs sont connus
    player1_id          BIGINT REFERENCES players(id) ON DELETE SET NULL,
    player2_id          BIGINT REFERENCES players(id) ON DELETE SET NULL,
    bracket_position    INT,                              -- ordre dans le bracket pour le rendu
    next_match_id       BIGINT REFERENCES tournament_matches(id) ON DELETE SET NULL,
    next_match_slot     VARCHAR(2),                       -- "P1" ou "P2" : slot que le winner occupera
    status              VARCHAR(24) NOT NULL DEFAULT 'WAITING'
                        CHECK (status IN ('WAITING', 'READY', 'IN_PROGRESS',
                                          'PENDING_VALIDATION', 'COMPLETED',
                                          'DEADLINE_PASSED', 'DOUBLE_FORFEITED')),
    winner_id           BIGINT REFERENCES players(id) ON DELETE SET NULL,
    deadline            TIMESTAMP,
    completed_at        TIMESTAMP
);
CREATE INDEX idx_tmatches_tournament ON tournament_matches(tournament_id);
CREATE INDEX idx_tmatches_round ON tournament_matches(round_id);
CREATE INDEX idx_tmatches_status ON tournament_matches(status);
CREATE INDEX idx_tmatches_player1 ON tournament_matches(player1_id);
CREATE INDEX idx_tmatches_player2 ON tournament_matches(player2_id);

CREATE TABLE password_reset_requests (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              VARCHAR(16) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'RESOLVED', 'REJECTED')),
    requested_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    resolved_at         TIMESTAMP
);
CREATE INDEX idx_pwd_reset_status ON password_reset_requests(status);
CREATE INDEX idx_pwd_reset_user ON password_reset_requests(user_id);

CREATE TABLE user_avatars (
    user_id      BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(64)  NOT NULL,
    file_path    VARCHAR(255) NOT NULL,        -- chemin relatif au app.upload.dir
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Seed : clubs --------------------------------------------

INSERT INTO clubs (name) VALUES ('Paris'), ('Lyon'), ('Marseille');

-- ---------- Seed : users (BCrypt cost 10, htpasswd) ----------------
-- admin / admin
-- gerant / gerant   (gère Paris + Lyon)
-- gerantmars / gerantmars (gère Marseille)
-- alice / alice (joueuse, Paris + Lyon)
-- bob / bob     (joueur, Paris)
-- charlie / charlie (joueur, Lyon)
-- emma / emma   (joueuse, Marseille)

INSERT INTO users (username, password, role) VALUES
  ('admin',      '$2y$10$W7Y18xDAxbn0kok5DK/2ieac8jTs1wf0FtM.19gro7DlGz9wjZ66O', 'ADMIN'),
  ('gerant',     '$2y$10$MKOqZlW3K7o0N3xnd3YpYeqhdor.1fFmLlwnNoabHQFfSw6p.EUd.', 'GERANT'),
  ('gerantmars', '$2y$10$qSU8K9aQyESSAGhcQDt6XOrWxXRwjre5lqWXTaPmze6DwkEfXtuMq', 'GERANT'),
  ('alice',      '$2y$10$VYxPSKSGOQFLR9PP8o4.RuOn7yuv8YLZXqM3L1J.mnOLmb8WiKucK', 'JOUEUR'),
  ('bob',        '$2y$10$BbEoVgFQsHv5D8HtQHbDSuEggQIgfdWcVN90P8LaLzhcUVygG70NW', 'JOUEUR'),
  ('charlie',    '$2y$10$97r1CXHt5Kln44AqxpRWZ.8Sgnup7ArfarxD2HE8/ylchXlcauMu6', 'JOUEUR'),
  ('emma',       '$2y$10$BR8/8hnloJ.MOi3WZfY7z.NCWjYDZobRxlXlzNNsydpmG6/2scVrS', 'JOUEUR');

-- ---------- Seed : gérants <-> clubs --------------------------------

INSERT INTO user_clubs (user_id, club_id)
SELECT u.id, c.id FROM users u, clubs c
WHERE u.username = 'gerant' AND c.name IN ('Paris', 'Lyon');

INSERT INTO user_clubs (user_id, club_id)
SELECT u.id, c.id FROM users u, clubs c
WHERE u.username = 'gerantmars' AND c.name = 'Marseille';

-- ---------- Seed : billiards ----------------------------------------

INSERT INTO billiard_tables (name, club_id)
SELECT 'Table 1', id FROM clubs WHERE name = 'Paris';
INSERT INTO billiard_tables (name, club_id)
SELECT 'Table 2', id FROM clubs WHERE name = 'Paris';
INSERT INTO billiard_tables (name, club_id)
SELECT 'Table Lyon-A', id FROM clubs WHERE name = 'Lyon';
INSERT INTO billiard_tables (name, club_id)
SELECT 'Table Marseille-1', id FROM clubs WHERE name = 'Marseille';

-- ---------- Seed : players + multi-club -----------------------------

-- Alice : Paris (principal) + Lyon
INSERT INTO players (name, elo, user_id, primary_club_id)
SELECT 'Alice', 1200, u.id, c.id
FROM users u, clubs c WHERE u.username = 'alice' AND c.name = 'Paris';

INSERT INTO player_clubs (player_id, club_id)
SELECT p.id, c.id FROM players p, clubs c
WHERE p.name = 'Alice' AND c.name IN ('Paris', 'Lyon');

-- Bob : Paris uniquement
INSERT INTO players (name, elo, user_id, primary_club_id)
SELECT 'Bob', 1100, u.id, c.id
FROM users u, clubs c WHERE u.username = 'bob' AND c.name = 'Paris';

INSERT INTO player_clubs (player_id, club_id)
SELECT p.id, c.id FROM players p, clubs c WHERE p.name = 'Bob' AND c.name = 'Paris';

-- Charlie : Lyon uniquement
INSERT INTO players (name, elo, user_id, primary_club_id)
SELECT 'Charlie', 1050, u.id, c.id
FROM users u, clubs c WHERE u.username = 'charlie' AND c.name = 'Lyon';

INSERT INTO player_clubs (player_id, club_id)
SELECT p.id, c.id FROM players p, clubs c WHERE p.name = 'Charlie' AND c.name = 'Lyon';

-- Emma : Marseille uniquement
INSERT INTO players (name, elo, user_id, primary_club_id)
SELECT 'Emma', 1080, u.id, c.id
FROM users u, clubs c WHERE u.username = 'emma' AND c.name = 'Marseille';

INSERT INTO player_clubs (player_id, club_id)
SELECT p.id, c.id FROM players p, clubs c WHERE p.name = 'Emma' AND c.name = 'Marseille';
