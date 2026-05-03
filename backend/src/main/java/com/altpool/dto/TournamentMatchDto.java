package com.altpool.dto;

import com.altpool.entity.TournamentMatchStatus;
import com.altpool.entity.TournamentPhase;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TournamentMatchDto {
    private Long id;
    private Long tournamentId;
    private String tournamentName;
    private Long roundId;
    private TournamentPhase phase;
    private Integer roundNumber;
    private Integer bestOf;
    private Long poolId;
    private String poolName;
    private Long matchId;            // lien vers le Match réel encodable
    private Long player1Id;
    private String player1Name;
    private Integer player1Elo;
    private Long player1UserId;
    private Long player2Id;
    private String player2Name;
    private Integer player2Elo;
    private Long player2UserId;
    private Integer bracketPosition;
    private TournamentMatchStatus status;
    private Long winnerId;
    private String winnerName;
    private LocalDateTime deadline;
    private LocalDateTime completedAt;
    private Integer scoreP1;
    private Integer scoreP2;
}
