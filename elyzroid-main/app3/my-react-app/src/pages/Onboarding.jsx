import { useMemo, useState } from "react";
import { IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonPage, IonText, IonTitle, IonToolbar, IonCheckbox } from "@ionic/react";

export default function Onboarding({ onComplete }) {
  const [mode, setMode] = useState("register"); // register | login
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const canSubmit = useMemo(() => {
    if (!consent) return false;
    if (!form.email || !form.password) return false;
    if (mode === "register" && !form.name) return false;
    return true;
  }, [consent, form.email, form.password, form.name, mode]);

  const submit = () => {
    if (!canSubmit) return;
    const user = {
      name: mode === "register" ? form.name : form.email.split("@")[0],
      email: form.email,
      joined: new Date().toLocaleDateString(),
    };
    onComplete(user);
  };

  return (
    <IonPage className="ely-bg-grid">
      <IonHeader>
        <IonToolbar color="transparent">
          <IonTitle style={{ letterSpacing: "0.22em", fontWeight: 800 }}>ELYZORID</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="ely-layer" style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginTop: 10, marginBottom: 14 }}>
            <IonText color="medium">
              <div style={{ letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12 }}>Android Security Intelligence</div>
            </IonText>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <IonButton expand="block" fill={mode === "login" ? "solid" : "outline"} onClick={() => setMode("login")} style={{ flex: 1 }}>
              Login
            </IonButton>
            <IonButton expand="block" fill={mode === "register" ? "solid" : "outline"} onClick={() => setMode("register")} style={{ flex: 1 }}>
              Register
            </IonButton>
          </div>

          <IonCard className="ely-card">
            <IonCardContent>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>{mode === "login" ? "Welcome back" : "Create account"}</div>

              {mode === "register" && (
                <IonItem lines="full">
                  <IonLabel position="stacked">Full Name</IonLabel>
                  <IonInput value={form.name} onIonInput={(e) => setForm((f) => ({ ...f, name: e.detail.value || "" }))} placeholder="Jane Doe" />
                </IonItem>
              )}

              <IonItem lines="full">
                <IonLabel position="stacked">Email</IonLabel>
                <IonInput value={form.email} onIonInput={(e) => setForm((f) => ({ ...f, email: e.detail.value || "" }))} placeholder="you@example.com" inputMode="email" />
              </IonItem>

              <IonItem lines="full">
                <IonLabel position="stacked">Password</IonLabel>
                <IonInput value={form.password} onIonInput={(e) => setForm((f) => ({ ...f, password: e.detail.value || "" }))} placeholder="••••••••" type="password" />
              </IonItem>

              <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "var(--ely-surface2)", border: "1px solid var(--ely-border)" }}>
                <IonText color="medium">
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                    By using Elyzorid you accept the Terms & Conditions and Privacy Policy, and consent to scanning/monitoring (apps, permissions, files metadata, local VPN traffic filtering, notifications, clipboard)
                    to generate vulnerability reports. This is stored locally on your device/build.
                  </div>
                </IonText>

                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 10 }}>
                  <IonCheckbox checked={consent} onIonChange={(e) => setConsent(e.detail.checked)} />
                  <IonText color="medium">
                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>I accept and consent (single checkbox).</div>
                  </IonText>
                </div>
              </div>

              <IonButton expand="block" style={{ marginTop: 14 }} disabled={!canSubmit} onClick={submit}>
                {mode === "login" ? "Sign In & Continue" : "Create Account & Continue"}
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
}

