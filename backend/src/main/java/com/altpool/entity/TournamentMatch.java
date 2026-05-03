package com.altpool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tournament_matches")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TournamentMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "round_id", nullable = false)
    private TournamentRound round;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pool_id")
    private TournamentPool pool;

    /** Lien vers le Match réel (créé une fois les 2 joueurs connus). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id")
    private MatchEntity match;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player1_id")
    private Player player1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player2_id")
    private Player player2;

    @Column(name = "bracket_position")
    private Integer bracketPosition;

    /** Lien vers le match suivant où ira le winner (bracket). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "next_match_id")
    private TournamentMatch nextMatch;

    /** "P1" ou "P2" — slot que le winner occupera dans le match suivant. */
    @Column(name = "next_match_slot", length = 2)
    private String nextMatchSlot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TournamentMatchStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_id")
    private Player winner;

    private LocalDateTime deadline;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    void onCreate() {
        if (status == null) status = TournamentMatchStatus.WAITING;
    }
}
