package com.altpool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ClubDto {
    private Long id;
    @NotBlank
    private String name;
}
