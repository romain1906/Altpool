package com.altpool.entity;

public enum TournamentParticipantStatus {
    REGISTERED,        // inscrit, en attente du démarrage
    IN_TOURNAMENT,     // joue actuellement
    ELIMINATED,        // sorti après une défaite
    FORFEITED,         // forfait (deadline ratée)
    CHAMPION,          // 1ère place
    RUNNER_UP,         // 2ème
    THIRD_PLACE,       // 3ème
    FOURTH_PLACE       // 4ème
}
