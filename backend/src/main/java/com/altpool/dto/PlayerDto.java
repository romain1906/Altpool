package com.altpool.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlayerDto {
    private Long id;
    @NotBlank
    private String name;
    private Integer elo;
    private Long userId;
    private String username;
    @NotNull
    private Long primaryClubId;
    private String primaryClubName;
    /** Tous les clubs où ce joueur peut jouer. */
    private List<ClubDto> clubs;
}
