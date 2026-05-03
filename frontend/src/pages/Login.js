import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Form, { SimpleItem, ButtonItem, Label } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import { login } from "../services/auth";

export default function Login() {
  const navigate = useNavigate();
  const [data] = useState({ username: "", password: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(data.username, data.password);
      navigate("/leaderboard");
    } catch (err) {
      notify(err.response?.data?.message || "Échec de la connexion", "error", 3000);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="brand-stack">
          <img src="/logo-icon.png" alt="AltPool" />
          <div className="wordmark">Alt<span>Pool</span></div>
        </div>
        <h2>Connexion</h2>
        <form onSubmit={handleSubmit}>
          <Form formData={data} labelLocation="top" colCount={1}>
            <SimpleItem dataField="username" isRequired>
              <Label text="Nom d'utilisateur" />
            </SimpleItem>
            <SimpleItem
              dataField="password"
              editorType="dxTextBox"
              editorOptions={{ mode: "password" }}
              isRequired
            >
              <Label text="Mot de passe" />
            </SimpleItem>
            <ButtonItem
              horizontalAlignment="center"
              buttonOptions={{
                text: "Se connecter",
                type: "default",
                useSubmitBehavior: true,
                icon: "user",
              }}
            />
          </Form>
        </form>
        <p style={{ marginTop: 16, textAlign: "center", fontSize: 13 }}>
          <Link to="/forgot-password">Mot de passe oublié ?</Link>
        </p>
      </div>
    </div>
  );
}
