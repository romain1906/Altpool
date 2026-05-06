package com.altpool.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LeaderboardEntry {
    private Integer rank;
    private Long playerId;
    /** ID du User lié au Player (peut être null) — utilisé pour afficher l'avatar. */
    private Long userId;
    private String name;
    private Integer elo;
    private String primaryClubName;
    /** Nombre de victoires consécutives sur les matchs RANKED validés les plus récents. 0 si la dernière partie est une défaite. */
    private Integer winStreak;
    /** Nombre de défaites consécutives sur les matchs RANKED validés les plus récents. 0 si la dernière partie est une victoire. */
    private Integer loseStreak;
}
