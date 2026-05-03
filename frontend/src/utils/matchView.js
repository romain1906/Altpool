/**
 * Helpers pour analyser un MatchDto du point de vue d'un user donné.
 */

/** Retourne quel "côté" le user occupe dans le match : "p1" | "p2" | null. */
export function userSideInMatch(match, userId) {
  if (!match || !userId) return null;
  if (match.player1UserId === userId) return "p1";
  if (match.player2UserId === userId) return "p2";
  return null;
}

/**
 * Vue subjective d'un match :
 *   {
 *     side: "p1" | "p2" | null,      // côté du user
 *     hasParticipated: boolean,
 *     isWinner, isLoser, isDraw: bool, // pour l'instant pas de draw, mais on prépare
 *     myDelta: number|null,           // +14, -14, ou null si non participant / non validé
 *     opponentDelta: number|null,
 *     myName, opponentName, myElo, opponentElo,
 *     canValidate: bool,              // peut valider/refuser
 *   }
 */
export function matchView(match, currentUser, isAdminFlag) {
  const userId = currentUser?.userId;
  const side = userSideInMatch(match, userId);
  const hasParticipated = side != null;

  const isWinner = hasParticipated && match.winnerId != null
    && ((side === "p1" && match.winnerId === match.player1Id)
     || (side === "p2" && match.winnerId === match.player2Id));

  const isLoser = hasParticipated && match.winnerId != null && !isWinner;

  let myDelta = null;
  let opponentDelta = null;
  if (match.status === "VALIDATED" && match.eloChangeWinner != null) {
    if (isWinner) { myDelta = match.eloChangeWinner; opponentDelta = match.eloChangeLoser; }
    else if (isLoser) { myDelta = match.eloChangeLoser; opponentDelta = match.eloChangeWinner; }
  }

  const myName = side === "p1" ? match.player1Name : side === "p2" ? match.player2Name : null;
  const myElo  = side === "p1" ? match.player1Elo  : side === "p2" ? match.player2Elo  : null;
  const opponentName = side === "p1" ? match.player2Name : side === "p2" ? match.player1Name : null;
  const opponentElo  = side === "p1" ? match.player2Elo  : side === "p2" ? match.player1Elo  : null;

  const canValidate = match.status === "PENDING_VALIDATION"
    && (isAdminFlag || isLoser);

  return {
    side, hasParticipated,
    isWinner, isLoser,
    myDelta, opponentDelta,
    myName, opponentName, myElo, opponentElo,
    canValidate,
  };
}
