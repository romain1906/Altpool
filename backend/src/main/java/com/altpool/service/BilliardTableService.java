package com.altpool.service;

import com.altpool.dto.BilliardTableDto;
import com.altpool.entity.BilliardTable;
import com.altpool.entity.Club;
import com.altpool.exception.ApiException;
import com.altpool.repository.BilliardTableRepository;
import com.altpool.repository.ClubRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BilliardTableService {

    private final BilliardTableRepository billiardRepository;
    private final ClubRepository clubRepository;

    @Transactional(readOnly = true)
    public List<BilliardTableDto> findAll() {
        return billiardRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional
    public BilliardTableDto create(BilliardTableDto dto) {
        Club club = clubRepository.findById(dto.getClubId())
                .orElseThrow(() -> ApiException.notFound("Club not found"));
        BilliardTable b = BilliardTable.builder()
                .name(dto.getName())
                .club(club)
                .build();
        return toDto(billiardRepository.save(b));
    }

    public BilliardTableDto toDto(BilliardTable b) {
        return BilliardTableDto.builder()
                .id(b.getId())
                .name(b.getName())
                .clubId(b.getClub().getId())
                .clubName(b.getClub().getName())
                .build();
    }
}
