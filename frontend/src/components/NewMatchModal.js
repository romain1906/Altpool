import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Popup from "devextreme-react/popup";
import notify from "devextreme/ui/notify";
import api from "../services/api";
import { currentUser, role } from "../services/auth";

const FORMATS = [1, 3, 5, 7];

/**
 * Modal de création d'un match.
 * - "Mode après-coup" : on saisit toutes les frames, on soumet, le match est créé en PENDING_VALIDATION
 * - "Mode live" : on crée le match vide → l'utilisateur va sur sa page et ajoute frame par frame
 */
export default function NewMatchModal({ visible, onClose, onCreated }) {
  const navigate = useNavigate();
  const me = currentUser();
  const myRole = role();
  const [players, setPlayers] = useState([]);
  const [myClubs, setMyClubs] = useState([]);     // clubs où l'user a un droit (gérant : managedClubs ; joueur : ses clubs)
  const [myPlayer, setMyPlayer] = useState(null); // Player lié à l'user courant (si JOUEUR)

  const [mode, setMode] = useState("after"); // "after" | "live"
  const [step, setStep] = useState(1);       // 1 = config, 2 = frames

  const [match, setMatch] = useState({
    player1Id: null, player2Id: null,
    type: "RANKED", bestOf: 3, clubId: null,
  });
  const [frames, setFrames] = useState([]);

  // Reset à chaque ouverture + chargement
  useEffect(() => {
    if (!visible) return;
    setMode("after");
    setStep(1);
    setMatch({ player1Id: null, player2Id: null, type: "RANKED", bestOf: 3, clubId: null });
    setFrames([]);
    Promise.all([
      api.get("/players"),
      api.get("/users/me/clubs"),
    ]).then(([pRes, cRes]) => {
      setPlayers(pRes.data);
      setMyClubs(cRes.data);
      const mine = pRes.data.find((p) => p.userId === me?.userId);
      setMyPlayer(mine || null);
      // JOUEUR : auto-sélection de soi-même comme P1
      if (myRole === "JOUEUR" && mine) {
        setMatch((m) => ({ ...m, player1Id: mine.id }));
      }
    }).catch(() => {});
  }, [visible, myRole, me?.userId]);

  const target = Math.floor(match.bestOf / 2) + 1;
  const scoreP1 = frames.filter((f) => f.winnerId === match.player1Id).length;
  const scoreP2 = frames.filter((f) => f.winnerId === match.player2Id).length;
  const matchOver = scoreP1 >= target || scoreP2 >= target;

  const player1 = players.find((p) => p.id === match.player1Id);
  const player2 = players.find((p) => p.id === match.player2Id);

  /**
   * Joueurs éligibles comme P1 (selon rôle de l'user courant) :
   *  - ADMIN : tous les joueurs
   *  - GERANT : uniquement les joueurs présents dans au moins un de ses clubs gérés
   *  - JOUEUR : seulement lui-même (auto-locked)
   */
  const eligiblePlayer1 = useMemo(() => {
    if (myRole === "JOUEUR") return myPlayer ? [myPlayer] : [];
    if (myRole === "GERANT") {
      const myClubIds = new Set(myClubs.map((c) => c.id));
      return players.filter((p) =>
        (p.clubs || []).some((c) => myClubIds.has(c.id))
      );
    }
    return players; // ADMIN
  }, [myRole, players, myClubs, myPlayer]);

  /**
   * Joueurs éligibles comme P2 :
   *  - différent de P1
   *  - doivent partager au moins un club avec P1 (règle métier conservée)
   *  - ET (uniquement pour GERANT) être dans un club que je gère
   *  - JOUEUR : pas de restriction supplémentaire (peut affronter n'importe qui de ses clubs)
   */
  const eligiblePlayer2 = useMemo(() => {
    if (!player1) return [];
    const p1ClubIds = new Set((player1.clubs || []).map((c) => c.id));
    const myClubIds = myRole === "GERANT" ? new Set(myClubs.map((c) => c.id)) : null;
    return players.filter((p) => {
      if (p.id === player1.id) return false;
      const sharesWithP1 = (p.clubs || []).some((c) => p1ClubIds.has(c.id));
      if (!sharesWithP1) return false;
      if (myClubIds) {
        // GERANT : doit aussi être dans mes clubs
        return (p.clubs || []).some((c) => myClubIds.has(c.id));
      }
      return true;
    });
  }, [player1, players, myRole, myClubs]);

  // Clubs communs aux 2 joueurs sélectionnés (règle métier conservée)
  const sharedClubs = useMemo(() => {
    if (!player1 || !player2) return [];
    const p2ClubIds = new Set((player2.clubs || []).map((c) => c.id));
    return (player1.clubs || []).filter((c) => p2ClubIds.has(c.id));
  }, [player1, player2]);

  // Si le P2 sélectionné n'est plus éligible (changement de P1), le reset
  useEffect(() => {
    if (match.player2Id && !eligiblePlayer2.find((p) => p.id === match.player2Id)) {
      setMatch((m) => ({ ...m, player2Id: null, clubId: null }));
    }
  }, [eligiblePlayer2, match.player2Id]);

  // Gestion auto du club selon les clubs communs
  useEffect(() => {
    if (!player1 || !player2) return;
    if (sharedClubs.length === 1) {
      // Un seul club commun → auto-sélectionné
      if (match.clubId !== sharedClubs[0].id) {
        setMatch((m) => ({ ...m, clubId: sharedClubs[0].id }));
      }
    } else if (match.clubId && !sharedClubs.find((c) => c.id === match.clubId)) {
      // Club sélectionné n'est plus dans la liste commune
      setMatch((m) => ({ ...m, clubId: null }));
    }
  }, [sharedClubs, player1, player2, match.clubId]);

  const validateConfig = () => {
    if (!match.player1Id || !match.player2Id) {
      notify("Sélectionne les 2 joueurs", "error", 2500); return false;
    }
    if (match.player1Id === match.player2Id) {
      notify("Les 2 joueurs doivent être différents", "error", 2500); return false;
    }
    if (match.bestOf % 2 === 0) {
      notify("Le format doit être impair", "error", 2500); return false;
    }
    return true;
  };

  // --- Mode after-the-fact ---
  const goToFrames = () => { if (validateConfig()) setStep(2); };
  const addFrame = () => {
    if (matchOver) return;
    setFrames([...frames, {
      winnerId: null, endedOnBlack: false, ballsRemaining: 0, foulFinish: false,
    }]);
  };
  const updateFrame = (i, patch) => {
    setFrames(frames.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  };
  const removeFrame = (i) => setFrames(frames.filter((_, idx) => idx !== i));

  const submitAfter = async () => {
    if (!matchOver) {
      notify(`Pas encore de vainqueur (faut ${target} frames gagnées)`, "error", 3000);
      return;
    }
    if (frames.some((f) => !f.winnerId)) {
      notify("Toutes les frames doivent avoir un gagnant", "error", 2500);
      return;
    }
    try {
      await api.post("/matches", { ...match, frames });
      notify("Match créé — en attente de validation", "success", 2500);
      onCreated?.();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  // --- Mode live ---
  const submitLive = async () => {
    if (!validateConfig()) return;
    try {
      const { data: created } = await api.post("/matches", { ...match, frames: [] });
      notify("Match créé — saisis les frames une par une", "success", 2500);
      onClose?.();
      navigate(`/matches/${created.id}`);
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  return (
    <Popup
      visible={visible}
      onHiding={onClose}
      hideOnOutsideClick
      title={step === 1 ? "Nouveau match" : `Saisie des frames (${scoreP1}-${scoreP2})`}
      width={600}
      height={650}
    >
      {step === 1 && (
        <ConfigStep
          match={match} setMatch={setMatch}
          eligiblePlayer1={eligiblePlayer1}
          eligiblePlayer2={eligiblePlayer2}
          sharedClubs={sharedClubs}
          myRole={myRole} myPlayer={myPlayer}
          mode={mode} setMode={setMode}
          onCancel={onClose}
          onAfter={goToFrames}
          onLive={submitLive}
        />
      )}
      {step === 2 && (
        <FramesStep
          match={match} player1={player1} player2={player2}
          frames={frames} target={target}
          scoreP1={scoreP1} scoreP2={scoreP2} matchOver={matchOver}
          addFrame={addFrame} updateFrame={updateFrame} removeFrame={removeFrame}
          onBack={() => setStep(1)} onSubmit={submitAfter}
        />
      )}
    </Popup>
  );
}

// ---------- Étape 1 : configuration ----------------------------------
function ConfigStep({ match, setMatch, eligiblePlayer1, eligiblePlayer2, sharedClubs,
                     myRole, myPlayer,
                     mode, setMode, onCancel, onAfter, onLive }) {
  const player1Selected = !!match.player1Id;
  const bothSelected = !!match.player1Id && !!match.player2Id;
  const p1Locked = myRole === "JOUEUR";   // joueur ne peut pas changer P1 (= lui-même)
  const noPlayerProfile = myRole === "JOUEUR" && !myPlayer;

  return (
    <div>
      <Section label="Type">
        <RadioGroup
          value={match.type}
          options={[{ v: "RANKED", l: "Classé (Elo)" }, { v: "FRIENDLY", l: "Amical" }]}
          onChange={(v) => setMatch({ ...match, type: v })}
        />
      </Section>

      <Section label="Format (best of)">
        <div style={{ display: "flex", gap: 8 }}>
          {FORMATS.map((n) => (
            <button key={n} type="button"
              onClick={() => setMatch({ ...match, bestOf: n })}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 100,
                background: match.bestOf === n ? "#7B5CFF" : "rgba(123,92,255,0.12)",
                color: match.bestOf === n ? "#fff" : "#9B7FFF",
                border: "none", cursor: "pointer",
                fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700,
              }}>
              BO{n}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Joueurs">
        {noPlayerProfile && (
          <div style={{
            padding: "8px 12px", borderRadius: 6, marginBottom: 10,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#F87171", fontSize: 12,
          }}>
            <i className="fi fi-rr-exclamation" /> Tu n'as pas de profil joueur lié.
            Demande à un gérant de te créer un profil joueur.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
          {p1Locked ? (
            <div style={{
              padding: "10px 14px", borderRadius: 6,
              background: "rgba(123,92,255,0.18)", border: "1px solid #7B5CFF",
              color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{
                background: "#7B5CFF", color: "#fff",
                padding: "2px 8px", borderRadius: 100,
                fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
              }}>moi</span>
              {myPlayer ? `${myPlayer.name} (Elo ${myPlayer.elo})` : "—"}
            </div>
          ) : (
            <PlayerSelect
              value={match.player1Id}
              onChange={(v) => setMatch({ ...match, player1Id: v })}
              players={eligiblePlayer1}
              placeholder="Joueur 1"
            />
          )}

          <span style={{ color: "#8A92B2", fontSize: 12, fontWeight: 700 }}>VS</span>

          <PlayerSelect
            value={match.player2Id}
            onChange={(v) => setMatch({ ...match, player2Id: v })}
            players={eligiblePlayer2}
            placeholder={player1Selected ? "Joueur 2" : "Choisis d'abord le joueur 1"}
            disabled={!player1Selected}
          />
        </div>

        {/* Aides selon le rôle */}
        {myRole === "GERANT" && eligiblePlayer1.length === 0 && (
          <div style={{
            marginTop: 8, padding: "8px 12px", borderRadius: 6,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#F87171", fontSize: 12,
          }}>
            <i className="fi fi-rr-exclamation" /> Aucun joueur dans tes clubs.
            Crée ou rattache des joueurs à un de tes clubs avant d'encoder un match.
          </div>
        )}
        {myRole === "GERANT" && eligiblePlayer1.length > 0 && (
          <div style={{
            marginTop: 8, fontSize: 11, color: "#8A92B2", fontStyle: "italic",
          }}>
            <i className="fi fi-rr-info" /> &nbsp;
            Joueurs limités à ceux de tes clubs : {eligiblePlayer1.length} disponible{eligiblePlayer1.length > 1 ? "s" : ""}.
          </div>
        )}
        {player1Selected && eligiblePlayer2.length === 0 && (
          <div style={{
            marginTop: 8, padding: "8px 12px", borderRadius: 6,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#F87171", fontSize: 12,
          }}>
            <i className="fi fi-rr-exclamation" /> &nbsp;
            Aucun adversaire {myRole === "GERANT" ? "dans tes clubs " : ""}ne partage de club avec ce joueur.
          </div>
        )}
      </Section>

      <Section label="Club du match">
        {!bothSelected && (
          <div style={hintStyle}>Sélectionne les 2 joueurs pour voir leurs clubs en commun.</div>
        )}
        {bothSelected && sharedClubs.length === 0 && (
          <div style={{
            padding: "8px 12px", borderRadius: 6,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#F87171", fontSize: 12,
          }}>
            Aucun club commun trouvé.
          </div>
        )}
        {bothSelected && sharedClubs.length === 1 && (
          <div style={{
            padding: "10px 14px", borderRadius: 6,
            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
            color: "#22C55E", fontSize: 13, fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            <i className="fi fi-rr-marker" />
            {sharedClubs[0].name}
            <span style={{ color: "#8A92B2", fontWeight: 400, fontSize: 11, marginLeft: 4 }}>
              (seul club commun)
            </span>
          </div>
        )}
        {bothSelected && sharedClubs.length > 1 && (
          <>
            <div style={hintStyle}>
              {sharedClubs.length} clubs en commun — choisis où le match a été joué :
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {sharedClubs.map((c) => (
                <button key={c.id} type="button"
                  onClick={() => setMatch({ ...match, clubId: c.id })}
                  style={{
                    padding: "9px 14px", borderRadius: 100,
                    background: match.clubId === c.id ? "#7B5CFF" : "rgba(123,92,255,0.12)",
                    color: match.clubId === c.id ? "#fff" : "#9B7FFF",
                    border: "none", cursor: "pointer",
                    fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}>
                  <i className="fi fi-rr-marker" /> {c.name}
                </button>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section label="Mode de saisie">
        <RadioGroup
          value={mode}
          options={[
            { v: "after", l: "Saisir le match terminé (frames d'un coup)" },
            { v: "live",  l: "Mode live (créer puis saisir frame par frame)" },
          ]}
          onChange={setMode}
        />
      </Section>

      <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={btnGhost}>Annuler</button>
        {mode === "after" ? (
          <button type="button" onClick={onAfter} style={btnPrimary}>
            Saisir les frames →
          </button>
        ) : (
          <button type="button" onClick={onLive} style={btnPrimary}>
            <i className="fi fi-rr-play" /> &nbsp;Démarrer le match
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Étape 2 : frames ------------------------------------------
function FramesStep({ match, player1, player2, frames, target, scoreP1, scoreP2, matchOver,
                     addFrame, updateFrame, removeFrame, onBack, onSubmit }) {
  return (
    <div>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center", gap: 10, padding: "10px 0 16px",
        borderBottom: "1px solid #2A3050", marginBottom: 16,
      }}>
        <div style={{ textAlign: "right", color: "#fff", fontWeight: 600 }}>
          {player1?.name} <span style={{ color: "#8A92B2", fontSize: 11 }}>(Elo {player1?.elo})</span>
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 26, color: "#fff" }}>
          {scoreP1} : {scoreP2}
        </div>
        <div style={{ color: "#fff", fontWeight: 600 }}>
          {player2?.name} <span style={{ color: "#8A92B2", fontSize: 11 }}>(Elo {player2?.elo})</span>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#8A92B2", marginBottom: 10 }}>
        BO{match.bestOf} — premier à <strong>{target}</strong> frames
      </div>

      {frames.map((f, i) => (
        <FrameRow key={i} index={i} frame={f}
          player1={player1} player2={player2}
          onUpdate={(patch) => updateFrame(i, patch)}
          onRemove={() => removeFrame(i)}
        />
      ))}

      {!matchOver && (
        <button type="button" onClick={addFrame}
          style={{
            width: "100%", padding: "12px", border: "1px dashed #4A5378",
            background: "transparent", color: "#9B7FFF", borderRadius: 8,
            cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
            marginTop: 8,
          }}>
          <i className="fi fi-rr-plus" /> &nbsp;Ajouter une frame
        </button>
      )}
      {matchOver && (
        <div style={{
          padding: 12, background: "rgba(34,197,94,0.1)", borderRadius: 6,
          color: "#22C55E", fontSize: 13, fontWeight: 600, textAlign: "center",
          marginTop: 8,
        }}>
          ✓ Match terminé — {scoreP1 > scoreP2 ? player1?.name : player2?.name} l'emporte {scoreP1}-{scoreP2}
        </div>
      )}

      <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "space-between" }}>
        <button type="button" onClick={onBack} style={btnGhost}>← Modifier la config</button>
        <button type="button" onClick={onSubmit} disabled={!matchOver}
          style={{ ...btnPrimary, opacity: matchOver ? 1 : 0.4, cursor: matchOver ? "pointer" : "not-allowed" }}>
          <i className="fi fi-rr-check" /> &nbsp;Valider le match
        </button>
      </div>
    </div>
  );
}

function FrameRow({ index, frame, player1, player2, onUpdate, onRemove }) {
  return (
    <div style={{
      background: "#1A1F3D", border: "1px solid #2A3050",
      borderRadius: 8, padding: 14, marginBottom: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#8A92B2", textTransform: "uppercase" }}>
          Frame {index + 1}
        </span>
        <button type="button" onClick={onRemove}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 12 }}>
          <i className="fi fi-rr-trash" />
        </button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={miniLabel}>Vainqueur</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => onUpdate({ winnerId: player1?.id })}
            style={frame.winnerId === player1?.id ? winnerBtnActive : winnerBtn}>
            {player1?.name}
          </button>
          <button type="button" onClick={() => onUpdate({ winnerId: player2?.id })}
            style={frame.winnerId === player2?.id ? winnerBtnActive : winnerBtn}>
            {player2?.name}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={miniLabel}>Billes restantes (perdant)</div>
          <input type="number" min="0" max="7" value={frame.ballsRemaining}
            onChange={(e) => onUpdate({ ballsRemaining: Math.max(0, Math.min(7, Number(e.target.value))) })}
            style={inputStyle} />
        </div>
        <div>
          <div style={miniLabel}>Fin sur la noire ?</div>
          <button type="button"
            onClick={() => onUpdate({ endedOnBlack: !frame.endedOnBlack })}
            style={{
              width: "100%", padding: "9px 14px", borderRadius: 6,
              background: frame.endedOnBlack ? "#0B0F2A" : "rgba(123,92,255,0.1)",
              color: frame.endedOnBlack ? "#fff" : "#9B7FFF",
              border: frame.endedOnBlack ? "1px solid #fff" : "1px solid #2A3050",
              cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
            }}>
            {frame.endedOnBlack ? "🎱 Oui" : "Non"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Helpers UI ----------------------------------------------
function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: 2.5,
        textTransform: "uppercase", color: "#8A92B2", marginBottom: 8,
      }}>{label}</div>
      {children}
    </div>
  );
}

function RadioGroup({ value, options, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          style={{
            padding: "9px 16px", borderRadius: 100,
            background: value === o.v ? "#7B5CFF" : "rgba(123,92,255,0.12)",
            color: value === o.v ? "#fff" : "#9B7FFF",
            border: "none", cursor: "pointer",
            fontFamily: "inherit", fontSize: 13, fontWeight: 600,
          }}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function PlayerSelect({ value, onChange, players, placeholder, disabled = false }) {
  return (
    <select
      value={value || ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      style={{ ...inputStyle, opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
      <option value="">{placeholder}</option>
      {players.map((p) => (
        <option key={p.id} value={p.id}>{p.name} (Elo {p.elo})</option>
      ))}
    </select>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 14px", fontSize: 13,
  border: "1px solid #2A3050", borderRadius: 6,
  background: "#1A1F3D", color: "#fff", fontFamily: "inherit",
};
const hintStyle = {
  fontSize: 12, color: "#8A92B2", fontStyle: "italic", marginBottom: 8,
};
const miniLabel = {
  fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
  textTransform: "uppercase", color: "#8A92B2", marginBottom: 5,
};
const btnPrimary = {
  background: "#7B5CFF", color: "#fff", border: "none",
  padding: "10px 20px", borderRadius: 100, cursor: "pointer",
  fontFamily: "inherit", fontSize: 13, fontWeight: 600,
  display: "inline-flex", alignItems: "center",
};
const btnGhost = {
  background: "transparent", color: "#8A92B2",
  border: "1px solid #2A3050", padding: "10px 20px", borderRadius: 100,
  cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500,
};
const winnerBtn = {
  flex: 1, padding: "9px 14px", borderRadius: 6,
  background: "rgba(123,92,255,0.1)", color: "#9B7FFF",
  border: "1px solid #2A3050", cursor: "pointer",
  fontFamily: "inherit", fontSize: 13, fontWeight: 600,
};
const winnerBtnActive = {
  ...winnerBtn,
  background: "#7B5CFF", color: "#fff", border: "1px solid #7B5CFF",
};
