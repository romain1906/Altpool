package com.altpool.repository;

import com.altpool.entity.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PlayerRepository extends JpaRepository<Player, Long> {

    List<Player> findAllByOrderByEloDesc();

    @Query("""
        SELECT DISTINCT p FROM Player p
        JOIN p.clubs c
        WHERE c.id = :clubId
        ORDER BY p.elo DESC
    """)
    List<Player> findByClubIdOrderByEloDesc(@Param("clubId") Long clubId);

    Optional<Player> findByUserId(Long userId);

    Optional<Player> findByNameIgnoreCase(String name);
}
