import React, { useEffect, useState, useCallback } from "react";
import DataGrid, { Column, Paging, SearchPanel } from "devextreme-react/data-grid";
import Popup from "devextreme-react/popup";
import Button from "devextreme-react/button";
import Form, { SimpleItem, Label } from "devextreme-react/form";
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
  const handleCreate = async () => {
    try {
      await api.post("/users", createForm);
      notify("Utilisateur créé", "success", 2000);
      setCreatePopup(false);
      setCreateForm({ username: "", password: "", role: "GERANT", managedClubIds: [] });
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

  // Helper : DevExtreme passe parfois { data: rowData } et parfois rowData directement.
  // On gère les 2 cas pour être défensif.
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
        <button type="button" onClick={() => setCreatePopup(true)}
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
        width={460}
        height={500}
      >
        <Form formData={createForm} labelLocation="top">
          <SimpleItem dataField="username" isRequired>
            <Label text="Identifiant" />
          </SimpleItem>
          <SimpleItem
            dataField="password"
            editorType="dxTextBox"
            editorOptions={{ mode: "password" }}
            isRequired
          >
            <Label text="Mot de passe" />
          </SimpleItem>
          <SimpleItem
            dataField="role"
            editorType="dxSelectBox"
            editorOptions={{
              dataSource: ROLE_OPTIONS, valueExpr: "value", displayExpr: "label",
            }}
            isRequired
          >
            <Label text="Rôle" />
          </SimpleItem>
          {createForm.role === "GERANT" && (
            <SimpleItem
              dataField="managedClubIds"
              editorType="dxTagBox"
              editorOptions={{
                dataSource: clubs, valueExpr: "id", displayExpr: "name",
                placeholder: "Sélectionne les clubs à gérer",
                showSelectionControls: true,
                applyValueMode: "useButtons",
              }}
            >
              <Label text="Clubs gérés" />
            </SimpleItem>
          )}
        </Form>
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Button text="Annuler" onClick={() => setCreatePopup(false)} />
          &nbsp;
          <Button text="Créer" type="default" icon="save" onClick={handleCreate} />
        </div>
      </Popup>

      {/* ---------- Popup Édition --------------------------------------- */}
      <Popup
        visible={editPopup}
        onHiding={() => setEditPopup(false)}
        hideOnOutsideClick
        title={`Éditer — ${editForm.username}`}
        width={500}
        height={520}
      >
        <div style={{
          padding: "12px 14px", borderRadius: 6, marginBottom: 16,
          background: "rgba(123,92,255,0.08)", border: "1px solid rgba(123,92,255,0.3)",
          color: "#C9D1FF", fontSize: 12,
        }}>
          <i className="fi fi-rr-info" /> &nbsp;
          Tu peux promouvoir un joueur en gérant en changeant son rôle ci-dessous.
          Si tu choisis <strong>Gérant</strong>, sélectionne les clubs qu'il devra gérer.
        </div>

        <Form formData={editForm} labelLocation="top">
          <SimpleItem editorOptions={{ readOnly: true, value: editForm.username }}
                      editorType="dxTextBox">
            <Label text="Identifiant (non modifiable)" />
          </SimpleItem>
          <SimpleItem
            dataField="role"
            editorType="dxSelectBox"
            editorOptions={{
              dataSource: ROLE_OPTIONS, valueExpr: "value", displayExpr: "label",
            }}
            isRequired
          >
            <Label text="Rôle" />
          </SimpleItem>
          {editForm.role === "GERANT" && (
            <SimpleItem
              dataField="managedClubIds"
              editorType="dxTagBox"
              editorOptions={{
                dataSource: clubs, valueExpr: "id", displayExpr: "name",
                placeholder: "Sélectionne les clubs à gérer",
                showSelectionControls: true,
                applyValueMode: "useButtons",
              }}
            >
              <Label text="Clubs gérés" />
            </SimpleItem>
          )}
          {editForm.role !== "GERANT" && (
            <div style={{
              padding: "10px 14px", borderRadius: 6, marginTop: 8,
              background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.3)",
              color: "#FACC15", fontSize: 11,
            }}>
              <i className="fi fi-rr-exclamation" /> &nbsp;
              Le rôle <strong>{ROLE_OPTIONS.find(o => o.value === editForm.role)?.label}</strong> ne gère pas de club —
              les clubs précédents seront détachés à la sauvegarde.
            </div>
          )}
        </Form>

        <div style={{ marginTop: 20, textAlign: "right" }}>
          <Button text="Annuler" onClick={() => setEditPopup(false)} />
          &nbsp;
          <Button text="Enregistrer" type="default" icon="save" onClick={handleUpdate} />
        </div>
      </Popup>
    </div>
  );
}
