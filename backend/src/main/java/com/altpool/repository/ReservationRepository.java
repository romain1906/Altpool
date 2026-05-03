package com.altpool.repository;

import com.altpool.entity.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    @Query("""
        SELECT r FROM Reservation r
        WHERE r.billiard.id = :billiardId
          AND r.startTime < :end
          AND r.endTime   > :start
    """)
    List<Reservation> findConflicts(@Param("billiardId") Long billiardId,
                                    @Param("start") LocalDateTime start,
                                    @Param("end") LocalDateTime end);

    List<Reservation> findByUserId(Long userId);
}
