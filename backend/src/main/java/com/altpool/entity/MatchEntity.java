package com.altpool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "matches")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatchType type;

    @Column(name = "best_of", nullable = false)
    private Integer bestOf;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player1_id", nullable = false)
    private Player player1;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player2_id", nullable = false)
    private Player player2;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id")
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id")
    private Reservation reservation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatchStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_id")
    private Player winner;

    @Column(name = "score_p1", nullable = false)
    private Integer scoreP1;

    @Column(name = "score_p2", nullable = false)
    private Integer scoreP2;

    @Column(name = "elo_change_winner")
    private Integer eloChangeWinner;

    @Column(name = "elo_change_loser")
    private Integer eloChangeLoser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "validated_by_user_id")
    private User validatedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @OneToMany(mappedBy = "match", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("frameNumber ASC")
    @Builder.Default
    private List<Frame> frames = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = MatchStatus.IN_PROGRESS;
        if (scoreP1 == null) scoreP1 = 0;
        if (scoreP2 == null) scoreP2 = 0;
    }

    /** Helper : retourne le perdant si le match a un winner. */
    public Player getLoser() {
        if (winner == null) return null;
        return winner.getId().equals(player1.getId()) ? player2 : player1;
    }

    /** Score de victoire requis : ceil(bestOf / 2). */
    public int targetWins() {
        return (bestOf / 2) + 1;
    }
}
