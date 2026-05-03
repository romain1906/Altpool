package com.altpool.repository;

import com.altpool.entity.TournamentParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TournamentParticipantRepository extends JpaRepository<TournamentParticipant, Long> {

    List<TournamentParticipant> findByTournamentId(Long tournamentId);

    Optional<TournamentParticipant> findByTournamentIdAndPlayerId(Long tournamentId, Long playerId);

    boolean existsByTournamentIdAndPlayerId(Long tournamentId, Long playerId);

    List<TournamentParticipant> findByPlayerId(Long playerId);

    List<TournamentParticipant> findByPoolId(Long poolId);
}
