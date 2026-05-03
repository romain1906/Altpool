package com.altpool.service;

import com.altpool.dto.ReservationDto;
import com.altpool.entity.BilliardTable;
import com.altpool.entity.Player;
import com.altpool.entity.Reservation;
import com.altpool.entity.Role;
import com.altpool.entity.User;
import com.altpool.exception.ApiException;
import com.altpool.repository.BilliardTableRepository;
import com.altpool.repository.PlayerRepository;
import com.altpool.repository.ReservationRepository;
import com.altpool.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final BilliardTableRepository billiardRepository;
    private final UserRepository userRepository;
    private final PlayerRepository playerRepository;

    @Transactional(readOnly = true)
    public List<ReservationDto> findAll() {
        return reservationRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional
    public ReservationDto create(ReservationDto dto, String username) {
        if (dto.getStartTime() == null || dto.getEndTime() == null) {
            throw ApiException.badRequest("Start and end times are required");
        }
        if (!dto.getEndTime().isAfter(dto.getStartTime())) {
            throw ApiException.badRequest("End time must be after start time");
        }

        BilliardTable billiard = billiardRepository.findById(dto.getBilliardId())
                .orElseThrow(() -> ApiException.notFound("Billiard not found"));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));

        // ADMIN et GERANT (du club du billard) bypass.
        boolean isAdmin = user.getRole() == Role.ADMIN;
        boolean isManagerOfClub = user.getRole() == Role.GERANT
                && user.getManagedClubs().stream()
                        .anyMatch(c -> c.getId().equals(billiard.getClub().getId()));
        boolean playerCanPlayHere = false;
        if (!isAdmin && !isManagerOfClub) {
            Player p = playerRepository.findByUserId(user.getId()).orElse(null);
            if (p == null) {
                throw ApiException.forbidden("No player profile linked to your account");
            }
            playerCanPlayHere = p.getClubs().stream()
                    .anyMatch(c -> c.getId().equals(billiard.getClub().getId()));
            if (!playerCanPlayHere) {
                throw ApiException.forbidden("You are not registered in this club");
            }
        }

        List<Reservation> conflicts = reservationRepository.findConflicts(
                billiard.getId(), dto.getStartTime(), dto.getEndTime());
        if (!conflicts.isEmpty()) {
            throw ApiException.conflict("Billiard already reserved for this period");
        }

        Reservation r = Reservation.builder()
                .billiard(billiard)
                .user(user)
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .build();
        return toDto(reservationRepository.save(r));
    }

    public ReservationDto toDto(Reservation r) {
        return ReservationDto.builder()
                .id(r.getId())
                .billiardId(r.getBilliard().getId())
                .billiardName(r.getBilliard().getName())
                .userId(r.getUser().getId())
                .username(r.getUser().getUsername())
                .startTime(r.getStartTime())
                .endTime(r.getEndTime())
                .build();
    }
}
