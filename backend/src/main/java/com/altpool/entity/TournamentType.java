package com.altpool.entity;

public enum TournamentType {
    /** Bracket à élimination directe uniquement. */
    BRACKET_ONLY,
    /** Phase de poules puis bracket avec les qualifiés. */
    POOL_AND_BRACKET,
    /** Round robin uniquement, classement final par points. */
    POOL_ONLY
}
