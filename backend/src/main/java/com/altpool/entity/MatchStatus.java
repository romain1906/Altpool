package com.altpool.entity;

public enum MatchStatus {
    /** Le match est en cours, des frames peuvent encore être ajoutées. */
    IN_PROGRESS,
    /** Le score final est atteint, attente de validation par le perdant ou un admin. */
    PENDING_VALIDATION,
    /** Validé : Elo appliqué (si RANKED). */
    VALIDATED,
    /** Refusé : aucun changement Elo. */
    REJECTED
}
