import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import notify from "devextreme/ui/notify";
import api from "../services/api";
import { currentUser, isAdmin, canManage } from "../services/auth";

const PHASE_LABEL = {
  POOL: "Phase de poules",
  ROUND_OF_32: "16e de finale",
  ROUND_OF_16: "8e de finale",
  QUARTERFINAL: "Quart de finale",
  SEMIFINAL: "Demi-finale",
  THIRD_PLACE: "Match pour la 3e place",
  FINAL: "Finale",
};

const TM_STATUS_COLORS = {
  WAITING:            { bg: "rgba(138,146,178,0.15)", fg: "#8A92B2", label: "En attente" },
  READY:              { bg: "rgba(59,130,246,0.18)",  fg: "#60A5FA", label: "À jouer" },
  IN_PROGRESS:        { bg: "rgba(123,92,255,0.18)",  fg: "#9B7FFF", label: "En cours" },
  PENDING_VALIDATION: { bg: "rgba(250,204,21,0.18)",  fg: "#FACC15", label: "À valider" },
  COMPLETED:          { bg: "rgba(34,197,94,0.18)",   fg: "#22C55E", label: "Terminé" },
  DEADLINE_PASSED:    { bg: "rgba(239,68,68,0.18)",   fg: "#EF4444", label: "Deadline" },
  DOUBLE_FORFEITED:   { bg: "rgba(168,55,43,0.25)",   fg: "#FCA5A5", label: "Double forfait" },
};

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = currentUser();
  const [t, setT] = useState(null);
  const [matches, setMatches] = useState([]);

  const load = useCallback(() => {
    Promise.all([
      api.get(`/tournaments/${id}`),
      api.get(`/tournaments/${id}/matches`),
    ]).then(([tRes, mRes]) => {
      setT(tRes.data);
      setMatches(mRes.data);
    }).catch(() => notify("Tournoi introuvable", "error", 2500));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (fn, msg) => {
    try { await fn(); notify(msg, "success", 2000); load(); }
    catch (err) { notify(err.response?.data?.message || "Erreur", "error", 3000); }
  };

  if (!t) {
    return <div><h2 className="page-title"><i className="fi fi-rr-trophy" /> Tournoi</h2>
      <div className="card" style={{ textAlign: "center", color: "#8A92B2" }}>Chargement…</div></div>;
  }

  const isReg = t.status === "REGISTRATION";
  const isLive = t.status === "IN_PROGRESS";
  const isDone = t.status === "FINISHED";
  const myMatches = matches.filter(m =>
    (m.player1UserId === me?.userId || m.player2UserId === me?.userId) &&
    (m.status === "READY" || m.status === "IN_PROGRESS" || m.status === "PENDING_VALIDATION" || m.status === "DEADLINE_PASSED")
  );

  return (
    <div>
      <button type="button" onClick={() => navigate("/tournaments")}
        style={{
          background: "transparent", border: "none", cursor: "pointer",
          color: "#9B7FFF", fontSize: 13, fontFamily: "inherit",
          display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 0", marginBottom: 14,
        }}>
        <i className="fi fi-rr-arrow-left" /> Retour aux tournois
      </button>

      {/* Header */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{
          background: "linear-gradient(135deg, #5B3FE0, #7B5CFF)",
          color: "#fff", padding: "24px 28px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{
              background: "rgba(255,255,255,0.15)", color: "#fff",
              padding: "3px 12px", borderRadius: 100,
              fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
            }}>{t.type === "POOL_AND_BRACKET" ? "Poules + bracket" : t.type === "BRACKET_ONLY" ? "Élimination directe" : "Round robin"}</span>
            {t.ranked && (
              <span style={{
                background: "rgba(212,165,55,0.25)", color: "#FACC15",
                padding: "3px 12px", borderRadius: 100,
                fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
              }}>🏆 Classé</span>
            )}
            <StatusBadge status={t.status} />
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>
            {t.name}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, display: "flex", alignItems: "center", gap: 6 }}>
            <i className="fi fi-rr-marker" /> {t.clubName}
            <span style={{ marginLeft: 14 }}>•</span>
            <span style={{ marginLeft: 14 }}>{t.participantCount} inscrit{t.participantCount > 1 ? "s" : ""}</span>
          </div>
          {t.description && (
            <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>{t.description}</div>
          )}
          {t.winnerName && (
            <div style={{
              marginTop: 14, padding: "10px 14px", borderRadius: 8,
              background: "rgba(34,197,94,0.2)", display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 14, fontWeight: 700,
            }}>
              <i className="fi fi-sr-crown" style={{ color: "#FACC15" }} /> Vainqueur : {t.winnerName}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{
          padding: "14px 28px", borderTop: "1px solid #2A3050",
          display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        }}>
          {isReg && !t.canManage && (
            <button type="button"
              onClick={() => handleAction(
                () => t.isRegistered ? api.delete(`/tournaments/${id}/register`) : api.post(`/tournaments/${id}/register`),
                t.isRegistered ? "Désinscription" : "Inscription confirmée"
              )}
              style={t.isRegistered ? btnGhost : btnPrimary}>
              <i className={t.isRegistered ? "fi fi-rr-cross" : "fi fi-rr-user-add"} />
              &nbsp;{t.isRegistered ? "Me désinscrire" : "S'inscrire"}
            </button>
          )}
          {t.canManage && isReg && (
            <button type="button"
              onClick={() => {
                if (!window.confirm("Démarrer le tournoi ? Les inscriptions seront closes.")) return;
                handleAction(() => api.post(`/tournaments/${id}/start`), "Tournoi démarré");
              }}
              style={btnPrimary}>
              <i className="fi fi-rr-play" /> &nbsp;Démarrer le tournoi
            </button>
          )}
          {t.canManage && (isReg || isLive) && (
            <button type="button"
              onClick={() => {
                if (!window.confirm("Annuler ce tournoi ?")) return;
                handleAction(() => api.post(`/tournaments/${id}/cancel`), "Tournoi annulé");
              }}
              style={btnDanger}>Annuler</button>
          )}
        </div>
      </div>

      {/* Mes matchs à jouer dans ce tournoi */}
      {myMatches.length > 0 && (
        <div className="card" style={{
          background: "linear-gradient(135deg, rgba(123,92,255,0.12), rgba(91,63,224,0.06))",
          border: "1px solid rgba(123,92,255,0.4)",
        }}>
          <h3 style={sectionTitle}><i className="fi fi-rr-bell" style={{ color: "#9B7FFF" }} /> Tes matchs à jouer</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {myMatches.map((m) => <MyMatchRow key={m.id} m={m} navigate={navigate} />)}
          </div>
        </div>
      )}

      {/* Participants */}
      <div className="card">
        <h3 style={sectionTitle}><i className="fi fi-rr-users" style={{ color: "#7B5CFF" }} />
          Participants ({t.participants?.length || 0})
        </h3>
        {(!t.participants || t.participants.length === 0) ? (
          <div style={{ color: "#8A92B2", fontStyle: "italic", fontSize: 13 }}>
            Aucun inscrit pour le moment.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {t.participants.map((p) => (
              <ParticipantPill key={p.id} p={p} highlightWinner={t.winnerPlayerId === p.playerId} />
            ))}
          </div>
        )}
      </div>

      {/* Standings de poules */}
      {(isLive || isDone) && hasPools(matches) && (
        <PoolsSection tournament={t} matches={matches} />
      )}

      {/* Bracket */}
      {(isLive || isDone) && hasBracket(matches) && (
        <BracketSection tournament={t} matches={matches} navigate={navigate} canManage={t.canManage} onRefresh={load} />
      )}
    </div>
  );
}

// ===========================================================================
//  COMPOSANTS
// ===========================================================================

function StatusBadge({ status }) {
  const map = {
    REGISTRATION:    { bg: "rgba(59,130,246,0.25)",  fg: "#60A5FA",  label: "Inscriptions" },
    READY_TO_START:  { bg: "rgba(250,204,21,0.25)",  fg: "#FACC15",  label: "Prêt" },
    IN_PROGRESS:     { bg: "rgba(123,92,255,0.3)",   fg: "#fff",     label: "En cours" },
    FINISHED:        { bg: "rgba(34,197,94,0.3)",    fg: "#86EFAC",  label: "Terminé" },
    CANCELLED:       { bg: "rgba(239,68,68,0.25)",   fg: "#FCA5A5",  label: "Annulé" },
  }[status] || { bg: "#333", fg: "#aaa", label: status };
  return <span style={{
    background: map.bg, color: map.fg,
    padding: "3px 12px", borderRadius: 100,
    fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
  }}>{map.label}</span>;
}

function ParticipantPill({ p, highlightWinner }) {
  const isCrown = highlightWinner || p.status === "CHAMPION";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "8px 14px", borderRadius: 100,
      background: isCrown ? "rgba(250,204,21,0.18)"
                : p.status === "RUNNER_UP" ? "rgba(192,192,192,0.15)"
                : p.status === "THIRD_PLACE" ? "rgba(205,127,50,0.18)"
                : p.status === "FORFEITED" ? "rgba(239,68,68,0.12)"
                : "rgba(123,92,255,0.12)",
      color: "#fff", border: "1px solid rgba(255,255,255,0.05)",
      fontSize: 13, fontWeight: 600,
    }}>
      {p.finalPosition && <span style={{
        background: "rgba(0,0,0,0.3)", color: "#FACC15",
        width: 22, height: 22, borderRadius: "50%",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700,
      }}>{p.finalPosition}</span>}
      {isCrown && <i className="fi fi-sr-crown" style={{ color: "#FACC15" }} />}
      {p.playerName}
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, opacity: 0.65 }}>
        {p.playerElo}
      </span>
      {p.eloChange != null && (
        <span style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700,
          color: p.eloChange >= 0 ? "#22C55E" : "#EF4444",
        }}>{p.eloChange >= 0 ? "+" : ""}{p.eloChange}</span>
      )}
    </div>
  );
}

function MyMatchRow({ m, navigate }) {
  const phase = PHASE_LABEL[m.phase] || m.phase;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
      background: "rgba(123,92,255,0.08)", borderRadius: 8, cursor: "pointer",
    }} onClick={() => m.matchId && navigate(`/matches/${m.matchId}`)}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
        background: "rgba(123,92,255,0.2)", color: "#9B7FFF",
        padding: "3px 8px", borderRadius: 100,
      }}>BO{m.bestOf} · {phase}</span>
      <div style={{ flex: 1, color: "#fff", fontSize: 14, fontWeight: 600 }}>
        {m.player1Name} <span style={{ color: "#8A92B2", fontSize: 11 }}>vs</span> {m.player2Name}
      </div>
      <button type="button"
        style={{
          background: "#7B5CFF", color: "#fff", border: "none",
          padding: "6px 14px", borderRadius: 100,
          fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
        }}>
        Encoder →
      </button>
    </div>
  );
}

// ---------- POULES ----------

function hasPools(matches) {
  return matches.some(m => m.poolId != null);
}

function PoolsSection({ tournament, matches }) {
  // Group participants by pool
  const poolsMap = {};
  (tournament.participants || []).forEach(p => {
    if (p.poolId) {
      if (!poolsMap[p.poolId]) poolsMap[p.poolId] = { id: p.poolId, name: p.poolName, players: [] };
      poolsMap[p.poolId].players.push(p);
    }
  });
  Object.values(poolsMap).forEach(pool => {
    pool.players.sort((a, b) => {
      const pts = (b.poolPoints || 0) - (a.poolPoints || 0);
      if (pts !== 0) return pts;
      const dA = (a.poolBallsFor || 0) - (a.poolBallsAgainst || 0);
      const dB = (b.poolBallsFor || 0) - (b.poolBallsAgainst || 0);
      const diff = dB - dA;
      if (diff !== 0) return diff;
      return (a.poolBallsAgainst || 0) - (b.poolBallsAgainst || 0);
    });
  });

  return (
    <div className="card">
      <h3 style={sectionTitle}>
        <i className="fi fi-rr-list-check" style={{ color: "#7B5CFF" }} /> Phase de poules
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
        {Object.values(poolsMap).map(pool => (
          <PoolStandings key={pool.id} pool={pool}
            matches={matches.filter(m => m.poolId === pool.id)} />
        ))}
      </div>
    </div>
  );
}

function PoolStandings({ pool, matches }) {
  const qualifierLine = 2; // par défaut top 2 (à raffiner avec t.qualifiersPerPool)
  return (
    <div style={{
      background: "rgba(10,15,40,0.5)", borderRadius: 8, overflow: "hidden",
      border: "1px solid #2A3050",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #5B3FE0, #7B5CFF)",
        color: "#fff", padding: "10px 14px", fontWeight: 700, fontSize: 13,
        letterSpacing: 1, textTransform: "uppercase",
      }}>{pool.name}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "rgba(123,92,255,0.08)", color: "#8A92B2" }}>
            <Th>#</Th><Th left>Joueur</Th><Th>Pts</Th><Th>V</Th><Th>D</Th><Th title="Billes mises à l'adversaire">+B</Th><Th title="Billes laissées en sa défaveur (tie-break)">−B</Th>
          </tr>
        </thead>
        <tbody>
          {pool.players.map((p, i) => (
            <tr key={p.id} style={{
              borderTop: "1px solid #2A3050",
              background: i < qualifierLine ? "rgba(34,197,94,0.06)" : "transparent",
            }}>
              <Td><span style={{
                color: i < qualifierLine ? "#22C55E" : "#8A92B2",
                fontWeight: 700, fontFamily: "JetBrains Mono, monospace",
              }}>{i + 1}</span></Td>
              <Td left>
                <span style={{ fontWeight: 600, color: "#fff" }}>{p.playerName}</span>
                <span style={{ marginLeft: 6, color: "#8A92B2", fontFamily: "JetBrains Mono, monospace", fontSize: 10 }}>{p.playerElo}</span>
              </Td>
              <Td><strong style={{ color: "#fff" }}>{p.poolPoints}</strong></Td>
              <Td>{p.poolWins}</Td>
              <Td>{p.poolLosses}</Td>
              <Td><span style={{ color: "#22C55E" }}>{p.poolBallsFor}</span></Td>
              <Td><span style={{ color: "#EF4444" }}>{p.poolBallsAgainst}</span></Td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Mini liste des matchs */}
      <div style={{ padding: "8px 12px", fontSize: 11, color: "#8A92B2",
        borderTop: "1px solid #2A3050", background: "rgba(0,0,0,0.15)" }}>
        {matches.filter(m => m.status === "COMPLETED").length} / {matches.length} match{matches.length > 1 ? "s" : ""} joué{matches.length > 1 ? "s" : ""}
      </div>
    </div>
  );
}

function Th({ children, left, title }) {
  return <th style={{
    padding: "8px 6px", textAlign: left ? "left" : "center",
    fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", fontSize: 10,
  }} title={title}>{children}</th>;
}
function Td({ children, left }) {
  return <td style={{ padding: "8px 6px", textAlign: left ? "left" : "center" }}>{children}</td>;
}

// ---------- BRACKET ----------

function hasBracket(matches) {
  return matches.some(m => m.poolId == null);
}

function BracketSection({ tournament, matches, navigate, canManage, onRefresh }) {
  // Grouper par phase, ordre du plus tôt au plus tard
  const phaseOrder = ["ROUND_OF_32", "ROUND_OF_16", "QUARTERFINAL", "SEMIFINAL", "FINAL", "THIRD_PLACE"];
  const bracketMatches = matches.filter(m => m.poolId == null);
  const byPhase = {};
  bracketMatches.forEach(m => {
    if (!byPhase[m.phase]) byPhase[m.phase] = [];
    byPhase[m.phase].push(m);
  });
  Object.values(byPhase).forEach(arr =>
    arr.sort((a, b) => (a.bracketPosition || 0) - (b.bracketPosition || 0)));

  const phasesPresent = phaseOrder.filter(p => byPhase[p]);

  return (
    <div className="card">
      <h3 style={sectionTitle}>
        <i className="fi fi-rr-tournament" style={{ color: "#7B5CFF" }} /> Bracket
      </h3>
      <div style={{
        display: "flex", gap: 18, overflowX: "auto", paddingBottom: 10, alignItems: "stretch",
      }}>
        {phasesPresent.filter(p => p !== "THIRD_PLACE").map(phase => (
          <BracketColumn key={phase} phase={phase} matches={byPhase[phase]}
            navigate={navigate} canManage={canManage} onRefresh={onRefresh} />
        ))}
        {byPhase["THIRD_PLACE"] && (
          <div style={{
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
            paddingLeft: 18, borderLeft: "1px dashed #2A3050",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
              color: "#FACC15", marginBottom: 8,
            }}>Match 3e place</div>
            {byPhase["THIRD_PLACE"].map(m => (
              <BracketMatchCard key={m.id} m={m} navigate={navigate}
                canManage={canManage} onRefresh={onRefresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BracketColumn({ phase, matches, navigate, canManage, onRefresh }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", minWidth: 240, gap: 12 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
        color: "#9B7FFF", textAlign: "center",
      }}>{PHASE_LABEL[phase] || phase}</div>
      {matches.map(m => <BracketMatchCard key={m.id} m={m} navigate={navigate}
        canManage={canManage} onRefresh={onRefresh} />)}
    </div>
  );
}

function BracketMatchCard({ m, navigate, canManage, onRefresh }) {
  const status = TM_STATUS_COLORS[m.status] || TM_STATUS_COLORS.WAITING;
  const isP1Win = m.winnerId && m.winnerId === m.player1Id;
  const isP2Win = m.winnerId && m.winnerId === m.player2Id;

  const handleClick = () => {
    if (m.matchId) navigate(`/matches/${m.matchId}`);
  };

  const handleForfeit = async (e) => {
    e.stopPropagation();
    if (!window.confirm("Déclarer un double forfait pour ce match ?")) return;
    try {
      await api.post(`/tournaments/matches/${m.id}/double-forfeit`);
      notify("Double forfait appliqué", "success", 2000);
      onRefresh?.();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  return (
    <div style={{
      background: "rgba(10,15,40,0.6)", border: "1px solid #2A3050",
      borderRadius: 6, overflow: "hidden", cursor: m.matchId ? "pointer" : "default",
    }} onClick={handleClick}>
      <PlayerSlot name={m.player1Name} score={m.scoreP1} isWinner={isP1Win} />
      <div style={{ height: 1, background: "#2A3050" }} />
      <PlayerSlot name={m.player2Name} score={m.scoreP2} isWinner={isP2Win} />
      <div style={{
        padding: "5px 10px", display: "flex", alignItems: "center",
        background: "rgba(0,0,0,0.2)", borderTop: "1px solid #2A3050",
      }}>
        <span style={{
          background: status.bg, color: status.fg,
          padding: "1px 8px", borderRadius: 100,
          fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
        }}>{status.label}</span>
        <span style={{ flex: 1 }} />
        {canManage && (m.status === "READY" || m.status === "IN_PROGRESS" || m.status === "DEADLINE_PASSED") && (
          <button type="button" onClick={handleForfeit}
            title="Double forfait"
            style={{
              background: "transparent", color: "#EF4444", border: "none",
              cursor: "pointer", fontSize: 11, padding: "2px 4px",
            }}><i className="fi fi-rr-ban" /></button>
        )}
      </div>
    </div>
  );
}

function PlayerSlot({ name, score, isWinner }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", padding: "8px 12px",
      background: isWinner ? "rgba(34,197,94,0.08)" : "transparent",
    }}>
      <span style={{
        flex: 1, fontSize: 12, fontWeight: isWinner ? 700 : 500,
        color: name ? (isWinner ? "#fff" : "#C9D1FF") : "#5A6478",
        fontStyle: name ? "normal" : "italic",
      }}>
        {isWinner && <i className="fi fi-sr-crown" style={{ color: "#FACC15", fontSize: 10, marginRight: 4 }} />}
        {name || "À déterminer"}
      </span>
      {score != null && (
        <span style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700,
          color: isWinner ? "#fff" : "#8A92B2",
        }}>{score}</span>
      )}
    </div>
  );
}

const sectionTitle = {
  margin: "0 0 14px", fontFamily: "Inter, sans-serif",
  fontSize: 11, fontWeight: 700, color: "#8A92B2",
  textTransform: "uppercase", letterSpacing: 2.5,
  display: "flex", alignItems: "center", gap: 8,
};
const btnPrimary = {
  background: "#7B5CFF", color: "#fff", border: "none",
  padding: "10px 22px", borderRadius: 100, cursor: "pointer",
  fontSize: 13, fontWeight: 600, fontFamily: "inherit",
  display: "inline-flex", alignItems: "center",
};
const btnGhost = {
  background: "transparent", color: "#9B7FFF",
  border: "1px solid rgba(123,92,255,0.5)",
  padding: "9px 22px", borderRadius: 100, cursor: "pointer",
  fontFamily: "inherit", fontSize: 13, fontWeight: 600,
  display: "inline-flex", alignItems: "center",
};
const btnDanger = {
  background: "transparent", color: "#EF4444",
  border: "1px solid rgba(239,68,68,0.5)",
  padding: "9px 22px", borderRadius: 100, cursor: "pointer",
  fontFamily: "inherit", fontSize: 13, fontWeight: 500,
};
