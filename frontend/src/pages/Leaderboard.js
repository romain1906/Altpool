import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Avatar from "../components/Avatar";
import { currentUser } from "../services/auth";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Couleurs gold/silver/bronze pour les 3 premiers du classement. */
const RANK_THEME = {
  1: {
    label: "Or",
    grad: "linear-gradient(180deg, #FFE17A 0%, #F59E0B 60%, #B45309 100%)",
    glow: "rgba(250, 204, 21, 0.45)",
    ring: "#FACC15",
    icon: "fi fi-sr-crown",
    iconColor: "#FFE17A",
  },
  2: {
    label: "Argent",
    grad: "linear-gradient(180deg, #F1F5F9 0%, #C7CDDB 60%, #6B7280 100%)",
    glow: "rgba(203, 213, 225, 0.40)",
    ring: "#E2E8F0",
    icon: "fi fi-sr-trophy",
    iconColor: "#E2E8F0",
  },
  3: {
    label: "Bronze",
    grad: "linear-gradient(180deg, #F2A574 0%, #C97A4A 60%, #7C4A20 100%)",
    glow: "rgba(201, 122, 74, 0.40)",
    ring: "#E89B69",
    icon: "fi fi-sr-trophy",
    iconColor: "#E89B69",
  },
};

/** Génère une teinte stable à partir d'un nom (pour les avatars en initiales). */
function colorFromName(name) {
  const palette = ["#7B5CFF", "#3B82F6", "#22C55E", "#EC4899", "#F59E0B", "#06B6D4"];
  if (!name) return palette[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

/* ------------------------------------------------------------------ */
/*  Sous-composants                                                    */
/* ------------------------------------------------------------------ */

/** Carte d'une marche du podium (rank ∈ {1,2,3}). */
function PodiumStep({ entry, rank, isMe }) {
  const theme = RANK_THEME[rank];
  // Hauteur visuelle des marches : 1er > 2e > 3e
  const stepHeight = rank === 1 ? 110 : rank === 2 ? 80 : 60;

  return (
    <div className={`lb-podium-col lb-podium-col-${rank}`}>
      <div className="lb-podium-card">
        {rank === 1 && (
          <div className="lb-crown" aria-hidden>
            <i className="fi fi-sr-crown" />
          </div>
        )}
        <div
          className="lb-podium-avatar"
          style={{ borderColor: theme.ring, boxShadow: `0 0 24px ${theme.glow}` }}
        >
          <Avatar
            userId={entry.userId}
            name={entry.name}
            size={rank === 1 ? 88 : 72}
            bg={colorFromName(entry.name)}
          />
        </div>
        <div className="lb-podium-name" title={entry.name}>
          {entry.name}
          {isMe && <span className="lb-me-tag">moi</span>}
        </div>
        {entry.primaryClubName && (
          <div className="lb-podium-club">{entry.primaryClubName}</div>
        )}
        <div className="lb-podium-elo">
          <div className="lb-podium-elo-value">{entry.elo}</div>
          <div className="lb-podium-elo-label">Elo</div>
        </div>
      </div>
      <div
        className="lb-podium-step"
        style={{ height: stepHeight, background: theme.grad }}
      >
        <span className="lb-podium-rank">{rank}</span>
      </div>
    </div>
  );
}

/** Encart KPI (joueurs, elo moyen, top elo). */
function KpiCard({ icon, label, value, accent }) {
  return (
    <div className="lb-kpi">
      <div className="lb-kpi-icon" style={{ color: accent }}>
        <i className={icon} />
      </div>
      <div className="lb-kpi-body">
        <div className="lb-kpi-label">{label}</div>
        <div className="lb-kpi-value">{value}</div>
      </div>
    </div>
  );
}

/** Cellule "rang" avec icône trophée pour le top 3. */
function RankCell({ rank }) {
  const theme = RANK_THEME[rank];
  if (theme) {
    return (
      <span className={`lb-rank lb-rank-${rank}`}>
        <i className={theme.icon} style={{ color: theme.iconColor }} />
        <span className="lb-rank-num">{rank}</span>
      </span>
    );
  }
  return <span className="lb-rank lb-rank-default">{rank}</span>;
}

/** Pastille ELO avec gradient violet (mise en évidence forte). */
function EloBadge({ elo, rank }) {
  // Le top 3 reçoit un gradient or/argent/bronze, les autres le gradient violet
  const theme = RANK_THEME[rank];
  const style = theme
    ? { background: theme.grad, color: rank === 2 ? "#1F2937" : "#fff" }
    : null;
  return (
    <span className={`lb-elo-badge ${theme ? "lb-elo-badge-podium" : ""}`} style={style}>
      {elo}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Leaderboard() {
  const me = currentUser();
  const myUserId = me?.userId ?? null;

  const [rows, setRows] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [clubId, setClubId] = useState(""); // "" = tous
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Charge la liste des clubs (pour le filtre)
  useEffect(() => {
    api.get("/clubs").then((r) => setClubs(r.data)).catch(() => {});
  }, []);

  // Charge le classement, filtré ou non par club
  useEffect(() => {
    setLoading(true);
    const url = clubId ? `/leaderboard?clubId=${clubId}` : "/leaderboard";
    api
      .get(url)
      .then((r) => setRows(r.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [clubId]);

  // Top 3 et reste du classement
  const top3 = useMemo(() => rows.slice(0, 3), [rows]);
  const rest = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tail = rows.slice(3);
    if (!q) return tail;
    return tail.filter(
      (r) =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.primaryClubName || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  // KPIs globaux (calculés sur l'ensemble du résultat courant)
  const kpis = useMemo(() => {
    if (rows.length === 0) return { count: 0, avg: 0, top: 0 };
    const total = rows.reduce((s, r) => s + (r.elo || 0), 0);
    return {
      count: rows.length,
      avg: Math.round(total / rows.length),
      top: rows[0]?.elo ?? 0,
    };
  }, [rows]);

  // Ordre d'affichage du podium : 2 - 1 - 3 (visuel classique)
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div>
      <h2 className="page-title">
        <i className="fi fi-sr-trophy" /> Classement
      </h2>

      {/* ---------- Podium top 3 ---------- */}
      {top3.length > 0 && (
        <div className="card lb-podium-card-wrap">
          <div className="lb-podium-header">
            <h3 className="lb-podium-title">
              <i className="fi fi-sr-medal" /> Top 3
            </h3>
            <div className="lb-podium-sub">
              {clubId
                ? clubs.find((c) => String(c.id) === String(clubId))?.name || ""
                : "Tous clubs confondus"}
            </div>
          </div>
          <div className="lb-podium">
            {podiumOrder.map((entry) => (
              <PodiumStep
                key={entry.playerId}
                entry={entry}
                rank={entry.rank}
                isMe={myUserId != null && entry.userId === myUserId}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---------- KPIs ---------- */}
      {rows.length > 0 && (
        <div className="lb-kpi-row">
          <KpiCard
            icon="fi fi-sr-users"
            label="Joueurs classés"
            value={kpis.count}
            accent="#9B7FFF"
          />
          <KpiCard
            icon="fi fi-sr-stats"
            label="Elo moyen"
            value={kpis.avg}
            accent="#3B82F6"
          />
          <KpiCard
            icon="fi fi-sr-rocket"
            label="Top Elo"
            value={kpis.top}
            accent="#FACC15"
          />
        </div>
      )}

      {/* ---------- Filtres + tableau ---------- */}
      <div className="card">
        <div className="lb-toolbar">
          <div className="lb-search">
            <i className="fi fi-rr-search" />
            <input
              type="text"
              placeholder="Rechercher un joueur ou un club…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="lb-filter">
            <select value={clubId} onChange={(e) => setClubId(e.target.value)}>
              <option value="">Tous les clubs</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="lb-empty">
            <i className="fi fi-rr-spinner lb-spin" /> Chargement…
          </div>
        ) : rows.length === 0 ? (
          <div className="lb-empty">
            <i className="fi fi-rr-trophy" /> Aucun joueur classé pour ce filtre.
          </div>
        ) : (
          <div className="lb-table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>#</th>
                  <th>Joueur</th>
                  <th className="lb-th-club">Club</th>
                  <th style={{ textAlign: "right", width: 110 }}>Elo</th>
                </tr>
              </thead>
              <tbody>
                {/* Le top 3 reste affiché en tête du tableau (avec mise en évidence) */}
                {top3.map((r) => {
                  const isMe = myUserId != null && r.userId === myUserId;
                  return (
                    <tr
                      key={r.playerId}
                      className={`lb-row lb-row-top lb-row-top-${r.rank} ${
                        isMe ? "lb-row-me" : ""
                      }`}
                    >
                      <td>
                        <RankCell rank={r.rank} />
                      </td>
                      <td>
                        <div className="lb-player">
                          <Avatar
                            userId={r.userId}
                            name={r.name}
                            size={36}
                            bg={colorFromName(r.name)}
                          />
                          <div className="lb-player-name">
                            {r.name}
                            {isMe && <span className="lb-me-tag">moi</span>}
                          </div>
                        </div>
                      </td>
                      <td className="lb-td-club">
                        {r.primaryClubName && (
                          <span className="lb-club-pill">{r.primaryClubName}</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <EloBadge elo={r.elo} rank={r.rank} />
                      </td>
                    </tr>
                  );
                })}

                {/* Reste du classement (filtré par la recherche) */}
                {rest.map((r) => {
                  const isMe = myUserId != null && r.userId === myUserId;
                  return (
                    <tr
                      key={r.playerId}
                      className={`lb-row ${isMe ? "lb-row-me" : ""}`}
                    >
                      <td>
                        <RankCell rank={r.rank} />
                      </td>
                      <td>
                        <div className="lb-player">
                          <Avatar
                            userId={r.userId}
                            name={r.name}
                            size={36}
                            bg={colorFromName(r.name)}
                          />
                          <div className="lb-player-name">
                            {r.name}
                            {isMe && <span className="lb-me-tag">moi</span>}
                          </div>
                        </div>
                      </td>
                      <td className="lb-td-club">
                        {r.primaryClubName && (
                          <span className="lb-club-pill">{r.primaryClubName}</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <EloBadge elo={r.elo} />
                      </td>
                    </tr>
                  );
                })}

                {/* Cas : recherche vide après filtrage */}
                {search.trim() && rest.length === 0 && top3.length > 0 && (
                  <tr>
                    <td colSpan={4} className="lb-empty-row">
                      Aucun résultat hors top 3 pour « {search} ».
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
