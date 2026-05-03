package com.altpool.service;

import com.altpool.dto.ClubDto;
import com.altpool.entity.Club;
import com.altpool.entity.Role;
import com.altpool.entity.User;
import com.altpool.exception.ApiException;
import com.altpool.repository.ClubRepository;
import com.altpool.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClubService {

    private final ClubRepository clubRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ClubDto> findAll() {
        return clubRepository.findAll().stream().map(this::toDto).toList();
    }

    /**
     * Crée un club. Si le créateur est GERANT, il est automatiquement
     * rattaché comme gérant de ce nouveau club.
     */
    @Transactional
    public ClubDto create(ClubDto dto, String creatorUsername) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw ApiException.badRequest("Name is required");
        }
        Club club = clubRepository.save(Club.builder().name(dto.getName()).build());

        if (creatorUsername != null) {
            User creator = userRepository.findByUsername(creatorUsername).orElse(null);
            if (creator != null && creator.getRole() == Role.GERANT) {
                creator.getManagedClubs().add(club);
                userRepository.save(creator);
            }
        }
        return toDto(club);
    }

    public ClubDto toDto(Club c) {
        return ClubDto.builder().id(c.getId()).name(c.getName()).build();
    }
}
