package com.altpool.entity;

public enum TournamentStatus {
    DRAFT,            // créé mais pas publié (réservé pour usage futur)
    REGISTRATION,     // inscriptions ouvertes
    READY_TO_START,   // inscriptions closes, en attente du gérant pour démarrer
    IN_PROGRESS,      // tournoi lancé
    FINISHED,         // tournoi terminé, Elo appliqué
    CANCELLED
}
