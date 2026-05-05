package com.altpool.dto;

import com.altpool.entity.Role;
import lombok.*;

import java.util.List;

/**
 * Modifie le rôle et/ou les clubs gérés d'un utilisateur existant.
 * Endpoint réservé aux ADMIN.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UpdateUserRequest {
    /** Nouveau rôle (optionnel — si null, on garde le rôle actuel). */
    private Role role;
    /**
     * Liste des clubs à gérer (uniquement appliqué si le rôle final est GERANT).
     * Si role != GERANT, les clubs sont vidés automatiquement.
     */
    private List<Long> managedClubIds;
}
