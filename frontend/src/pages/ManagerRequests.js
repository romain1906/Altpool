import React, { useEffect, useState, useCallback } from "react";
import Popup from "devextreme-react/popup";
import Button from "devextreme-react/button";
import Form, { SimpleItem, Label } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import api from "../services/api";
import Avatar from "../components/Avatar";
import { avatarVersion } from "../services/auth";

export default function ManagerRequests() {
  const [rows, setRows] = useState([]);
  const [popup, setPopup] = useState(false);
  const [form, setForm] = useState({ id: null, username: "", newPassword: "" });

  const load = useCallback(() => {
    api.get("/password-resets")
       .then((r) => {
         setRows(r.data);
         window.dispatchEvent(new CustomEvent("altpool:resets-changed"));
       })
       .catch((err) => notify(err.response?.data?.message || "Erreur", "error", 3000));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openResolve = (row) => {
    setForm({ id: row.id, username: row.username, newPassword: "" });
    setPopup(true);
  };

  const handleResolve = async () => {
    if (!form.newPassword || form.newPassword.length < 3) {
      notify("Mot de passe trop court (min 3 caractères)", "error", 2500);
      return;
    }
    try {
      await api.post(`/password-resets/${form.id}/resolve`, { newPassword: form.newPassword });
      notify(`Mot de passe de ${form.username} réinitialisé`, "success", 3000);
      setPopup(false);
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  const handleReject = async (row) => {
    if (!window.confirm(`Refuser la demande de ${row.username} ?`)) return;
    try {
      await api.post(`/password-resets/${row.id}/reject`);
      notify("Demande refusée", "success", 2000);
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  const fmt = (iso) => {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString("fr-FR"); } catch { return iso; }
  };

  return (
    <div>
      <h2 className="page-title">
        <i className="fi fi-rr-key" /> Demandes de réinitialisation
      </h2>

      <p style={{ color: "#8A92B2", fontSize: 13, marginBottom: 20 }}>
        Joueurs ayant oublié leur mot de passe et rattachés à un club que tu gères.
        Saisis-leur un nouveau mot de passe et remets-le-leur en main propre.
        <br />
        <strong>{rows.length}</strong> demande{rows.length > 1 ? "s" : ""} en attente.
      </p>

      {rows.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#8A92B2" }}>
          <i className="fi fi-rr-check-circle" style={{ fontSize: 36, color: "#22C55E", display: "block", marginBottom: 10 }} />
          Aucune demande en attente. ✨
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
        {rows.map((row) => (
          <div key={row.id} className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 0 }}>
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #5B3FE0, #7B5CFF)",
              color: "#fff",
              padding: "16px 20px",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <Avatar
                userId={row.userId}
                name={row.playerName || row.username}
                size={44}
                version={avatarVersion()}
                border
                bg="rgba(255,255,255,0.15)"
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>
                  {row.playerName || row.username}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, fontFamily: "JetBrains Mono, monospace" }}>
                  @{row.username}
                </div>
              </div>
              <span style={{
                background: "rgba(212,165,55,0.25)", color: "#FACC15",
                padding: "4px 10px", borderRadius: 100,
                fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
              }}>
                {row.status}
              </span>
            </div>

            {/* Body */}
            <div style={{ padding: "16px 20px" }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 10, color: "#8A92B2", textTransform: "uppercase",
                  letterSpacing: 2, fontWeight: 600, marginBottom: 6,
                }}>Clubs</div>
                {(row.clubs && row.clubs.length > 0) ? row.clubs.map((c) => (
                  <span key={c.id} style={{
                    display: "inline-block", margin: "2px 4px 2px 0",
                    padding: "3px 10px", background: "rgba(123,92,255,0.18)",
                    borderRadius: 100, fontSize: 12, color: "#9B7FFF", fontWeight: 600,
                  }}>{c.name}</span>
                )) : <span style={{ color: "#999", fontStyle: "italic", fontSize: 12 }}>aucun</span>}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 10, color: "#8A92B2", textTransform: "uppercase",
                  letterSpacing: 2, fontWeight: 600, marginBottom: 4,
                }}>Demandé le</div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>
                  {fmt(row.requestedAt)}
                </div>
              </div>

              {/* Actions */}
              {row.status === "PENDING" ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => openResolve(row)}
                    style={{
                      flex: 1, padding: "12px 16px", borderRadius: 100,
                      background: "#9B7FFF", color: "#fff", border: "none",
                      cursor: "pointer", fontSize: 14, fontWeight: 600,
                      fontFamily: "inherit", letterSpacing: 0.3,
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = "#5B3FE0"; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "#9B7FFF"; }}
                  >
                    <i className="fi fi-rr-key" /> Réinitialiser
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(row)}
                    style={{
                      padding: "12px 16px", borderRadius: 100,
                      background: "rgba(255,255,255,0.05)", color: "#F87171",
                      border: "1.5px solid rgba(239,68,68,0.5)",
                      cursor: "pointer", fontSize: 14, fontWeight: 600,
                      fontFamily: "inherit", letterSpacing: 0.3,
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <i className="fi fi-rr-cross" /> Refuser
                  </button>
                </div>
              ) : (
                <div style={{
                  fontSize: 12, color: "#8A92B2", fontStyle: "italic",
                  padding: 10, background: "rgba(255,255,255,0.05)", borderRadius: 4,
                }}>
                  Traitée — aucune action possible.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Popup
        visible={popup}
        onHiding={() => setPopup(false)}
        hideOnOutsideClick
        title={`Nouveau mot de passe — ${form.username}`}
        width={460}
        height={320}
      >
        <Form formData={form} labelLocation="top">
          <SimpleItem
            dataField="newPassword"
            editorType="dxTextBox"
            editorOptions={{
              mode: "password",
              placeholder: "Saisis le nouveau mot de passe",
              onEnterKey: handleResolve,
            }}
            isRequired
          >
            <Label text="Mot de passe" />
          </SimpleItem>
        </Form>
        <p style={{ fontSize: 12, color: "#8A92B2", marginTop: 12 }}>
          Ce mot de passe sera communiqué en main propre au joueur.
        </p>
        <div style={{ marginTop: 16, textAlign: "right", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button text="Annuler" onClick={() => setPopup(false)} />
          <Button text="Réinitialiser" type="default" icon="key" onClick={handleResolve} />
        </div>
      </Popup>
    </div>
  );
}
