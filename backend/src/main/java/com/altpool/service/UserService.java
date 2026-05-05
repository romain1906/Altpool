package com.altpool.service;

import com.altpool.dto.ChangePasswordRequest;
import com.altpool.dto.ClubDto;
import com.altpool.dto.CreateUserRequest;
import com.altpool.dto.UpdateProfileRequest;
import com.altpool.dto.UpdateUserRequest;
import com.altpool.dto.UserDto;
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
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    private final PlayerRepository playerRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserDto> findAll() {
        return userRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional
    public UserDto create(CreateUserRequest req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw ApiException.conflict("Username already exists");
        }
        Set<Club> managed = new HashSet<>();
        if (req.getRole() == Role.GERANT && req.getManagedClubIds() != null) {
            for (Long cid : req.getManagedClubIds()) {
                managed.add(clubRepository.findById(cid)
                        .orElseThrow(() -> ApiException.notFound("Club not found: " + cid)));
            }
        }
        User u = User.builder()
                .username(req.getUsername())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(req.getRole())
                .managedClubs(managed)
                .build();
        return toDto(userRepository.save(u));
    }

    /**
     * Met à jour le rôle et/ou les clubs gérés d'un user existant (ADMIN only).
     * - Si role change vers GERANT : applique managedClubIds (ou laisse les clubs actuels si null)
     * - Si role change vers ADMIN ou JOUEUR : vide les clubs gérés
     */
    @Transactional
    public UserDto updateUser(Long userId, UpdateUserRequest req) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Utilisateur introuvable"));

        if (req.getRole() != null) {
            u.setRole(req.getRole());
            if (req.getRole() != Role.GERANT) {
                u.getManagedClubs().clear();
            }
        }

        if (req.getManagedClubIds() != null && u.getRole() == Role.GERANT) {
            Set<Club> newClubs = new HashSet<>();
            for (Long cid : req.getManagedClubIds()) {
                newClubs.add(clubRepository.findById(cid)
                        .orElseThrow(() -> ApiException.notFound("Club introuvable : " + cid)));
            }
            u.getManagedClubs().clear();
            u.getManagedClubs().addAll(newClubs);
        }

        return toDto(userRepository.save(u));
    }

    @Transactional(readOnly = true)
    public UserDto getMe(String username) {
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        return toDto(u);
    }

    @Transactional
    public UserDto updateProfile(String username, UpdateProfileRequest req) {
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));

        // Nom du joueur (uniquement JOUEUR)
        if (u.getRole() == Role.JOUEUR && req.getPlayerName() != null) {
            String trimmed = req.getPlayerName().trim();
            if (trimmed.isEmpty()) {
                throw ApiException.badRequest("Le nom ne peut pas être vide");
            }
            Player p = playerRepository.findByUserId(u.getId())
                    .orElseThrow(() -> ApiException.notFound("Aucun profil joueur lié"));
            p.setName(trimmed);
            playerRepository.save(p);
        }

        // Champs personnels
        if (req.getEmail() != null) {
            String email = req.getEmail().trim();
            u.setEmail(email.isEmpty() ? null : email);
        }
        if (req.getBirthDate() != null) {
            // Validation âge ≥ 16 ans
            int age = java.time.Period.between(req.getBirthDate(), java.time.LocalDate.now()).getYears();
            if (age < 16) {
                throw ApiException.badRequest("Tu dois avoir au moins 16 ans");
            }
            if (age > 120) {
                throw ApiException.badRequest("Date de naissance invalide");
            }
            u.setBirthDate(req.getBirthDate());
        }
        if (req.getGender() != null) u.setGender(req.getGender());
        if (req.getPhone() != null) {
            String phone = req.getPhone().trim();
            u.setPhone(phone.isEmpty() ? null : phone);
        }
        if (req.getCountry() != null) {
            String country = req.getCountry().trim();
            u.setCountry(country.isEmpty() ? null : country);
        }

        userRepository.save(u);
        return toDto(u);
    }

    @Transactional
    public void changePassword(String username, ChangePasswordRequest req) {
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        if (!passwordEncoder.matches(req.getOldPassword(), u.getPassword())) {
            throw ApiException.badRequest("Mot de passe actuel incorrect");
        }
        if (req.getNewPassword().length() < 3) {
            throw ApiException.badRequest("Mot de passe trop court (min 3 caractères)");
        }
        u.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(u);
    }

    @Transactional(readOnly = true)
    public List<ClubDto> getMyClubs(String username) {
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        return switch (u.getRole()) {
            case ADMIN -> clubRepository.findAll().stream()
                    .map(c -> ClubDto.builder().id(c.getId()).name(c.getName()).build())
                    .toList();
            case GERANT -> u.getManagedClubs().stream()
                    .map(c -> ClubDto.builder().id(c.getId()).name(c.getName()).build())
                    .toList();
            case JOUEUR -> playerRepository.findByUserId(u.getId())
                    .map(p -> p.getClubs().stream()
                            .map(c -> ClubDto.builder().id(c.getId()).name(c.getName()).build())
                            .toList())
                    .orElse(List.of());
        };
    }

    public UserDto toDto(User u) {
        List<ClubDto> managed = u.getManagedClubs() == null ? List.of() : u.getManagedClubs().stream()
                .map(c -> ClubDto.builder().id(c.getId()).name(c.getName()).build())
                .toList();

        UserDto.UserDtoBuilder b = UserDto.builder()
                .id(u.getId())
                .username(u.getUsername())
                .role(u.getRole())
                .email(u.getEmail())
                .birthDate(u.getBirthDate())
                .gender(u.getGender())
                .phone(u.getPhone())
                .country(u.getCountry())
                .profileComplete(u.isProfileComplete())
                .managedClubs(managed);

        if (u.getRole() == Role.JOUEUR) {
            playerRepository.findByUserId(u.getId()).ifPresent(p -> {
                b.playerName(p.getName());
                b.elo(p.getElo());
                b.primaryClubId(p.getPrimaryClub() != null ? p.getPrimaryClub().getId() : null);
                List<ClubDto> playerClubs = p.getClubs().stream()
                        .map(c -> ClubDto.builder().id(c.getId()).name(c.getName()).build())
                        .toList();
                b.playerClubs(playerClubs);
            });
        }
        return b.build();
    }
}
