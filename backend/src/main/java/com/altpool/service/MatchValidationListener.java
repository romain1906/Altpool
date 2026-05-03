package com.altpool.service;

import com.altpool.entity.MatchEntity;

/**
 * Hook appelé à chaque fois qu'un Match est validé/refusé.
 * Permet à TournamentService de réagir sans créer de dépendance circulaire.
 */
public interface MatchValidationListener {
    void onValidated(MatchEntity match);
    void onRejected(MatchEntity match);
}
