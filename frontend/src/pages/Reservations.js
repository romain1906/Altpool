import React, { useEffect, useState, useCallback } from "react";
import DataGrid, { Column, Paging, SearchPanel } from "devextreme-react/data-grid";
import Popup from "devextreme-react/popup";
import Button from "devextreme-react/button";
import Form, { SimpleItem, Label } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import api from "../services/api";

export default function Reservations() {
  const [rows, setRows] = useState([]);
  const [billiards, setBilliards] = useState([]);
  const [popup, setPopup] = useState(false);
  const [form, setForm] = useState({
    billiardId: null,
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600_000),
  });

  const load = useCallback(() => {
    api.get("/reservations").then((r) => setRows(r.data));
    api.get("/billards").then((r) => setBilliards(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      const payload = {
        billiardId: form.billiardId,
        startTime: new Date(form.startTime).toISOString().slice(0, 19),
        endTime: new Date(form.endTime).toISOString().slice(0, 19),
      };
      await api.post("/reservations", payload);
      notify("Réservation créée", "success", 2000);
      setPopup(false);
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Conflit ou erreur", "error", 3000);
    }
  };

  return (
    <div>
      <h2 className="page-title">
        <i className="fi fi-rr-calendar" /> Réservations
      </h2>
      <div className="card">
        <div style={{ marginBottom: 12 }}>
          <Button
            type="default"
            onClick={() => setPopup(true)}
            render={() => (
              <span><i className="fi fi-rr-calendar-plus" /> &nbsp;Nouvelle réservation</span>
            )}
          />
        </div>
        <DataGrid dataSource={rows} keyExpr="id" showBorders>
          <SearchPanel visible />
          <Paging defaultPageSize={20} />
          <Column dataField="id" width={70} />
          <Column dataField="billiardName" caption="Billard" />
          <Column dataField="username" caption="Utilisateur" />
          <Column dataField="startTime" caption="Début" dataType="datetime" />
          <Column dataField="endTime" caption="Fin" dataType="datetime" />
        </DataGrid>
      </div>

      <Popup
        visible={popup}
        onHiding={() => setPopup(false)}
        hideOnOutsideClick
        title="Nouvelle réservation"
        width={460}
        height={400}
      >
        <Form formData={form} labelLocation="top">
          <SimpleItem
            dataField="billiardId"
            editorType="dxSelectBox"
            editorOptions={{
              dataSource: billiards,
              valueExpr: "id",
              displayExpr: (b) => b && `${b.name} — ${b.clubName}`,
              placeholder: "Billard",
            }}
            isRequired
          >
            <Label text="Billard" />
          </SimpleItem>
          <SimpleItem dataField="startTime" editorType="dxDateBox" editorOptions={{ type: "datetime" }} isRequired>
            <Label text="Début" />
          </SimpleItem>
          <SimpleItem dataField="endTime" editorType="dxDateBox" editorOptions={{ type: "datetime" }} isRequired>
            <Label text="Fin" />
          </SimpleItem>
        </Form>
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Button text="Annuler" onClick={() => setPopup(false)} />
          &nbsp;
          <Button text="Réserver" type="default" icon="save" onClick={handleSave} />
        </div>
      </Popup>
    </div>
  );
}
