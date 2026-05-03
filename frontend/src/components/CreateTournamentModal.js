import React, { useEffect, useState } from "react";
import Popup from "devextreme-react/popup";
import notify from "devextreme/ui/notify";
import api from "../services/api";

const TYPE_OPTIONS = [
  { v: "POOL_AND_BRACKET", l: "Poules + bracket", desc: "Phase de poules puis élimination directe" },
  { v: "BRACKET_ONLY",     l: "Élimination directe", desc: "Bracket simple (pas de poules)" },
  { v: "POOL_ONLY",        l: "Poules uniquement", desc: "Round robin, classement par points" },
];
const FORMATS = [1, 3, 5, 7];

export default function CreateTournamentModal({ visible, onClose, onCreated }) {
  const [clubs, setClubs] = useState([]);
  const [form, setForm] = useState(initialForm());

  function initialForm() {
    return {
      name: "",
      description: "",
      clubId: null,
      type: "POOL_AND_BRACKET",
      ranked: true,
      poolBestOf: 1,
      bracketBestOf: 3,
      finalBestOf: 5,
      poolSize: 4,
      qualifiersPerPool: 2,
      maxParticipants: null,
      matchDeadlineHours: 48,
      registrationDeadline: defaultDeadline(7),
      startsAt: defaultDeadline(8),
    };
  }
  function defaultDeadline(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16); // datetime-local
  }

  useEffect(() => {
    if (!visible) return;
    setForm(initialForm());
    api.get("/users/me/clubs")
       .then((r) => {
         setClubs(r.data);
         if (r.data.length === 1) {
           setForm((f) => ({ ...f, clubId: r.data[0].id }));
         }
       })
       .catch(() => {});
  }, [visible]);

  const isPool = form.type === "POOL_AND_BRACKET" || form.type === "POOL_ONLY";
  const hasBracket = form.type === "POOL_AND_BRACKET" || form.type === "BRACKET_ONLY";

  const submit = async () => {
    if (!form.name?.trim()) { notify("Nom requis", "error", 2500); return; }
    if (!form.clubId) { notify("Club requis", "error", 2500); return; }
    if (!form.registrationDeadline) { notify("Deadline d'inscription requise", "error", 2500); return; }
    try {
      const payload = {
        ...form,
        registrationDeadline: form.registrationDeadline,  // backend sait parser ISO local
        startsAt: form.startsAt || null,
      };
      const { data } = await api.post("/tournaments", payload);
      notify(`Tournoi "${data.name}" créé`, "success", 2500);
      onCreated?.(data);
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  return (
    <Popup
      visible={visible}
      onHiding={onClose}
      hideOnOutsideClick
      title="Nouveau tournoi"
      width={640}
      height={760}
    >
      <div style={{ overflow: "auto", maxHeight: "100%", paddingRight: 4 }}>

        <Section label="Identité">
          <Field label="Nom du tournoi *" >
            <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
              placeholder="Ex. Coupe d'été Paris" style={inputStyle} />
          </Field>
          <Field label="Description (optionnel)">
            <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
              rows={2} style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
          <Field label="Club organisateur *">
            {clubs.length === 0 ? (
              <div style={{
                padding: "10px 14px", borderRadius: 6,
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)",
                color: "#FCA5A5", fontSize: 12,
              }}>
                <i className="fi fi-rr-exclamation" /> &nbsp;
                Tu ne gères aucun club. Demande à un admin de te rattacher à au moins
                un club via <strong>Administration → Utilisateurs</strong>.
              </div>
            ) : (
              <select value={form.clubId || ""} onChange={(e) => setForm({...form, clubId: e.target.value ? Number(e.target.value) : null})}
                style={inputStyle}>
                <option value="">Choisis un club</option>
                {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </Field>
        </Section>

        <Section label="Format">
          <Field label="Type de tournoi">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {TYPE_OPTIONS.map((o) => (
                <button key={o.v} type="button"
                  onClick={() => setForm({...form, type: o.v})}
                  style={{
                    padding: "10px 14px", borderRadius: 8, textAlign: "left",
                    background: form.type === o.v ? "rgba(123,92,255,0.2)" : "rgba(123,92,255,0.06)",
                    color: form.type === o.v ? "#fff" : "#C9D1FF",
                    border: form.type === o.v ? "1px solid #7B5CFF" : "1px solid #2A3050",
                    cursor: "pointer", fontFamily: "inherit",
                  }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{o.l}</div>
                  <div style={{ fontSize: 11, color: "#8A92B2", marginTop: 2 }}>{o.desc}</div>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Tournoi classé (impacte l'Elo) ?">
            <button type="button"
              onClick={() => setForm({...form, ranked: !form.ranked})}
              style={{
                padding: "10px 18px", borderRadius: 100,
                background: form.ranked ? "#FACC15" : "rgba(138,146,178,0.2)",
                color: form.ranked ? "#0B0F2A" : "#8A92B2",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 13, fontWeight: 700, letterSpacing: 0.3,
              }}>
              {form.ranked ? "🏆 Classé" : "Amical"}
            </button>
          </Field>
        </Section>

        <Section label="Format des matchs">
          {isPool && (
            <Field label={`En poule : BO${form.poolBestOf}`}>
              <FormatPicker value={form.poolBestOf} onChange={(v) => setForm({...form, poolBestOf: v})} />
            </Field>
          )}
          {hasBracket && (
            <>
              <Field label={`En bracket : BO${form.bracketBestOf}`}>
                <FormatPicker value={form.bracketBestOf} onChange={(v) => setForm({...form, bracketBestOf: v})} />
              </Field>
              <Field label={`Finale : BO${form.finalBestOf}`}>
                <FormatPicker value={form.finalBestOf} onChange={(v) => setForm({...form, finalBestOf: v})} />
              </Field>
            </>
          )}
        </Section>

        {isPool && (
          <Section label="Configuration des poules">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Joueurs par poule">
                <input type="number" min="3" max="8" value={form.poolSize}
                  onChange={(e) => setForm({...form, poolSize: Number(e.target.value)})}
                  style={inputStyle} />
              </Field>
              {form.type === "POOL_AND_BRACKET" && (
                <Field label="Qualifiés / poule">
                  <input type="number" min="1" max={form.poolSize - 1} value={form.qualifiersPerPool}
                    onChange={(e) => setForm({...form, qualifiersPerPool: Number(e.target.value)})}
                    style={inputStyle} />
                </Field>
              )}
            </div>
          </Section>
        )}

        <Section label="Dates et limites">
          <Field label="Deadline d'inscription *">
            <input type="datetime-local" value={form.registrationDeadline}
              onChange={(e) => setForm({...form, registrationDeadline: e.target.value})}
              style={inputStyle} />
          </Field>
          <Field label="Démarrage prévu (optionnel)">
            <input type="datetime-local" value={form.startsAt || ""}
              onChange={(e) => setForm({...form, startsAt: e.target.value})}
              style={inputStyle} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Max participants (vide = illimité)">
              <input type="number" min="2" value={form.maxParticipants || ""}
                onChange={(e) => setForm({...form, maxParticipants: e.target.value ? Number(e.target.value) : null})}
                style={inputStyle} />
            </Field>
            <Field label="Délai par match (heures)">
              <input type="number" min="1" value={form.matchDeadlineHours || ""}
                onChange={(e) => setForm({...form, matchDeadlineHours: e.target.value ? Number(e.target.value) : null})}
                style={inputStyle} />
            </Field>
          </div>
        </Section>

        <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={btnGhost}>Annuler</button>
          <button type="button" onClick={submit} style={btnPrimary}>
            <i className="fi fi-rr-trophy" /> &nbsp;Créer le tournoi
          </button>
        </div>

      </div>
    </Popup>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 2.5,
        textTransform: "uppercase", color: "#9B7FFF", marginBottom: 10,
        borderBottom: "1px solid #2A3050", paddingBottom: 6,
      }}>{label}</div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "#8A92B2",
        marginBottom: 5, textTransform: "uppercase",
      }}>{label}</div>
      {children}
    </div>
  );
}

function FormatPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {FORMATS.map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 100,
            background: value === n ? "#7B5CFF" : "rgba(123,92,255,0.1)",
            color: value === n ? "#fff" : "#9B7FFF",
            border: "none", cursor: "pointer",
            fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700,
          }}>
          BO{n}
        </button>
      ))}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 12px", fontSize: 13,
  border: "1px solid #2A3050", borderRadius: 6,
  background: "#1A1F3D", color: "#fff", fontFamily: "inherit",
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
