package com.altpool.repository;

import com.altpool.entity.Frame;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FrameRepository extends JpaRepository<Frame, Long> {
    List<Frame> findByMatchIdOrderByFrameNumberAsc(Long matchId);
    long countByMatchId(Long matchId);
}
