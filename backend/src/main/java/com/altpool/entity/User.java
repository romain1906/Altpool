package com.altpool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    /** Pour les GERANT : clubs qu'ils gèrent (M2M). */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_clubs",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "club_id")
    )
    @Builder.Default
    private Set<Club> managedClubs = new HashSet<>();
}
