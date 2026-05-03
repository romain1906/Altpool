package com.altpool.repository;

import com.altpool.entity.MatchEntity;
import com.altpool.entity.MatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MatchRepository extends JpaRepository<MatchEntity, Long> {

    List<MatchEntity> findAllByOrderByCreatedAtDesc();

    List<MatchEntity> findByStatusOrderByCreatedAtDesc(MatchStatus status);

    @Query("""
        SELECT m FROM MatchEntity m
        WHERE m.player1.id = :playerId OR m.player2.id = :playerId
        ORDER BY m.createdAt DESC
    """)
    List<MatchEntity> findByPlayerId(@Param("playerId") Long playerId);

    @Query("""
        SELECT m FROM MatchEntity m
        WHERE m.status = 'PENDING_VALIDATION'
          AND (m.player1.user.id = :userId OR m.player2.user.id = :userId)
        ORDER BY m.createdAt DESC
    """)
    List<MatchEntity> findPendingForUser(@Param("userId") Long userId);

    long countByStatus(MatchStatus status);
}
