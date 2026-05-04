import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import Popup from "devextreme-react/popup";
import Button from "devextreme-react/button";
import Form, { SimpleItem, Label } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import api from "../services/api";
import Avatar from "../components/Avatar";
import { avatarVersion, bumpAvatarVersion } from "../services/auth";

const ROLE_LABEL = { ADMIN: "Administrateur", GERANT: "Gérant", JOUEUR: "Joueur" };
const ROLE_COLOR = {
  ADMIN:  { bg: "rgba(239,68,68,0.18)",  fg: "#F87171" },
  GERANT: { bg: "rgba(250,204,21,0.18)", fg: "#FACC15" },
  JOUEUR: { bg: "rgba(123,92,255,0.22)", fg: "#9B7FFF" },
};

export default function Profile() {
  const [me, setMe] = useState(null);
  const [editName, setEditName] = useState("");
  const [pwdPopup, setPwdPopup] = useState(false);
  const [pwdForm, setPwdForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [avatarV, setAvatarV] = useState(avatarVersion());
  const fileRef = useRef(null);
  const [perso, setPerso] = useState({ email: "", birthDate: "", gender: "", phone: "", country: "" });

  const load = useCallback(() => {
    api.get("/users/me")
       .then((r) => {
         setMe(r.data);
         setEditName(r.data.playerName || "");
         setPerso({
           email: r.data.email || "",
           birthDate: r.data.birthDate || "",
           gender: r.data.gender || "",
           phone: r.data.phone || "",
           country: r.data.country || "",
         });
       })
       .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirty = me?.role === "JOUEUR" && (editName.trim() !== (me?.playerName || ""));

  const saveProfile = async () => {
    if (!dirty) return;
    if (editName.trim().length === 0) {
      notify("Le nom ne peut pas être vide", "error", 2500);
      return;
    }
    try {
      const { data } = await api.patch("/users/me", { playerName: editName.trim() });
      setMe(data);
      setEditName(data.playerName || "");
      notify("Profil mis à jour", "success", 2000);
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  const savePerso = async () => {
    if (!perso.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(perso.email.trim())) {
      notify("Email invalide", "error", 2500); return;
    }
    if (!perso.birthDate) { notify("Date de naissance requise", "error", 2500); return; }
    if (!perso.gender) { notify("Genre requis", "error", 2500); return; }
    try {
      const wasComplete = me?.profileComplete;
      const { data } = await api.patch("/users/me", {
        email: perso.email.trim(),
        birthDate: perso.birthDate,
        gender: perso.gender,
        phone: perso.phone?.trim() || null,
        country: perso.country?.trim() || null,
      });
      setMe(data);
      setPerso({
        email: data.email || "",
        birthDate: data.birthDate || "",
        gender: data.gender || "",
        phone: data.phone || "",
        country: data.country || "",
      });
      if (data.profileComplete && !wasComplete) {
        notify("🎉 Profil complet — tu peux maintenant jouer !", "success", 4000);
        // Notifie la sidebar pour rafraîchir le badge
        window.dispatchEvent(new CustomEvent("altpool:profile-changed"));
      } else {
        notify("Informations enregistrées", "success", 2000);
      }
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  const submitPassword = async () => {
    if (!pwdForm.oldPassword || !pwdForm.newPassword) {
      notify("Renseigne tous les champs", "error", 2500);
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      notify("Les deux nouveaux mots de passe ne correspondent pas", "error", 3000);
      return;
    }
    if (pwdForm.newPassword.length < 3) {
      notify("Mot de passe trop court (min 3 caractères)", "error", 2500);
      return;
    }
    try {
      await api.post("/users/me/password", {
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword,
      });
      notify("Mot de passe modifié", "success", 2500);
      setPwdPopup(false);
      setPwdForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  const onPickFile = () => fileRef.current?.click();

  const onUploadFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset pour pouvoir re-uploader le même
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      notify("Le fichier doit être une image", "error", 2500);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      notify("Image trop volumineuse (max 2 Mo)", "error", 2500);
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post("/users/me/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAvatarV(bumpAvatarVersion());
      notify("Photo de profil mise à jour", "success", 2000);
    } catch (err) {
      notify(err.response?.data?.message || "Erreur d'upload", "error", 3000);
    }
  };

  const onDeleteAvatar = async () => {
    if (!window.confirm("Supprimer ta photo de profil ?")) return;
    try {
      await api.delete("/users/me/avatar");
      setAvatarV(bumpAvatarVersion());
      notify("Photo de profil supprimée", "success", 2000);
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  if (!me) {
    return (
      <div>
        <h2 className="page-title"><i className="fi fi-rr-user" /> Mon profil</h2>
        <div className="card" style={{ textAlign: "center", color: "#8A92B2" }}>Chargement…</div>
      </div>
    );
  }

  const roleStyle = ROLE_COLOR[me.role] || ROLE_COLOR.JOUEUR;
  const initials = ((me.playerName || me.username || "?").charAt(0)).toUpperCase();

  return (
    <div>
      <h2 className="page-title">
        <i className="fi fi-rr-user" /> Mon profil
      </h2>

      {/* ---------- Identité --------------------------------------------- */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{
          background: "linear-gradient(135deg, #5B3FE0 0%, #7B5CFF 50%, #3B82F6 100%)",
          color: "#fff",
          padding: "26px 28px",
          display: "flex", alignItems: "center", gap: 22,
          position: "relative",
        }}>
          <div style={{ position: "relative" }}>
            <Avatar
              userId={me.id}
              name={me.playerName || me.username}
              size={96}
              version={avatarV}
              border
              bg="rgba(255,255,255,0.18)"
            />
            <button
              type="button"
              onClick={onPickFile}
              title="Changer la photo"
              style={{
                position: "absolute", bottom: -4, right: -4,
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #7B5CFF, #5B3FE0)",
                color: "#fff", border: "2px solid #0B0F2A",
                cursor: "pointer", display: "inline-flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 14,
                boxShadow: "0 0 18px rgba(123,92,255,0.6)",
              }}>
              <i className="fi fi-rr-camera" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              style={{ display: "none" }}
              onChange={onUploadFile}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "Inter, sans-serif", fontWeight: 800,
              fontSize: 32, letterSpacing: -0.5, lineHeight: 1.1,
            }}>
              {me.playerName || me.username}
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, opacity: 0.85, marginTop: 6 }}>
              @{me.username}
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{
                background: "rgba(255,255,255,0.18)", color: "#fff",
                padding: "4px 12px", borderRadius: 100,
                fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
                backdropFilter: "blur(8px)",
              }}>
                {ROLE_LABEL[me.role] || me.role}
              </span>
              {me.role === "JOUEUR" && me.elo != null && (
                <span style={{
                  background: "rgba(255,255,255,0.18)", color: "#fff",
                  padding: "4px 12px", borderRadius: 100,
                  fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700,
                  backdropFilter: "blur(8px)",
                }}>
                  Elo {me.elo}
                </span>
              )}
              {me.role === "GERANT" && (
                <span style={{
                  background: "rgba(255,255,255,0.18)", color: "#fff",
                  padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                  backdropFilter: "blur(8px)",
                }}>
                  {me.managedClubs?.length || 0} club{(me.managedClubs?.length || 0) > 1 ? "s" : ""} géré{(me.managedClubs?.length || 0) > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Photo de profil -------------------------------------- */}
      <div className="card">
        <h3 style={{
          margin: "0 0 16px", fontFamily: "Inter, sans-serif",
          fontSize: 11, fontWeight: 600, color: "#8A92B2",
          textTransform: "uppercase", letterSpacing: 2.5,
        }}>
          <i className="fi fi-rr-picture" style={{ color: "#9B7FFF", marginRight: 8 }} />
          Photo de profil
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar
            userId={me.id}
            name={me.playerName || me.username}
            size={64}
            version={avatarV}
          />
          <div style={{ flex: 1, fontSize: 13, color: "#8A92B2" }}>
            PNG, JPG, WEBP ou GIF, 2 Mo max.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button" onClick={onPickFile}
              style={{
                background: "linear-gradient(135deg, #7B5CFF, #5B3FE0)",
                color: "#fff", border: "none",
                padding: "9px 16px", borderRadius: 100, cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 8,
                boxShadow: "0 4px 16px rgba(123,92,255,0.4)",
              }}>
              <i className="fi fi-rr-cloud-upload" /> Changer
            </button>
            <button
              type="button" onClick={onDeleteAvatar}
              style={{
                background: "transparent", color: "#F87171",
                border: "1px solid rgba(239,68,68,0.5)",
                padding: "9px 14px", borderRadius: 100, cursor: "pointer",
                fontSize: 13, fontWeight: 500, fontFamily: "inherit",
              }}>
              Retirer
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Informations modifiables ----------------------------- */}
      {me.role === "JOUEUR" && (
        <div className="card">
          <h3 style={{
            margin: "0 0 16px", fontFamily: "Inter, sans-serif",
            fontSize: 11, fontWeight: 600, color: "#8A92B2",
            textTransform: "uppercase", letterSpacing: 2.5,
          }}>
            <i className="fi fi-rr-edit" style={{ color: "#9B7FFF", marginRight: 8 }} />
            Informations
          </h3>
          <label style={{
            display: "block", fontSize: 11, fontWeight: 500,
            textTransform: "uppercase", letterSpacing: 1.5, color: "#8A92B2", marginBottom: 6,
          }}>
            Nom affiché (sur le classement, les matchs…)
          </label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            style={{
              width: "100%", padding: "12px 14px", fontSize: 15,
              border: "1px solid rgba(123,92,255,0.25)", borderRadius: 8,
              fontFamily: "inherit",
              background: "rgba(255,255,255,0.04)",
              color: "#fff",
              outline: "none",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#7B5CFF"; e.target.style.boxShadow = "0 0 0 3px rgba(123,92,255,0.15)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(123,92,255,0.25)"; e.target.style.boxShadow = "none"; }}
          />
          <p style={{ marginTop: 10, fontSize: 12, color: "#8A92B2" }}>
            Ton identifiant <code style={{ fontFamily: "JetBrains Mono, monospace", color: "#C9D1FF" }}>@{me.username}</code> ne peut pas être modifié.
          </p>
          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={saveProfile}
              disabled={!dirty}
              style={{
                background: dirty ? "linear-gradient(135deg, #7B5CFF, #5B3FE0)" : "rgba(255,255,255,0.06)",
                color: dirty ? "#fff" : "#8A92B2",
                border: "none",
                padding: "10px 20px", borderRadius: 100,
                cursor: dirty ? "pointer" : "not-allowed",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 8,
                transition: "all 0.2s",
                boxShadow: dirty ? "0 4px 18px rgba(123,92,255,0.4)" : "none",
              }}
            >
              <i className="fi fi-rr-disk" /> Enregistrer
            </button>
            {dirty && (
              <button
                type="button"
                onClick={() => setEditName(me.playerName || "")}
                style={{
                  background: "transparent", color: "#C9D1FF",
                  border: "1px solid rgba(123,92,255,0.3)",
                  padding: "10px 20px", borderRadius: 100, cursor: "pointer",
                  fontSize: 13, fontWeight: 500, fontFamily: "inherit",
                }}
              >
                Annuler
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---------- Informations personnelles ---------------------------- */}
      <PersoSection me={me} perso={perso} setPerso={setPerso} onSave={savePerso} />

      {/* ---------- Sécurité --------------------------------------------- */}
      <div className="card">
        <h3 style={{
          margin: "0 0 16px", fontFamily: "Inter, sans-serif",
          fontSize: 11, fontWeight: 600, color: "#8A92B2",
          textTransform: "uppercase", letterSpacing: 2.5,
        }}>
          <i className="fi fi-rr-lock" style={{ color: "#9B7FFF", marginRight: 8 }} />
          Sécurité
        </h3>
        <p style={{ margin: 0, color: "#C9D1FF", fontSize: 14 }}>
          Mot de passe : <code style={{ fontFamily: "JetBrains Mono, monospace", color: "#fff" }}>••••••••</code>
        </p>
        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={() => setPwdPopup(true)}
            style={{
              background: "linear-gradient(135deg, #7B5CFF, #5B3FE0)",
              color: "#fff", border: "none",
              padding: "10px 20px", borderRadius: 100, cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 18px rgba(123,92,255,0.4)",
            }}
          >
            <i className="fi fi-rr-key" /> Changer mon mot de passe
          </button>
        </div>
      </div>

      {/* ---------- Mes clubs -------------------------------------------- */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{
            margin: 0, fontFamily: "Inter, sans-serif",
            fontSize: 11, fontWeight: 600, color: "#8A92B2",
            textTransform: "uppercase", letterSpacing: 2.5,
          }}>
            <i className="fi fi-rr-marker" style={{ color: "#9B7FFF", marginRight: 8 }} />
            {me.role === "GERANT" ? "Clubs gérés" : me.role === "JOUEUR" ? "Mes clubs" : "Tous les clubs"}
          </h3>
          <Link to="/my-clubs" style={{
            color: "#9B7FFF", fontSize: 12, textDecoration: "none", fontWeight: 600,
          }}>
            Voir et gérer →
          </Link>
        </div>
        <ClubsRow user={me} />
      </div>

      {/* ---------- Popup mdp -------------------------------------------- */}
      <Popup
        visible={pwdPopup}
        onHiding={() => setPwdPopup(false)}
        hideOnOutsideClick
        title="Changer mon mot de passe"
        width={460}
        height={420}
      >
        <Form formData={pwdForm} labelLocation="top">
          <SimpleItem
            dataField="oldPassword"
            editorType="dxTextBox"
            editorOptions={{ mode: "password", placeholder: "Mot de passe actuel" }}
            isRequired
          >
            <Label text="Mot de passe actuel" />
          </SimpleItem>
          <SimpleItem
            dataField="newPassword"
            editorType="dxTextBox"
            editorOptions={{ mode: "password", placeholder: "Nouveau mot de passe" }}
            isRequired
          >
            <Label text="Nouveau mot de passe" />
          </SimpleItem>
          <SimpleItem
            dataField="confirmPassword"
            editorType="dxTextBox"
            editorOptions={{ mode: "password", placeholder: "Confirmer le nouveau mdp", onEnterKey: submitPassword }}
            isRequired
          >
            <Label text="Confirmation" />
          </SimpleItem>
        </Form>
        <div style={{ marginTop: 16, textAlign: "right", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button text="Annuler" onClick={() => setPwdPopup(false)} />
          <Button text="Modifier" type="default" icon="key" onClick={submitPassword} />
        </div>
      </Popup>
    </div>
  );
}

function ClubsRow({ user }) {
  const list = user.role === "JOUEUR"
    ? (user.playerClubs || [])
    : user.role === "GERANT"
      ? (user.managedClubs || [])
      : null;

  if (user.role === "ADMIN") {
    return (
      <p style={{ margin: 0, color: "#8A92B2", fontSize: 13 }}>
        En tant qu'administrateur, tu as accès à tous les clubs de la plateforme.
      </p>
    );
  }

  if (!list || list.length === 0) {
    return (
      <p style={{ margin: 0, color: "#8A92B2", fontStyle: "italic", fontSize: 13 }}>
        Tu n'es lié à aucun club pour le moment.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {list.map((c) => {
        const isPrimary = user.role === "JOUEUR" && user.primaryClubId === c.id;
        return (
          <span key={c.id} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 100,
            background: user.role === "GERANT" ? "rgba(250,204,21,0.15)" : "rgba(123,92,255,0.18)",
            color: user.role === "GERANT" ? "#FACC15" : "#9B7FFF",
            border: "1px solid " + (user.role === "GERANT" ? "rgba(250,204,21,0.3)" : "rgba(123,92,255,0.35)"),
            fontSize: 13, fontWeight: 600,
          }}>
            {isPrimary && <i className="fi fi-sr-star" style={{ color: "#FACC15", fontSize: 10 }} />}
            {c.name}
          </span>
        );
      })}
    </div>
  );
}

// =====================================================================
//  Section Informations personnelles
// =====================================================================

const GENDER_OPTIONS = [
  { v: "MALE",          l: "Homme" },
  { v: "FEMALE",        l: "Femme" },
  { v: "OTHER",         l: "Autre" },
  { v: "NOT_SPECIFIED", l: "Préfère ne pas dire" },
];

function PersoSection({ me, perso, setPerso, onSave }) {
  const requiredFilled =
    !!perso.email?.trim() &&
    !!perso.birthDate &&
    !!perso.gender && perso.gender !== "NOT_SPECIFIED";
  const completedCount = [
    !!perso.email?.trim(),
    !!perso.birthDate,
    !!perso.gender && perso.gender !== "NOT_SPECIFIED",
  ].filter(Boolean).length;

  const isComplete = me?.profileComplete;
  const showWarning = me?.role === "JOUEUR" && !isComplete;

  return (
    <div className="card" style={
      showWarning
        ? { border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.04)" }
        : undefined
    }>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{
          margin: 0, fontFamily: "Inter, sans-serif",
          fontSize: 11, fontWeight: 600, color: "#8A92B2",
          textTransform: "uppercase", letterSpacing: 2.5,
        }}>
          <i className="fi fi-rr-user" style={{ color: "#7B5CFF", marginRight: 8 }} />
          Informations personnelles
        </h3>
        {me?.role === "JOUEUR" && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100,
            background: isComplete ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
            color: isComplete ? "#22C55E" : "#F87171",
          }}>
            {isComplete ? "✓ Profil complet" : `${completedCount}/3 champs requis`}
          </span>
        )}
      </div>

      {showWarning && (
        <div style={{
          padding: "10px 14px", borderRadius: 6, marginBottom: 14,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          color: "#FCA5A5", fontSize: 12,
        }}>
          <i className="fi fi-rr-exclamation" /> &nbsp;
          Tant que ton profil n'est pas complet, tu ne peux pas créer de match,
          t'inscrire à un tournoi ou réserver une table. Renseigne au minimum ton
          email, ta date de naissance et ton genre.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Email *" required={!perso.email?.trim()}>
          <input type="email" value={perso.email}
            onChange={(e) => setPerso({...perso, email: e.target.value})}
            placeholder="ex. jean@example.com" style={persoInput} />
        </Field>
        <Field label="Date de naissance *" required={!perso.birthDate}>
          <input type="date" value={perso.birthDate}
            onChange={(e) => setPerso({...perso, birthDate: e.target.value})}
            style={persoInput} />
        </Field>
        <Field label="Genre *" required={!perso.gender || perso.gender === "NOT_SPECIFIED"}>
          <select value={perso.gender}
            onChange={(e) => setPerso({...perso, gender: e.target.value})}
            style={persoInput}>
            <option value="">Choisir…</option>
            {GENDER_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </Field>
        <Field label="Téléphone (optionnel)">
          <input type="tel" value={perso.phone}
            onChange={(e) => setPerso({...perso, phone: e.target.value})}
            placeholder="+33 6 12 34 56 78" style={persoInput} />
        </Field>
        <Field label="Pays (optionnel)">
          <input type="text" value={perso.country}
            onChange={(e) => setPerso({...perso, country: e.target.value})}
            placeholder="France" style={persoInput} />
        </Field>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
        <button type="button" onClick={onSave}
          disabled={!requiredFilled}
          style={{
            background: requiredFilled ? "#7B5CFF" : "rgba(123,92,255,0.3)",
            color: "#fff", border: "none",
            padding: "10px 22px", borderRadius: 100,
            cursor: requiredFilled ? "pointer" : "not-allowed",
            fontSize: 13, fontWeight: 600, fontFamily: "inherit",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
          <i className="fi fi-rr-disk" /> Enregistrer
        </button>
        {!requiredFilled && (
          <span style={{ fontSize: 11, color: "#8A92B2", fontStyle: "italic" }}>
            Remplis les 3 champs requis pour activer
          </span>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
        textTransform: "uppercase", color: required ? "#F87171" : "#8A92B2",
        marginBottom: 5,
      }}>{label}</div>
      {children}
    </div>
  );
}

const persoInput = {
  width: "100%", padding: "9px 12px", fontSize: 13,
  border: "1px solid #2A3050", borderRadius: 6,
  background: "#1A1F3D", color: "#fff", fontFamily: "inherit",
};
