package com.altpool.dto;

import com.altpool.entity.MatchStatus;
import com.altpool.entity.MatchType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchDto {
    private Long id;
    private MatchType type;
    private Integer bestOf;
    private Long player1Id;
    private String player1Name;
    private Integer player1Elo;
    private Long player1UserId;
    private Long player2Id;
    private String player2Name;
    private Integer player2Elo;
    private Long player2UserId;
    private Long clubId;
    private String clubName;
    private Long reservationId;
    private MatchStatus status;
    private Long winnerId;
    private String winnerName;
    private Integer scoreP1;
    private Integer scoreP2;
    private Integer eloChangeWinner;
    private Integer eloChangeLoser;
    private String createdByUsername;
    private String validatedByUsername;
    private LocalDateTime createdAt;
    private LocalDateTime finishedAt;
    private LocalDateTime validatedAt;
    private List<FrameDto> frames;
}
