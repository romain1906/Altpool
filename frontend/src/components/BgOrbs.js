import React from "react";

/**
 * Décor d'arrière-plan animé — 3 orbes lumineux qui dérivent lentement,
 * une grille subtile et un voile de bruit. Purement visuel, pas d'interaction.
 */
export default function BgOrbs() {
  return (
    <div className="bg-orbs" aria-hidden="true">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="bg-grid" />
      <div className="bg-noise" />
    </div>
  );
}
