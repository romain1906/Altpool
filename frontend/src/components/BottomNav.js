import React from "react";
import { NavLink } from "react-router-dom";

export default function BottomNav() {
  const link = ({ isActive }) => (isActive ? "active" : undefined);

  return (
    <nav className="bottom-nav">
      <NavLink to="/my-clubs" className={link}>
        <i className="fi fi-rr-marker" />
        <span>Mes clubs</span>
      </NavLink>
      <NavLink to="/reservations" className={link}>
        <i className="fi fi-rr-calendar" />
        <span>Réservations</span>
      </NavLink>
      <NavLink to="/profile" className={link}>
        <i className="fi fi-rr-user" />
        <span>Profil</span>
      </NavLink>
    </nav>
  );
}
