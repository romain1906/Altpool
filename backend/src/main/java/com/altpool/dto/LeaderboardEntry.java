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
}
