import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

/**
 * Bandeau rouge affiché en haut du contenu si l'utilisateur connecté est un JOUEUR
 * dont le profil est incomplet. Caché sur la page profil elle-même.
 * Refresh à chaque changement de route + écoute "altpool:profile-changed".
 */
export default function ProfileIncompleteBanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);

  const fetchMe = () => {
    api.get("/users/me").then((r) => setMe(r.data)).catch(() => {});
  };

  useEffect(() => { fetchMe(); }, [location.pathname]);
  useEffect(() => {
    const onChange = () => fetchMe();
    window.addEventListener("altpool:profile-changed", onChange);
    return () => window.removeEventListener("altpool:profile-changed", onChange);
  }, []);

  if (!me) return null;
  if (me.role !== "JOUEUR") return null;
  if (me.profileComplete) return null;
  if (location.pathname === "/profile") return null;

  return (
    <div style={{
      background: "linear-gradient(90deg, rgba(239,68,68,0.18), rgba(239,68,68,0.10))",
      border: "1px solid rgba(239,68,68,0.4)",
      borderRadius: 8, padding: "12px 18px", marginBottom: 16,
      display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "rgba(239,68,68,0.25)", color: "#FCA5A5",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, flexShrink: 0,
      }}>
        <i className="fi fi-rr-exclamation" />
      </div>
      <div style={{ flex: 1, minWidth: 200, color: "#fff", fontSize: 13 }}>
        <strong>Profil incomplet</strong> — ajoute ton email, ta date de naissance et ton genre
        pour pouvoir créer des matchs, t'inscrire à un tournoi ou réserver une table.
      </div>
      <button type="button" onClick={() => navigate("/profile")}
        style={{
          background: "#EF4444", color: "#fff", border: "none",
          padding: "8px 18px", borderRadius: 100, cursor: "pointer",
          fontSize: 12, fontWeight: 600, fontFamily: "inherit",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
        <i className="fi fi-rr-arrow-right" /> Compléter mon profil
      </button>
    </div>
  );
}
