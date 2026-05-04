package com.altpool.service;

import com.altpool.entity.Player;
import com.altpool.entity.Role;
import com.altpool.entity.User;
import com.altpool.exception.ApiException;

/**
 * Vérifications transverses sur la complétude de profil.
 * Règle : seuls les JOUEUR sont soumis au gating.
 * Les ADMIN et GERANT (sans profil joueur) peuvent piloter sans limitation.
 */
public final class ProfileGuard {

    private ProfileGuard() {}

    /** Lève une exception si le user est JOUEUR avec profil incomplet. */
    public static void requireCompleteProfile(User u, String action) {
        if (u == null) return;
        if (u.getRole() == Role.ADMIN || u.getRole() == Role.GERANT) return;
        if (!u.isProfileComplete()) {
            throw ApiException.forbidden(
                "Complète ton profil (email, date de naissance, genre) pour " + action);
        }
    }

    /** Vérifie qu'un Player (et le User derrière) ont leur profil complet. */
    public static void requireCompletePlayer(Player p, String action) {
        if (p == null) return;
        User u = p.getUser();
        if (u == null) return;
        if (u.getRole() != Role.JOUEUR) return;
        if (!u.isProfileComplete()) {
            throw ApiException.forbidden(
                p.getName() + " n'a pas encore complété son profil — impossible de " + action);
        }
    }
}
