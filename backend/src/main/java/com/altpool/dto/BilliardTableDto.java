package com.altpool.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BilliardTableDto {
    private Long id;
    @NotBlank
    private String name;
    @NotNull
    private Long clubId;
    private String clubName;
}
