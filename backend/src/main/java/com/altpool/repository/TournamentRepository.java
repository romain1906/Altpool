package com.altpool.repository;

import com.altpool.entity.Tournament;
import com.altpool.entity.TournamentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TournamentRepository extends JpaRepository<Tournament, Long> {

    List<Tournament> findAllByOrderByCreatedAtDesc();

    List<Tournament> findByClubIdOrderByCreatedAtDesc(Long clubId);

    List<Tournament> findByStatusOrderByCreatedAtDesc(TournamentStatus status);

    List<Tournament> findByClubIdInOrderByCreatedAtDesc(List<Long> clubIds);
}
