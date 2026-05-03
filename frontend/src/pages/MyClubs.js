import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Popup from "devextreme-react/popup";
import Button from "devextreme-react/button";
import Form, { SimpleItem, Label } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import api from "../services/api";
import { canManage, avatarVersion } from "../services/auth";
import Avatar from "../components/Avatar";

export default function MyClubs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clubs, setClubs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Popups
  const [createPopup, setCreatePopup] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", username: "", password: "", primaryClubId: null,
  });

  const [attachPopup, setAttachPopup] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const [attachForm, setAttachForm] = useState({ playerId: null });

  const [newClubPopup, setNewClubPopup] = useState(false);
  const [newClubForm, setNewClubForm] = useState({ name: "" });

  const loadClubs = useCallback(() => {
    api.get("/users/me/clubs")
       .then((r) => setClubs(r.data))
       .catch(() => {});
  }, []);

  useEffect(() => { loadClubs(); }, [loadClubs]);

  const loadMembers = useCallback((clubId) => {
    setLoadingMembers(true);
    api.get(`/players?clubId=${clubId}`)
       .then((r) => setMembers(r.data))
       .finally(() => setLoadingMembers(false));
  }, []);

  const openClub = useCallback((club) => {
    setSelected(club);
    setMembers([]);
    loadMembers(club.id);
  }, [loadMembers]);

  // Si l'URL contient ?clubId=X, on ouvre directement ce club une fois la liste chargée
  useEffect(() => {
    const cid = searchParams.get("clubId");
    if (!cid || clubs.length === 0 || selected) return;
    const club = clubs.find((c) => String(c.id) === String(cid));
    if (club) openClub(club);
  }, [searchParams, clubs, selected, openClub]);

  const back = () => {
    setSelected(null);
    setMembers([]);
    if (searchParams.get("clubId")) setSearchParams({});
  };

  // ----- Création nouveau joueur ----------------------------------------
  const openCreate = () => {
    setCreateForm({ name: "", username: "", password: "", primaryClubId: selected.id });
    setCreatePopup(true);
  };
  const handleCreate = async () => {
    try {
      await api.post("/players", createForm);
      notify(`${createForm.name} créé et ajouté à ${selected.name}`, "success", 2500);
      setCreatePopup(false);
      loadMembers(selected.id);
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  // ----- Rattachement d'un joueur existant ------------------------------
  const openAttach = async () => {
    try {
      const r = await api.get("/players");
      // exclut ceux déjà dans le club
      const memberIds = new Set(members.map((m) => m.id));
      setAllPlayers(r.data.filter((p) => !memberIds.has(p.id)));
      setAttachForm({ playerId: null });
      setAttachPopup(true);
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };
  const handleAttach = async () => {
    if (!attachForm.playerId) return;
    try {
      await api.post(`/players/${attachForm.playerId}/clubs/${selected.id}`);
      notify("Joueur rattaché au club", "success", 2000);
      setAttachPopup(false);
      loadMembers(selected.id);
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  // ----- Création d'un nouveau club -------------------------------------
  const openNewClub = () => {
    setNewClubForm({ name: "" });
    setNewClubPopup(true);
  };
  const handleNewClub = async () => {
    if (!newClubForm.name || newClubForm.name.trim().length < 2) {
      notify("Nom de club trop court", "error", 2500);
      return;
    }
    try {
      const { data: created } = await api.post("/clubs", { name: newClubForm.name.trim() });
      notify(`Club "${created.name}" créé`, "success", 2500);
      setNewClubPopup(false);
      // Recharge la liste, puis ouvre le nouveau club
      const r = await api.get("/users/me/clubs");
      setClubs(r.data);
      const fresh = r.data.find((c) => c.id === created.id);
      if (fresh) openClub(fresh);
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  // ----- Détacher un joueur ---------------------------------------------
  const detach = async (player) => {
    if (player.primaryClubId === selected.id) {
      notify("Impossible : c'est le club principal du joueur", "error", 3000);
      return;
    }
    if (!window.confirm(`Détacher ${player.name} de ${selected.name} ?`)) return;
    try {
      await api.delete(`/players/${player.id}/clubs/${selected.id}`);
      notify("Joueur détaché", "success", 2000);
      loadMembers(selected.id);
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  // ----- Vue détaillée d'un club ----------------------------------------
  if (selected) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button
            type="button" onClick={back}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "#9B7FFF", fontSize: 14, fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 6, padding: 6,
            }}
          >
            <i className="fi fi-rr-arrow-left" /> Mes clubs
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <h2 className="page-title">
            <i className="fi fi-rr-marker" /> {selected.name}
          </h2>
          {canManage() && (
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                type="button" onClick={openCreate}
                style={{
                  background: "linear-gradient(135deg, #7B5CFF, #5B3FE0)",
                  color: "#fff", border: "none",
                  padding: "10px 18px", borderRadius: 100, cursor: "pointer",
                  fontSize: 13, fontWeight: 600, fontFamily: "inherit", letterSpacing: 0.3,
                  display: "inline-flex", alignItems: "center", gap: 8,
                  boxShadow: "0 4px 18px rgba(123,92,255,0.4)",
                }}>
                <i className="fi fi-rr-user-add" /> Nouveau joueur
              </button>
              <button
                type="button" onClick={openAttach}
                style={{
                  background: "transparent", color: "#9B7FFF",
                  border: "1.5px solid rgba(123,92,255,0.5)",
                  padding: "10px 18px", borderRadius: 100, cursor: "pointer",
                  fontSize: 13, fontWeight: 600, fontFamily: "inherit", letterSpacing: 0.3,
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}>
                <i className="fi fi-rr-link" /> Rattacher un joueur
              </button>
            </div>
          )}
        </div>

        <p style={{ color: "#8A92B2", fontSize: 13, marginBottom: 20 }}>
          {loadingMembers
            ? "Chargement des membres…"
            : <><strong>{members.length}</strong> joueur{members.length > 1 ? "s" : ""} dans ce club.</>}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {members.map((p, idx) => (
            <div key={p.id} className="card" style={{
              padding: 0, overflow: "hidden", marginBottom: 0,
              display: "flex", flexDirection: "column",
            }}>
              <div style={{
                background: idx === 0
                  ? "linear-gradient(135deg, #FACC15 0%, #F59E0B 100%)"
                  : "linear-gradient(135deg, #5B3FE0 0%, #7B5CFF 50%, #3B82F6 100%)",
                color: "#fff",
                padding: "16px 20px",
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <Avatar
                  userId={p.userId}
                  name={p.name}
                  size={50}
                  version={avatarVersion()}
                  border
                  bg="rgba(255,255,255,0.18)"
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>
                    {p.name}
                    {idx === 0 && <i className="fi fi-sr-crown" style={{ marginLeft: 6, fontSize: 13 }} />}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Rang #{idx + 1}</div>
                </div>
              </div>
              <div style={{ padding: "14px 20px", flex: 1 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  paddingBottom: 10, borderBottom: "1px solid rgba(123,92,255,0.15)",
                }}>
                  <span style={{ fontSize: 10, color: "#8A92B2", textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>Elo</span>
                  <span style={{
                    fontFamily: "Inter, sans-serif", fontWeight: 800,
                    fontSize: 28, color: "#9B7FFF", letterSpacing: -1,
                  }}>{p.elo}</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <span style={{ fontSize: 10, color: "#8A92B2", textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>Club principal</span>
                  <div style={{ fontSize: 13, marginTop: 3, color: "#fff" }}>
                    {p.primaryClubName}
                    {p.primaryClubId === selected.id && (
                      <span style={{
                        marginLeft: 6, fontSize: 10, padding: "1px 6px", borderRadius: 100,
                        background: "rgba(250,204,21,0.18)", color: "#FACC15", fontWeight: 600,
                      }}>ICI</span>
                    )}
                  </div>
                </div>
                {p.clubs && p.clubs.length > 1 && (
                  <div style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 10, color: "#8A92B2", textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>Aussi dans</span>
                    <div style={{ marginTop: 4 }}>
                      {p.clubs.filter(c => c.name !== p.primaryClubName).map(c => (
                        <span key={c.id} style={{
                          display: "inline-block", margin: "2px 4px 2px 0",
                          padding: "2px 8px", background: "rgba(123,92,255,0.18)",
                          borderRadius: 100, fontSize: 11, color: "#9B7FFF", fontWeight: 600,
                        }}>{c.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action détacher (admin/gérant + non-primary) */}
                {canManage() && p.primaryClubId !== selected.id && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(123,92,255,0.15)" }}>
                    <button
                      type="button" onClick={() => detach(p)}
                      style={{
                        width: "100%", background: "transparent", color: "#F87171",
                        border: "1px solid rgba(239,68,68,0.5)", padding: "6px 10px", borderRadius: 100,
                        cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}>
                      <i className="fi fi-rr-link-slash" /> Détacher du club
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {!loadingMembers && members.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 30, color: "#8A92B2" }}>
            Aucun joueur dans ce club pour le moment.
            {canManage() && <><br /><br />Utilise les boutons ci-dessus pour ajouter le premier joueur.</>}
          </div>
        )}

        {/* Popup création joueur */}
        <Popup
          visible={createPopup}
          onHiding={() => setCreatePopup(false)}
          hideOnOutsideClick
          title={`Nouveau joueur — ${selected.name}`}
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
              editorOptions={{ mode: "password", placeholder: "Mot de passe initial" }}
              isRequired
            >
              <Label text="Mot de passe initial" />
            </SimpleItem>
          </Form>
          <p style={{ fontSize: 12, color: "#8A92B2", marginTop: 10 }}>
            Le joueur sera créé avec <strong>{selected.name}</strong> comme club principal.
          </p>
          <div style={{ marginTop: 16, textAlign: "right", display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button text="Annuler" onClick={() => setCreatePopup(false)} />
            <Button text="Créer" type="default" icon="save" onClick={handleCreate} />
          </div>
        </Popup>

        {/* Popup rattachement */}
        <Popup
          visible={attachPopup}
          onHiding={() => setAttachPopup(false)}
          hideOnOutsideClick
          title={`Rattacher un joueur — ${selected.name}`}
          width={460}
          height={300}
        >
          <Form formData={attachForm} labelLocation="top">
            <SimpleItem
              dataField="playerId"
              editorType="dxSelectBox"
              editorOptions={{
                dataSource: allPlayers, valueExpr: "id",
                displayExpr: (p) => p && `${p.name} (${p.primaryClubName} — Elo ${p.elo})`,
                searchEnabled: true,
                placeholder: "Rechercher un joueur",
                noDataText: "Aucun joueur disponible",
              }}
              isRequired
            >
              <Label text="Joueur" />
            </SimpleItem>
          </Form>
          <div style={{ marginTop: 16, textAlign: "right", display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button text="Annuler" onClick={() => setAttachPopup(false)} />
            <Button text="Rattacher" type="default" icon="link" onClick={handleAttach} />
          </div>
        </Popup>
      </div>
    );
  }

  // ----- Vue liste des clubs --------------------------------------------
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: 20, flexWrap: "wrap",
      }}>
        <h2 className="page-title">
          <i className="fi fi-rr-marker" /> Mes clubs
        </h2>
        {canManage() && (
          <button
            type="button" onClick={openNewClub}
            style={{
              background: "#9B7FFF", color: "#fff", border: "none",
              padding: "10px 18px", borderRadius: 100, cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit", letterSpacing: 0.3,
              display: "inline-flex", alignItems: "center", gap: 8, marginTop: 4,
            }}>
            <i className="fi fi-rr-plus" /> Nouveau club
          </button>
        )}
      </div>

      <p style={{ color: "#8A92B2", fontSize: 13, marginBottom: 20 }}>
        Sélectionne un club pour voir ses membres
        {canManage() && " et les gérer"}.
      </p>

      {clubs.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 30, color: "#8A92B2" }}>
          Tu n'es lié à aucun club. Demande à un gérant de te rattacher.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {clubs.map((c) => (
          <div
            key={c.id}
            className="card"
            onClick={() => openClub(c)}
            style={{
              cursor: "pointer", padding: 0, overflow: "hidden", marginBottom: 0,
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 12px 24px rgba(15,76,53,0.18)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
            }}
          >
            <div style={{
              background: "linear-gradient(135deg, #5B3FE0, #7B5CFF)",
              color: "#fff", padding: "30px 20px", textAlign: "center",
            }}>
              <i className="fi fi-sr-marker" style={{
                fontSize: 36, color: "#FACC15", display: "block", marginBottom: 10,
              }} />
              <div style={{
                fontFamily: "Inter, sans-serif", fontWeight: 800,
                fontVariationSettings: '"opsz" 144,"SOFT" 40,"wght" 400',
                fontSize: 24, letterSpacing: -0.5,
              }}>
                {c.name}
              </div>
            </div>
            <div style={{
              padding: "12px 20px", display: "flex", justifyContent: "space-between",
              alignItems: "center", color: "#8A92B2", fontSize: 13,
            }}>
              <span>{canManage() ? "Voir et gérer" : "Voir les membres"}</span>
              <i className="fi fi-rr-angle-right" />
            </div>
          </div>
        ))}
      </div>

      {/* Popup création club */}
      <Popup
        visible={newClubPopup}
        onHiding={() => setNewClubPopup(false)}
        hideOnOutsideClick
        title="Nouveau club"
        width={420}
        height={280}
      >
        <Form formData={newClubForm} labelLocation="top">
          <SimpleItem
            dataField="name"
            isRequired
            editorOptions={{ placeholder: "Ex. Bordeaux Centre" }}
          >
            <Label text="Nom du club" />
          </SimpleItem>
        </Form>
        <p style={{ fontSize: 12, color: "#8A92B2", marginTop: 12 }}>
          Tu seras automatiquement gérant de ce nouveau club.
        </p>
        <div style={{ marginTop: 16, textAlign: "right", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button text="Annuler" onClick={() => setNewClubPopup(false)} />
          <Button text="Créer" type="default" icon="save" onClick={handleNewClub} />
        </div>
      </Popup>
    </div>
  );
}
