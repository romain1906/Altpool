package com.altpool.service;

import com.altpool.dto.ClubDto;
import com.altpool.dto.PasswordResetRequestDto;
import com.altpool.entity.PasswordResetRequest;
import com.altpool.entity.Player;
import com.altpool.entity.ResetStatus;
import com.altpool.entity.Role;
import com.altpool.entity.User;
import com.altpool.exception.ApiException;
import com.altpool.repository.PasswordResetRequestRepository;
import com.altpool.repository.PlayerRepository;
import com.altpool.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final PasswordResetRequestRepository repo;
    private final UserRepository userRepository;
    private final PlayerRepository playerRepository;
    private final PasswordEncoder passwordEncoder;

    /** Création publique : un user qui ne sait plus son mdp. */
    @Transactional
    public PasswordResetRequestDto request(String username) {
        User u = userRepository.findByUsername(username).orElse(null);
        if (u == null) {
            // Ne pas révéler si l'username existe — on retourne une réponse "vide".
            return PasswordResetRequestDto.builder()
                    .username(username)
                    .status(ResetStatus.PENDING)
                    .requestedAt(LocalDateTime.now())
                    .build();
        }
        PasswordResetRequest r = PasswordResetRequest.builder()
                .user(u)
                .status(ResetStatus.PENDING)
                .build();
        r = repo.save(r);
        return toDto(r);
    }

    /** Liste des demandes visibles par l'utilisateur connecté. */
    @Transactional(readOnly = true)
    public List<PasswordResetRequestDto> findVisible(String requesterUsername) {
        User u = userRepository.findByUsername(requesterUsername)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        List<PasswordResetRequest> list;
        if (u.getRole() == Role.ADMIN) {
            list = repo.findByStatusOrderByRequestedAtDesc(ResetStatus.PENDING);
        } else if (u.getRole() == Role.GERANT) {
            list = repo.findPendingForGerant(u.getId());
        } else {
            throw ApiException.forbidden("Not authorized");
        }
        return list.stream().map(this::toDto).toList();
    }

    /** Le gérant (ou admin) résout la demande en saisissant le nouveau mdp. */
    @Transactional
    public PasswordResetRequestDto resolve(Long requestId, String newPassword, String requesterUsername) {
        if (newPassword == null || newPassword.isBlank()) {
            throw ApiException.badRequest("New password is required");
        }
        User actor = userRepository.findByUsername(requesterUsername)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));

        PasswordResetRequest r = repo.findById(requestId)
                .orElseThrow(() -> ApiException.notFound("Request not found"));
        if (r.getStatus() != ResetStatus.PENDING) {
            throw ApiException.badRequest("Request is not pending");
        }
        assertActorCanResolve(actor, r);

        User target = r.getUser();
        target.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(target);

        r.setStatus(ResetStatus.RESOLVED);
        r.setResolvedBy(actor);
        r.setResolvedAt(LocalDateTime.now());
        return toDto(repo.save(r));
    }

    @Transactional
    public PasswordResetRequestDto reject(Long requestId, String requesterUsername) {
        User actor = userRepository.findByUsername(requesterUsername)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        PasswordResetRequest r = repo.findById(requestId)
                .orElseThrow(() -> ApiException.notFound("Request not found"));
        if (r.getStatus() != ResetStatus.PENDING) {
            throw ApiException.badRequest("Request is not pending");
        }
        assertActorCanResolve(actor, r);
        r.setStatus(ResetStatus.REJECTED);
        r.setResolvedBy(actor);
        r.setResolvedAt(LocalDateTime.now());
        return toDto(repo.save(r));
    }

    private void assertActorCanResolve(User actor, PasswordResetRequest r) {
        if (actor.getRole() == Role.ADMIN) return;
        if (actor.getRole() != Role.GERANT) {
            throw ApiException.forbidden("Not authorized");
        }
        // Le gérant doit gérer au moins un club du player demandeur.
        boolean ok = playerRepository.findByUserId(r.getUser().getId())
                .map(p -> p.getClubs().stream().anyMatch(c ->
                        actor.getManagedClubs().stream().anyMatch(mc -> mc.getId().equals(c.getId()))))
                .orElse(false);
        if (!ok) {
            throw ApiException.forbidden("You don't manage any club this user is registered in");
        }
    }

    private PasswordResetRequestDto toDto(PasswordResetRequest r) {
        Player player = playerRepository.findByUserId(r.getUser().getId()).orElse(null);
        java.util.List<ClubDto> clubs = player == null ? java.util.List.of() :
                player.getClubs().stream()
                        .map(c -> ClubDto.builder().id(c.getId()).name(c.getName()).build())
                        .toList();
        return PasswordResetRequestDto.builder()
                .id(r.getId())
                .userId(r.getUser().getId())
                .username(r.getUser().getUsername())
                .playerName(player != null ? player.getName() : null)
                .clubs(clubs)
                .status(r.getStatus())
                .requestedAt(r.getRequestedAt())
                .resolvedByUsername(r.getResolvedBy() != null ? r.getResolvedBy().getUsername() : null)
                .resolvedAt(r.getResolvedAt())
                .build();
    }
}
