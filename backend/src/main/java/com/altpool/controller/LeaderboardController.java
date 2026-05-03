package com.altpool.controller;

import com.altpool.dto.LeaderboardEntry;
import com.altpool.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    @GetMapping
    public List<LeaderboardEntry> get(@RequestParam(required = false) Long clubId) {
        return leaderboardService.getLeaderboard(clubId);
    }
}
