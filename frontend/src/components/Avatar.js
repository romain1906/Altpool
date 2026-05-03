import React, { useState, useEffect } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";

/**
 * Affiche l'avatar d'un user. Si pas d'image (404) ou pas de userId,
 * fallback sur les initiales sur fond coloré.
 *
 * Props :
 *   userId   : Long (sinon initiales seulement)
 *   name     : string (pour les initiales)
 *   size     : px (default 40)
 *   bg       : couleur du fallback (default vert primary)
 *   version  : nombre/string pour invalider le cache après upload
 *   border   : booléen, ajoute un liseré clair (utile sur fond foncé)
 */
export default function Avatar({
  userId,
  name = "?",
  size = 40,
  bg = "#7B5CFF",
  version,
  border = false,
}) {
  const [error, setError] = useState(false);
  useEffect(() => { setError(false); }, [userId, version]);

  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const baseStyle = {
    width: size,
    height: size,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
    border: border ? "2px solid rgba(255,255,255,0.25)" : "none",
  };

  if (!userId || error) {
    return (
      <div
        style={{
          ...baseStyle,
          background: bg,
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: Math.round(size * 0.42),
          fontFamily: "Inter, sans-serif",
        }}
        aria-label={name}
      >
        {initial}
      </div>
    );
  }

  const v = version != null ? `?v=${version}` : "";
  return (
    <img
      src={`${API_BASE}/users/${userId}/avatar${v}`}
      alt={name}
      onError={() => setError(true)}
      style={baseStyle}
    />
  );
}
