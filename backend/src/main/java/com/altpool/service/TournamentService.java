package com.altpool.service;

import com.altpool.dto.CreateTournamentRequest;
import com.altpool.dto.TournamentDto;
import com.altpool.dto.TournamentMatchDto;
import com.altpool.dto.TournamentParticipantDto;
import com.altpool.entity.*;
import com.altpool.exception.ApiException;
import com.altpool.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class TournamentService implements MatchValidationListener {

    private final TournamentRepository tournamentRepository;
    private final TournamentParticipantRepository participantRepository;
    private final TournamentPoolRepository poolRepository;
    private final TournamentRoundRepository roundRepository;
    private final TournamentMatchRepository tournamentMatchRepository;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;
    private final PlayerRepository playerRepository;
    private final MatchRepository matchRepository;

    // --------------------------------------------------------------------
    //  Lectures
    // --------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<TournamentDto> findVisibleFor(String username) {
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        List<Tournament> list;
        if (u.getRole() == Role.ADMIN) {
            list = tournamentRepository.findAllByOrderByCreatedAtDesc();
        } else {
            Set<Long> clubIds = accessibleClubIds(u);
            list = clubIds.isEmpty()
                    ? List.of()
                    : tournamentRepository.findByClubIdInOrderByCreatedAtDesc(clubIds.stream().toList());
        }
        Player myPlayer = playerRepository.findByUserId(u.getId()).orElse(null);
        return list.stream().map(t -> toDto(t, u, myPlayer, false)).toList();
    }

    @Transactional(readOnly = true)
    public TournamentDto get(Long id, String username) {
        Tournament t = tournamentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Tournoi introuvable"));
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        assertCanView(t, u);
        Player myPlayer = playerRepository.findByUserId(u.getId()).orElse(null);
        return toDto(t, u, myPlayer, true);
    }

    // --------------------------------------------------------------------
    //  Création
    // --------------------------------------------------------------------

    @Transactional
    public TournamentDto create(CreateTournamentRequest req, String username) {
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        if (u.getRole() == Role.JOUEUR) {
            throw ApiException.forbidden("Seul un gérant ou un admin peut créer un tournoi");
        }
        Club club = clubRepository.findById(req.getClubId())
                .orElseThrow(() -> ApiException.notFound("Club introuvable"));
        if (u.getRole() == Role.GERANT) {
            boolean managesIt = u.getManagedClubs().stream()
                    .anyMatch(c -> c.getId().equals(club.getId()));
            if (!managesIt) {
                throw ApiException.forbidden("Tu ne gères pas ce club");
            }
        }
        if (req.getPoolBestOf() % 2 == 0
                || req.getBracketBestOf() % 2 == 0
                || req.getFinalBestOf() % 2 == 0) {
            throw ApiException.badRequest("Les formats best_of doivent être impairs");
        }
        if (req.getRegistrationDeadline() != null
                && req.getRegistrationDeadline().isBefore(LocalDateTime.now())) {
            throw ApiException.badRequest("La deadline d'inscription doit être dans le futur");
        }

        Tournament t = Tournament.builder()
                .name(req.getName())
                .description(req.getDescription())
                .club(club)
                .createdBy(u)
                .type(req.getType())
                .ranked(req.getRanked() != null ? req.getRanked() : true)
                .status(TournamentStatus.REGISTRATION)
                .poolBestOf(req.getPoolBestOf())
                .bracketBestOf(req.getBracketBestOf())
                .finalBestOf(req.getFinalBestOf())
                .poolSize(req.getPoolSize() != null ? req.getPoolSize() : 4)
                .qualifiersPerPool(req.getQualifiersPerPool() != null ? req.getQualifiersPerPool() : 2)
                .maxParticipants(req.getMaxParticipants())
                .matchDeadlineHours(req.getMatchDeadlineHours())
                .registrationDeadline(req.getRegistrationDeadline())
                .startsAt(req.getStartsAt())
                .build();
        t = tournamentRepository.save(t);
        return toDto(t, u, playerRepository.findByUserId(u.getId()).orElse(null), true);
    }

    // --------------------------------------------------------------------
    //  Inscription / désinscription
    // --------------------------------------------------------------------

    @Transactional
    public TournamentDto register(Long tournamentId, String username) {
        Tournament t = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> ApiException.notFound("Tournoi introuvable"));
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        if (t.getStatus() != TournamentStatus.REGISTRATION) {
            throw ApiException.badRequest("Les inscriptions sont closes");
        }
        if (t.getRegistrationDeadline() != null
                && t.getRegistrationDeadline().isBefore(LocalDateTime.now())) {
            throw ApiException.badRequest("La deadline d'inscription est dépassée");
        }
        // Gating profil
        ProfileGuard.requireCompleteProfile(u, "t'inscrire à un tournoi");

        Player p = playerRepository.findByUserId(u.getId())
                .orElseThrow(() -> ApiException.badRequest("Tu n'as pas de profil joueur"));
        boolean inClub = p.getClubs().stream()
                .anyMatch(c -> c.getId().equals(t.getClub().getId()));
        if (!inClub) {
            throw ApiException.forbidden("Tu n'es pas membre du club organisateur");
        }
        if (participantRepository.existsByTournamentIdAndPlayerId(t.getId(), p.getId())) {
            throw ApiException.conflict("Tu es déjà inscrit");
        }
        if (t.getMaxParticipants() != null) {
            long cur = participantRepository.findByTournamentId(t.getId()).size();
            if (cur >= t.getMaxParticipants()) {
                throw ApiException.conflict("Le tournoi est complet");
            }
        }
        TournamentParticipant tp = TournamentParticipant.builder()
                .tournament(t).player(p)
                .status(TournamentParticipantStatus.REGISTERED)
                .build();
        participantRepository.save(tp);
        return toDto(t, u, p, true);
    }

    @Transactional
    public TournamentDto unregister(Long tournamentId, String username) {
        Tournament t = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> ApiException.notFound("Tournoi introuvable"));
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        if (t.getStatus() != TournamentStatus.REGISTRATION) {
            throw ApiException.badRequest("Les inscriptions sont closes");
        }
        Player p = playerRepository.findByUserId(u.getId())
                .orElseThrow(() -> ApiException.badRequest("Pas de profil joueur"));
        TournamentParticipant tp = participantRepository
                .findByTournamentIdAndPlayerId(t.getId(), p.getId())
                .orElseThrow(() -> ApiException.notFound("Tu n'es pas inscrit"));
        participantRepository.delete(tp);
        return toDto(t, u, p, true);
    }

    @Transactional
    public TournamentDto cancel(Long tournamentId, String username) {
        Tournament t = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> ApiException.notFound("Tournoi introuvable"));
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        assertCanManage(t, u);
        if (t.getStatus() == TournamentStatus.FINISHED) {
            throw ApiException.badRequest("Tournoi déjà terminé");
        }
        t.setStatus(TournamentStatus.CANCELLED);
        return toDto(tournamentRepository.save(t), u,
                playerRepository.findByUserId(u.getId()).orElse(null), true);
    }

    // ====================================================================
    //  PHASE 3 : DÉMARRAGE DU TOURNOI
    // ====================================================================

    @Transactional
    public TournamentDto start(Long tournamentId, String username) {
        Tournament t = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> ApiException.notFound("Tournoi introuvable"));
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        assertCanManage(t, u);
        if (t.getStatus() != TournamentStatus.REGISTRATION
                && t.getStatus() != TournamentStatus.READY_TO_START) {
            throw ApiException.badRequest("Le tournoi ne peut être démarré depuis cet état");
        }

        List<TournamentParticipant> participants = new ArrayList<>(
                participantRepository.findByTournamentId(t.getId()));
        if (participants.size() < 2) {
            throw ApiException.badRequest("Au moins 2 participants requis");
        }

        // Random shuffle + attribution des seeds
        Collections.shuffle(participants);
        for (int i = 0; i < participants.size(); i++) {
            TournamentParticipant p = participants.get(i);
            p.setSeed(i + 1);
            p.setStatus(TournamentParticipantStatus.IN_TOURNAMENT);
        }
        participantRepository.saveAll(participants);

        // Génération de la première phase selon le type
        switch (t.getType()) {
            case POOL_AND_BRACKET, POOL_ONLY -> generatePools(t, participants);
            case BRACKET_ONLY -> generateBracketFromList(t, participants);
        }

        t.setStatus(TournamentStatus.IN_PROGRESS);
        t.setStartedAt(LocalDateTime.now());
        return toDto(tournamentRepository.save(t), u,
                playerRepository.findByUserId(u.getId()).orElse(null), true);
    }

    /**
     * Crée les poules + matchs round-robin pour un tournoi avec phase de poules.
     */
    private void generatePools(Tournament t, List<TournamentParticipant> participants) {
        int poolSize = t.getPoolSize() != null ? t.getPoolSize() : 4;
        int poolCount = (int) Math.ceil(participants.size() / (double) poolSize);

        // Création des poules
        List<TournamentPool> pools = new ArrayList<>();
        for (int i = 0; i < poolCount; i++) {
            TournamentPool pool = TournamentPool.builder()
                    .tournament(t)
                    .name("Poule " + (char) ('A' + i))
                    .build();
            pools.add(poolRepository.save(pool));
        }

        // Distribution snake : 1→A, 2→B, 3→C, 4→D, 5→D, 6→C, 7→B, 8→A, ...
        for (int i = 0; i < participants.size(); i++) {
            int row = i / poolCount;
            int col = (row % 2 == 0) ? (i % poolCount) : (poolCount - 1 - (i % poolCount));
            participants.get(i).setPool(pools.get(col));
        }
        participantRepository.saveAll(participants);

        // Round POOL
        TournamentRound poolRound = TournamentRound.builder()
                .tournament(t)
                .phase(TournamentPhase.POOL)
                .roundNumber(1)
                .bestOf(t.getPoolBestOf())
                .deadline(computeDeadline(t))
                .status(TournamentRoundStatus.IN_PROGRESS)
                .build();
        poolRound = roundRepository.save(poolRound);

        // Round-robin par poule
        for (TournamentPool pool : pools) {
            List<TournamentParticipant> poolPlayers = participants.stream()
                    .filter(p -> p.getPool() != null && p.getPool().getId().equals(pool.getId()))
                    .toList();
            int posCounter = 0;
            for (int i = 0; i < poolPlayers.size(); i++) {
                for (int j = i + 1; j < poolPlayers.size(); j++) {
                    createReadyTournamentMatch(t, poolRound, pool,
                            poolPlayers.get(i).getPlayer(), poolPlayers.get(j).getPlayer(),
                            posCounter++);
                }
            }
        }
    }

    /**
     * Crée à la fois la TournamentMatch et son MatchEntity sous-jacent (READY).
     * Le Match est en FRIENDLY car l'Elo est appliqué globalement à la fin du tournoi.
     */
    private TournamentMatch createReadyTournamentMatch(Tournament t, TournamentRound round,
                                                        TournamentPool pool, Player p1, Player p2,
                                                        int bracketPosition) {
        MatchEntity match = MatchEntity.builder()
                .type(MatchType.FRIENDLY)   // l'Elo n'est PAS appliqué par match individuel
                .bestOf(round.getBestOf())
                .player1(p1)
                .player2(p2)
                .club(t.getClub())
                .status(MatchStatus.IN_PROGRESS)
                .scoreP1(0).scoreP2(0)
                .build();
        match = matchRepository.save(match);

        TournamentMatch tm = TournamentMatch.builder()
                .tournament(t)
                .round(round)
                .pool(pool)
                .match(match)
                .player1(p1).player2(p2)
                .bracketPosition(bracketPosition)
                .status(TournamentMatchStatus.READY)
                .deadline(round.getDeadline())
                .build();
        return tournamentMatchRepository.save(tm);
    }

    // ====================================================================
    //  PHASE 4 : GÉNÉRATION DU BRACKET
    // ====================================================================

    /**
     * Génère un bracket à élimination directe à partir d'une liste de qualifiés.
     * Le bracket a une taille = next power of 2 (ajout de byes si nécessaire).
     */
    private void generateBracketFromList(Tournament t, List<TournamentParticipant> qualifiers) {
        if (qualifiers.size() < 2) {
            // Cas dégénéré : 0 ou 1 joueur, on finalise directement
            t.setStatus(TournamentStatus.FINISHED);
            t.setFinishedAt(LocalDateTime.now());
            tournamentRepository.save(t);
            return;
        }

        // Taille du bracket = puissance de 2 supérieure ou égale
        int bracketSize = 1;
        while (bracketSize < qualifiers.size()) bracketSize *= 2;
        int totalRounds = (int) (Math.log(bracketSize) / Math.log(2));

        // Shuffle aléatoire (même règle que les poules)
        List<TournamentParticipant> seeded = new ArrayList<>(qualifiers);
        Collections.shuffle(seeded);

        // Padding avec des null (byes) pour atteindre bracketSize
        List<Player> slot = new ArrayList<>();
        for (TournamentParticipant tp : seeded) slot.add(tp.getPlayer());
        while (slot.size() < bracketSize) slot.add(null);

        // Création des rounds (du plus bas vers le plus haut)
        // ex. bracketSize=8 → R8 (=QF), R4 (=SF), R2 (=F)
        // On crée aussi un round "third place" entre les perdants des SF si bracketSize >= 4
        Map<Integer, TournamentRound> roundsByMatchCount = new HashMap<>();
        Map<Integer, List<TournamentMatch>> matchesByRoundIdx = new HashMap<>();

        int matchCount = bracketSize / 2;
        int roundIdx = 0;
        int firstRoundNumber = (t.getType() == TournamentType.POOL_AND_BRACKET ? 2 : 1);
        while (matchCount >= 1) {
            TournamentPhase phase = phaseForBracket(matchCount);
            int bo = (matchCount == 1) ? t.getFinalBestOf() : t.getBracketBestOf();

            TournamentRound round = TournamentRound.builder()
                    .tournament(t)
                    .phase(phase)
                    .roundNumber(firstRoundNumber + roundIdx)
                    .bestOf(bo)
                    .deadline(computeDeadline(t))
                    .status(matchCount == bracketSize / 2
                            ? TournamentRoundStatus.IN_PROGRESS
                            : TournamentRoundStatus.WAITING)
                    .build();
            round = roundRepository.save(round);
            roundsByMatchCount.put(matchCount, round);

            List<TournamentMatch> matches = new ArrayList<>();
            for (int i = 0; i < matchCount; i++) {
                TournamentMatch tm = TournamentMatch.builder()
                        .tournament(t)
                        .round(round)
                        .bracketPosition(i)
                        .status(TournamentMatchStatus.WAITING)
                        .deadline(round.getDeadline())
                        .build();
                matches.add(tournamentMatchRepository.save(tm));
            }
            matchesByRoundIdx.put(matchCount, matches);

            matchCount /= 2;
            roundIdx++;
        }

        // Linkage : chaque match du tour N pointe vers son successeur au tour N/2
        for (int mc = bracketSize / 2; mc > 1; mc /= 2) {
            List<TournamentMatch> cur = matchesByRoundIdx.get(mc);
            List<TournamentMatch> next = matchesByRoundIdx.get(mc / 2);
            for (int i = 0; i < cur.size(); i++) {
                TournamentMatch tm = cur.get(i);
                TournamentMatch parent = next.get(i / 2);
                tm.setNextMatch(parent);
                tm.setNextMatchSlot((i % 2 == 0) ? "P1" : "P2");
                tournamentMatchRepository.save(tm);
            }
        }

        // Round "match pour la 3e place" si bracket ≥ 4
        if (bracketSize >= 4) {
            TournamentRound thirdPlaceRound = TournamentRound.builder()
                    .tournament(t)
                    .phase(TournamentPhase.THIRD_PLACE)
                    .roundNumber(firstRoundNumber + totalRounds)
                    .bestOf(t.getBracketBestOf())
                    .deadline(computeDeadline(t))
                    .status(TournamentRoundStatus.WAITING)
                    .build();
            thirdPlaceRound = roundRepository.save(thirdPlaceRound);

            TournamentMatch thirdMatch = TournamentMatch.builder()
                    .tournament(t)
                    .round(thirdPlaceRound)
                    .bracketPosition(0)
                    .status(TournamentMatchStatus.WAITING)
                    .deadline(thirdPlaceRound.getDeadline())
                    .build();
            tournamentMatchRepository.save(thirdMatch);
            // Le linkage des 2 perdants de SF se fera dans propagateLoser
        }

        // Assignation des 2 premiers joueurs aux matchs du 1er tour
        List<TournamentMatch> firstRoundMatches = matchesByRoundIdx.get(bracketSize / 2);
        for (int i = 0; i < firstRoundMatches.size(); i++) {
            TournamentMatch tm = firstRoundMatches.get(i);
            Player p1 = slot.get(2 * i);
            Player p2 = slot.get(2 * i + 1);
            tm.setPlayer1(p1);
            tm.setPlayer2(p2);

            // Cas bye : un seul joueur → il avance auto
            if (p1 != null && p2 == null) {
                tm.setWinner(p1);
                tm.setStatus(TournamentMatchStatus.COMPLETED);
                tm.setCompletedAt(LocalDateTime.now());
                tournamentMatchRepository.save(tm);
                propagateWinner(tm);
            } else if (p2 != null && p1 == null) {
                tm.setWinner(p2);
                tm.setStatus(TournamentMatchStatus.COMPLETED);
                tm.setCompletedAt(LocalDateTime.now());
                tournamentMatchRepository.save(tm);
                propagateWinner(tm);
            } else if (p1 != null && p2 != null) {
                // Crée le Match réel (jouable)
                MatchEntity match = MatchEntity.builder()
                        .type(MatchType.FRIENDLY)
                        .bestOf(tm.getRound().getBestOf())
                        .player1(p1).player2(p2).club(t.getClub())
                        .status(MatchStatus.IN_PROGRESS)
                        .scoreP1(0).scoreP2(0)
                        .build();
                match = matchRepository.save(match);
                tm.setMatch(match);
                tm.setStatus(TournamentMatchStatus.READY);
                tournamentMatchRepository.save(tm);
            }
        }
    }

    private TournamentPhase phaseForBracket(int matchCount) {
        return switch (matchCount) {
            case 1 -> TournamentPhase.FINAL;
            case 2 -> TournamentPhase.SEMIFINAL;
            case 4 -> TournamentPhase.QUARTERFINAL;
            case 8 -> TournamentPhase.ROUND_OF_16;
            case 16 -> TournamentPhase.ROUND_OF_32;
            default -> TournamentPhase.ROUND_OF_32;
        };
    }

    /**
     * Propage le winner d'un TournamentMatch vers son nextMatch.
     * Si le nextMatch a maintenant ses 2 joueurs, il devient READY et son Match réel est créé.
     * Si le bracket arrive en finale, le perdant des SF va sur le match 3e place.
     */
    private void propagateWinner(TournamentMatch tm) {
        if (tm.getNextMatch() == null) return;
        TournamentMatch parent = tm.getNextMatch();

        if ("P1".equals(tm.getNextMatchSlot())) {
            parent.setPlayer1(tm.getWinner());
        } else {
            parent.setPlayer2(tm.getWinner());
        }

        // Le nextMatch est-il prêt ?
        if (parent.getPlayer1() != null && parent.getPlayer2() != null) {
            MatchEntity match = MatchEntity.builder()
                    .type(MatchType.FRIENDLY)
                    .bestOf(parent.getRound().getBestOf())
                    .player1(parent.getPlayer1()).player2(parent.getPlayer2())
                    .club(tm.getTournament().getClub())
                    .status(MatchStatus.IN_PROGRESS)
                    .scoreP1(0).scoreP2(0)
                    .build();
            match = matchRepository.save(match);
            parent.setMatch(match);
            parent.setStatus(TournamentMatchStatus.READY);
            // Le round du parent passe IN_PROGRESS si encore WAITING
            if (parent.getRound().getStatus() == TournamentRoundStatus.WAITING) {
                parent.getRound().setStatus(TournamentRoundStatus.IN_PROGRESS);
                roundRepository.save(parent.getRound());
            }
        }
        tournamentMatchRepository.save(parent);
    }

    /**
     * Le perdant d'une SF va vers le match 3e place.
     */
    private void propagateLoserToThirdPlace(TournamentMatch tm) {
        if (tm.getRound().getPhase() != TournamentPhase.SEMIFINAL) return;
        Tournament t = tm.getTournament();
        // Trouve le round THIRD_PLACE
        TournamentRound thirdRound = t.getRounds().stream()
                .filter(r -> r.getPhase() == TournamentPhase.THIRD_PLACE)
                .findFirst().orElse(null);
        if (thirdRound == null) {
            // recharge depuis repo si lazy
            thirdRound = roundRepository.findByTournamentIdOrderByRoundNumberAsc(t.getId()).stream()
                    .filter(r -> r.getPhase() == TournamentPhase.THIRD_PLACE)
                    .findFirst().orElse(null);
        }
        if (thirdRound == null) return;

        TournamentMatch thirdMatch = tournamentMatchRepository.findByRoundIdOrderByBracketPositionAsc(thirdRound.getId())
                .stream().findFirst().orElse(null);
        if (thirdMatch == null) return;

        Player loser = tm.getWinner().getId().equals(tm.getPlayer1().getId())
                ? tm.getPlayer2() : tm.getPlayer1();

        if (thirdMatch.getPlayer1() == null) {
            thirdMatch.setPlayer1(loser);
        } else if (thirdMatch.getPlayer2() == null) {
            thirdMatch.setPlayer2(loser);
        }

        if (thirdMatch.getPlayer1() != null && thirdMatch.getPlayer2() != null) {
            MatchEntity match = MatchEntity.builder()
                    .type(MatchType.FRIENDLY)
                    .bestOf(thirdMatch.getRound().getBestOf())
                    .player1(thirdMatch.getPlayer1()).player2(thirdMatch.getPlayer2())
                    .club(t.getClub())
                    .status(MatchStatus.IN_PROGRESS)
                    .scoreP1(0).scoreP2(0)
                    .build();
            match = matchRepository.save(match);
            thirdMatch.setMatch(match);
            thirdMatch.setStatus(TournamentMatchStatus.READY);
            thirdRound.setStatus(TournamentRoundStatus.IN_PROGRESS);
            roundRepository.save(thirdRound);
        }
        tournamentMatchRepository.save(thirdMatch);
    }

    /**
     * Après la fin de la phase de poules, qualifie les top N de chaque poule
     * et démarre le bracket avec eux.
     */
    private void generateBracketAfterPools(Tournament t) {
        int qPerPool = t.getQualifiersPerPool() != null ? t.getQualifiersPerPool() : 2;
        List<TournamentPool> pools = poolRepository.findByTournamentId(t.getId());

        // Pour chaque poule : trier par points DESC, puis par (balls_for - balls_against) DESC
        // (= différence de billes), puis par balls_against ASC (le moins en défaveur)
        List<TournamentParticipant> qualifiers = new ArrayList<>();
        for (TournamentPool pool : pools) {
            List<TournamentParticipant> ranked = participantRepository.findByPoolId(pool.getId())
                    .stream().sorted(this::comparePoolStats).toList();
            for (int i = 0; i < Math.min(qPerPool, ranked.size()); i++) {
                qualifiers.add(ranked.get(i));
            }
            // Les autres sortent
            for (int i = qPerPool; i < ranked.size(); i++) {
                TournamentParticipant tp = ranked.get(i);
                tp.setStatus(TournamentParticipantStatus.ELIMINATED);
                participantRepository.save(tp);
            }
        }

        if (t.getType() == TournamentType.POOL_ONLY) {
            // Pas de bracket : on finalise directement avec le classement final
            assignFinalPositionsFromPools(t, qualifiers);
            t.setStatus(TournamentStatus.FINISHED);
            t.setFinishedAt(LocalDateTime.now());
            tournamentRepository.save(t);
            return;
        }

        // POOL_AND_BRACKET → on enchaîne sur le bracket
        generateBracketFromList(t, qualifiers);
    }

    /** Compare 2 participants en poule : points DESC, diff billes DESC, balls_against ASC. */
    private int comparePoolStats(TournamentParticipant a, TournamentParticipant b) {
        int pts = Integer.compare(b.getPoolPoints(), a.getPoolPoints());
        if (pts != 0) return pts;
        int diffA = a.getPoolBallsFor() - a.getPoolBallsAgainst();
        int diffB = b.getPoolBallsFor() - b.getPoolBallsAgainst();
        int diff = Integer.compare(diffB, diffA);
        if (diff != 0) return diff;
        // Tie-break final : le moins de billes en défaveur (le moins "punching ball")
        return Integer.compare(a.getPoolBallsAgainst(), b.getPoolBallsAgainst());
    }

    /** Pour POOL_ONLY : attribue les positions finales depuis le tri pool stats. */
    private void assignFinalPositionsFromPools(Tournament t, List<TournamentParticipant> ranked) {
        for (int i = 0; i < ranked.size(); i++) {
            TournamentParticipant tp = ranked.get(i);
            tp.setFinalPosition(i + 1);
            tp.setStatus(switch (i) {
                case 0 -> TournamentParticipantStatus.CHAMPION;
                case 1 -> TournamentParticipantStatus.RUNNER_UP;
                case 2 -> TournamentParticipantStatus.THIRD_PLACE;
                case 3 -> TournamentParticipantStatus.FOURTH_PLACE;
                default -> TournamentParticipantStatus.ELIMINATED;
            });
            participantRepository.save(tp);
        }
        if (!ranked.isEmpty()) {
            t.setWinner(ranked.get(0).getPlayer());
        }
    }

    private LocalDateTime computeDeadline(Tournament t) {
        if (t.getMatchDeadlineHours() == null) return null;
        return LocalDateTime.now().plusHours(t.getMatchDeadlineHours());
    }

    // ====================================================================
    //  PHASE 3c : Hook MatchValidationListener
    // ====================================================================

    @Override
    @Transactional
    public void onValidated(MatchEntity match) {
        TournamentMatch tm = tournamentMatchRepository.findByMatchId(match.getId()).orElse(null);
        if (tm == null) return;

        tm.setWinner(match.getWinner());
        tm.setStatus(TournamentMatchStatus.COMPLETED);
        tm.setCompletedAt(LocalDateTime.now());
        tournamentMatchRepository.save(tm);

        // Stats de poule
        if (tm.getPool() != null) {
            updatePoolStats(tm, match);
        }

        // Marque le perdant comme ELIMINATED si bracket (pas de 2e chance hors 3e place)
        if (tm.getPool() == null) {
            Player loser = tm.getWinner().getId().equals(tm.getPlayer1().getId())
                    ? tm.getPlayer2() : tm.getPlayer1();
            // Sauf si c'est une SF (le perdant ira au match 3e place)
            if (tm.getRound().getPhase() != TournamentPhase.SEMIFINAL) {
                participantRepository.findByTournamentIdAndPlayerId(tm.getTournament().getId(), loser.getId())
                        .ifPresent(lp -> {
                            lp.setStatus(TournamentParticipantStatus.ELIMINATED);
                            participantRepository.save(lp);
                        });
            }
            // Propagation winner → nextMatch
            propagateWinner(tm);
            // Propagation loser de SF → match 3e place
            propagateLoserToThirdPlace(tm);
        }

        // Vérifie la fin du round courant
        checkRoundCompletion(tm.getRound());
    }

    @Override
    @Transactional
    public void onRejected(MatchEntity match) {
        TournamentMatch tm = tournamentMatchRepository.findByMatchId(match.getId()).orElse(null);
        if (tm == null) return;
        // Le rejet ramène le TournamentMatch en READY pour pouvoir le rejouer
        tm.setStatus(TournamentMatchStatus.READY);
        tm.setWinner(null);
        tournamentMatchRepository.save(tm);
    }

    /** Met à jour les stats de poule des 2 participants après un match validé. */
    private void updatePoolStats(TournamentMatch tm, MatchEntity match) {
        TournamentParticipant winnerP = participantRepository
                .findByTournamentIdAndPlayerId(tm.getTournament().getId(), match.getWinner().getId())
                .orElse(null);
        Player loser = match.getWinner().getId().equals(match.getPlayer1().getId())
                ? match.getPlayer2() : match.getPlayer1();
        TournamentParticipant loserP = participantRepository
                .findByTournamentIdAndPlayerId(tm.getTournament().getId(), loser.getId())
                .orElse(null);
        if (winnerP == null || loserP == null) return;

        // Calcul des billes "for" (pour le winner) et "against" (pour le loser)
        int ballsLeftToLoser = 0;   // billes que le winner a laissé au loser sur les frames qu'il a gagnées
        int ballsLeftToWinner = 0;  // idem inverse
        for (Frame f : match.getFrames()) {
            if (f.getWinner().getId().equals(winnerP.getPlayer().getId())) {
                ballsLeftToLoser += f.getBallsRemaining();
            } else {
                ballsLeftToWinner += f.getBallsRemaining();
            }
        }

        winnerP.setPoolWins(winnerP.getPoolWins() + 1);
        winnerP.setPoolPoints(winnerP.getPoolPoints() + 3);
        winnerP.setPoolBallsFor(winnerP.getPoolBallsFor() + ballsLeftToLoser);
        winnerP.setPoolBallsAgainst(winnerP.getPoolBallsAgainst() + ballsLeftToWinner);

        loserP.setPoolLosses(loserP.getPoolLosses() + 1);
        loserP.setPoolBallsFor(loserP.getPoolBallsFor() + ballsLeftToWinner);
        loserP.setPoolBallsAgainst(loserP.getPoolBallsAgainst() + ballsLeftToLoser);

        participantRepository.save(winnerP);
        participantRepository.save(loserP);
    }

    /** Vérifie si tous les matchs d'un round sont terminés et déclenche la suite. */
    private void checkRoundCompletion(TournamentRound round) {
        List<TournamentMatch> matches = tournamentMatchRepository.findByRoundIdOrderByBracketPositionAsc(round.getId());
        boolean allDone = matches.stream().allMatch(m ->
                m.getStatus() == TournamentMatchStatus.COMPLETED
                        || m.getStatus() == TournamentMatchStatus.DOUBLE_FORFEITED);
        if (!allDone) return;

        round.setStatus(TournamentRoundStatus.COMPLETED);
        roundRepository.save(round);

        Tournament t = round.getTournament();

        // Fin de la phase de poules → on enchaîne sur le bracket
        if (round.getPhase() == TournamentPhase.POOL) {
            generateBracketAfterPools(t);
            return;
        }

        // Fin de la finale → finalisation du tournoi (Phase 5)
        if (round.getPhase() == TournamentPhase.FINAL) {
            // Le match 3e place doit aussi être terminé pour finaliser
            boolean thirdDone = roundRepository.findByTournamentIdOrderByRoundNumberAsc(t.getId()).stream()
                    .filter(r -> r.getPhase() == TournamentPhase.THIRD_PLACE)
                    .allMatch(r -> r.getStatus() == TournamentRoundStatus.COMPLETED);
            if (thirdDone) finalizeTournament(t);
        }

        // Fin du match 3e place → finalisation si la finale est aussi finie
        if (round.getPhase() == TournamentPhase.THIRD_PLACE) {
            boolean finalDone = roundRepository.findByTournamentIdOrderByRoundNumberAsc(t.getId()).stream()
                    .filter(r -> r.getPhase() == TournamentPhase.FINAL)
                    .allMatch(r -> r.getStatus() == TournamentRoundStatus.COMPLETED);
            if (finalDone) finalizeTournament(t);
        }
    }

    // ====================================================================
    //  PHASE 5 : FINALISATION + CALCUL ELO
    // ====================================================================

    /** Base Elo par position finale (pour un tournoi de 8). On scale ensuite. */
    private static final int[] BASE_ELO_BY_POSITION = { 50, 30, 20, 10, 5, 5, 0, 0 };

    /**
     * Finalise le tournoi : assigne les positions, calcule l'Elo, met à jour les Player.
     */
    private void finalizeTournament(Tournament t) {
        // Détermination des podiums depuis les matchs du bracket
        List<TournamentRound> rounds = roundRepository.findByTournamentIdOrderByRoundNumberAsc(t.getId());
        TournamentRound finalRound = rounds.stream()
                .filter(r -> r.getPhase() == TournamentPhase.FINAL)
                .findFirst().orElse(null);
        TournamentRound thirdRound = rounds.stream()
                .filter(r -> r.getPhase() == TournamentPhase.THIRD_PLACE)
                .findFirst().orElse(null);

        Player champion = null, runnerUp = null, third = null, fourth = null;

        if (finalRound != null) {
            TournamentMatch finalMatch = tournamentMatchRepository
                    .findByRoundIdOrderByBracketPositionAsc(finalRound.getId())
                    .stream().findFirst().orElse(null);
            if (finalMatch != null && finalMatch.getWinner() != null) {
                champion = finalMatch.getWinner();
                runnerUp = finalMatch.getWinner().getId().equals(finalMatch.getPlayer1().getId())
                        ? finalMatch.getPlayer2() : finalMatch.getPlayer1();
            }
        }
        if (thirdRound != null) {
            TournamentMatch thirdMatch = tournamentMatchRepository
                    .findByRoundIdOrderByBracketPositionAsc(thirdRound.getId())
                    .stream().findFirst().orElse(null);
            if (thirdMatch != null && thirdMatch.getWinner() != null) {
                third = thirdMatch.getWinner();
                fourth = thirdMatch.getWinner().getId().equals(thirdMatch.getPlayer1().getId())
                        ? thirdMatch.getPlayer2() : thirdMatch.getPlayer1();
            }
        }

        // Assigne les statuts/positions des 4 premiers
        assignPosition(t, champion, 1, TournamentParticipantStatus.CHAMPION);
        assignPosition(t, runnerUp, 2, TournamentParticipantStatus.RUNNER_UP);
        assignPosition(t, third, 3, TournamentParticipantStatus.THIRD_PLACE);
        assignPosition(t, fourth, 4, TournamentParticipantStatus.FOURTH_PLACE);

        // Pour les autres : éliminés au tour le plus haut atteint → position basée sur ce tour
        // Simplification : tous les autres reçoivent la même position "5+" (à raffiner plus tard)
        List<TournamentParticipant> others = participantRepository.findByTournamentId(t.getId())
                .stream()
                .filter(p -> p.getFinalPosition() == null)
                .toList();
        int rank = 5;
        for (TournamentParticipant tp : others) {
            tp.setFinalPosition(rank++);
            if (tp.getStatus() != TournamentParticipantStatus.FORFEITED) {
                tp.setStatus(TournamentParticipantStatus.ELIMINATED);
            }
            participantRepository.save(tp);
        }

        // Winner du tournoi
        if (champion != null) {
            t.setWinner(champion);
        }

        // Calcul Elo si tournoi RANKED
        if (Boolean.TRUE.equals(t.getRanked())) {
            applyTournamentElo(t);
        }

        t.setStatus(TournamentStatus.FINISHED);
        t.setFinishedAt(LocalDateTime.now());
        tournamentRepository.save(t);
        log.info("Tournament {} finalized — winner: {}", t.getId(),
                champion != null ? champion.getName() : "none");
    }

    private void assignPosition(Tournament t, Player player, int position,
                                TournamentParticipantStatus status) {
        if (player == null) return;
        participantRepository.findByTournamentIdAndPlayerId(t.getId(), player.getId())
                .ifPresent(tp -> {
                    tp.setFinalPosition(position);
                    tp.setStatus(status);
                    participantRepository.save(tp);
                });
    }

    /**
     * Applique l'Elo aux joueurs en fin de tournoi.
     *
     * Formule par participant :
     *   base = baseEloByPosition[position-1]   (50 pour 1ᵉʳ, 30 pour 2ᵉ, …)
     *   ball_score = (balls_for - balls_against) / max_possible    [-1..1]
     *   delta = round(base + base * 0.5 * ball_score)               // ±50% modulation
     *
     * Pour les éliminés (position ≥ 5), delta = -10 modulé par leurs billes
     * (pour pénaliser les moins bons et récompenser ceux qui ont bien lutté).
     */
    private void applyTournamentElo(Tournament t) {
        List<TournamentParticipant> all = participantRepository.findByTournamentId(t.getId());
        int totalParticipants = all.size();

        for (TournamentParticipant tp : all) {
            int position = tp.getFinalPosition() != null ? tp.getFinalPosition() : totalParticipants;

            // Base par position
            int base;
            if (position - 1 < BASE_ELO_BY_POSITION.length) {
                base = BASE_ELO_BY_POSITION[position - 1];
            } else {
                base = -10;  // tous les éliminés "lointains" perdent un peu
            }

            // Modulation par les billes (poule + bracket cumulés)
            int totalBallsFor = tp.getPoolBallsFor();
            int totalBallsAgainst = tp.getPoolBallsAgainst();
            // On ajoute aussi les billes des matchs de bracket
            for (TournamentMatch tm : tournamentMatchRepository.findByTournamentIdOrderByIdAsc(t.getId())) {
                if (tm.getPool() != null) continue;  // déjà compté
                if (tm.getMatch() == null || tm.getMatch().getStatus() != MatchStatus.VALIDATED) continue;
                MatchEntity m = tm.getMatch();
                if (m.getPlayer1() == null || m.getPlayer2() == null) continue;
                if (!m.getPlayer1().getId().equals(tp.getPlayer().getId())
                        && !m.getPlayer2().getId().equals(tp.getPlayer().getId())) continue;

                for (Frame f : m.getFrames()) {
                    if (f.getWinner().getId().equals(tp.getPlayer().getId())) {
                        totalBallsFor += f.getBallsRemaining();
                    } else {
                        totalBallsAgainst += f.getBallsRemaining();
                    }
                }
            }

            // Score billes normalisé entre -1 et 1
            int totalBalls = totalBallsFor + totalBallsAgainst;
            double ballScore = totalBalls == 0 ? 0
                    : (totalBallsFor - totalBallsAgainst) / (double) totalBalls;

            int delta = (int) Math.round(base + base * 0.5 * ballScore);

            // Forfait : malus fixe lourd (override)
            if (tp.getStatus() == TournamentParticipantStatus.FORFEITED) {
                delta = -25;
            }

            tp.setEloChange(delta);
            participantRepository.save(tp);

            // Application au Player
            Player p = tp.getPlayer();
            p.setElo(Math.max(0, p.getElo() + delta));
            playerRepository.save(p);
        }
    }

    // --------------------------------------------------------------------
    //  Helpers permissions
    // --------------------------------------------------------------------

    private Set<Long> accessibleClubIds(User u) {
        Set<Long> ids = new HashSet<>();
        if (u.getRole() == Role.GERANT) {
            u.getManagedClubs().forEach(c -> ids.add(c.getId()));
        }
        playerRepository.findByUserId(u.getId()).ifPresent(p ->
                p.getClubs().forEach(c -> ids.add(c.getId()))
        );
        return ids;
    }

    private void assertCanView(Tournament t, User u) {
        if (u.getRole() == Role.ADMIN) return;
        Set<Long> ids = accessibleClubIds(u);
        if (!ids.contains(t.getClub().getId())) {
            throw ApiException.forbidden("Tu n'as pas accès à ce tournoi");
        }
    }

    private void assertCanManage(Tournament t, User u) {
        if (u.getRole() == Role.ADMIN) return;
        boolean isManager = u.getRole() == Role.GERANT && u.getManagedClubs().stream()
                .anyMatch(c -> c.getId().equals(t.getClub().getId()));
        if (!isManager) {
            throw ApiException.forbidden("Seul un admin ou un gérant du club peut piloter ce tournoi");
        }
    }

    // --------------------------------------------------------------------
    //  Mappers
    // --------------------------------------------------------------------

    public TournamentDto toDto(Tournament t, User viewer, Player viewerPlayer, boolean includeParticipants) {
        boolean isAdmin = viewer != null && viewer.getRole() == Role.ADMIN;
        boolean isManager = viewer != null && viewer.getRole() == Role.GERANT
                && viewer.getManagedClubs().stream()
                    .anyMatch(c -> c.getId().equals(t.getClub().getId()));
        boolean isRegistered = viewerPlayer != null
                && participantRepository.existsByTournamentIdAndPlayerId(t.getId(), viewerPlayer.getId());

        List<TournamentParticipantDto> participants = null;
        if (includeParticipants) {
            participants = participantRepository.findByTournamentId(t.getId())
                    .stream().map(this::participantToDto).toList();
        }
        int participantCount = participants != null
                ? participants.size()
                : participantRepository.findByTournamentId(t.getId()).size();

        return TournamentDto.builder()
                .id(t.getId()).name(t.getName()).description(t.getDescription())
                .type(t.getType()).status(t.getStatus()).ranked(t.getRanked())
                .clubId(t.getClub().getId()).clubName(t.getClub().getName())
                .createdByUserId(t.getCreatedBy() != null ? t.getCreatedBy().getId() : null)
                .createdByUsername(t.getCreatedBy() != null ? t.getCreatedBy().getUsername() : null)
                .poolBestOf(t.getPoolBestOf()).bracketBestOf(t.getBracketBestOf()).finalBestOf(t.getFinalBestOf())
                .poolSize(t.getPoolSize()).qualifiersPerPool(t.getQualifiersPerPool())
                .maxParticipants(t.getMaxParticipants()).matchDeadlineHours(t.getMatchDeadlineHours())
                .registrationDeadline(t.getRegistrationDeadline()).startsAt(t.getStartsAt())
                .createdAt(t.getCreatedAt()).startedAt(t.getStartedAt()).finishedAt(t.getFinishedAt())
                .winnerPlayerId(t.getWinner() != null ? t.getWinner().getId() : null)
                .winnerName(t.getWinner() != null ? t.getWinner().getName() : null)
                .participantCount(participantCount)
                .isRegistered(isRegistered).canManage(isAdmin || isManager)
                .participants(participants)
                .build();
    }

    // ====================================================================
    //  PHASE 6 : Endpoints utilitaires
    // ====================================================================

    /** Liste des TournamentMatch d'un tournoi (visible à tous ceux qui voient le tournoi). */
    @Transactional(readOnly = true)
    public List<TournamentMatchDto> getMatches(Long tournamentId, String username) {
        Tournament t = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> ApiException.notFound("Tournoi introuvable"));
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        assertCanView(t, u);
        return tournamentMatchRepository.findByTournamentIdOrderByIdAsc(t.getId())
                .stream().map(tm -> matchToDto(tm, t)).toList();
    }

    /** Liste des matchs de tournoi à jouer pour l'utilisateur courant. */
    @Transactional(readOnly = true)
    public List<TournamentMatchDto> getMyTournamentMatches(String username) {
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        List<TournamentMatch> ready = tournamentMatchRepository.findByStatusAndUserId(
                TournamentMatchStatus.READY, u.getId());
        List<TournamentMatch> deadlinePassed = tournamentMatchRepository.findByStatusAndUserId(
                TournamentMatchStatus.DEADLINE_PASSED, u.getId());
        List<TournamentMatch> all = new ArrayList<>(ready);
        all.addAll(deadlinePassed);
        return all.stream().map(tm -> matchToDto(tm, tm.getTournament())).toList();
    }

    /**
     * Force le double forfait d'un TournamentMatch (gérant/admin).
     * Marque les 2 joueurs comme FORFEITED et débloque le bracket.
     */
    @Transactional
    public TournamentMatchDto forceDoubleForfeit(Long tournamentMatchId, String username) {
        TournamentMatch tm = tournamentMatchRepository.findById(tournamentMatchId)
                .orElseThrow(() -> ApiException.notFound("Match de tournoi introuvable"));
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        assertCanManage(tm.getTournament(), u);

        if (tm.getStatus() == TournamentMatchStatus.COMPLETED) {
            throw ApiException.badRequest("Match déjà terminé");
        }

        tm.setStatus(TournamentMatchStatus.DOUBLE_FORFEITED);
        tm.setCompletedAt(LocalDateTime.now());

        // Annule le Match sous-jacent s'il existe
        if (tm.getMatch() != null) {
            MatchEntity m = tm.getMatch();
            m.setStatus(MatchStatus.REJECTED);
            matchRepository.save(m);
        }

        // Marque les 2 joueurs comme FORFEITED + applique le malus billes max
        Tournament t = tm.getTournament();
        for (Player p : List.of(tm.getPlayer1(), tm.getPlayer2())) {
            if (p == null) continue;
            participantRepository.findByTournamentIdAndPlayerId(t.getId(), p.getId())
                    .ifPresent(tp -> {
                        tp.setStatus(TournamentParticipantStatus.FORFEITED);
                        // 7 billes en défaveur (équivalent table propre adverse)
                        tp.setPoolBallsAgainst(tp.getPoolBallsAgainst() + 7);
                        participantRepository.save(tp);
                    });
        }

        tournamentMatchRepository.save(tm);
        checkRoundCompletion(tm.getRound());
        return matchToDto(tm, t);
    }

    public TournamentMatchDto matchToDto(TournamentMatch tm, Tournament t) {
        return TournamentMatchDto.builder()
                .id(tm.getId())
                .tournamentId(t.getId())
                .tournamentName(t.getName())
                .roundId(tm.getRound().getId())
                .phase(tm.getRound().getPhase())
                .roundNumber(tm.getRound().getRoundNumber())
                .bestOf(tm.getRound().getBestOf())
                .poolId(tm.getPool() != null ? tm.getPool().getId() : null)
                .poolName(tm.getPool() != null ? tm.getPool().getName() : null)
                .matchId(tm.getMatch() != null ? tm.getMatch().getId() : null)
                .player1Id(tm.getPlayer1() != null ? tm.getPlayer1().getId() : null)
                .player1Name(tm.getPlayer1() != null ? tm.getPlayer1().getName() : null)
                .player1Elo(tm.getPlayer1() != null ? tm.getPlayer1().getElo() : null)
                .player1UserId(tm.getPlayer1() != null && tm.getPlayer1().getUser() != null
                        ? tm.getPlayer1().getUser().getId() : null)
                .player2Id(tm.getPlayer2() != null ? tm.getPlayer2().getId() : null)
                .player2Name(tm.getPlayer2() != null ? tm.getPlayer2().getName() : null)
                .player2Elo(tm.getPlayer2() != null ? tm.getPlayer2().getElo() : null)
                .player2UserId(tm.getPlayer2() != null && tm.getPlayer2().getUser() != null
                        ? tm.getPlayer2().getUser().getId() : null)
                .bracketPosition(tm.getBracketPosition())
                .status(tm.getStatus())
                .winnerId(tm.getWinner() != null ? tm.getWinner().getId() : null)
                .winnerName(tm.getWinner() != null ? tm.getWinner().getName() : null)
                .deadline(tm.getDeadline())
                .completedAt(tm.getCompletedAt())
                .scoreP1(tm.getMatch() != null ? tm.getMatch().getScoreP1() : null)
                .scoreP2(tm.getMatch() != null ? tm.getMatch().getScoreP2() : null)
                .build();
    }

    public TournamentParticipantDto participantToDto(TournamentParticipant p) {
        return TournamentParticipantDto.builder()
                .id(p.getId()).playerId(p.getPlayer().getId())
                .playerName(p.getPlayer().getName()).playerElo(p.getPlayer().getElo())
                .playerUserId(p.getPlayer().getUser() != null ? p.getPlayer().getUser().getId() : null)
                .poolId(p.getPool() != null ? p.getPool().getId() : null)
                .poolName(p.getPool() != null ? p.getPool().getName() : null)
                .seed(p.getSeed()).status(p.getStatus()).finalPosition(p.getFinalPosition())
                .poolPoints(p.getPoolPoints()).poolWins(p.getPoolWins())
                .poolLosses(p.getPoolLosses()).poolDraws(p.getPoolDraws())
                .poolBallsFor(p.getPoolBallsFor()).poolBallsAgainst(p.getPoolBallsAgainst())
                .eloChange(p.getEloChange())
                .build();
    }
}
