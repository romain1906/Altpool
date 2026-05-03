package com.altpool.dto;

import com.altpool.entity.TournamentType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateTournamentRequest {
    @NotBlank
    private String name;
    private String description;

    @NotNull
    private Long clubId;

    @NotNull
    private TournamentType type;

    /** Tournoi classé (impacte l'Elo) ou amical. */
    private Boolean ranked;

    @NotNull @Min(1)
    private Integer poolBestOf;
    @NotNull @Min(1)
    private Integer bracketBestOf;
    @NotNull @Min(1)
    private Integer finalBestOf;

    /** Nb joueurs par poule (si POOL_AND_BRACKET ou POOL_ONLY). Défaut 4. */
    private Integer poolSize;
    /** Top N qui passent au bracket (si POOL_AND_BRACKET). Défaut 2. */
    private Integer qualifiersPerPool;

    private Integer maxParticipants;
    /** Délai en heures pour jouer un match du tournoi avant deadline. */
    private Integer matchDeadlineHours;

    @NotNull
    private LocalDateTime registrationDeadline;
    private LocalDateTime startsAt;
}
