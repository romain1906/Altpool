import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import notify from "devextreme/ui/notify";
import api from "../services/api";
import { isAdmin, currentUser } from "../services/auth";
import { matchView } from "../utils/matchView";

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = currentUser();
  const [match, setMatch] = useState(null);

  const load = useCallback(() => {
    api.get(`/matches/${id}`)
       .then((r) => setMatch(r.data))
       .catch(() => notify("Match introuvable", "error", 2500));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!match) {
    return (
      <div>
        <h2 className="page-title"><i className="fi fi-rr-game-board-alt" /> Match</h2>
        <div className="card" style={{ textAlign: "center", color: "#8A92B2" }}>Chargement…</div>
      </div>
    );
  }

  const target = Math.floor(match.bestOf / 2) + 1;
  const isLive = match.status === "IN_PROGRESS";
  const isPending = match.status === "PENDING_VALIDATION";
  const view = matchView(match, me, isAdmin());

  const addFrame = async (winnerId, ballsRemaining, endedOnBlack) => {
    try {
      await api.post(`/matches/${match.id}/frames`, {
        winnerId, ballsRemaining, endedOnBlack, foulFinish: false,
      });
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur lors de l'ajout", "error", 4000);
    }
  };

  const removeFrame = async (frameId) => {
    if (!window.confirm("Supprimer cette frame ?")) return;
    try {
      await api.delete(`/matches/${match.id}/frames/${frameId}`);
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  const validate = async () => {
    try {
      await api.post(`/matches/${match.id}/validate`);
      notify("Match validé", "success", 2000);
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  const reject = async () => {
    if (!window.confirm("Refuser ce match ?")) return;
    try {
      await api.post(`/matches/${match.id}/reject`);
      notify("Match refusé", "success", 2000);
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  return (
    <div>
      <button type="button" onClick={() => navigate("/matches")}
        style={{
          background: "transparent", border: "none", cursor: "pointer",
          color: "#9B7FFF", fontSize: 13, fontFamily: "inherit",
          display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 0", marginBottom: 14,
        }}>
        <i className="fi fi-rr-arrow-left" /> Retour aux matchs
      </button>

      <h2 className="page-title">
        <i className="fi fi-rr-game-board-alt" /> Match #{match.id}
      </h2>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{
          background: "linear-gradient(135deg, #5B3FE0, #7B5CFF)",
          color: "#fff", padding: "20px 24px",
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
          <Pill>{match.type === "RANKED" ? "Classé" : "Amical"}</Pill>
          <Pill mono>BO{match.bestOf}</Pill>
          {match.clubName && <Pill icon="fi fi-rr-marker">{match.clubName}</Pill>}
          <span style={{ flex: 1 }} />
          <StatusBadge status={match.status} />
        </div>

        <div style={{
          padding: "30px 24px",
          display: "grid", gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center", gap: 20,
        }}>
          <PlayerHeader
            player={{ name: match.player1Name, elo: match.player1Elo }}
            isWinner={match.winnerId === match.player1Id}
            isMe={view.side === "p1"}
            align="right"
          />
          <div style={{
            fontFamily: "Inter, sans-serif", fontWeight: 800,
            fontSize: 56, color: "#fff", letterSpacing: -2,
            textAlign: "center", fontVariantNumeric: "tabular-nums",
          }}>
            {match.scoreP1} <span style={{ color: "#8A92B2", fontSize: 36 }}>:</span> {match.scoreP2}
          </div>
          <PlayerHeader
            player={{ name: match.player2Name, elo: match.player2Elo }}
            isWinner={match.winnerId === match.player2Id}
            isMe={view.side === "p2"}
            align="left"
          />
        </div>

        {/* Bandeau Elo POV utilisateur */}
        {match.status === "VALIDATED" && match.type === "RANKED" && view.myDelta != null && (
          <div style={{
            padding: "18px 24px", borderTop: "1px solid #2A3050",
            background: view.myDelta >= 0 ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 2,
              color: "#8A92B2", textTransform: "uppercase",
            }}>
              {view.isWinner ? "Tu as gagné" : "Tu as perdu"}
            </div>
            <div style={{
              fontFamily: "Inter, sans-serif", fontSize: 56, fontWeight: 800,
              letterSpacing: -2, lineHeight: 1,
              color: view.myDelta >= 0 ? "#22C55E" : "#EF4444",
              fontVariantNumeric: "tabular-nums",
            }}>
              {view.myDelta >= 0 ? "+" : ""}{view.myDelta}
              <span style={{ fontSize: 22, color: "#8A92B2", fontWeight: 500, marginLeft: 6 }}>Elo</span>
            </div>
            <div style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: 11,
              color: "#5A6478", marginTop: 4,
            }}>
              {view.opponentName} : {view.opponentDelta >= 0 ? "+" : ""}{view.opponentDelta}
            </div>
          </div>
        )}

        {/* Cas spectateur (admin/autre) : affichage neutre du delta */}
        {match.status === "VALIDATED" && match.type === "RANKED" && view.myDelta == null && match.eloChangeWinner != null && (
          <div style={{
            padding: "10px 24px", borderTop: "1px solid #2A3050",
            display: "flex", justifyContent: "center", gap: 24,
            fontFamily: "JetBrains Mono, monospace", fontSize: 14,
          }}>
            <span style={{ color: "#22C55E" }}>{match.winnerName} +{match.eloChangeWinner}</span>
            <span style={{ color: "#EF4444" }}>perdant {match.eloChangeLoser}</span>
          </div>
        )}

        {/* Actions de validation : visibles UNIQUEMENT pour le perdant ou un admin */}
        {isPending && view.canValidate && (
          <div style={{
            padding: "14px 24px", borderTop: "1px solid #2A3050",
            display: "flex", gap: 10, justifyContent: "center",
          }}>
            <button type="button" onClick={validate}
              style={{
                background: "#22C55E", color: "#fff", border: "none",
                padding: "10px 22px", borderRadius: 100, cursor: "pointer",
                fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              }}>
              <i className="fi fi-rr-check" /> &nbsp;Valider le match
            </button>
            <button type="button" onClick={reject}
              style={{
                background: "transparent", color: "#EF4444",
                border: "1.5px solid rgba(239,68,68,0.5)",
                padding: "10px 22px", borderRadius: 100, cursor: "pointer",
                fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              }}>
              <i className="fi fi-rr-cross" /> &nbsp;Refuser
            </button>
          </div>
        )}

        {/* En attente mais user pas autorisé : message informatif */}
        {isPending && !view.canValidate && (
          <div style={{
            padding: "14px 24px", borderTop: "1px solid #2A3050",
            color: "#FACC15", fontSize: 13, fontStyle: "italic", textAlign: "center",
          }}>
            <i className="fi fi-rr-clock" /> &nbsp;
            En attente de validation par le perdant ({match.winnerId === match.player1Id ? match.player2Name : match.player1Name}).
          </div>
        )}
      </div>

      {/* MODE LIVE — bandeau d'info bien visible */}
      {isLive && (
        <div style={{
          background: "linear-gradient(135deg, rgba(123,92,255,0.18), rgba(91,63,224,0.18))",
          border: "1px solid rgba(123,92,255,0.4)", borderRadius: 8,
          padding: "14px 18px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{
            background: "#EF4444", color: "#fff",
            padding: "3px 10px", borderRadius: 100,
            fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase",
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: "#fff",
              animation: "pulse 1.4s ease-in-out infinite",
            }} />
            Live
          </span>
          <div style={{ flex: 1, color: "#fff", fontSize: 13 }}>
            Match en cours. Saisis chaque frame ci-dessous.
            Premier à <strong>{target}</strong> frames pour gagner.
          </div>
        </div>
      )}

      {/* Frames */}
      <div className="card">
        <h3 style={{
          margin: "0 0 14px", fontFamily: "Inter, sans-serif",
          fontSize: 11, fontWeight: 600, color: "#8A92B2",
          textTransform: "uppercase", letterSpacing: 2.5,
        }}>
          <i className="fi fi-rr-list" style={{ color: "#7B5CFF", marginRight: 8 }} />
          Frames jouées ({match.frames?.length || 0} — premier à {target})
        </h3>

        {(!match.frames || match.frames.length === 0) && (
          <div style={{ color: "#8A92B2", fontStyle: "italic", fontSize: 13, marginBottom: 10 }}>
            Aucune frame jouée pour le moment.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {match.frames?.map((f) => (
            <FrameCard key={f.id} frame={f}
              p1Id={match.player1Id} canRemove={isLive || isPending}
              onRemove={() => removeFrame(f.id)} />
          ))}
        </div>
      </div>

      {/* Live add frame — DANS SON PROPRE BLOC, IMPOSSIBLE A LOUPER */}
      {isLive && (
        <LiveAddFrame match={match} onAdd={addFrame} />
      )}
    </div>
  );
}

// ---------- Composants helpers ---------------------------------------

function Pill({ children, icon, mono }) {
  return (
    <span style={{
      background: "rgba(255,255,255,0.15)", color: "#fff",
      padding: "3px 12px", borderRadius: 100,
      fontSize: 11, fontWeight: 700, letterSpacing: mono ? 0 : 1.5,
      textTransform: mono ? "none" : "uppercase",
      fontFamily: mono ? "JetBrains Mono, monospace" : "inherit",
      display: "inline-flex", alignItems: "center", gap: 5,
    }}>
      {icon && <i className={icon} />}
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    IN_PROGRESS: { bg: "rgba(123,92,255,0.18)", fg: "#9B7FFF", label: "En cours" },
    PENDING_VALIDATION: { bg: "rgba(250,204,21,0.18)", fg: "#FACC15", label: "À valider" },
    VALIDATED: { bg: "rgba(34,197,94,0.18)", fg: "#22C55E", label: "Validé" },
    REJECTED: { bg: "rgba(239,68,68,0.18)", fg: "#EF4444", label: "Refusé" },
  }[status] || { bg: "#333", fg: "#aaa", label: status };
  return (
    <span style={{
      background: map.bg, color: map.fg,
      padding: "3px 12px", borderRadius: 100,
      fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
    }}>
      {map.label}
    </span>
  );
}

function PlayerHeader({ player, isWinner, isMe, align }) {
  return (
    <div style={{ textAlign: align, color: isWinner ? "#fff" : "#C9D1FF" }}>
      <div style={{
        fontWeight: isWinner ? 700 : 500, fontSize: 22,
        display: "flex", alignItems: "center", gap: 8,
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        flexWrap: "wrap",
      }}>
        {isWinner && align === "left" && <i className="fi fi-sr-crown" style={{ color: "#FACC15" }} />}
        {player.name}
        {isMe && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 2, padding: "2px 8px",
            background: "rgba(123,92,255,0.3)", color: "#fff",
            borderRadius: 100, textTransform: "uppercase",
          }}>moi</span>
        )}
        {isWinner && align === "right" && <i className="fi fi-sr-crown" style={{ color: "#FACC15" }} />}
      </div>
      <div style={{
        fontFamily: "JetBrains Mono, monospace", fontSize: 12,
        color: "#8A92B2", marginTop: 4,
      }}>
        Elo {player.elo}
      </div>
    </div>
  );
}

function FrameCard({ frame, p1Id, canRemove, onRemove }) {
  return (
    <div style={{
      background: "#1A1F3D", border: "1px solid #2A3050",
      borderRadius: 6, padding: "10px 14px",
      display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
    }}>
      <span style={{
        fontFamily: "JetBrains Mono, monospace", fontWeight: 700,
        color: "#7B5CFF", fontSize: 13, minWidth: 28,
      }}>
        #{frame.frameNumber}
      </span>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <i className="fi fi-sr-crown" style={{ color: "#FACC15", fontSize: 12 }} />
        <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{frame.winnerName}</span>
        <span style={{ color: "#8A92B2", fontSize: 11 }}>vs</span>
        <span style={{ color: "#8A92B2", fontSize: 13 }}>{frame.loserName}</span>
      </div>
      <span style={{
        fontFamily: "JetBrains Mono, monospace", fontSize: 11,
        color: "#C9D1FF", background: "rgba(123,92,255,0.1)",
        padding: "2px 8px", borderRadius: 100,
      }}>
        🎱 {frame.ballsRemaining} restantes
      </span>
      {frame.endedOnBlack && (
        <span style={{
          fontSize: 11, color: "#FACC15", background: "rgba(250,204,21,0.1)",
          padding: "2px 8px", borderRadius: 100, fontWeight: 600,
        }}>
          fin sur la noire
        </span>
      )}
      {canRemove && (
        <button type="button" onClick={onRemove}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#EF4444" }}>
          <i className="fi fi-rr-trash" />
        </button>
      )}
    </div>
  );
}

// ---------- LIVE : ajout d'une frame ---------------------------------
function LiveAddFrame({ match, onAdd }) {
  const [winnerId, setWinnerId] = useState(null);
  const [ballsRemaining, setBallsRemaining] = useState(0);
  const [endedOnBlack, setEndedOnBlack] = useState(false);

  const submit = () => {
    if (!winnerId) {
      notify("Choisis le vainqueur de la frame", "warning", 2500);
      return;
    }
    onAdd(winnerId, ballsRemaining, endedOnBlack);
    setWinnerId(null);
    setBallsRemaining(0);
    setEndedOnBlack(false);
  };

  const winnerBtn = (id) => ({
    flex: 1, padding: "14px 18px", borderRadius: 8,
    background: winnerId === id ? "#7B5CFF" : "rgba(123,92,255,0.1)",
    color: winnerId === id ? "#fff" : "#9B7FFF",
    border: winnerId === id ? "2px solid #7B5CFF" : "2px solid #2A3050",
    cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 700,
    transition: "all 0.15s",
  });

  return (
    <div className="card" style={{
      background: "linear-gradient(135deg, rgba(123,92,255,0.12), rgba(91,63,224,0.08))",
      border: "1px solid rgba(123,92,255,0.4)",
    }}>
      <h3 style={{
        margin: "0 0 14px", fontFamily: "Inter, sans-serif",
        fontSize: 12, fontWeight: 700, color: "#9B7FFF",
        textTransform: "uppercase", letterSpacing: 2.5,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <i className="fi fi-rr-plus" /> Saisir la prochaine frame
      </h3>

      <div style={{ marginBottom: 14 }}>
        <Label>Vainqueur de la frame</Label>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setWinnerId(match.player1Id)} style={winnerBtn(match.player1Id)}>
            {match.player1Name}
          </button>
          <button type="button" onClick={() => setWinnerId(match.player2Id)} style={winnerBtn(match.player2Id)}>
            {match.player2Name}
          </button>
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14,
      }}>
        <div>
          <Label>Billes restantes au perdant (0–7)</Label>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button key={n} type="button" onClick={() => setBallsRemaining(n)}
                style={{
                  flex: "1 0 32px", padding: "10px 0", borderRadius: 6,
                  background: ballsRemaining === n ? "#7B5CFF" : "rgba(123,92,255,0.1)",
                  color: ballsRemaining === n ? "#fff" : "#9B7FFF",
                  border: ballsRemaining === n ? "1px solid #7B5CFF" : "1px solid #2A3050",
                  fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700,
                  cursor: "pointer",
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Fin sur la noire ?</Label>
          <button type="button" onClick={() => setEndedOnBlack(!endedOnBlack)}
            style={{
              width: "100%", padding: "13px 14px", borderRadius: 6,
              background: endedOnBlack ? "#0B0F2A" : "rgba(123,92,255,0.1)",
              color: endedOnBlack ? "#fff" : "#9B7FFF",
              border: endedOnBlack ? "2px solid #fff" : "2px solid #2A3050",
              cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600,
            }}>
            {endedOnBlack ? "🎱 Oui, sur la noire" : "Non"}
          </button>
        </div>
      </div>

      <button type="button" onClick={submit}
        disabled={!winnerId}
        style={{
          width: "100%", background: winnerId ? "#22C55E" : "#3A4060",
          color: "#fff", border: "none",
          padding: "14px 20px", borderRadius: 100,
          cursor: winnerId ? "pointer" : "not-allowed",
          fontFamily: "inherit", fontSize: 14, fontWeight: 700,
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
        <i className="fi fi-rr-check" /> Ajouter la frame
      </button>
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, letterSpacing: 1.5,
      textTransform: "uppercase", color: "#8A92B2", marginBottom: 8,
    }}>
      {children}
    </div>
  );
}
