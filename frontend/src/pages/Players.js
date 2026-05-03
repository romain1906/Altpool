import React, { useEffect, useState, useCallback } from "react";
import DataGrid, { Column, Paging, SearchPanel } from "devextreme-react/data-grid";
import Popup from "devextreme-react/popup";
import Button from "devextreme-react/button";
import Form, { SimpleItem, Label } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import api from "../services/api";
import { canManage } from "../services/auth";

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [popupCreate, setPopupCreate] = useState(false);
  const [popupAttach, setPopupAttach] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", username: "", password: "", primaryClubId: null
  });
  const [attachForm, setAttachForm] = useState({ playerId: null, clubId: null });

  const load = useCallback(() => {
    api.get("/players").then((r) => setPlayers(r.data));
    api.get("/clubs").then((r) => setClubs(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await api.post("/players", createForm);
      notify("Joueur créé", "success", 2000);
      setPopupCreate(false);
      setCreateForm({ name: "", username: "", password: "", primaryClubId: null });
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  const handleAttach = async () => {
    try {
      await api.post(`/players/${attachForm.playerId}/clubs/${attachForm.clubId}`);
      notify("Joueur rattaché au club", "success", 2000);
      setPopupAttach(false);
      setAttachForm({ playerId: null, clubId: null });
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  const ClubsCell = ({ data }) => {
    const list = data?.data?.clubs || [];
    return list.map((c) => (
      <span key={c.id}
        style={{
          display: "inline-block", margin: "1px 3px 1px 0",
          padding: "2px 8px", background: "rgba(123,92,255,0.18)",
          borderRadius: 100, fontSize: 11, color: "#9B7FFF"
        }}>{c.name}</span>
    ));
  };

  return (
    <div>
      <h2 className="page-title">
        <i className="fi fi-rr-users" /> Joueurs
      </h2>
      <div className="card">
        {canManage() && (
          <div style={{ marginBottom: 12, display: "flex", gap: 10 }}>
            <Button type="default" onClick={() => setPopupCreate(true)} render={() => (
              <span><i className="fi fi-rr-plus" /> &nbsp;Nouveau joueur</span>
            )} />
            <Button onClick={() => setPopupAttach(true)} render={() => (
              <span><i className="fi fi-rr-link" /> &nbsp;Rattacher à un club</span>
            )} />
          </div>
        )}
        <DataGrid dataSource={players} keyExpr="id" showBorders>
          <SearchPanel visible />
          <Paging defaultPageSize={20} />
          <Column dataField="id" width={70} />
          <Column dataField="name" caption="Nom" />
          <Column dataField="elo" caption="Elo" dataType="number" />
          <Column dataField="primaryClubName" caption="Club principal" />
          <Column caption="Clubs" cellRender={ClubsCell} />
        </DataGrid>
      </div>

      {/* Création joueur (User + Player) */}
      <Popup
        visible={popupCreate}
        onHiding={() => setPopupCreate(false)}
        hideOnOutsideClick
        title="Nouveau joueur"
        width={460}
        height={460}
      >
        <Form formData={createForm} labelLocation="top">
          <SimpleItem dataField="name" isRequired>
            <Label text="Nom du joueur" />
          </SimpleItem>
          <SimpleItem dataField="username" isRequired>
            <Label text="Identifiant de connexion" />
          </SimpleItem>
          <SimpleItem
            dataField="password"
            editorType="dxTextBox"
            editorOptions={{ mode: "password" }}
            isRequired
          >
            <Label text="Mot de passe initial" />
          </SimpleItem>
          <SimpleItem
            dataField="primaryClubId"
            editorType="dxSelectBox"
            editorOptions={{ dataSource: clubs, valueExpr: "id", displayExpr: "name", placeholder: "Club principal" }}
            isRequired
          >
            <Label text="Club principal" />
          </SimpleItem>
        </Form>
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Button text="Annuler" onClick={() => setPopupCreate(false)} />
          &nbsp;
          <Button text="Créer" type="default" icon="save" onClick={handleCreate} />
        </div>
      </Popup>

      {/* Rattachement à un club */}
      <Popup
        visible={popupAttach}
        onHiding={() => setPopupAttach(false)}
        hideOnOutsideClick
        title="Rattacher un joueur à un club"
        width={460}
        height={320}
      >
        <Form formData={attachForm} labelLocation="top">
          <SimpleItem
            dataField="playerId"
            editorType="dxSelectBox"
            editorOptions={{
              dataSource: players, valueExpr: "id",
              displayExpr: (p) => p && `${p.name} (${p.primaryClubName})`,
              searchEnabled: true, placeholder: "Joueur",
            }}
            isRequired
          >
            <Label text="Joueur" />
          </SimpleItem>
          <SimpleItem
            dataField="clubId"
            editorType="dxSelectBox"
            editorOptions={{ dataSource: clubs, valueExpr: "id", displayExpr: "name", placeholder: "Club" }}
            isRequired
          >
            <Label text="Club à rattacher" />
          </SimpleItem>
        </Form>
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Button text="Annuler" onClick={() => setPopupAttach(false)} />
          &nbsp;
          <Button text="Rattacher" type="default" icon="link" onClick={handleAttach} />
        </div>
      </Popup>
    </div>
  );
}
