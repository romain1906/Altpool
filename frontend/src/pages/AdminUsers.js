import React, { useEffect, useState, useCallback } from "react";
import DataGrid, { Column, Paging } from "devextreme-react/data-grid";
import Popup from "devextreme-react/popup";
import Button from "devextreme-react/button";
import Form, { SimpleItem, Label } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import api from "../services/api";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "GERANT", label: "Gérant" },
  { value: "JOUEUR", label: "Joueur" },
];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [popup, setPopup] = useState(false);
  const [form, setForm] = useState({
    username: "", password: "", role: "GERANT", managedClubIds: [],
  });

  const load = useCallback(() => {
    api.get("/users").then((r) => setUsers(r.data));
    api.get("/clubs").then((r) => setClubs(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await api.post("/users", form);
      notify("Utilisateur créé", "success", 2000);
      setPopup(false);
      setForm({ username: "", password: "", role: "GERANT", managedClubIds: [] });
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  const ManagedCell = ({ data }) => {
    const list = data?.data?.managedClubs || [];
    return list.map((c) => (
      <span key={c.id}
        style={{
          display: "inline-block", margin: "1px 3px 1px 0",
          padding: "2px 8px", background: "rgba(250,204,21,0.18)",
          borderRadius: 100, fontSize: 11, color: "#FACC15"
        }}>{c.name}</span>
    ));
  };

  return (
    <div>
      <h2 className="page-title">
        <i className="fi fi-rr-user-shield" /> Utilisateurs
      </h2>
      <div className="card">
        <div style={{ marginBottom: 12 }}>
          <Button type="default" onClick={() => setPopup(true)} render={() => (
            <span><i className="fi fi-rr-plus" /> &nbsp;Nouvel utilisateur</span>
          )} />
        </div>
        <DataGrid dataSource={users} keyExpr="id" showBorders>
          <Paging defaultPageSize={20} />
          <Column dataField="id" width={70} />
          <Column dataField="username" caption="Identifiant" />
          <Column dataField="role" caption="Rôle" width={120} />
          <Column caption="Clubs gérés" cellRender={ManagedCell} />
        </DataGrid>
      </div>

      <Popup
        visible={popup}
        onHiding={() => setPopup(false)}
        hideOnOutsideClick
        title="Nouvel utilisateur"
        width={460}
        height={500}
      >
        <Form formData={form} labelLocation="top">
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
          <SimpleItem
            dataField="managedClubIds"
            editorType="dxTagBox"
            editorOptions={{
              dataSource: clubs, valueExpr: "id", displayExpr: "name",
              placeholder: "Clubs (uniquement pour les gérants)",
              showSelectionControls: true,
              applyValueMode: "useButtons",
            }}
          >
            <Label text="Clubs gérés" />
          </SimpleItem>
        </Form>
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Button text="Annuler" onClick={() => setPopup(false)} />
          &nbsp;
          <Button text="Créer" type="default" icon="save" onClick={handleCreate} />
        </div>
      </Popup>
    </div>
  );
}
