package com.altpool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.Period;
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

    // ----- Profil personnel ----------------------------------------------

    @Column
    private String email;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column
    private Gender gender;

    @Column
    private String phone;

    @Column
    private String country;

    /** Pour les GERANT : clubs qu'ils gèrent (M2M). */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_clubs",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "club_id")
    )
    @Builder.Default
    private Set<Club> managedClubs = new HashSet<>();

    // ----- Helpers -------------------------------------------------------

    /**
     * Le profil est "complet" quand email + date de naissance + genre sont renseignés
     * et que l'âge est ≥ 16 ans. Indispensable pour les actions d'engagement (matchs,
     * inscription tournoi, réservation) chez les JOUEUR.
     */
    public boolean isProfileComplete() {
        if (email == null || email.isBlank()) return false;
        if (birthDate == null) return false;
        if (gender == null || gender == Gender.NOT_SPECIFIED) return false;
        int age = Period.between(birthDate, LocalDate.now()).getYears();
        return age >= 16;
    }
}
