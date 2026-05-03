package com.altpool.dto;

import com.altpool.entity.Role;
import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserDto {
    private Long id;
    private String username;
    private Role role;
    /** Nom du joueur si l'utilisateur a un profil joueur (Player.name). */
    private String playerName;
    /** Elo si JOUEUR. */
    private Integer elo;
    /** Pour les GERANT : clubs gérés. */
    private List<ClubDto> managedClubs;
    /** Pour les JOUEUR : clubs où il joue. */
    private List<ClubDto> playerClubs;
    /** Pour les JOUEUR : id du club principal. */
    private Long primaryClubId;
}
