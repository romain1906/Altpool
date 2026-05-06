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

    /**
     * Tous les matchs RANKED validés (avec un winner), du plus récent au plus ancien.
     * Utilisé pour calculer les win/lose streaks de chaque joueur.
     */
    @Query("""
        SELECT m FROM MatchEntity m
        WHERE m.status = MatchStatus.VALIDATED
          AND m.type = MatchType.RANKED
          AND m.winner IS NOT NULL
        ORDER BY COALESCE(m.validatedAt, m.finishedAt, m.createdAt) DESC
    """)
    List<MatchEntity> findValidatedRankedForStreaks();
}
