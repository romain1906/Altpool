package com.altpool.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LeaderboardEntry {
    private Integer rank;
    private Long playerId;
    private String name;
    private Integer elo;
    private String primaryClubName;
}
