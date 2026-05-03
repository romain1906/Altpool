package com.altpool.dto;

import com.altpool.entity.TournamentStatus;
import com.altpool.entity.TournamentType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TournamentDto {
    private Long id;
    private String name;
    private String description;

    private TournamentType type;
    private TournamentStatus status;
    private Boolean ranked;

    private Long clubId;
    private String clubName;

    private Long createdByUserId;
    private String createdByUsername;

    private Integer poolBestOf;
    private Integer bracketBestOf;
    private Integer finalBestOf;
    private Integer poolSize;
    private Integer qualifiersPerPool;
    private Integer maxParticipants;
    private Integer matchDeadlineHours;

    private LocalDateTime registrationDeadline;
    private LocalDateTime startsAt;
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;

    private Long winnerPlayerId;
    private String winnerName;

    private Integer participantCount;
    /** Renseigné par le service selon l'utilisateur courant. */
    private Boolean isRegistered;
    /** L'utilisateur courant peut-il piloter ce tournoi (admin ou gérant du club). */
    private Boolean canManage;

    /** Liste des participants (incluse seulement sur GET d'un détail). */
    private List<TournamentParticipantDto> participants;
}
