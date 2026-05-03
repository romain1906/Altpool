package com.altpool.dto;

import com.altpool.entity.MatchType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateMatchRequest {
    @NotNull
    private Long player1Id;
    @NotNull
    private Long player2Id;
    @NotNull
    private MatchType type;
    /** 1 (BO1), 3 (BO3), 5 (BO5), 7 (BO7), … doit être impair. */
    @NotNull @Min(1)
    private Integer bestOf;
    private Long clubId;
    private Long reservationId;
    /** Optionnel : si fourni, le match est créé puis fini d'un coup (mode after-the-fact). */
    @Valid
    private List<FrameDto> frames;
}
