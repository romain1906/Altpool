import React, { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { currentUser, isAdmin, canManage, logout, avatarVersion } from "../services/auth";
import api from "../services/api";
import Avatar from "./Avatar";
import BottomNav from "./BottomNav";
import BgOrbs from "./BgOrbs";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = currentUser();
  const [pendingResets, setPendingResets] = useState(0);
  const [pendingMatches, setPendingMatches] = useState(0);
  const [avatarV, setAvatarV] = useState(avatarVersion());

  // se met à jour quand l'utilisateur change d'avatar
  useEffect(() => {
    const onAvatar = (e) => setAvatarV(e.detail || Date.now());
    window.addEventListener("altpool:avatar-changed", onAvatar);
    return () => window.removeEventListener("altpool:avatar-changed", onAvatar);
  }, []);

  // ouvert par défaut sur desktop, fermé sur mobile
  const isDesktop = () => typeof window !== "undefined" && window.innerWidth >= 1024;
  const [open, setOpen] = useState(() => isDesktop());

  // ferme le drawer au changement de page UNIQUEMENT sur mobile
  useEffect(() => {
    if (!isDesktop()) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ferme avec Escape (mobile) ou Cmd/Ctrl-B (desktop)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !isDesktop()) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // bloque le scroll body uniquement sur mobile (overlay)
  useEffect(() => {
    if (open && !isDesktop()) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // refresh du badge demandes mdp
  useEffect(() => {
    if (!canManage()) return;
    const refresh = () => {
      api.get("/password-resets")
        .then((r) => setPendingResets(r.data.filter(x => x.status === "PENDING").length))
        .catch(() => {});
    };
    refresh();
    window.addEventListener("altpool:resets-changed", refresh);
    const interval = setInterval(refresh, 30000);
    return () => {
      window.removeEventListener("altpool:resets-changed", refresh);
      clearInterval(interval);
    };
  }, []);

  // refresh du badge "matchs à valider" (pour le user courant + admin)
  useEffect(() => {
    const refresh = () => {
      const url = isAdmin()
        ? "/matches?status=PENDING_VALIDATION"
        : "/matches?mine=true";
      api.get(url)
        .then((r) => setPendingMatches(r.data.length))
        .catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const link = ({ isActive }) => (isActive ? "active" : undefined);

  return (
    <div className={`app-shell ${open ? "drawer-open" : ""}`}>
      {/* ---------- Décor animé en fond ---------------------------- */}
      <BgOrbs />

      {/* ---------- Topbar ----------------------------------------- */}
      <header className="topbar">
        <button
          type="button"
          className="burger"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setOpen(!open)}
        >
          <i className={open ? "fi fi-rr-cross" : "fi fi-rr-menu-burger"} />
        </button>
        <div className="topbar-brand" onClick={() => navigate("/leaderboard")}>
          <img src="/logo-icon.png" alt="" />
          <span>Alt<i>Pool</i></span>
        </div>
        {user && (
          <button
            type="button"
            className="topbar-user"
            onClick={() => navigate("/profile")}
            title="Mon profil"
          >
            <Avatar
              userId={user.userId}
              name={user.username}
              size={38}
              version={avatarV}
              border
            />
          </button>
        )}
      </header>

      {/* ---------- Backdrop (mobile only via CSS) ------------------ */}
      {open && <div className="backdrop" onClick={() => setOpen(false)} />}

      {/* ---------- Sidebar (drawer) -------------------------------- */}
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo-icon.png" alt="AltPool" />
          <span className="brand-name">ALTPOOL</span>
        </div>

        <nav className="nav">
          <NavLink to="/leaderboard" className={link}>
            <i className="fi fi-rr-trophy" /> Classement
          </NavLink>
          <NavLink to="/my-clubs" className={link}>
            <i className="fi fi-rr-marker" /> Mes clubs
          </NavLink>
          <NavLink to="/players" className={link}>
            <i className="fi fi-rr-users" /> Joueurs
          </NavLink>
          <NavLink to="/reservations" className={link}>
            <i className="fi fi-rr-calendar" /> Réservations
          </NavLink>
          <NavLink to="/matches" className={link}>
            <i className="fi fi-rr-game-board-alt" /> Matchs
            {pendingMatches > 0 && <span className="badge">{pendingMatches}</span>}
          </NavLink>
          <NavLink to="/tournaments" className={link}>
            <i className="fi fi-rr-trophy" /> Tournois
          </NavLink>
          <NavLink to="/profile" className={link}>
            <i className="fi fi-rr-id-badge" /> Mon profil
          </NavLink>

          {canManage() && (
            <NavLink to="/manager/requests" className={link}>
              <i className="fi fi-rr-key" /> Demandes mdp
              {pendingResets > 0 && <span className="badge">{pendingResets}</span>}
            </NavLink>
          )}

          {isAdmin() && (
            <>
              <div className="nav-section">Administration</div>
              <NavLink to="/admin" className={link}>
                <i className="fi fi-rr-settings" /> Clubs & billards
              </NavLink>
              <NavLink to="/admin/users" className={link}>
                <i className="fi fi-rr-user-shield" /> Utilisateurs
              </NavLink>
            </>
          )}
        </nav>

        {user && (
          <div className="user-box">
            <div onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>
              <i className="fi fi-rr-user" /> &nbsp;{user.username}
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{user.role}</div>
            </div>
            <a href="#logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
              <i className="fi fi-rr-sign-out-alt" /> &nbsp;Déconnexion
            </a>
          </div>
        )}
      </aside>

      {/* ---------- Content ----------------------------------------- */}
      <main className="content">{children}</main>

      {/* ---------- Bottom nav (mobile uniquement, via CSS) --------- */}
      <BottomNav />
    </div>
  );
}
