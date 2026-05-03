package com.altpool.dto;

import com.altpool.entity.TournamentParticipantStatus;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TournamentParticipantDto {
    private Long id;
    private Long playerId;
    private String playerName;
    private Integer playerElo;
    private Long playerUserId;
    private Long poolId;
    private String poolName;
    private Integer seed;
    private TournamentParticipantStatus status;
    private Integer finalPosition;
    private Integer poolPoints;
    private Integer poolWins;
    private Integer poolLosses;
    private Integer poolDraws;
    private Integer poolBallsFor;
    private Integer poolBallsAgainst;
    private Integer eloChange;
}
