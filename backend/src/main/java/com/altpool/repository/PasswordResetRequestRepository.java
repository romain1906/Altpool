package com.altpool.repository;

import com.altpool.entity.PasswordResetRequest;
import com.altpool.entity.ResetStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, Long> {

    List<PasswordResetRequest> findByStatusOrderByRequestedAtDesc(ResetStatus status);

    /**
     * Demandes en attente impactant un gérant donné :
     * - le user demandeur a un Player rattaché à un club que ce gérant gère.
     */
    @Query("""
        SELECT DISTINCT r FROM PasswordResetRequest r
        JOIN Player p ON p.user = r.user
        JOIN p.clubs pc
        JOIN com.altpool.entity.User g ON g.id = :gerantId
        JOIN g.managedClubs gc
        WHERE r.status = 'PENDING'
          AND pc.id = gc.id
        ORDER BY r.requestedAt DESC
    """)
    List<PasswordResetRequest> findPendingForGerant(@Param("gerantId") Long gerantId);
}
