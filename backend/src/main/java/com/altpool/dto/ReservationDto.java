package com.altpool.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReservationDto {
    private Long id;
    @NotNull
    private Long billiardId;
    private String billiardName;
    private Long userId;
    private String username;
    @NotNull
    private LocalDateTime startTime;
    @NotNull
    private LocalDateTime endTime;
}
