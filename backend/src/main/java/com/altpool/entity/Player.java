package com.altpool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "players")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer elo;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    /** Club d'inscription d'origine. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "primary_club_id", nullable = false)
    private Club primaryClub;

    /** Tous les clubs où ce joueur a le droit de jouer (inclut le primaryClub). */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "player_clubs",
        joinColumns = @JoinColumn(name = "player_id"),
        inverseJoinColumns = @JoinColumn(name = "club_id")
    )
    @Builder.Default
    private Set<Club> clubs = new HashSet<>();
}
