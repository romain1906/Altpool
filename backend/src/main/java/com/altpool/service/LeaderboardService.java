package com.altpool.service;

import com.altpool.dto.LeaderboardEntry;
import com.altpool.entity.Player;
import com.altpool.repository.PlayerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final PlayerRepository playerRepository;

    @Transactional(readOnly = true)
    public List<LeaderboardEntry> getLeaderboard(Long clubId) {
        List<Player> players = clubId != null
                ? playerRepository.findByClubIdOrderByEloDesc(clubId)
                : playerRepository.findAllByOrderByEloDesc();
        List<LeaderboardEntry> entries = new ArrayList<>();
        int rank = 1;
        for (Player p : players) {
            entries.add(LeaderboardEntry.builder()
                    .rank(rank++)
                    .playerId(p.getId())
                    .name(p.getName())
                    .elo(p.getElo())
                    .primaryClubName(p.getPrimaryClub().getName())
                    .build());
        }
        return entries;
    }
}
