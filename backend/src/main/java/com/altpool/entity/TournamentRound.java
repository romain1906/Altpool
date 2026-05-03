package com.altpool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tournament_rounds")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TournamentRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TournamentPhase phase;

    @Column(name = "round_number", nullable = false)
    private Integer roundNumber;

    @Column(name = "best_of", nullable = false)
    private Integer bestOf;

    private LocalDateTime deadline;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TournamentRoundStatus status;

    @OneToMany(mappedBy = "round", fetch = FetchType.LAZY,
               cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TournamentMatch> matches = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (status == null) status = TournamentRoundStatus.WAITING;
    }
}
