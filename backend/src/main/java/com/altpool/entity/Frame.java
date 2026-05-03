package com.altpool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "frames")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Frame {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private MatchEntity match;

    @Column(name = "frame_number", nullable = false)
    private Integer frameNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "winner_id", nullable = false)
    private Player winner;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "loser_id", nullable = false)
    private Player loser;

    @Column(name = "ended_on_black", nullable = false)
    private Boolean endedOnBlack;

    /** Billes restantes au tableau pour le perdant (0 = aucune, 7 = max). */
    @Column(name = "balls_remaining", nullable = false)
    private Integer ballsRemaining;

    @Column(name = "foul_finish", nullable = false)
    private Boolean foulFinish;

    @Column(name = "duration_sec")
    private Integer durationSec;

    @Column(name = "played_at", nullable = false)
    private LocalDateTime playedAt;

    @PrePersist
    void onCreate() {
        if (playedAt == null) playedAt = LocalDateTime.now();
        if (endedOnBlack == null) endedOnBlack = false;
        if (foulFinish == null) foulFinish = false;
        if (ballsRemaining == null) ballsRemaining = 0;
    }
}
