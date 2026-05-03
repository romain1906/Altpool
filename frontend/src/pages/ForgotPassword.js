import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Form, { SimpleItem, ButtonItem, Label } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import { forgotPassword } from "../services/auth";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [data] = useState({ username: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await forgotPassword(data.username);
      notify(
        "Demande envoyée. Un gérant de votre club traitera la demande.",
        "success",
        4000
      );
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      notify(err.response?.data?.message || "Erreur", "error", 3000);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="brand-stack">
          <img src="/logo-icon.png" alt="AltPool" />
          <div className="wordmark">Alt<span>Pool</span></div>
        </div>
        <h2>Mot de passe oublié</h2>
        <p style={{ textAlign: "center", color: "#8A92B2", fontSize: 13, marginBottom: 16 }}>
          Saisis ton nom d'utilisateur. Un gérant d'un de tes clubs sera notifié
          et te remettra un nouveau mot de passe en main propre.
        </p>
        <form onSubmit={handleSubmit}>
          <Form formData={data} labelLocation="top">
            <SimpleItem dataField="username" isRequired>
              <Label text="Nom d'utilisateur" />
            </SimpleItem>
            <ButtonItem
              horizontalAlignment="center"
              buttonOptions={{
                text: "Envoyer la demande",
                type: "default",
                useSubmitBehavior: true,
                icon: "email",
              }}
            />
          </Form>
        </form>
        <p style={{ marginTop: 16, textAlign: "center", fontSize: 13 }}>
          <Link to="/login">← Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}
