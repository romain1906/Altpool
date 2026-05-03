import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import notify from "devextreme/ui/notify";
import api from "../services/api";
import { canManage } from "../services/auth";
import CreateTournamentModal from "../components/CreateTournamentModal";

const TABS = [
  { key: "all",          label: "Tous",            filter: () => true },
  { key: "registration", label: "Inscriptions",    filter: (t) => t.status === "REGISTRATION" },
  { key: "ready",        label: "Prêts à démarrer", filter: (t) => t.status === "READY_TO_START" },
  { key: "in_progress",  label: "En cours",        filter: (t) => t.status === "IN_PROGRESS" },
  { key: "finished",     label: "Terminés",        filter: (t) => t.status === "FINISHED" },
];

const TYPE_LABEL = {
  BRACKET_ONLY: "Élimination directe",
  POOL_AND_BRACKET: "Poules + bracket",
  POOL_ONLY: "Poules (round robin)",
};

const STATUS_COLORS = {
  REGISTRATION:    { bg: "rgba(59,130,246,0.18)",  fg: "#60A5FA",  label: "Inscriptions" },
  READY_TO_START:  { bg: "rgba(250,204,21,0.18)",  fg: "#FACC15",  label: "Prêt à démarrer" },
  IN_PROGRESS:     { bg: "rgba(123,92,255,0.18)",  fg: "#9B7FFF",  label: "En cours" },
  FINISHED:        { bg: "rgba(34,197,94,0.18)",   fg: "#22C55E",  label: "Terminé" },
  CANCELLED:       { bg: "rgba(239,68,68,0.18)",   fg: "#EF4444",  label: "Annulé" },
  DRAFT:           { bg: "rgba(138,146,178,0.2)",  fg: "#8A92B2",  label: "Brouillon" },
};

export default function Tournaments() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const [tournaments, setTournaments] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    api.get("/tournaments")
       .then((r) => setTournaments(r.data))
       .catch((err) => notify(err.response?.data?.message || "Erreur", "error", 3000));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tournaments.filter(TABS.find(t => t.key === tab).filter);

  const handleRegister = async (id, isRegistered) => {
    try {
      if (isRegistered) {
        await api.delete(`/tournaments/${id}/register`);
        notify("Désinscription effectuée", "success", 2000);
      } else {
        await api.post(`/tournaments/${id}/register`);
        notify("Inscription confirmée", "success", 2000);
      }
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  const handleStart = async (id) => {
    if (!window.confirm("Démarrer le tournoi ? Les inscriptions seront closes et le bracket généré.")) return;
    try {
      await api.post(`/tournaments/${id}/start`);
      notify("Tournoi démarré ! Bracket généré.", "success", 2500);
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Annuler ce tournoi définitivement ?")) return;
    try {
      await api.post(`/tournaments/${id}/cancel`);
      notify("Tournoi annulé", "success", 2000);
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: 20, flexWrap: "wrap",
      }}>
        <h2 className="page-title">
          <i className="fi fi-rr-trophy" /> Tournois
        </h2>
        {canManage() && (
          <button
            type="button" onClick={() => setShowCreate(true)}
            style={{
              background: "#7B5CFF", color: "#fff", border: "none",
              padding: "10px 18px", borderRadius: 100, cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 8, marginTop: 4,
            }}>
            <i className="fi fi-rr-plus" /> Nouveau tournoi
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 6, marginBottom: 20,
        borderBottom: "1px solid #2A3050", overflowX: "auto",
      }}>
        {TABS.map((t) => (
          <button
            key={t.key} type="button"
            onClick={() => setTab(t.key)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              padding: "10px 18px", fontSize: 13, fontWeight: 600,
              fontFamily: "inherit", color: tab === t.key ? "#7B5CFF" : "#8A92B2",
              borderBottom: tab === t.key ? "2px solid #7B5CFF" : "2px solid transparent",
              marginBottom: -1, whiteSpace: "nowrap",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#8A92B2" }}>
          <i className="fi fi-rr-trophy" style={{ fontSize: 36, color: "#7B5CFF", display: "block", marginBottom: 10 }} />
          Aucun tournoi dans cette catégorie.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
        {filtered.map((t) => (
          <TournamentCard
            key={t.id} t={t}
            onOpen={() => navigate(`/tournaments/${t.id}`)}
            onRegister={() => handleRegister(t.id, t.isRegistered)}
            onStart={() => handleStart(t.id)}
            onCancel={() => handleCancel(t.id)}
          />
        ))}
      </div>

      <CreateTournamentModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(created) => {
          setShowCreate(false);
          load();
          if (created?.id) navigate(`/tournaments/${created.id}`);
        }}
      />
    </div>
  );
}

function TournamentCard({ t, onOpen, onRegister, onStart, onCancel }) {
  const status = STATUS_COLORS[t.status] || STATUS_COLORS.DRAFT;

  const fmtDate = (iso) => {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }); }
    catch { return iso; }
  };

  return (
    <div className="card" style={{
      padding: 0, overflow: "hidden", marginBottom: 0, cursor: "pointer",
    }} onClick={onOpen}>
      <div style={{
        background: "linear-gradient(135deg, #5B3FE0, #7B5CFF)",
        color: "#fff", padding: "14px 18px",
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <span style={{
          background: "rgba(255,255,255,0.15)", color: "#fff",
          padding: "2px 10px", borderRadius: 100,
          fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
        }}>
          {TYPE_LABEL[t.type] || t.type}
        </span>
        {t.ranked && (
          <span style={{
            background: "rgba(212,165,55,0.25)", color: "#FACC15",
            padding: "2px 10px", borderRadius: 100,
            fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
          }}>
            Classé
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{
          background: status.bg, color: status.fg,
          padding: "2px 10px", borderRadius: 100,
          fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
        }}>{status.label}</span>
      </div>

      <div style={{ padding: "18px" }}>
        <div style={{
          fontSize: 18, fontWeight: 700, color: "#fff",
          marginBottom: 4, letterSpacing: -0.3,
        }}>
          {t.name}
        </div>
        <div style={{
          fontSize: 12, color: "#8A92B2", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <i className="fi fi-rr-marker" /> {t.clubName}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14, fontSize: 11 }}>
          <Info label="Format" value={`BO${t.poolBestOf}/BO${t.bracketBestOf}/BO${t.finalBestOf}`} mono />
          <Info label="Inscrits" value={`${t.participantCount}${t.maxParticipants ? "/" + t.maxParticipants : ""}`} mono />
          {t.registrationDeadline && (
            <Info label="Inscriptions jusqu'au" value={fmtDate(t.registrationDeadline)} />
          )}
          {t.startsAt && (
            <Info label="Démarrage" value={fmtDate(t.startsAt)} />
          )}
        </div>

        {t.winnerName && (
          <div style={{
            padding: "8px 12px", borderRadius: 6, marginBottom: 10,
            background: "rgba(34,197,94,0.12)", color: "#22C55E",
            fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <i className="fi fi-sr-crown" style={{ color: "#FACC15" }} />
            Vainqueur : {t.winnerName}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
          {t.status === "REGISTRATION" && !t.canManage && (
            <button type="button" onClick={onRegister} style={t.isRegistered ? btnGhost : btnPrimary}>
              <i className={t.isRegistered ? "fi fi-rr-cross" : "fi fi-rr-user-add"} />
              &nbsp;{t.isRegistered ? "Me désinscrire" : "S'inscrire"}
            </button>
          )}
          {t.canManage && t.status === "REGISTRATION" && (
            <button type="button" onClick={onStart} style={btnPrimary}>
              <i className="fi fi-rr-play" /> &nbsp;Démarrer
            </button>
          )}
          {t.canManage && (t.status === "REGISTRATION" || t.status === "READY_TO_START" || t.status === "IN_PROGRESS") && (
            <button type="button" onClick={onCancel} style={btnDanger}>
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono }) {
  return (
    <div>
      <div style={{
        fontSize: 9, fontWeight: 600, letterSpacing: 1.5,
        textTransform: "uppercase", color: "#8A92B2", marginBottom: 2,
      }}>{label}</div>
      <div style={{
        color: "#C9D1FF", fontSize: 12,
        fontFamily: mono ? "JetBrains Mono, monospace" : "inherit",
      }}>{value}</div>
    </div>
  );
}

const btnPrimary = {
  background: "#7B5CFF", color: "#fff", border: "none",
  padding: "8px 14px", borderRadius: 100, cursor: "pointer",
  fontSize: 12, fontWeight: 600, fontFamily: "inherit",
  display: "inline-flex", alignItems: "center", gap: 4,
};
const btnGhost = {
  background: "transparent", color: "#9B7FFF",
  border: "1px solid rgba(123,92,255,0.5)",
  padding: "7px 14px", borderRadius: 100, cursor: "pointer",
  fontSize: 12, fontWeight: 600, fontFamily: "inherit",
};
const btnDanger = {
  background: "transparent", color: "#EF4444",
  border: "1px solid rgba(239,68,68,0.5)",
  padding: "7px 14px", borderRadius: 100, cursor: "pointer",
  fontSize: 12, fontWeight: 500, fontFamily: "inherit",
};
