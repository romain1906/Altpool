package com.altpool.service;

import com.altpool.dto.LeaderboardEntry;
import com.altpool.entity.MatchEntity;
import com.altpool.entity.Player;
import com.altpool.repository.MatchRepository;
import com.altpool.repository.PlayerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final PlayerRepository playerRepository;
    private final MatchRepository matchRepository;

    @Transactional(readOnly = true)
    public List<LeaderboardEntry> getLeaderboard(Long clubId) {
        List<Player> players = clubId != null
                ? playerRepository.findByClubIdOrderByEloDesc(clubId)
                : playerRepository.findAllByOrderByEloDesc();

        Map<Long, int[]> streaks = computeStreaks();

        List<LeaderboardEntry> entries = new ArrayList<>();
        int rank = 1;
        for (Player p : players) {
            // userId peut être null si le Player n'est pas (encore) lié à un User
            Long userId = p.getUser() != null ? p.getUser().getId() : null;
            int[] s = streaks.getOrDefault(p.getId(), new int[]{0, 0});
            entries.add(LeaderboardEntry.builder()
                    .rank(rank++)
                    .playerId(p.getId())
                    .userId(userId)
                    .name(p.getName())
                    .elo(p.getElo())
                    .primaryClubName(p.getPrimaryClub().getName())
                    .winStreak(s[0])
                    .loseStreak(s[1])
                    .build());
        }
        return entries;
    }

    /**
     * Calcule pour chaque joueur la winStreak et la loseStreak en se basant
     * sur ses matchs RANKED validés, du plus récent au plus ancien.
     * Une seule des deux valeurs est non-nulle (la plus récente "casse" l'autre).
     *
     * @return map playerId → [winStreak, loseStreak]
     */
    private Map<Long, int[]> computeStreaks() {
        List<MatchEntity> matches = matchRepository.findValidatedRankedForStreaks();
        // Pour chaque joueur on construit la liste de ses résultats du plus récent au plus ancien (true = win)
        Map<Long, List<Boolean>> resultsByPlayer = new HashMap<>();
        for (MatchEntity m : matches) {
            Long winnerId = m.getWinner().getId();
            Long p1Id = m.getPlayer1().getId();
            Long p2Id = m.getPlayer2().getId();
            resultsByPlayer.computeIfAbsent(p1Id, k -> new ArrayList<>()).add(winnerId.equals(p1Id));
            resultsByPlayer.computeIfAbsent(p2Id, k -> new ArrayList<>()).add(winnerId.equals(p2Id));
        }
        Map<Long, int[]> out = new HashMap<>();
        for (Map.Entry<Long, List<Boolean>> e : resultsByPlayer.entrySet()) {
            List<Boolean> hist = e.getValue();
            if (hist.isEmpty()) continue;
            boolean lastWasWin = hist.get(0);
            int count = 0;
            for (Boolean win : hist) {
                if (win == lastWasWin) count++;
                else break;
            }
            out.put(e.getKey(), lastWasWin ? new int[]{count, 0} : new int[]{0, count});
        }
        return out;
    }
}
