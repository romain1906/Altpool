package com.altpool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tournament_participants",
       uniqueConstraints = @UniqueConstraint(columnNames = {"tournament_id", "player_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TournamentParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pool_id")
    private TournamentPool pool;

    private Integer seed;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TournamentParticipantStatus status;

    @Column(name = "final_position")
    private Integer finalPosition;

    @Column(name = "pool_points", nullable = false)
    private Integer poolPoints;

    @Column(name = "pool_wins", nullable = false)
    private Integer poolWins;

    @Column(name = "pool_losses", nullable = false)
    private Integer poolLosses;

    @Column(name = "pool_draws", nullable = false)
    private Integer poolDraws;

    @Column(name = "pool_balls_for", nullable = false)
    private Integer poolBallsFor;

    @Column(name = "pool_balls_against", nullable = false)
    private Integer poolBallsAgainst;

    @Column(name = "elo_change")
    private Integer eloChange;

    @Column(name = "registered_at", nullable = false)
    private LocalDateTime registeredAt;

    @PrePersist
    void onCreate() {
        if (registeredAt == null) registeredAt = LocalDateTime.now();
        if (status == null) status = TournamentParticipantStatus.REGISTERED;
        if (poolPoints == null) poolPoints = 0;
        if (poolWins == null) poolWins = 0;
        if (poolLosses == null) poolLosses = 0;
        if (poolDraws == null) poolDraws = 0;
        if (poolBallsFor == null) poolBallsFor = 0;
        if (poolBallsAgainst == null) poolBallsAgainst = 0;
    }
}
