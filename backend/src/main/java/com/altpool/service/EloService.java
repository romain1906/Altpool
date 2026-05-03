package com.altpool.service;

import com.altpool.entity.Frame;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EloService {

    public static final int K_BASE = 32;
    public static final int INITIAL_ELO = 1000;
    public static final int MAX_BALLS = 7; // billes "potentiables" hors blanche

    /**
     * Variantes simple : ne tient pas compte des frames (utilisée comme fallback).
     */
    public int[] computeNewRatings(int winnerElo, int loserElo) {
        return computeWithKFactor(winnerElo, loserElo, K_BASE);
    }

    /**
     * Calcul Elo modulé par la qualité de la victoire (mix marge frames + score billes).
     *
     * Formule :
     *   marge_frames = (frames_won - frames_lost) / best_of
     *   score_billes = moyenne sur les frames gagnées de (7 - balls_remaining) / 7
     *   score_qualité = 0.5 * marge_frames + 0.5 * score_billes
     *   K = 32 * (1 + 0.5 * score_qualité)   // entre 32 et 48
     *
     * @return tableau [newWinnerElo, newLoserElo, deltaWinner, deltaLoser]
     */
    public int[] computeWithFrames(int winnerElo, int loserElo,
                                   Long winnerPlayerId,
                                   List<Frame> frames,
                                   int bestOf) {
        int framesWon = 0, framesLost = 0;
        double ballScoreSum = 0.0;
        int wonCount = 0;

        for (Frame f : frames) {
            if (f.getWinner().getId().equals(winnerPlayerId)) {
                framesWon++;
                wonCount++;
                int rem = f.getBallsRemaining() == null ? 0 : f.getBallsRemaining();
                double score = (MAX_BALLS - Math.min(rem, MAX_BALLS)) / (double) MAX_BALLS;
                ballScoreSum += score;
            } else {
                framesLost++;
            }
        }

        double frameMargin = bestOf == 0 ? 0 : (framesWon - framesLost) / (double) bestOf;
        if (frameMargin < 0) frameMargin = 0;
        if (frameMargin > 1) frameMargin = 1;

        double ballScore = wonCount == 0 ? 0 : ballScoreSum / wonCount;

        double quality = 0.5 * frameMargin + 0.5 * ballScore; // 0..1
        double multiplier = 1.0 + 0.5 * quality;              // 1..1.5
        int k = (int) Math.round(K_BASE * multiplier);

        int[] r = computeWithKFactor(winnerElo, loserElo, k);
        int newWinner = r[0];
        int newLoser = r[1];
        return new int[]{ newWinner, newLoser, newWinner - winnerElo, newLoser - loserElo };
    }

    private int[] computeWithKFactor(int winnerElo, int loserElo, int k) {
        double expectedWinner = 1.0 / (1.0 + Math.pow(10, (loserElo - winnerElo) / 400.0));
        double expectedLoser  = 1.0 / (1.0 + Math.pow(10, (winnerElo - loserElo) / 400.0));
        int newWinner = (int) Math.round(winnerElo + k * (1 - expectedWinner));
        int newLoser  = (int) Math.round(loserElo  + k * (0 - expectedLoser));
        return new int[]{ newWinner, newLoser };
    }
}
