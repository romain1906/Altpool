package com.altpool.repository;

import com.altpool.entity.TournamentPool;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TournamentPoolRepository extends JpaRepository<TournamentPool, Long> {
    List<TournamentPool> findByTournamentId(Long tournamentId);
}
