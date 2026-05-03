package com.altpool.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "clubs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Club {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;
}
