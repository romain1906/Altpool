package com.altpool.dto;

import com.altpool.entity.ResetStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PasswordResetRequestDto {
    private Long id;
    private Long userId;
    private String username;
    /** Nom du joueur (Player.name) si le user a un profil joueur. */
    private String playerName;
    /** Clubs où ce joueur est rattaché. */
    private List<ClubDto> clubs;
    private ResetStatus status;
    private LocalDateTime requestedAt;
    private String resolvedByUsername;
    private LocalDateTime resolvedAt;
}
