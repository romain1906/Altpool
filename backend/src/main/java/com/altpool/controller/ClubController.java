package com.altpool.controller;

import com.altpool.dto.ClubDto;
import com.altpool.service.ClubService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/clubs")
@RequiredArgsConstructor
public class ClubController {

    private final ClubService clubService;

    @GetMapping
    public List<ClubDto> list() {
        return clubService.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','GERANT')")
    public ClubDto create(@Valid @RequestBody ClubDto dto, Authentication auth) {
        return clubService.create(dto, auth.getName());
    }
}
