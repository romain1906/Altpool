package com.altpool.dto;

import com.altpool.entity.Gender;
import com.altpool.entity.Role;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserDto {
    private Long id;
    private String username;
    private Role role;

    // Profil personnel
    private String email;
    private LocalDate birthDate;
    private Gender gender;
    private String phone;
    private String country;
    /** True si email + birthDate + gender remplis et âge ≥ 16. */
    private Boolean profileComplete;

    // Joueur
    private String playerName;
    private Integer elo;
    private List<ClubDto> playerClubs;
    private Long primaryClubId;

    // Gérant
    private List<ClubDto> managedClubs;
}
