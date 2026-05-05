import React, { useEffect, useState, useCallback } from "react";
import DataGrid, { Column, Paging, SearchPanel } from "devextreme-react/data-grid";
import Popup from "devextreme-react/popup";
import notify from "devextreme/ui/notify";
import api from "../services/api";

const ROLE_OPTIONS = [
  { value: "ADMIN",  label: "Admin" },
  { value: "GERANT", label: "Gérant" },
  { value: "JOUEUR", label: "Joueur" },
];

const ROLE_BADGE = {
  ADMIN:  { bg: "rgba(239,68,68,0.18)",  fg: "#F87171" },
  GERANT: { bg: "rgba(250,204,21,0.18)", fg: "#FACC15" },
  JOUEUR: { bg: "rgba(123,92,255,0.22)", fg: "#9B7FFF" },
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [clubs, setClubs] = useState([]);

  const [createPopup, setCreatePopup] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "", password: "", role: "GERANT", managedClubIds: [],
  });

  const [editPopup, setEditPopup] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null, username: "", role: "JOUEUR", managedClubIds: [],
  });

  const load = useCallback(() => {
    api.get("/users").then((r) => setUsers(r.data));
    api.get("/clubs").then((r) => setClubs(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ----- Création --------------------------------------------------------
  const openCreate = () => {
    setCreateForm({ username: "", password: "", role: "GERANT", managedClubIds: [] });
    setCreatePopup(true);
  };
  const handleCreate = async () => {
    if (!createForm.username?.trim()) { notify("Identifiant requis", "error", 2500); return; }
    if (!createForm.password?.trim()) { notify("Mot de passe requis", "error", 2500); return; }
    try {
      await api.post("/users", createForm);
      notify("Utilisateur créé", "success", 2000);
      setCreatePopup(false);
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  // ----- Édition ---------------------------------------------------------
  const openEdit = (u) => {
    setEditForm({
      id: u.id,
      username: u.username,
      role: u.role,
      managedClubIds: (u.managedClubs || []).map((c) => c.id),
    });
    setEditPopup(true);
  };
  const handleUpdate = async () => {
    try {
      await api.patch(`/users/${editForm.id}`, {
        role: editForm.role,
        managedClubIds: editForm.managedClubIds,
      });
      notify(`${editForm.username} mis à jour`, "success", 2500);
      setEditPopup(false);
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  // ----- Cell renderers --------------------------------------------------
  const getRow = (info) => info?.data?.role !== undefined ? info.data : info;

  const RoleCell = (info) => {
    const row = getRow(info);
    if (!row) return <span style={{ color: "#5A6478", fontSize: 11 }}>?</span>;
    const r = row.role;
    if (!r) return <span style={{ color: "#EF4444", fontSize: 11, fontStyle: "italic" }}>(role manquant)</span>;
    const key = typeof r === "string" ? r : r.name;
    const c = ROLE_BADGE[key] || { bg: "#333", fg: "#aaa" };
    const label = ROLE_OPTIONS.find(o => o.value === key)?.label || String(r);
    return (
      <span style={{
        background: c.bg, color: c.fg,
        padding: "3px 10px", borderRadius: 100,
        fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
      }}>{label}</span>
    );
  };

  const ManagedCell = (info) => {
    const row = getRow(info) || {};
    const list = row.managedClubs || [];
    if (list.length === 0) {
      return <span style={{ color: "#5A6478", fontStyle: "italic", fontSize: 11 }}>—</span>;
    }
    return (
      <span>
        {list.map((c) => (
          <span key={c.id}
            style={{
              display: "inline-block", margin: "1px 3px 1px 0",
              padding: "2px 8px", background: "rgba(250,204,21,0.18)",
              borderRadius: 100, fontSize: 11, color: "#FACC15", fontWeight: 600,
            }}>{c.name}</span>
        ))}
      </span>
    );
  };

  const ActionsCell = (info) => {
    const row = getRow(info);
    if (!row) return null;
    return (
      <button type="button" onClick={() => openEdit(row)}
        style={{
          background: "#7B5CFF", border: "none",
          color: "#fff", padding: "6px 14px", borderRadius: 100,
          cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
          display: "inline-flex", alignItems: "center", gap: 6,
          boxShadow: "0 2px 6px rgba(123,92,255,0.3)",
          whiteSpace: "nowrap",
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = "#5B3FE0"; }}
        onMouseOut={(e) => { e.currentTarget.style.background = "#7B5CFF"; }}
      >
        <i className="fi fi-rr-edit" /> Éditer
      </button>
    );
  };

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: 20, flexWrap: "wrap",
      }}>
        <h2 className="page-title">
          <i className="fi fi-rr-user-shield" /> Utilisateurs
        </h2>
        <button type="button" onClick={openCreate}
          style={{
            background: "#7B5CFF", color: "#fff", border: "none",
            padding: "10px 18px", borderRadius: 100, cursor: "pointer",
            fontSize: 13, fontWeight: 600, fontFamily: "inherit",
            display: "inline-flex", alignItems: "center", gap: 8, marginTop: 4,
          }}>
          <i className="fi fi-rr-plus" /> Nouvel utilisateur
        </button>
      </div>

      <div className="card">
        <DataGrid dataSource={users} keyExpr="id" showBorders rowAlternationEnabled>
          <SearchPanel visible />
          <Paging defaultPageSize={20} />
          <Column dataField="id" caption="#" width={60} />
          <Column dataField="username" caption="Identifiant" width={160} />
          <Column dataField="role" caption="Rôle" width={120} cellRender={RoleCell} />
          <Column caption="Clubs gérés" cellRender={ManagedCell} />
          <Column caption="Actions" cellRender={ActionsCell} width={130} alignment="left" />
        </DataGrid>
      </div>

      {/* ---------- Popup Création -------------------------------------- */}
      <Popup
        visible={createPopup}
        onHiding={() => setCreatePopup(false)}
        hideOnOutsideClick
        title="Nouvel utilisateur"
        width={520}
        height={620}
      >
        <UserForm
          form={createForm} setForm={setCreateForm} clubs={clubs} mode="create"
          onCancel={() => setCreatePopup(false)}
          onSubmit={handleCreate}
        />
      </Popup>

      {/* ---------- Popup Édition --------------------------------------- */}
      <Popup
        visible={editPopup}
        onHiding={() => setEditPopup(false)}
        hideOnOutsideClick
        title={`Éditer — ${editForm.username}`}
        width={520}
        height={580}
      >
        <UserForm
          form={editForm} setForm={setEditForm} clubs={clubs} mode="edit"
          onCancel={() => setEditPopup(false)}
          onSubmit={handleUpdate}
        />
      </Popup>
    </div>
  );
}

// =====================================================================
//  Formulaire user (HTML natif, fiable, réactif)
// =====================================================================

function UserForm({ form, setForm, clubs, mode, onCancel, onSubmit }) {
  const isEdit = mode === "edit";

  const toggleClub = (clubId) => {
    const current = form.managedClubIds || [];
    const next = current.includes(clubId)
      ? current.filter((id) => id !== clubId)
      : [...current, clubId];
    setForm({ ...form, managedClubIds: next });
  };

  const selectAll = () => setForm({ ...form, managedClubIds: clubs.map((c) => c.id) });
  const clearAll = () => setForm({ ...form, managedClubIds: [] });

  return (
    <div style={{ overflow: "auto", maxHeight: "100%", paddingRight: 4 }}>
      {isEdit && (
        <div style={{
          padding: "10px 14px", borderRadius: 6, marginBottom: 14,
          background: "rgba(123,92,255,0.08)", border: "1px solid rgba(123,92,255,0.3)",
          color: "#C9D1FF", fontSize: 12,
        }}>
          <i className="fi fi-rr-info" /> &nbsp;
          Promeut un joueur en gérant ou modifie ses clubs gérés.
        </div>
      )}

      {/* Identifiant */}
      <Field label={isEdit ? "Identifiant (non modifiable)" : "Identifiant *"}>
        <input
          type="text"
          value={form.username || ""}
          disabled={isEdit}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          style={{ ...inputStyle, opacity: isEdit ? 0.6 : 1 }}
        />
      </Field>

      {/* Mot de passe — uniquement à la création */}
      {!isEdit && (
        <Field label="Mot de passe *">
          <input
            type="password"
            value={form.password || ""}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={inputStyle}
          />
        </Field>
      )}

      {/* Rôle */}
      <Field label="Rôle">
        <div style={{ display: "flex", gap: 8 }}>
          {ROLE_OPTIONS.map((o) => (
            <button key={o.value} type="button"
              onClick={() => setForm({ ...form, role: o.value })}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 100,
                background: form.role === o.value ? "#7B5CFF" : "rgba(123,92,255,0.1)",
                color: form.role === o.value ? "#fff" : "#9B7FFF",
                border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              }}>
              {o.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Clubs (uniquement si Gérant) */}
      {form.role === "GERANT" && (
        <Field label={`Clubs gérés (${(form.managedClubIds || []).length} / ${clubs.length})`}>
          {clubs.length === 0 ? (
            <div style={hintStyle}>Aucun club n'existe encore.</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 11 }}>
                <button type="button" onClick={selectAll} style={miniBtn}>Tout sélectionner</button>
                <button type="button" onClick={clearAll} style={miniBtn}>Tout désélectionner</button>
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 6, padding: 10,
                background: "rgba(0,0,0,0.2)", border: "1px solid #2A3050", borderRadius: 8,
                maxHeight: 240, overflowY: "auto",
              }}>
                {clubs.map((c) => {
                  const checked = (form.managedClubIds || []).includes(c.id);
                  return (
                    <label key={c.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px", borderRadius: 6,
                        background: checked ? "rgba(250,204,21,0.18)" : "rgba(123,92,255,0.06)",
                        border: checked ? "1px solid rgba(250,204,21,0.5)" : "1px solid transparent",
                        cursor: "pointer", fontSize: 13,
                        color: checked ? "#FACC15" : "#C9D1FF",
                        fontWeight: checked ? 600 : 500,
                        transition: "background 0.15s",
                      }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClub(c.id)}
                        style={{ accentColor: "#FACC15", width: 16, height: 16, flexShrink: 0 }}
                      />
                      <span style={{ flex: 1 }}>{c.name}</span>
                      {checked && <i className="fi fi-sr-check" style={{ color: "#FACC15" }} />}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </Field>
      )}

      {form.role && form.role !== "GERANT" && (
        <div style={{
          padding: "10px 14px", borderRadius: 6, marginTop: 8,
          background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.3)",
          color: "#FACC15", fontSize: 11,
        }}>
          <i className="fi fi-rr-exclamation" /> &nbsp;
          Le rôle <strong>{ROLE_OPTIONS.find(o => o.value === form.role)?.label}</strong> ne gère pas de club —
          les éventuels clubs précédents seront détachés à la sauvegarde.
        </div>
      )}

      <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={btnGhost}>Annuler</button>
        <button type="button" onClick={onSubmit} style={btnPrimary}>
          <i className="fi fi-rr-disk" /> &nbsp;{isEdit ? "Enregistrer" : "Créer"}
        </button>
      </div>
    </div>
  );
}

// ----- Helpers UI ------------------------------------------------------

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
        textTransform: "uppercase", color: "#8A92B2", marginBottom: 6,
      }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 12px", fontSize: 13,
  border: "1px solid #2A3050", borderRadius: 6,
  background: "#1A1F3D", color: "#fff", fontFamily: "inherit",
};
const hintStyle = {
  fontSize: 12, color: "#8A92B2", fontStyle: "italic",
  padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 6,
};
const miniBtn = {
  background: "transparent", color: "#9B7FFF",
  border: "1px solid rgba(123,92,255,0.4)",
  padding: "4px 10px", borderRadius: 100, cursor: "pointer",
  fontFamily: "inherit", fontSize: 11, fontWeight: 600,
};
const btnPrimary = {
  background: "#7B5CFF", color: "#fff", border: "none",
  padding: "10px 22px", borderRadius: 100, cursor: "pointer",
  fontFamily: "inherit", fontSize: 13, fontWeight: 600,
  display: "inline-flex", alignItems: "center",
};
const btnGhost = {
  background: "transparent", color: "#8A92B2",
  border: "1px solid #2A3050", padding: "10px 22px", borderRadius: 100,
  cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500,
};
