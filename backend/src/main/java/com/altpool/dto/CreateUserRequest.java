package com.altpool.dto;

import com.altpool.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateUserRequest {
    @NotBlank
    private String username;
    @NotBlank
    private String password;
    @NotNull
    private Role role;
    /** Si role = GERANT : clubs à gérer. */
    private List<Long> managedClubIds;
}
