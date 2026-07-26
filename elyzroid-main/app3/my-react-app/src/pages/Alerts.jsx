import { IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonPage, IonText, IonTitle, IonToolbar } from "@ionic/react";

export default function Alerts({ alerts, onResolve }) {
  return (
    <IonPage className="ely-bg-grid">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Alerts</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="ely-layer" style={{ padding: 16 }}>
          {alerts.length === 0 ? (
            <IonCard className="ely-card">
              <IonCardContent style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 6 }}>🛡️</div>
                <IonText color="medium">No active alerts. Enable Toolkit modules for monitoring.</IonText>
              </IonCardContent>
            </IonCard>
          ) : (
            alerts.map((a) => (
              <IonCard key={a.id} className="ely-card">
                <IonCardContent>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <div style={{ fontWeight: 900, letterSpacing: "0.08em", fontSize: 12, color: a.severity === "HIGH" ? "var(--ely-red)" : a.severity === "MEDIUM" ? "var(--ely-yellow)" : "var(--ely-green)" }}>
                      {a.severity} · {a.type}
                    </div>
                    <div style={{ fontFamily: '"Space Mono", ui-monospace, monospace', fontSize: 12, color: "var(--ely-text2)" }}>{a.time}</div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>{a.title}</div>
                  <IonText color="medium">
                    <div style={{ fontSize: 13, lineHeight: 1.6 }}>{a.desc}</div>
                  </IonText>
                  <div style={{ marginTop: 10, padding: 10, background: "var(--ely-surface2)", borderRadius: 12, border: "1px solid var(--ely-border)" }}>
                    <div style={{ fontWeight: 800, color: "var(--ely-accent)", marginBottom: 4 }}>Mitigation</div>
                    <div style={{ fontSize: 13, color: "var(--ely-text)", lineHeight: 1.5 }}>{a.reco}</div>
                  </div>
                  <IonButton expand="block" style={{ marginTop: 12 }} onClick={() => onResolve(a.id)}>
                    Mark Resolved
                  </IonButton>
                </IonCardContent>
              </IonCard>
            ))
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

