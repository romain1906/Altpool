import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DataGrid, { Column, Paging } from "devextreme-react/data-grid";
import Popup from "devextreme-react/popup";
import Button from "devextreme-react/button";
import Form, { SimpleItem, Label } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import api from "../services/api";

export default function Admin() {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState([]);
  const [billiards, setBilliards] = useState([]);

  const [clubPopup, setClubPopup] = useState(false);
  const [clubForm, setClubForm] = useState({ name: "" });

  const [bilPopup, setBilPopup] = useState(false);
  const [bilForm, setBilForm] = useState({ name: "", clubId: null });

  const load = useCallback(() => {
    api.get("/clubs").then((r) => setClubs(r.data));
    api.get("/billards").then((r) => setBilliards(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createClub = async () => {
    try {
      const { data: created } = await api.post("/clubs", clubForm);
      notify("Club créé — redirection vers la gestion des membres", "success", 2500);
      setClubPopup(false);
      setClubForm({ name: "" });
      load();
      // Redirection : on ouvre la page Mes clubs en pré-sélectionnant le nouveau club
      setTimeout(() => navigate(`/my-clubs?clubId=${created.id}`), 800);
    } catch (err) { notify(err.response?.data?.message || "Erreur", "error", 3000); }
  };

  const createBilliard = async () => {
    try {
      await api.post("/billards", bilForm);
      notify("Billard créé", "success", 2000);
      setBilPopup(false);
      setBilForm({ name: "", clubId: null });
      load();
    } catch (err) { notify(err.response?.data?.message || "Erreur", "error", 3000); }
  };

  return (
    <div>
      <h2 className="page-title">
        <i className="fi fi-rr-settings" /> Administration
      </h2>

      <div className="card">
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <i className="fi fi-rr-marker" /> Clubs
        </h3>
        <div style={{ marginBottom: 10 }}>
          <Button type="default" onClick={() => setClubPopup(true)} render={() => (
            <span><i className="fi fi-rr-plus" /> &nbsp;Ajouter</span>
          )} />
        </div>
        <DataGrid dataSource={clubs} keyExpr="id" showBorders>
          <Paging defaultPageSize={10} />
          <Column dataField="id" width={80} />
          <Column dataField="name" caption="Nom" />
        </DataGrid>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <i className="fi fi-rr-gamepad" /> Billards
        </h3>
        <div style={{ marginBottom: 10 }}>
          <Button type="default" onClick={() => setBilPopup(true)} render={() => (
            <span><i className="fi fi-rr-plus" /> &nbsp;Ajouter</span>
          )} />
        </div>
        <DataGrid dataSource={billiards} keyExpr="id" showBorders>
          <Paging defaultPageSize={10} />
          <Column dataField="id" width={80} />
          <Column dataField="name" caption="Nom" />
          <Column dataField="clubName" caption="Club" />
        </DataGrid>
      </div>

      <Popup
        visible={clubPopup}
        onHiding={() => setClubPopup(false)}
        hideOnOutsideClick
        title="Nouveau club"
        width={400}
        height={250}
      >
        <Form formData={clubForm} labelLocation="top">
          <SimpleItem dataField="name" isRequired>
            <Label text="Nom" />
          </SimpleItem>
        </Form>
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Button text="Annuler" onClick={() => setClubPopup(false)} />
          &nbsp;
          <Button text="Créer" type="default" icon="save" onClick={createClub} />
        </div>
      </Popup>

      <Popup
        visible={bilPopup}
        onHiding={() => setBilPopup(false)}
        hideOnOutsideClick
        title="Nouveau billard"
        width={420}
        height={320}
      >
        <Form formData={bilForm} labelLocation="top">
          <SimpleItem dataField="name" isRequired>
            <Label text="Nom" />
          </SimpleItem>
          <SimpleItem
            dataField="clubId"
            editorType="dxSelectBox"
            editorOptions={{
              dataSource: clubs, valueExpr: "id", displayExpr: "name", placeholder: "Club",
            }}
            isRequired
          >
            <Label text="Club" />
          </SimpleItem>
        </Form>
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Button text="Annuler" onClick={() => setBilPopup(false)} />
          &nbsp;
          <Button text="Créer" type="default" icon="save" onClick={createBilliard} />
        </div>
      </Popup>
    </div>
  );
}
