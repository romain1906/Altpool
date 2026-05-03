package com.altpool.repository;

import com.altpool.entity.BilliardTable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BilliardTableRepository extends JpaRepository<BilliardTable, Long> {
    List<BilliardTable> findByClubId(Long clubId);
}
