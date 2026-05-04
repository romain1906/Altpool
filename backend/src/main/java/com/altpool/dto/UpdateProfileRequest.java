package com.altpool.dto;

import com.altpool.entity.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UpdateProfileRequest {
    /** Nom affiché du joueur (Player.name) — uniquement pour les JOUEUR. */
    @Size(min = 1, max = 255)
    private String playerName;

    @Email
    @Size(max = 255)
    private String email;

    private LocalDate birthDate;

    private Gender gender;

    @Size(max = 32)
    private String phone;

    @Size(max = 64)
    private String country;
}
