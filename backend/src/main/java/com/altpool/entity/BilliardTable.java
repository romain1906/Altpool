package com.altpool.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "billiard_tables")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BilliardTable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;
}
