package com.altpool.controller;

import com.altpool.dto.CreatePlayerRequest;
import com.altpool.dto.PlayerDto;
import com.altpool.service.PlayerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/players")
@RequiredArgsConstructor
public class PlayerController {

    private final PlayerService playerService;

    @GetMapping
    public List<PlayerDto> list(@RequestParam(required = false) Long clubId) {
        return clubId != null ? playerService.findByClub(clubId) : playerService.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','GERANT')")
    public PlayerDto create(@Valid @RequestBody CreatePlayerRequest req) {
        return playerService.create(req);
    }

    @PostMapping("/{id}/clubs/{clubId}")
    @PreAuthorize("hasAnyRole('ADMIN','GERANT')")
    public PlayerDto attach(@PathVariable Long id, @PathVariable Long clubId) {
        return playerService.attachToClub(id, clubId);
    }

    @DeleteMapping("/{id}/clubs/{clubId}")
    @PreAuthorize("hasAnyRole('ADMIN','GERANT')")
    public PlayerDto detach(@PathVariable Long id, @PathVariable Long clubId) {
        return playerService.detachFromClub(id, clubId);
    }
}
