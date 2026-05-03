import React, { useEffect, useState } from "react";
import DataGrid, { Column, Paging, SearchPanel } from "devextreme-react/data-grid";
import api from "../services/api";

function RankCell({ data }) {
  const rank = data?.data?.rank;
  if (rank == null) return null;
  if (rank === 1) return <span><i className="fi fi-sr-trophy" style={{ color: "#facc15" }} /> {rank}</span>;
  if (rank === 2) return <span><i className="fi fi-sr-trophy" style={{ color: "#9ca3af" }} /> {rank}</span>;
  if (rank === 3) return <span><i className="fi fi-sr-trophy" style={{ color: "#b45309" }} /> {rank}</span>;
  return <span>{rank}</span>;
}

export default function Leaderboard() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/leaderboard").then((r) => setRows(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <h2 className="page-title">
        <i className="fi fi-sr-trophy" /> Classement
      </h2>
      <div className="card">
        <DataGrid dataSource={rows} showBorders keyExpr="playerId">
          <SearchPanel visible />
          <Paging defaultPageSize={20} />
          <Column dataField="rank" caption="#" width={80} cellRender={RankCell} />
          <Column dataField="name" caption="Joueur" />
          <Column dataField="elo" caption="Elo" dataType="number" sortOrder="desc" />
          <Column dataField="primaryClubName" caption="Club" />
        </DataGrid>
      </div>
    </div>
  );
}
