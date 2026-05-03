package com.altpool.service;

import com.altpool.dto.CreateMatchRequest;
import com.altpool.dto.FrameDto;
import com.altpool.dto.MatchDto;
import com.altpool.entity.*;
import com.altpool.exception.ApiException;
import com.altpool.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;
    private final FrameRepository frameRepository;
    private final PlayerRepository playerRepository;
    private final ClubRepository clubRepository;
    private final ReservationRepository reservationRepository;
    private final UserRepository userRepository;
    private final EloService eloService;
    private final java.util.List<MatchValidationListener> validationListeners;

    // --------------------------------------------------------------------
    //  Lectures
    // --------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<MatchDto> findAll() {
        return matchRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<MatchDto> findByStatus(MatchStatus status) {
        return matchRepository.findByStatusOrderByCreatedAtDesc(status)
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<MatchDto> findPendingForUser(String username) {
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        return matchRepository.findPendingForUser(u.getId())
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public MatchDto get(Long id) {
        return toDto(matchRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Match not found")));
    }

    // --------------------------------------------------------------------
    //  Création
    // --------------------------------------------------------------------

    @Transactional
    public MatchDto create(CreateMatchRequest req, String username) {
        if (req.getPlayer1Id().equals(req.getPlayer2Id())) {
            throw ApiException.badRequest("Les deux joueurs doivent être différents");
        }
        if (req.getBestOf() % 2 == 0) {
            throw ApiException.badRequest("best_of doit être impair");
        }

        Player p1 = playerRepository.findById(req.getPlayer1Id())
                .orElseThrow(() -> ApiException.notFound("Joueur 1 introuvable"));
        Player p2 = playerRepository.findById(req.getPlayer2Id())
                .orElseThrow(() -> ApiException.notFound("Joueur 2 introuvable"));

        boolean shareClub = p1.getClubs().stream()
                .anyMatch(c -> p2.getClubs().stream().anyMatch(c2 -> c2.getId().equals(c.getId())));
        if (!shareClub) {
            throw ApiException.badRequest("Les deux joueurs doivent partager un club commun");
        }

        Club club = null;
        if (req.getClubId() != null) {
            club = clubRepository.findById(req.getClubId())
                    .orElseThrow(() -> ApiException.notFound("Club introuvable"));
        }
        Reservation res = null;
        if (req.getReservationId() != null) {
            res = reservationRepository.findById(req.getReservationId())
                    .orElseThrow(() -> ApiException.notFound("Réservation introuvable"));
        }
        User creator = userRepository.findByUsername(username).orElse(null);

        MatchEntity m = MatchEntity.builder()
                .type(req.getType())
                .bestOf(req.getBestOf())
                .player1(p1)
                .player2(p2)
                .club(club)
                .reservation(res)
                .createdBy(creator)
                .status(MatchStatus.IN_PROGRESS)
                .scoreP1(0)
                .scoreP2(0)
                .build();
        m = matchRepository.save(m);

        // Mode after-the-fact : frames fournies d'un coup
        if (req.getFrames() != null && !req.getFrames().isEmpty()) {
            int n = 1;
            for (FrameDto fd : req.getFrames()) {
                addFrameInternal(m, fd, n++);
            }
            checkAndFinish(m);
        }

        return toDto(m);
    }

    // --------------------------------------------------------------------
    //  Ajout frame (mode live)
    // --------------------------------------------------------------------

    @Transactional
    public MatchDto addFrame(Long matchId, FrameDto fd) {
        MatchEntity m = matchRepository.findById(matchId)
                .orElseThrow(() -> ApiException.notFound("Match introuvable"));
        if (m.getStatus() != MatchStatus.IN_PROGRESS) {
            throw ApiException.badRequest("Le match n'est plus en cours");
        }
        int next = m.getFrames().size() + 1;
        addFrameInternal(m, fd, next);
        checkAndFinish(m);
        return toDto(m);
    }

    private void addFrameInternal(MatchEntity m, FrameDto fd, int frameNumber) {
        if (fd.getWinnerId() == null) {
            throw ApiException.badRequest("winnerId requis");
        }
        if (fd.getBallsRemaining() == null || fd.getBallsRemaining() < 0 || fd.getBallsRemaining() > 7) {
            throw ApiException.badRequest("ballsRemaining doit être entre 0 et 7");
        }

        Player winner, loser;
        if (fd.getWinnerId().equals(m.getPlayer1().getId())) {
            winner = m.getPlayer1(); loser = m.getPlayer2();
        } else if (fd.getWinnerId().equals(m.getPlayer2().getId())) {
            winner = m.getPlayer2(); loser = m.getPlayer1();
        } else {
            throw ApiException.badRequest("winnerId ne correspond pas aux joueurs du match");
        }

        Frame f = Frame.builder()
                .match(m)
                .frameNumber(frameNumber)
                .winner(winner)
                .loser(loser)
                .endedOnBlack(Boolean.TRUE.equals(fd.getEndedOnBlack()))
                .ballsRemaining(fd.getBallsRemaining())
                .foulFinish(Boolean.TRUE.equals(fd.getFoulFinish()))
                .durationSec(fd.getDurationSec())
                .build();
        m.getFrames().add(f);
        frameRepository.save(f);

        // Met à jour le score
        if (winner.getId().equals(m.getPlayer1().getId())) {
            m.setScoreP1(m.getScoreP1() + 1);
        } else {
            m.setScoreP2(m.getScoreP2() + 1);
        }
    }

    /** Détecte si le match est terminé et bascule en PENDING_VALIDATION. */
    private void checkAndFinish(MatchEntity m) {
        int target = m.targetWins();
        if (m.getScoreP1() >= target || m.getScoreP2() >= target) {
            Player winner = m.getScoreP1() >= target ? m.getPlayer1() : m.getPlayer2();
            m.setWinner(winner);
            m.setStatus(MatchStatus.PENDING_VALIDATION);
            m.setFinishedAt(LocalDateTime.now());
        }
        matchRepository.save(m);
    }

    /** Suppression d'une frame (correction d'erreur de saisie, ramène en IN_PROGRESS). */
    @Transactional
    public MatchDto removeFrame(Long matchId, Long frameId) {
        MatchEntity m = matchRepository.findById(matchId)
                .orElseThrow(() -> ApiException.notFound("Match introuvable"));
        if (m.getStatus() == MatchStatus.VALIDATED) {
            throw ApiException.badRequest("Match déjà validé, impossible de modifier");
        }
        Frame f = frameRepository.findById(frameId)
                .orElseThrow(() -> ApiException.notFound("Frame introuvable"));
        if (!f.getMatch().getId().equals(m.getId())) {
            throw ApiException.badRequest("Cette frame n'appartient pas au match");
        }
        if (f.getWinner().getId().equals(m.getPlayer1().getId())) {
            m.setScoreP1(Math.max(0, m.getScoreP1() - 1));
        } else {
            m.setScoreP2(Math.max(0, m.getScoreP2() - 1));
        }
        m.getFrames().remove(f);
        frameRepository.delete(f);
        // re-numérote les frames suivantes
        int n = 1;
        List<Frame> remaining = new ArrayList<>(m.getFrames());
        remaining.sort((a, b) -> a.getFrameNumber() - b.getFrameNumber());
        for (Frame fr : remaining) fr.setFrameNumber(n++);
        m.setStatus(MatchStatus.IN_PROGRESS);
        m.setWinner(null);
        m.setFinishedAt(null);
        return toDto(matchRepository.save(m));
    }

    // --------------------------------------------------------------------
    //  Validation
    // --------------------------------------------------------------------

    @Transactional
    public MatchDto validate(Long matchId, String username) {
        MatchEntity m = matchRepository.findById(matchId)
                .orElseThrow(() -> ApiException.notFound("Match introuvable"));
        if (m.getStatus() != MatchStatus.PENDING_VALIDATION) {
            throw ApiException.badRequest("Match non en attente de validation");
        }
        User actor = assertActorCanResolve(m, username);

        if (m.getType() == MatchType.RANKED) {
            Player winner = m.getWinner();
            Player loser = m.getLoser();
            int[] r = eloService.computeWithFrames(
                    winner.getElo(), loser.getElo(),
                    winner.getId(), m.getFrames(), m.getBestOf());
            int newWinnerElo = r[0];
            int newLoserElo = r[1];
            int dWinner = r[2];
            int dLoser = r[3];
            winner.setElo(newWinnerElo);
            loser.setElo(newLoserElo);
            playerRepository.save(winner);
            playerRepository.save(loser);
            m.setEloChangeWinner(dWinner);
            m.setEloChangeLoser(dLoser);
        } else {
            m.setEloChangeWinner(0);
            m.setEloChangeLoser(0);
        }

        m.setStatus(MatchStatus.VALIDATED);
        m.setValidatedAt(LocalDateTime.now());
        m.setValidatedBy(actor);
        MatchEntity saved = matchRepository.save(m);
        // Notifie les listeners (ex. TournamentService pour propagation bracket)
        validationListeners.forEach(l -> l.onValidated(saved));
        return toDto(saved);
    }

    @Transactional
    public MatchDto reject(Long matchId, String username) {
        MatchEntity m = matchRepository.findById(matchId)
                .orElseThrow(() -> ApiException.notFound("Match introuvable"));
        if (m.getStatus() != MatchStatus.PENDING_VALIDATION) {
            throw ApiException.badRequest("Match non en attente de validation");
        }
        User actor = assertActorCanResolve(m, username);
        m.setStatus(MatchStatus.REJECTED);
        m.setValidatedAt(LocalDateTime.now());
        m.setValidatedBy(actor);
        MatchEntity saved = matchRepository.save(m);
        validationListeners.forEach(l -> l.onRejected(saved));
        return toDto(saved);
    }

    private User assertActorCanResolve(MatchEntity m, String username) {
        User actor = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        if (actor.getRole() == Role.ADMIN) return actor;
        Player loser = m.getLoser();
        boolean isLoser = loser != null && loser.getUser() != null
                && loser.getUser().getId().equals(actor.getId());
        if (!isLoser) {
            throw ApiException.forbidden("Seul le perdant ou un admin peut valider/refuser ce match");
        }
        return actor;
    }

    // --------------------------------------------------------------------
    //  Mappers
    // --------------------------------------------------------------------

    public MatchDto toDto(MatchEntity m) {
        List<FrameDto> frames = m.getFrames() == null ? List.of() : m.getFrames().stream()
                .map(this::frameToDto).toList();
        return MatchDto.builder()
                .id(m.getId())
                .type(m.getType())
                .bestOf(m.getBestOf())
                .player1Id(m.getPlayer1().getId())
                .player1Name(m.getPlayer1().getName())
                .player1Elo(m.getPlayer1().getElo())
                .player1UserId(m.getPlayer1().getUser() != null ? m.getPlayer1().getUser().getId() : null)
                .player2Id(m.getPlayer2().getId())
                .player2Name(m.getPlayer2().getName())
                .player2Elo(m.getPlayer2().getElo())
                .player2UserId(m.getPlayer2().getUser() != null ? m.getPlayer2().getUser().getId() : null)
                .clubId(m.getClub() != null ? m.getClub().getId() : null)
                .clubName(m.getClub() != null ? m.getClub().getName() : null)
                .reservationId(m.getReservation() != null ? m.getReservation().getId() : null)
                .status(m.getStatus())
                .winnerId(m.getWinner() != null ? m.getWinner().getId() : null)
                .winnerName(m.getWinner() != null ? m.getWinner().getName() : null)
                .scoreP1(m.getScoreP1())
                .scoreP2(m.getScoreP2())
                .eloChangeWinner(m.getEloChangeWinner())
                .eloChangeLoser(m.getEloChangeLoser())
                .createdByUsername(m.getCreatedBy() != null ? m.getCreatedBy().getUsername() : null)
                .validatedByUsername(m.getValidatedBy() != null ? m.getValidatedBy().getUsername() : null)
                .createdAt(m.getCreatedAt())
                .finishedAt(m.getFinishedAt())
                .validatedAt(m.getValidatedAt())
                .frames(frames)
                .build();
    }

    public FrameDto frameToDto(Frame f) {
        return FrameDto.builder()
                .id(f.getId())
                .frameNumber(f.getFrameNumber())
                .winnerId(f.getWinner().getId())
                .winnerName(f.getWinner().getName())
                .loserId(f.getLoser().getId())
                .loserName(f.getLoser().getName())
                .endedOnBlack(f.getEndedOnBlack())
                .ballsRemaining(f.getBallsRemaining())
                .foulFinish(f.getFoulFinish())
                .durationSec(f.getDurationSec())
                .playedAt(f.getPlayedAt() == null ? null : f.getPlayedAt().toString())
                .build();
    }
}
