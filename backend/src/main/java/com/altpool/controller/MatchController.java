package com.altpool.controller;

import com.altpool.dto.CreateMatchRequest;
import com.altpool.dto.FrameDto;
import com.altpool.dto.MatchDto;
import com.altpool.entity.MatchStatus;
import com.altpool.service.MatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    @GetMapping
    public List<MatchDto> list(@RequestParam(required = false) MatchStatus status,
                               @RequestParam(required = false, name = "mine") Boolean mine,
                               Authentication auth) {
        if (Boolean.TRUE.equals(mine)) {
            return matchService.findPendingForUser(auth.getName());
        }
        if (status != null) return matchService.findByStatus(status);
        return matchService.findAll();
    }

    @GetMapping("/{id}")
    public MatchDto get(@PathVariable Long id) {
        return matchService.get(id);
    }

    @PostMapping
    public MatchDto create(@Valid @RequestBody CreateMatchRequest req, Authentication auth) {
        return matchService.create(req, auth.getName());
    }

    @PostMapping("/{id}/frames")
    public MatchDto addFrame(@PathVariable Long id, @Valid @RequestBody FrameDto frame) {
        return matchService.addFrame(id, frame);
    }

    @DeleteMapping("/{id}/frames/{frameId}")
    public MatchDto removeFrame(@PathVariable Long id, @PathVariable Long frameId) {
        return matchService.removeFrame(id, frameId);
    }

    @PostMapping("/{id}/validate")
    public MatchDto validate(@PathVariable Long id, Authentication auth) {
        return matchService.validate(id, auth.getName());
    }

    @PostMapping("/{id}/reject")
    public MatchDto reject(@PathVariable Long id, Authentication auth) {
        return matchService.reject(id, auth.getName());
    }
}
