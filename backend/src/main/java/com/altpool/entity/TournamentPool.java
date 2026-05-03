package com.altpool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tournament_pools")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TournamentPool {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @Column(nullable = false)
    private String name;

    @OneToMany(mappedBy = "pool", fetch = FetchType.LAZY)
    @Builder.Default
    private List<TournamentParticipant> participants = new ArrayList<>();
}
