package com.altpool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tournaments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Tournament {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TournamentType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TournamentStatus status;

    @Column(nullable = false)
    private Boolean ranked;

    @Column(name = "pool_best_of", nullable = false)
    private Integer poolBestOf;

    @Column(name = "bracket_best_of", nullable = false)
    private Integer bracketBestOf;

    @Column(name = "final_best_of", nullable = false)
    private Integer finalBestOf;

    @Column(name = "pool_size")
    private Integer poolSize;

    @Column(name = "qualifiers_per_pool")
    private Integer qualifiersPerPool;

    @Column(name = "max_participants")
    private Integer maxParticipants;

    @Column(name = "match_deadline_hours")
    private Integer matchDeadlineHours;

    @Column(name = "registration_deadline")
    private LocalDateTime registrationDeadline;

    @Column(name = "starts_at")
    private LocalDateTime startsAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_player_id")
    private Player winner;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @OneToMany(mappedBy = "tournament", fetch = FetchType.LAZY,
               cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TournamentParticipant> participants = new ArrayList<>();

    @OneToMany(mappedBy = "tournament", fetch = FetchType.LAZY,
               cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TournamentPool> pools = new ArrayList<>();

    @OneToMany(mappedBy = "tournament", fetch = FetchType.LAZY,
               cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("roundNumber ASC")
    @Builder.Default
    private List<TournamentRound> rounds = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = TournamentStatus.REGISTRATION;
        if (ranked == null) ranked = true;
        if (poolBestOf == null) poolBestOf = 1;
        if (bracketBestOf == null) bracketBestOf = 3;
        if (finalBestOf == null) finalBestOf = 5;
    }
}
