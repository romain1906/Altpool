package com.altpool.dto;

import jakarta.validation.constraints.Size;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UpdateProfileRequest {
    /** Nom affiché du joueur (Player.name) — uniquement pour les JOUEUR. */
    @Size(min = 1, max = 255)
    private String playerName;
}
