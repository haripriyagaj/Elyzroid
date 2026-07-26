import { IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonText, IonTitle, IonToolbar } from "@ionic/react";

export default function Settings({ user, scansRun, alertsCount, consentAcceptedAt, onResetRegistration }) {
  return (
    <IonPage className="ely-bg-grid">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="ely-layer" style={{ padding: 16 }}>
          <IonCard className="ely-card">
            <IonCardContent>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>My Account</div>
              <IonItem lines="full">
                <IonLabel>
                  <div style={{ color: "var(--ely-text2)", fontSize: 12 }}>Name</div>
                  <div style={{ fontWeight: 800 }}>{user?.name || "—"}</div>
                </IonLabel>
              </IonItem>
              <IonItem lines="full">
                <IonLabel>
                  <div style={{ color: "var(--ely-text2)", fontSize: 12 }}>Email</div>
                  <div style={{ fontWeight: 800 }}>{user?.email || "—"}</div>
                </IonLabel>
              </IonItem>
              <IonItem lines="none">
                <IonLabel>
                  <div style={{ color: "var(--ely-text2)", fontSize: 12 }}>Joined</div>
                  <div style={{ fontWeight: 800 }}>{user?.joined || "—"}</div>
                </IonLabel>
              </IonItem>
            </IonCardContent>
          </IonCard>

          <IonCard className="ely-card">
            <IonCardContent>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>Device Summary</div>
              <IonList>
                {[
                  ["Scans Run", scansRun],
                  ["Alerts Generated", alertsCount],
                  ["Consent Given", consentAcceptedAt ? "✓ Verified" : "—"],
                  ["Consent Timestamp", consentAcceptedAt || "—"],
                  ["App Version", "v1.0.0"],
                ].map(([k, v]) => (
                  <IonItem key={k} lines="full">
                    <IonLabel>
                      <div style={{ color: "var(--ely-text2)", fontSize: 12 }}>{k}</div>
                      <div style={{ fontWeight: 800, color: k === "Consent Given" ? "var(--ely-green)" : "var(--ely-text)" }}>{v}</div>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            </IonCardContent>
          </IonCard>

          <IonCard className="ely-card">
            <IonCardContent>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>About Elyzorid</div>
              <IonText color="medium">
                <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                  Elyzorid scans apps and device indicators and generates vulnerability reports using ML models (MobileNetV2, CNN, Random Forest, Isolation Forest) and explainable AI summaries.
                </div>
              </IonText>
              <IonText color="medium">
                <div style={{ fontSize: 13, lineHeight: 1.7, marginTop: 10 }}>
                  In the Android build, Local VPN + Notification Listener + Clipboard monitoring require OS permissions and services. This web build focuses on the UI flow.
                </div>
              </IonText>
            </IonCardContent>
          </IonCard>

          <IonCard className="ely-card">
            <IonCardContent>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>Customer Support</div>
              <IonText color="medium">
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>Email: support@elyzorid.app</div>
              </IonText>
              <IonButton expand="block" fill="outline" style={{ marginTop: 12 }} onClick={() => alert("Support request sent (demo).")}>
                Contact Support
              </IonButton>
            </IonCardContent>
          </IonCard>

          <IonButton expand="block" color="danger" style={{ marginTop: 12 }} onClick={onResetRegistration}>
            Reset Device Registration
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
}

