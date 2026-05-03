package com.altpool.repository;

import com.altpool.entity.TournamentRound;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TournamentRoundRepository extends JpaRepository<TournamentRound, Long> {
    List<TournamentRound> findByTournamentIdOrderByRoundNumberAsc(Long tournamentId);
}
