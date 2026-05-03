package com.altpool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ResolveResetRequest {
    @NotBlank
    private String newPassword;
}
