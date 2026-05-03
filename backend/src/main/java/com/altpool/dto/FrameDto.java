package com.altpool.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FrameDto {
    private Long id;
    private Integer frameNumber;
    @NotNull
    private Long winnerId;
    private Long loserId;
    private String winnerName;
    private String loserName;
    @NotNull
    private Boolean endedOnBlack;
    @NotNull @Min(0) @Max(7)
    private Integer ballsRemaining;
    private Boolean foulFinish;
    private Integer durationSec;
    private String playedAt;
}
