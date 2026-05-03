package com.altpool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_avatars")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserAvatar {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "content_type", nullable = false, length = 64)
    private String contentType;

    /** Chemin relatif au dossier d'upload (ex. "avatars/12.png"). */
    @Column(name = "file_path", nullable = false, length = 255)
    private String filePath;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist @PreUpdate
    void touch() { updatedAt = LocalDateTime.now(); }
}
