package com.altpool.service;

import com.altpool.dto.ClubDto;
import com.altpool.dto.CreatePlayerRequest;
import com.altpool.dto.PlayerDto;
import com.altpool.entity.Club;
import com.altpool.entity.Player;
import com.altpool.entity.Role;
import com.altpool.entity.User;
import com.altpool.exception.ApiException;
import com.altpool.repository.ClubRepository;
import com.altpool.repository.PlayerRepository;
import com.altpool.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<PlayerDto> findAll() {
        return playerRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PlayerDto> findByClub(Long clubId) {
        return playerRepository.findByClubIdOrderByEloDesc(clubId).stream().map(this::toDto).toList();
    }

    /**
     * Crée un nouveau joueur (User + Player) rattaché à son club principal.
     * Réservé aux ADMIN/GERANT.
     */
    @Transactional
    public PlayerDto create(CreatePlayerRequest req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw ApiException.conflict("Username already exists");
        }
        Club primary = clubRepository.findById(req.getPrimaryClubId())
                .orElseThrow(() -> ApiException.notFound("Club not found"));

        User user = User.builder()
                .username(req.getUsername())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(Role.JOUEUR)
                .build();
        user = userRepository.save(user);

        HashSet<Club> clubs = new HashSet<>();
        clubs.add(primary);

        Player p = Player.builder()
                .name(req.getName())
                .elo(EloService.INITIAL_ELO)
                .user(user)
                .primaryClub(primary)
                .clubs(clubs)
                .build();
        return toDto(playerRepository.save(p));
    }

    /** Rattache un joueur existant à un club supplémentaire. */
    @Transactional
    public PlayerDto attachToClub(Long playerId, Long clubId) {
        Player p = playerRepository.findById(playerId)
                .orElseThrow(() -> ApiException.notFound("Player not found"));
        Club c = clubRepository.findById(clubId)
                .orElseThrow(() -> ApiException.notFound("Club not found"));
        p.getClubs().add(c);
        return toDto(playerRepository.save(p));
    }

    /** Détache un joueur d'un club (sauf son club principal). */
    @Transactional
    public PlayerDto detachFromClub(Long playerId, Long clubId) {
        Player p = playerRepository.findById(playerId)
                .orElseThrow(() -> ApiException.notFound("Player not found"));
        if (p.getPrimaryClub().getId().equals(clubId)) {
            throw ApiException.badRequest("Cannot detach player from primary club");
        }
        p.getClubs().removeIf(c -> c.getId().equals(clubId));
        return toDto(playerRepository.save(p));
    }

    public PlayerDto toDto(Player p) {
        List<ClubDto> clubs = p.getClubs() == null ? List.of() : p.getClubs().stream()
                .map(c -> ClubDto.builder().id(c.getId()).name(c.getName()).build())
                .toList();
        return PlayerDto.builder()
                .id(p.getId())
                .name(p.getName())
                .elo(p.getElo())
                .userId(p.getUser() != null ? p.getUser().getId() : null)
                .username(p.getUser() != null ? p.getUser().getUsername() : null)
                .primaryClubId(p.getPrimaryClub().getId())
                .primaryClubName(p.getPrimaryClub().getName())
                .clubs(clubs)
                .build();
    }
}
