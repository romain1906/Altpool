package com.altpool.repository;

import com.altpool.entity.TournamentMatch;
import com.altpool.entity.TournamentMatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TournamentMatchRepository extends JpaRepository<TournamentMatch, Long> {

    List<TournamentMatch> findByTournamentIdOrderByIdAsc(Long tournamentId);

    List<TournamentMatch> findByRoundIdOrderByBracketPositionAsc(Long roundId);

    Optional<TournamentMatch> findByMatchId(Long matchId);

    @Query("""
        SELECT tm FROM TournamentMatch tm
        WHERE tm.status = :status
          AND (tm.player1.user.id = :userId OR tm.player2.user.id = :userId)
        ORDER BY tm.deadline ASC NULLS LAST
    """)
    List<TournamentMatch> findByStatusAndUserId(@Param("status") TournamentMatchStatus status,
                                                @Param("userId") Long userId);
}
