package com.altpool.controller;

import com.altpool.dto.CreateTournamentRequest;
import com.altpool.dto.TournamentDto;
import com.altpool.dto.TournamentMatchDto;
import com.altpool.service.TournamentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tournaments")
@RequiredArgsConstructor
public class TournamentController {

    private final TournamentService tournamentService;

    @GetMapping
    public List<TournamentDto> list(Authentication auth) {
        return tournamentService.findVisibleFor(auth.getName());
    }

    @GetMapping("/{id}")
    public TournamentDto get(@PathVariable Long id, Authentication auth) {
        return tournamentService.get(id, auth.getName());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','GERANT')")
    public TournamentDto create(@Valid @RequestBody CreateTournamentRequest req, Authentication auth) {
        return tournamentService.create(req, auth.getName());
    }

    @PostMapping("/{id}/register")
    public TournamentDto register(@PathVariable Long id, Authentication auth) {
        return tournamentService.register(id, auth.getName());
    }

    @DeleteMapping("/{id}/register")
    public TournamentDto unregister(@PathVariable Long id, Authentication auth) {
        return tournamentService.unregister(id, auth.getName());
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','GERANT')")
    public TournamentDto cancel(@PathVariable Long id, Authentication auth) {
        return tournamentService.cancel(id, auth.getName());
    }

    /** Démarre le tournoi : random shuffle + génère poules ou bracket. */
    @PostMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('ADMIN','GERANT')")
    public TournamentDto start(@PathVariable Long id, Authentication auth) {
        return tournamentService.start(id, auth.getName());
    }

    /** Liste des TournamentMatch d'un tournoi (pour bracket viewer + standings). */
    @GetMapping("/{id}/matches")
    public List<TournamentMatchDto> matches(@PathVariable Long id, Authentication auth) {
        return tournamentService.getMatches(id, auth.getName());
    }

    /** Mes matchs de tournoi à jouer (toutes compétitions). */
    @GetMapping("/me/matches")
    public List<TournamentMatchDto> myMatches(Authentication auth) {
        return tournamentService.getMyTournamentMatches(auth.getName());
    }

    /** Force le double forfait d'un match (gérant/admin si deadline ratée). */
    @PostMapping("/matches/{tournamentMatchId}/double-forfeit")
    @PreAuthorize("hasAnyRole('ADMIN','GERANT')")
    public TournamentMatchDto doubleForfeit(@PathVariable Long tournamentMatchId, Authentication auth) {
        return tournamentService.forceDoubleForfeit(tournamentMatchId, auth.getName());
    }
}
