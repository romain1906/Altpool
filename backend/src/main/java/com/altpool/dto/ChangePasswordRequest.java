package com.altpool.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChangePasswordRequest {
    @NotBlank
    private String oldPassword;
    @NotBlank
    @Size(min = 3, max = 255)
    private String newPassword;
}
