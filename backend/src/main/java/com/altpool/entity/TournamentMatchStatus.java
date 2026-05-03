package com.altpool.entity;

public enum TournamentMatchStatus {
    WAITING,             // un ou les 2 joueurs encore inconnus (issus de matchs amont)
    READY,               // 2 joueurs connus, peut être joué
    IN_PROGRESS,         // match en cours d'encodage
    PENDING_VALIDATION,  // score atteint, attente validation
    COMPLETED,           // match validé, winner connu
    DEADLINE_PASSED,     // deadline atteinte sans résultat (encore jouable)
    DOUBLE_FORFEITED     // les 2 joueurs déclarés forfait par le gérant
}
