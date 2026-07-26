import { useState, useEffect, useRef, useCallback } from "react";

// ===================== STYLES =====================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');

  :root {
    --bg: #080c14;
    --surface: #0d1421;
    --surface2: #121b2e;
    --surface3: #1a2540;
    --accent: #00d4ff;
    --accent2: #7c3aed;
    --green: #00e676;
    --yellow: #ffca28;
    --red: #ff1744;
    --orange: #ff6d00;
    --text: #e8f0fe;
    --text2: #8fa3c8;
    --border: rgba(0,212,255,0.12);
    --glow: 0 0 20px rgba(0,212,255,0.15);
    --font: 'Outfit', sans-serif;
    --mono: 'Space Mono', monospace;
  }

  * { margin:0; padding:0; box-sizing:border-box; }

  .ely-root {
    font-family: var(--font);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
    position: relative;
  }

  .ely-root::before {
    content:'';
    position:fixed; inset:0; pointer-events:none; z-index:0;
    background-image:
      linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  /* ===== SPLASH ===== */
  .splash {
    position:fixed; inset:0; z-index:999;
    background: #05080f;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:20px;
  }
  .splash-logo {
    font-family: var(--mono);
    font-size:2.8rem; font-weight:700;
    color: var(--accent);
    letter-spacing:0.3em;
    text-shadow: 0 0 40px rgba(0,212,255,0.6), 0 0 80px rgba(0,212,255,0.2);
    margin-bottom:8px;
  }
  .splash-tagline {
    color: var(--text2); font-size:0.85rem; letter-spacing:0.2em; text-transform:uppercase;
    margin-bottom:48px;
  }
  .auth-tabs {
    display:flex; gap:0; margin-bottom:24px;
    border:1px solid var(--border); border-radius:10px; overflow:hidden;
    width:100%; max-width:400px;
  }
  .auth-tab {
    flex:1; padding:12px; background:transparent; border:none; color:var(--text2);
    font-family:var(--font); font-size:0.9rem; font-weight:600; cursor:pointer;
    transition:all 0.2s;
  }
  .auth-tab.active { background:var(--accent); color:#000; }
  .auth-card {
    background: var(--surface);
    border:1px solid var(--border);
    border-radius:16px; padding:32px;
    width:100%; max-width:400px;
    box-shadow: var(--glow);
  }
  .auth-card h2 { font-size:1.3rem; margin-bottom:20px; }
  .form-group { margin-bottom:16px; }
  .form-group label { display:block; font-size:0.8rem; color:var(--text2); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.1em; }
  .form-group input {
    width:100%; padding:12px 16px;
    background:var(--surface2); border:1px solid var(--border);
    border-radius:8px; color:var(--text);
    font-family:var(--font); font-size:0.95rem;
    outline:none; transition:border-color 0.2s;
  }
  .form-group input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(0,212,255,0.1); }
  .consent-box {
    background:var(--surface2); border:1px solid var(--border); border-radius:10px;
    padding:16px; margin-bottom:20px;
  }
  .consent-box p { font-size:0.82rem; color:var(--text2); line-height:1.6; margin-bottom:12px; }
  .consent-box a { color:var(--accent); text-decoration:none; }
  .consent-check { display:flex; align-items:flex-start; gap:10px; cursor:pointer; }
  .consent-check input[type=checkbox] { width:18px; height:18px; accent-color:var(--accent); margin-top:2px; flex-shrink:0; }
  .consent-check span { font-size:0.82rem; color:var(--text2); }

  /* ===== MAIN APP ===== */
  .app { display:flex; flex-direction:column; min-height:100vh; position:relative; z-index:1; }
  .topbar {
    display:flex; align-items:center; justify-content:space-between;
    padding:16px 20px;
    background: rgba(13,20,33,0.9);
    backdrop-filter:blur(12px);
    border-bottom:1px solid var(--border);
    position:sticky; top:0; z-index:100;
  }
  .topbar-logo { font-family:var(--mono); font-size:1.2rem; color:var(--accent); font-weight:700; letter-spacing:0.15em; }
  .topbar-status { display:flex; align-items:center; gap:8px; font-size:0.78rem; color:var(--text2); }
  .status-dot { width:8px; height:8px; border-radius:50%; background:var(--green); box-shadow:0 0 8px var(--green); animation:pulse 2s infinite; }
  @keyframes pulse { 0%,100%{ opacity:1; } 50%{ opacity:0.4; } }

  .pages { flex:1; overflow-y:auto; padding:20px; padding-bottom:80px; }

  .bottom-nav {
    position:fixed; bottom:0; left:0; right:0;
    background:rgba(13,20,33,0.95);
    backdrop-filter:blur(16px);
    border-top:1px solid var(--border);
    display:flex; z-index:100;
  }
  .nav-item {
    flex:1; display:flex; flex-direction:column; align-items:center;
    padding:12px 8px; cursor:pointer; transition:all 0.2s;
    border:none; background:transparent; color:var(--text2);
    font-family:var(--font); font-size:0.7rem; gap:4px;
  }
  .nav-item svg { width:22px; height:22px; stroke:currentColor; fill:none; stroke-width:1.8; }
  .nav-item.active { color:var(--accent); }
  .nav-item.active svg { filter:drop-shadow(0 0 6px var(--accent)); }

  .section-title { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.15em; color:var(--text2); margin-bottom:14px; }

  .card {
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:16px; padding:20px; margin-bottom:16px;
    position:relative; overflow:hidden;
  }
  .card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:1px;
    background:linear-gradient(90deg, transparent, var(--accent), transparent);
    opacity:0.4;
  }

  .risk-badge {
    display:inline-flex; align-items:center; gap:6px;
    padding:4px 12px; border-radius:20px;
    font-size:0.75rem; font-weight:700; font-family:var(--mono);
  }
  .risk-low { background:rgba(0,230,118,0.12); color:var(--green); border:1px solid rgba(0,230,118,0.3); }
  .risk-medium { background:rgba(255,202,40,0.12); color:var(--yellow); border:1px solid rgba(255,202,40,0.3); }
  .risk-high { background:rgba(255,23,68,0.12); color:var(--red); border:1px solid rgba(255,23,68,0.3); }

  .scan-box {
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:16px; padding:20px; margin-bottom:16px;
    cursor:pointer; transition:all 0.25s;
    position:relative; overflow:hidden;
  }
  .scan-box:hover { border-color:rgba(0,212,255,0.4); transform:translateY(-2px); box-shadow:var(--glow); }
  .scan-box-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .scan-box-icon {
    width:44px; height:44px; border-radius:12px;
    display:flex; align-items:center; justify-content:center;
    background:rgba(0,212,255,0.1);
  }
  .scan-box-icon svg { width:22px; height:22px; stroke:var(--accent); fill:none; stroke-width:1.8; }
  .scan-box h3 { font-size:1rem; font-weight:600; margin-bottom:4px; }
  .scan-box p { font-size:0.8rem; color:var(--text2); line-height:1.5; }
  .scan-btn {
    margin-top:14px; width:100%;
    padding:11px; border-radius:10px;
    background:linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,58,237,0.15));
    border:1px solid var(--border);
    color:var(--accent); font-family:var(--font); font-size:0.85rem; font-weight:600;
    cursor:pointer; transition:all 0.2s; letter-spacing:0.05em;
  }
  .scan-btn:hover { background:linear-gradient(135deg, rgba(0,212,255,0.25), rgba(124,58,237,0.25)); }

  .progress-bar-wrap { background:var(--surface3); border-radius:99px; height:6px; overflow:hidden; margin:10px 0; }
  .progress-bar-fill { height:100%; border-radius:99px; background:linear-gradient(90deg, var(--accent), var(--accent2)); transition:width 0.5s ease; }

  .modal-overlay {
    position:fixed; inset:0; z-index:500;
    background:rgba(0,0,0,0.7); backdrop-filter:blur(8px);
    display:flex; align-items:center; justify-content:center; padding:20px;
  }
  .modal {
    background:var(--surface); border:1px solid var(--border); border-radius:20px;
    padding:28px; width:100%; max-width:460px;
    max-height:90vh; overflow-y:auto;
  }
  .modal h2 { font-size:1.2rem; margin-bottom:6px; }
  .modal-sub { font-size:0.8rem; color:var(--text2); margin-bottom:20px; }

  .scan-log {
    background:var(--bg); border-radius:10px; padding:14px;
    font-family:var(--mono); font-size:0.72rem; color:#4af;
    height:160px; overflow-y:auto; margin-bottom:16px;
    border:1px solid rgba(0,212,255,0.1);
  }
  .scan-log-line { margin-bottom:4px; }
  .scan-log-line.ok { color:var(--green); }
  .scan-log-line.warn { color:var(--yellow); }
  .scan-log-line.bad { color:var(--red); }

  .result-section { margin-top:16px; }
  .result-row {
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 0; border-bottom:1px solid var(--border);
    font-size:0.85rem;
  }
  .result-row:last-child { border:none; }
  .result-label { color:var(--text2); }
  .result-value { font-weight:600; font-family:var(--mono); font-size:0.8rem; }

  .evidence-item {
    background:var(--surface2); border-radius:8px; padding:10px 12px;
    font-family:var(--mono); font-size:0.72rem; color:var(--text2);
    margin-bottom:6px; border-left:3px solid var(--yellow);
  }
  .evidence-item.bad { border-left-color:var(--red); color:var(--red); }
  .evidence-item.ok { border-left-color:var(--green); color:var(--green); }

  .xai-box {
    margin-top:16px; padding:16px;
    background:linear-gradient(135deg, rgba(124,58,237,0.1), rgba(0,212,255,0.08));
    border:1px solid rgba(124,58,237,0.3); border-radius:12px;
  }
  .xai-box .xai-icon { font-size:2rem; margin-bottom:8px; }
  .xai-box h4 { font-size:0.95rem; margin-bottom:6px; }
  .xai-box p { font-size:0.82rem; color:var(--text2); line-height:1.6; }

  .reco-item {
    display:flex; align-items:flex-start; gap:10px;
    padding:10px 12px; background:var(--surface2); border-radius:8px;
    margin-bottom:6px; font-size:0.82rem; line-height:1.5;
  }
  .reco-num { width:22px; height:22px; border-radius:50%; background:var(--accent2); color:#fff; font-size:0.7rem; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }

  .export-row { display:flex; gap:10px; margin-top:16px; }
  .btn-export {
    flex:1; padding:10px; border-radius:8px;
    background:rgba(0,212,255,0.08); border:1px solid var(--border);
    color:var(--accent); font-family:var(--font); font-size:0.82rem; font-weight:600;
    cursor:pointer; transition:all 0.2s;
  }
  .btn-export:hover { background:rgba(0,212,255,0.16); }

  .toggle-card {
    background:var(--surface); border:1px solid var(--border); border-radius:14px;
    padding:18px 20px; margin-bottom:12px;
    display:flex; align-items:center; justify-content:space-between;
  }
  .toggle-card-left { display:flex; align-items:center; gap:14px; }
  .toggle-icon {
    width:42px; height:42px; border-radius:11px;
    background:rgba(0,212,255,0.08); display:flex; align-items:center; justify-content:center;
  }
  .toggle-icon svg { width:20px; height:20px; stroke:var(--accent); fill:none; stroke-width:1.8; }
  .toggle-title { font-size:0.95rem; font-weight:600; margin-bottom:2px; }
  .toggle-sub { font-size:0.75rem; color:var(--text2); }
  .toggle-switch { position:relative; width:50px; height:28px; }
  .toggle-switch input { display:none; }
  .toggle-slider {
    position:absolute; inset:0; background:var(--surface3);
    border-radius:14px; cursor:pointer; transition:0.3s;
    border:1px solid var(--border);
  }
  .toggle-slider::after {
    content:''; position:absolute; top:4px; left:4px;
    width:18px; height:18px; border-radius:50%;
    background:var(--text2); transition:0.3s;
  }
  .toggle-switch input:checked + .toggle-slider { background:rgba(0,212,255,0.2); border-color:var(--accent); }
  .toggle-switch input:checked + .toggle-slider::after { transform:translateX(22px); background:var(--accent); box-shadow:0 0 8px var(--accent); }
  .toolkit-stat { font-family:var(--mono); font-size:0.7rem; color:var(--text2); margin-top:8px; }
  .toolkit-stat span { color:var(--accent); }

  .alert-item {
    background:var(--surface); border:1px solid var(--border); border-radius:14px;
    padding:16px 18px; margin-bottom:12px;
    border-left:4px solid var(--red);
  }
  .alert-item.medium { border-left-color:var(--yellow); }
  .alert-item.low { border-left-color:var(--green); }
  .alert-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
  .alert-type { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--red); font-weight:700; }
  .alert-item.medium .alert-type { color:var(--yellow); }
  .alert-item.low .alert-type { color:var(--green); }
  .alert-time { font-size:0.7rem; color:var(--text2); font-family:var(--mono); }
  .alert-title { font-size:0.95rem; font-weight:600; margin-bottom:4px; }
  .alert-desc { font-size:0.8rem; color:var(--text2); line-height:1.5; margin-bottom:10px; }
  .alert-reco { font-size:0.8rem; color:var(--text); line-height:1.5; background:var(--surface2); padding:10px; border-radius:8px; margin-bottom:10px; }
  .btn-dismiss {
    padding:7px 14px; border-radius:7px;
    background:rgba(0,230,118,0.1); border:1px solid rgba(0,230,118,0.3);
    color:var(--green); font-family:var(--font); font-size:0.78rem; font-weight:600;
    cursor:pointer; transition:all 0.2s;
  }
  .btn-dismiss:hover { background:rgba(0,230,118,0.2); }

  .settings-item {
    display:flex; align-items:center; justify-content:space-between;
    padding:16px 0; border-bottom:1px solid var(--border); cursor:pointer;
    transition:all 0.2s;
  }
  .settings-item:last-child { border:none; }
  .settings-item:hover { padding-left:6px; }
  .settings-left { display:flex; align-items:center; gap:14px; }
  .settings-icon {
    width:38px; height:38px; border-radius:10px;
    background:rgba(0,212,255,0.08); display:flex; align-items:center; justify-content:center;
  }
  .settings-icon svg { width:18px; height:18px; stroke:var(--accent); fill:none; stroke-width:1.8; }
  .settings-label { font-size:0.9rem; font-weight:500; }

  .sub-view {
    position:fixed; inset:0; z-index:200;
    background:var(--bg); display:flex; flex-direction:column;
  }
  .sub-topbar {
    display:flex; align-items:center; gap:14px;
    padding:16px 20px; border-bottom:1px solid var(--border);
    background:var(--surface);
  }
  .btn-back {
    background:none; border:none; color:var(--accent); cursor:pointer;
    display:flex; align-items:center; gap:6px; font-family:var(--font); font-size:0.9rem;
  }
  .sub-content { padding:20px; overflow-y:auto; flex:1; }

  .web-block-stats { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
  .stat-mini {
    background:var(--surface2); border:1px solid var(--border); border-radius:12px;
    padding:14px; text-align:center;
  }
  .stat-mini-val { font-family:var(--mono); font-size:1.5rem; font-weight:700; color:var(--accent); }
  .stat-mini-label { font-size:0.72rem; color:var(--text2); margin-top:2px; }

  .permission-app-item {
    background:var(--surface2); border-radius:10px; padding:12px 14px; margin-bottom:8px;
    display:flex; align-items:flex-start; justify-content:space-between; gap:10px;
  }
  .perm-app-name { font-size:0.88rem; font-weight:600; margin-bottom:4px; }
  .perm-tags { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
  .perm-tag { padding:2px 8px; border-radius:20px; font-size:0.68rem; font-weight:600; font-family:var(--mono); }
  .perm-tag.danger { background:rgba(255,23,68,0.15); color:var(--red); }
  .perm-tag.warn { background:rgba(255,202,40,0.15); color:var(--yellow); }
  .perm-tag.safe { background:rgba(0,230,118,0.15); color:var(--green); }

  .chip { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:20px; font-size:0.72rem; font-weight:600; background:var(--surface3); color:var(--text2); }

  .page-header { margin-bottom:24px; }
  .page-header h1 { font-size:1.5rem; font-weight:700; margin-bottom:4px; }
  .page-header p { font-size:0.83rem; color:var(--text2); }

  .status-card {
    background:linear-gradient(135deg, #0d1a2e, #0d1421);
    border:1px solid var(--border); border-radius:18px; padding:22px;
    margin-bottom:20px; position:relative; overflow:hidden;
  }
  .status-card::after {
    content:''; position:absolute; top:-40px; right:-40px;
    width:140px; height:140px; border-radius:50%;
    background:radial-gradient(circle, rgba(0,212,255,0.1), transparent);
  }

  .alert-badge {
    background:var(--red); color:#fff;
    width:16px; height:16px; border-radius:50%;
    font-size:0.6rem; font-weight:700; display:inline-flex; align-items:center; justify-content:center;
    position:absolute; top:-4px; right:-4px;
  }
  .nav-icon-wrap { position:relative; display:inline-flex; }

  .btn-primary {
    width:100%; padding:14px;
    background:linear-gradient(135deg, var(--accent), #0099bb);
    border:none; border-radius:10px;
    color:#000; font-family:var(--font); font-size:1rem; font-weight:700;
    cursor:pointer; transition:all 0.2s; letter-spacing:0.05em;
  }
  .btn-primary:hover { transform:translateY(-1px); box-shadow:0 8px 24px rgba(0,212,255,0.3); }
  .btn-primary:disabled { opacity:0.4; cursor:not-allowed; transform:none; }

  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(0,212,255,0.2); border-radius:2px; }

  textarea {
    width:100%; height:100px; background:var(--surface2);
    border:1px solid var(--border); border-radius:8px; color:var(--text);
    font-family:var(--font); font-size:0.9rem; padding:12px; outline:none; resize:none;
  }
  textarea:focus { border-color:var(--accent); }
`;

// ===================== SCAN CONFIG DATA =====================
const SCAN_CONFIGS = {
  main: {
    title: 'Full Device Scan',
    sub: 'Analyzing installed apps, APK binaries, system paths, and runtime behavior…',
    logs: [
      {t:200, cls:'', txt:'[INIT] Starting Elyzorid ML Engine v1.0…'},
      {t:400, cls:'ok', txt:'[OK] MobileNetV2 model loaded (TFLite)'},
      {t:600, cls:'ok', txt:'[OK] Random Forest classifier ready'},
      {t:800, cls:'ok', txt:'[OK] Isolation Forest anomaly detector ready'},
      {t:1100, cls:'', txt:'[SCAN] Enumerating installed packages…'},
      {t:1600, cls:'', txt:'[SCAN] Extracting APK manifests…'},
      {t:2100, cls:'', txt:'[SCAN] Analyzing permissions & intent filters…'},
      {t:2600, cls:'warn', txt:'[WARN] com.unknown.adware → excessive permissions'},
      {t:3000, cls:'', txt:'[SCAN] Scanning /system/bin for su binary…'},
      {t:3400, cls:'ok', txt:'[OK] No su binary detected'},
      {t:3700, cls:'', txt:'[SCAN] Checking system partition writability…'},
      {t:4100, cls:'ok', txt:'[OK] /system is read-only'},
      {t:4500, cls:'', txt:'[SCAN] Running static feature extraction…'},
      {t:5000, cls:'warn', txt:'[WARN] Suspicious API calls in com.example.app'},
      {t:5500, cls:'', txt:'[ML] Running CNN binary classifier…'},
      {t:6000, cls:'ok', txt:'[OK] 47 benign apps confirmed'},
      {t:6400, cls:'bad', txt:'[ALERT] 1 potentially malicious app detected'},
      {t:6800, cls:'', txt:'[SHAP] Computing feature explanations…'},
      {t:7200, cls:'ok', txt:'[OK] Report generated'},
    ],
    progress: [5,15,30,45,55,65,75,82,90,95,100],
    result: {
      status:'COMPLETED', riskLevel:'MEDIUM', files:'1,247', apps:'48', threats:'1', scanTime:'7.2s',
      evidence:[
        {cls:'warn', txt:'/data/app/com.unknown.adware – excessive permissions: CAMERA, RECORD_AUDIO, READ_CONTACTS, background network'},
        {cls:'bad', txt:'com.malicious.app – static feature score 0.87 (RF), CNN confidence 91% malware'},
        {cls:'ok', txt:'/system/bin/su – NOT FOUND'},
        {cls:'ok', txt:'Magisk Manager – NOT DETECTED'},
      ],
      xai:{ icon:'⚠️', title:'Oops — Low-Level Risk Detected', text:'SHAP analysis shows "com.unknown.adware" was flagged primarily due to: (1) simultaneous CAMERA + RECORD_AUDIO permissions with background network access (SHAP weight: 0.41), (2) suspicious intent filters targeting BOOT_COMPLETED (SHAP: 0.28). One app scored high malware probability. Overall device risk: MEDIUM.' },
      recos:['Remove or disable "com.unknown.adware" in Settings → Apps immediately.','Review app permissions for apps with CAMERA + microphone access and disable background network if not needed.','Enable Elyzorid Local VPN for continuous traffic monitoring.'],
      risk:'MEDIUM'
    }
  },
  perm: {
    title: 'App Permission Scan',
    sub: 'Analyzing all app permissions for over-privileged access…',
    logs: [
      {t:200, cls:'', txt:'[INIT] Loading permission analyzer…'},
      {t:500, cls:'ok', txt:'[OK] Package manager connected'},
      {t:900, cls:'', txt:'[SCAN] Reading all installed packages…'},
      {t:1400, cls:'', txt:'[SCAN] Mapping permissions per app…'},
      {t:1900, cls:'warn', txt:'[WARN] Instagram → CAMERA + MIC + BACKGROUND + CONTACTS'},
      {t:2400, cls:'warn', txt:'[WARN] TikTok → CAMERA + MIC + LOCATION + READ_EXTERNAL'},
      {t:2900, cls:'bad', txt:'[ALERT] com.unknown.app → 18 permissions, 6 dangerous'},
      {t:3300, cls:'ok', txt:'[OK] Maps → location only, no suspicious combos'},
      {t:3700, cls:'', txt:'[ML] Risk scoring with Random Forest…'},
      {t:4100, cls:'ok', txt:'[OK] Permission report ready'},
    ],
    progress:[10,30,50,65,80,90,100],
    result:{
      status:'COMPLETED', riskLevel:'MEDIUM', files:'—', apps:'48', threats:'3', scanTime:'4.1s',
      evidence:[
        {cls:'bad', txt:'com.unknown.app – 6 dangerous permissions including READ_SMS, PROCESS_OUTGOING_CALLS'},
        {cls:'warn', txt:'Social Media Apps (3) – CAMERA + MIC + BACKGROUND_PROCESS combo'},
        {cls:'ok', txt:'System apps – permissions within expected bounds'},
      ],
      xai:{ icon:'🔍', title:'Permission Risk Detected', text:'3 apps hold permission combinations that create privacy risks. "com.unknown.app" has the highest SHAP risk score (0.73) due to READ_SMS + PROCESS_OUTGOING_CALLS — classic spyware indicators.' },
      recos:['Uninstall com.unknown.app immediately.','Revoke BACKGROUND location for TikTok and Instagram.','Disable microphone for apps you do not use for voice.'],
      risk:'MEDIUM',
      permApps:[
        { name:'com.unknown.app', risk:'HIGH', perms:['READ_SMS','PROCESS_CALLS','CAMERA','MIC','CONTACTS','LOCATION'] },
        { name:'com.social.media', risk:'MEDIUM', perms:['CAMERA','MIC','BACKGROUND','READ_EXTERNAL'] },
        { name:'com.example.games', risk:'LOW', perms:['INTERNET','VIBRATE'] },
      ]
    }
  },
  root: {
    title: 'Rooting Detection Scan',
    sub: 'Checking for root indicators, Magisk, su binaries, and system integrity…',
    logs: [
      {t:200, cls:'', txt:'[INIT] Root detection engine starting…'},
      {t:500, cls:'', txt:'[SCAN] Checking /system/bin/su…'},
      {t:900, cls:'ok', txt:'[OK] su binary not found in /system/bin'},
      {t:1300, cls:'', txt:'[SCAN] Checking /system/xbin/su…'},
      {t:1700, cls:'ok', txt:'[OK] su binary not found in /system/xbin'},
      {t:2100, cls:'', txt:'[SCAN] Checking for Magisk Manager package…'},
      {t:2500, cls:'ok', txt:'[OK] Magisk Manager not installed'},
      {t:2900, cls:'', txt:'[SCAN] Verifying system partition integrity…'},
      {t:3300, cls:'ok', txt:'[OK] /system is read-only (expected)'},
      {t:3700, cls:'', txt:'[SCAN] Checking SafetyNet / Play Integrity…'},
      {t:4100, cls:'ok', txt:'[OK] Device passes SafetyNet basic integrity'},
      {t:4500, cls:'ok', txt:'[OK] No rooting artifacts detected'},
    ],
    progress:[10,25,45,60,75,88,100],
    result:{
      status:'COMPLETED', riskLevel:'LOW', files:'320', apps:'—', threats:'0', scanTime:'4.5s',
      evidence:[
        {cls:'ok', txt:'/system/bin/su – NOT FOUND'},
        {cls:'ok', txt:'/system/xbin/su – NOT FOUND'},
        {cls:'ok', txt:'Magisk Manager – NOT INSTALLED'},
        {cls:'ok', txt:'/system partition – READ ONLY'},
        {cls:'ok', txt:'SafetyNet Basic Integrity – PASS'},
      ],
      xai:{ icon:'✅', title:'Everything Looks Good!', text:'No rooting indicators detected. SHAP analysis confirms: su binary absence (weight: 0.45), system partition integrity (0.31), and Magisk absence (0.24) all point to an uncompromised device. Your device is safe for sensitive operations.' },
      recos:['Continue running periodic root detection scans.','If you ever root your device, avoid financial apps on that device.'],
      risk:'LOW'
    }
  }
};

const BLOCKED_DOMAINS = [
  { domain:'malware-phishing-xyz.com', type:'Malware', time:'10:42' },
  { domain:'tracking-ads-3rdparty.net', type:'Tracker', time:'10:38' },
  { domain:'cryptominer.js.cdn.evil.org', type:'Cryptominer', time:'10:31' },
  { domain:'suspicious-redirect.ru', type:'Redirect', time:'10:22' },
];
const CLIPBOARD_EVENTS = [
  { content:'http://phish.evil.example/bank-login', type:'Phishing URL', time:'10:45' },
  { content:'bc1q... (BTC address)', type:'Crypto Clipboard Hijack', time:'10:30' },
];

// ===================== ICONS =====================
const HomeIcon = () => <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
const ToolkitIcon = () => <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>;
const AlertIcon = () => <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const SettingsIcon = () => <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const BackIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>;
const ChevronIcon = () => <svg viewBox="0 0 24 24" style={{width:16,height:16,stroke:'var(--text2)',fill:'none',strokeWidth:2}}><polyline points="9,18 15,12 9,6"/></svg>;
const ShieldIcon = () => <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const ClipboardIcon = () => <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>;
const BellIcon = () => <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>;
const GridIcon = () => <svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>;
const WarningIcon = () => <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const BlockIcon = () => <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
const UserIcon = () => <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>;
const InfoIcon = () => <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const ChatIcon = () => <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const RefreshIcon = () => <svg viewBox="0 0 24 24"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;

// ===================== TOGGLE SWITCH =====================
function ToggleSwitch({ checked, onChange }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <div className="toggle-slider"></div>
    </label>
  );
}

// ===================== RISK BADGE =====================
function RiskBadge({ level }) {
  const cls = level === 'LOW' ? 'risk-low' : level === 'MEDIUM' ? 'risk-medium' : 'risk-high';
  return <span className={`risk-badge ${cls}`}>{level}</span>;
}

// ===================== SCAN MODAL =====================
function ScanModal({ scanType, onClose, onResult }) {
  const config = SCAN_CONFIGS[scanType];
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Initializing…');
  const [logs, setLogs] = useState([]);
  const [done, setDone] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    const steps = [...config.progress];
    let idx = 0;
    const pInt = setInterval(() => {
      if (idx < steps.length) {
        const p = steps[idx++];
        setProgress(p);
        setProgressLabel(p < 30 ? 'Initializing…' : p < 60 ? 'Analyzing…' : p < 90 ? 'Running ML Models…' : p < 100 ? 'Generating Report…' : 'Complete!');
      } else clearInterval(pInt);
    }, 700);

    config.logs.forEach(entry => {
      setTimeout(() => {
        setLogs(prev => [...prev, entry]);
      }, entry.t);
    });

    const last = config.logs[config.logs.length - 1];
    setTimeout(() => {
      clearInterval(pInt);
      setProgress(100);
      setProgressLabel('Complete!');
      setDone(true);
      onResult(config.result);
    }, last.t + 500);

    return () => clearInterval(pInt);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const result = config.result;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{config.title}</h2>
        <div className="modal-sub">{config.sub}</div>

        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <span style={{ fontSize:'0.75rem', color:'var(--text2)' }}>{progressLabel}</span>
          <span style={{ fontFamily:'var(--mono)', fontSize:'0.75rem', color:'var(--accent)' }}>{progress}%</span>
        </div>

        <div className="scan-log" ref={logRef}>
          {logs.map((l, i) => (
            <div key={i} className={`scan-log-line ${l.cls}`}>{l.txt}</div>
          ))}
        </div>

        {done && (
          <div>
            <div className="result-section">
              {[
                ['Status', result.status],
                ['Files Scanned', result.files],
                ['Apps Analyzed', result.apps],
                ['Scan Time', result.scanTime],
              ].map(([label, val]) => (
                <div key={label} className="result-row">
                  <span className="result-label">{label}</span>
                  <span className="result-value">{val}</span>
                </div>
              ))}
              <div className="result-row">
                <span className="result-label">Risk Level</span>
                <span className="result-value"><RiskBadge level={result.riskLevel} /></span>
              </div>
              <div className="result-row">
                <span className="result-label">Threats Detected</span>
                <span className="result-value" style={{ color:'var(--red)' }}>{result.threats}</span>
              </div>
            </div>

            <div style={{ margin:'14px 0 8px', fontSize:'0.72rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Evidence</div>
            {result.evidence.map((ev, i) => (
              <div key={i} className={`evidence-item ${ev.cls}`}>{ev.txt}</div>
            ))}

            <div className="xai-box">
              <div className="xai-icon">{result.xai.icon}</div>
              <h4>{result.xai.title}</h4>
              <p>{result.xai.text}</p>
            </div>

            {result.recos && (
              <>
                <div style={{ margin:'16px 0 8px', fontSize:'0.72rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Recommendations</div>
                {result.recos.map((r, i) => (
                  <div key={i} className="reco-item">
                    <div className="reco-num">{i + 1}</div>
                    <div>{r}</div>
                  </div>
                ))}
              </>
            )}

            {result.permApps && (
              <>
                <div style={{ margin:'16px 0 8px', fontSize:'0.72rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.1em' }}>App Permission Analysis</div>
                {result.permApps.map((a, i) => (
                  <div key={i} className="permission-app-item">
                    <div>
                      <div className="perm-app-name">{a.name}</div>
                      <div className="perm-tags">
                        {a.perms.map(p => (
                          <span key={p} className={`perm-tag ${a.risk === 'HIGH' ? 'danger' : a.risk === 'MEDIUM' ? 'warn' : 'safe'}`}>{p}</span>
                        ))}
                      </div>
                    </div>
                    <RiskBadge level={a.risk} />
                  </div>
                ))}
              </>
            )}

            <div className="export-row">
              <button className="btn-export" onClick={() => alert('Exporting PDF report…')}>📄 Export PDF</button>
              <button className="btn-export" onClick={() => alert('Exporting CSV report…')}>📊 Export CSV</button>
            </div>
          </div>
        )}

        <div style={{ marginTop:16, display:'flex', gap:10 }}>
          <button className="btn-export" onClick={onClose} style={{ flex:1 }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ===================== HOME PAGE =====================
function HomePage({ onScan, globalStatus }) {
  return (
    <div>
      <div className="page-header">
        <h1>Security Dashboard</h1>
        <p>Real-time threat intelligence for your Android device</p>
      </div>

      <div className="status-card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:'0.72rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Security Score</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:'2.5rem', fontWeight:700, color: globalStatus.color }}>
              {globalStatus.score}
            </div>
          </div>
          <span className={`risk-badge ${globalStatus.badgeCls}`} style={{ fontSize:'0.8rem', padding:'6px 14px' }}>
            {globalStatus.badgeText}
          </span>
        </div>
        <div style={{ fontSize:'0.82rem', color:'var(--text2)' }}>{globalStatus.xaiMsg}</div>
      </div>

      {[
        { type:'main', icon:<GridIcon/>, badge:'READY', badgeCls:'risk-low', title:'Full Device Scan', desc:'Deep scan of all installed apps, APK files, system paths, binaries, and runtime behaviors using ML ensemble (MobileNetV2 + Random Forest + Isolation Forest).', btn:'▶ Start Full Scan' },
        { type:'perm', icon:<ShieldIcon/>, badge:'READY', badgeCls:'risk-medium', title:'App Permission Scan', desc:'Analyze which apps hold unnecessary or excessive permissions (camera, mic, background network) and flag privacy risks.', btn:'▶ Scan App Permissions' },
        { type:'root', icon:<WarningIcon/>, badge:'READY', badgeCls:'risk-low', title:'Rooting Detection Scan', desc:'Detect su binaries, Magisk Manager, system partition modifications, and generate forensic evidence for audits.', btn:'▶ Detect Rooting' },
      ].map(s => (
        <div key={s.type} className="scan-box">
          <div className="scan-box-header">
            <div className="scan-box-icon">{s.icon}</div>
            <span className={`risk-badge ${s.badgeCls}`}>{s.badge}</span>
          </div>
          <h3>{s.title}</h3>
          <p>{s.desc}</p>
          <button className="scan-btn" onClick={() => onScan(s.type)}>{s.btn}</button>
        </div>
      ))}

      <div className="scan-box" onClick={() => onScan('webblock')}>
        <div className="scan-box-header">
          <div className="scan-box-icon"><BlockIcon /></div>
          <span className="chip">VPN Active</span>
        </div>
        <h3>Web Blocking</h3>
        <p>View redirects blocked by Local VPN, clipboard intercepts, and real-time threat domains detected.</p>
        <div className="web-block-stats" style={{ marginTop:14, marginBottom:0 }}>
          <div className="stat-mini"><div className="stat-mini-val">247</div><div className="stat-mini-label">Sites Blocked</div></div>
          <div className="stat-mini"><div className="stat-mini-val">12</div><div className="stat-mini-label">Clipboard Events</div></div>
        </div>
      </div>
    </div>
  );
}

// ===================== TOOLKIT PAGE =====================
function ToolkitPage({ modules, onToggle, toolkitLogs }) {
  const toolList = [
    { key:'clipboard', icon:<ClipboardIcon/>, title:'Clipboard Monitor', sub:'Intercept malicious clipboard activity' },
    { key:'notification', icon:<BellIcon/>, title:'Notification Listener', sub:'Monitor notifications for phishing/malware' },
    { key:'vpn', icon:<ShieldIcon/>, title:'Local VPN', sub:'Route traffic through local VPN for filtering' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Security Toolkit</h1>
        <p>Enable real-time monitoring and protection modules</p>
      </div>
      <p className="section-title">Monitoring Modules</p>
      {toolList.map(t => (
        <div key={t.key} className="toggle-card">
          <div className="toggle-card-left">
            <div className="toggle-icon">{t.icon}</div>
            <div>
              <div className="toggle-title">{t.title}</div>
              <div className="toggle-sub">{t.sub}</div>
              <div className="toolkit-stat">
                Status: <span>{modules[t.key] ? 'Active' : 'Disabled'}</span>
              </div>
            </div>
          </div>
          <ToggleSwitch checked={modules[t.key]} onChange={e => onToggle(t.key, e.target.checked)} />
        </div>
      ))}
      <p className="section-title" style={{ marginTop:24 }}>Module Activity Log</p>
      <div className="card">
        <div style={{ fontFamily:'var(--mono)', fontSize:'0.75rem', color:'var(--text2)', lineHeight:1.8 }}>
          {toolkitLogs.length === 0
            ? <div>No activity yet. Enable a module above.</div>
            : toolkitLogs.map((l, i) => <div key={i} dangerouslySetInnerHTML={{ __html: l }} />)
          }
        </div>
      </div>
    </div>
  );
}

// ===================== ALERTS PAGE =====================
function AlertsPage({ alerts, onDismiss }) {
  return (
    <div>
      <div className="page-header">
        <h1>Threat Alerts</h1>
        <p>Real-time security incidents and mitigations</p>
      </div>
      {alerts.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text2)' }}>
          <div style={{ fontSize:'3rem', marginBottom:12 }}>🛡️</div>
          <div>No active alerts. Your device is being monitored.</div>
        </div>
      ) : alerts.map(a => (
        <div key={a.id} className={`alert-item ${a.severity === 'LOW' ? 'low' : a.severity === 'MEDIUM' ? 'medium' : ''}`}>
          <div className="alert-header">
            <span className="alert-type">{a.severity} · {a.type}</span>
            <span className="alert-time">{a.time}</span>
          </div>
          <div className="alert-title">{a.title}</div>
          <div className="alert-desc">{a.desc}</div>
          <div className="alert-reco"><strong style={{ color:'var(--accent)' }}>Mitigation:</strong> {a.reco}</div>
          <button className="btn-dismiss" onClick={() => onDismiss(a.id)}>✓ Mark Resolved</button>
        </div>
      ))}
    </div>
  );
}

// ===================== SETTINGS PAGE =====================
function SettingsPage({ onOpen, onLogout }) {
  const items = [
    { key:'account', icon:<UserIcon/>, label:'My Account' },
    { key:'notifications', icon:<BellIcon/>, label:'My Notifications' },
    { key:'about', icon:<InfoIcon/>, label:'About Us' },
    { key:'support', icon:<ChatIcon/>, label:'Customer Support' },
    { key:'update', icon:<RefreshIcon/>, label:'Auto Update' },
  ];
  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Account, preferences, and app information</p>
      </div>
      <div className="card">
        {items.map(item => (
          <div key={item.key} className="settings-item" onClick={() => onOpen(item.key)}>
            <div className="settings-left">
              <div className="settings-icon">{item.icon}</div>
              <div className="settings-label">{item.label}</div>
            </div>
            <ChevronIcon />
          </div>
        ))}
      </div>
      <div style={{ textAlign:'center', marginTop:24 }}>
        <button className="btn-export" onClick={onLogout} style={{ maxWidth:200, background:'rgba(255,23,68,0.1)', borderColor:'rgba(255,23,68,0.3)', color:'var(--red)' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ===================== SUB VIEWS =====================
function SubViewAccount({ user, scansRun, alertCount, onClose }) {
  return (
    <div className="sub-view">
      <div className="sub-topbar">
        <button className="btn-back" onClick={onClose}><BackIcon /> Back</button>
        <strong>My Account</strong>
      </div>
      <div className="sub-content">
        <div className="card" style={{ textAlign:'center', padding:32 }}>
          <div style={{ width:70, height:70, borderRadius:'50%', background:'linear-gradient(135deg,var(--accent),var(--accent2))', margin:'0 auto 16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', fontWeight:700, color:'#fff' }}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div style={{ fontSize:'1.2rem', fontWeight:700 }}>{user?.name || '—'}</div>
          <div style={{ fontSize:'0.82rem', color:'var(--text2)', marginTop:4 }}>{user?.email || '—'}</div>
          <div style={{ marginTop:12, display:'flex', justifyContent:'center', gap:8 }}>
            <span className="chip">Elyzorid Pro</span>
            <span className="chip">Joined: {user?.joined || '—'}</span>
          </div>
        </div>
        <div className="card">
          {[['Plan','Professional'],['Scans Run', scansRun],['Alerts Generated', alertCount],['Consent Given','✓ Verified'],['App Version','v1.0.0']].map(([l, v]) => (
            <div key={l} className="result-row">
              <span className="result-label">{l}</span>
              <span className="result-value" style={l === 'Consent Given' ? { color:'var(--green)' } : {}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SubViewNotifications({ alerts, onClose }) {
  return (
    <div className="sub-view">
      <div className="sub-topbar">
        <button className="btn-back" onClick={onClose}><BackIcon /> Back</button>
        <strong>My Notifications</strong>
      </div>
      <div className="sub-content">
        {alerts.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text2)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:12 }}>🔔</div>
            <div>No notifications yet.</div>
          </div>
        ) : alerts.map(a => (
          <div key={a.id} className={`alert-item ${a.severity === 'LOW' ? 'low' : a.severity === 'MEDIUM' ? 'medium' : ''}`} style={{ marginBottom:10 }}>
            <div className="alert-header">
              <span className="alert-type">{a.type}</span>
              <span className="alert-time">{a.time}</span>
            </div>
            <div className="alert-title">{a.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubViewAbout({ onClose }) {
  return (
    <div className="sub-view">
      <div className="sub-topbar">
        <button className="btn-back" onClick={onClose}><BackIcon /> Back</button>
        <strong>About Elyzorid</strong>
      </div>
      <div className="sub-content">
        <div className="card" style={{ textAlign:'center', padding:28 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:'1.8rem', color:'var(--accent)', fontWeight:700, letterSpacing:'0.2em', marginBottom:8 }}>ELYZORID</div>
          <div style={{ fontSize:'0.78rem', color:'var(--text2)', marginBottom:16 }}>Android Security Intelligence Platform · v1.0.0</div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom:12 }}>About the App</h3>
          <p style={{ fontSize:'0.85rem', color:'var(--text2)', lineHeight:1.8 }}>Elyzorid is a professional Android security platform that uses machine learning (MobileNetV2, Random Forest, Isolation Forest) combined with explainable AI (SHAP) to detect malware, suspicious permissions, rooting, and network threats on your Android device.</p>
          <div style={{ marginTop:16 }}>
            {[['ML Models','MobileNetV2 · RF · IsoForest'],['XAI Engine','SHAP'],['Dataset','Drebin + AndroZoo'],['Privacy','On-Device Only'],['License','Pro Commercial']].map(([l,v]) => (
              <div key={l} className="result-row">
                <span className="result-label">{l}</span>
                <span className="result-value" style={l==='Privacy'?{color:'var(--green)'}:{}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom:12 }}>Privacy Policy Summary</h3>
          <p style={{ fontSize:'0.82rem', color:'var(--text2)', lineHeight:1.8 }}>All scanning occurs on-device. We do not transmit your data to external servers unless you explicitly choose to export a report. Clipboard and notification content is analyzed locally and never stored permanently.</p>
        </div>
      </div>
    </div>
  );
}

function SubViewSupport({ onClose }) {
  return (
    <div className="sub-view">
      <div className="sub-topbar">
        <button className="btn-back" onClick={onClose}><BackIcon /> Back</button>
        <strong>Customer Support</strong>
      </div>
      <div className="sub-content">
        <div className="card">
          <h3 style={{ marginBottom:16 }}>Contact Us</h3>
          <div className="form-group"><label>Subject</label><input type="text" placeholder="Describe your issue…" /></div>
          <div className="form-group"><label>Message</label><textarea placeholder="Tell us more…" /></div>
          <button className="btn-primary" onClick={() => alert('Message sent!')}>Send Message</button>
        </div>
        <div className="card">
          {[['Email','support@elyzorid.app'],['Response Time','< 24 hours'],['Hours','Mon–Fri 9AM–6PM']].map(([l,v]) => (
            <div key={l} className="result-row">
              <span className="result-label">{l}</span>
              <span className="result-value">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SubViewUpdate({ onClose }) {
  const [lastChecked, setLastChecked] = useState('—');
  return (
    <div className="sub-view">
      <div className="sub-topbar">
        <button className="btn-back" onClick={onClose}><BackIcon /> Back</button>
        <strong>Auto Update</strong>
      </div>
      <div className="sub-content">
        <div className="card">
          {[['Current Version','v1.0.0'],['Latest Version','v1.0.0 (up to date)']].map(([l,v]) => (
            <div key={l} className="result-row">
              <span className="result-label">{l}</span>
              <span className="result-value" style={l==='Latest Version'?{color:'var(--green)'}:{}}>{v}</span>
            </div>
          ))}
          <div className="result-row">
            <span className="result-label">Last Checked</span>
            <span className="result-value">{lastChecked}</span>
          </div>
        </div>
        <button className="btn-primary" style={{ marginTop:8 }} onClick={() => { setLastChecked(new Date().toLocaleString()); alert('✅ Elyzorid is up to date (v1.0.0)'); }}>Check for Updates Now</button>
      </div>
    </div>
  );
}

function SubViewWebBlock({ onClose }) {
  return (
    <div className="sub-view">
      <div className="sub-topbar">
        <button className="btn-back" onClick={onClose}><BackIcon /> Back</button>
        <strong>Web Blocking</strong>
      </div>
      <div className="sub-content">
        <div className="web-block-stats">
          {[['247','Sites Blocked'],['12','Clipboard Events'],['8','Redirects Caught'],['3','Malware Domains']].map(([v,l]) => (
            <div key={l} className="stat-mini"><div className="stat-mini-val">{v}</div><div className="stat-mini-label">{l}</div></div>
          ))}
        </div>
        <p className="section-title">Recently Blocked Domains</p>
        {BLOCKED_DOMAINS.map((d, i) => (
          <div key={i} className="evidence-item bad" style={{ marginBottom:6, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>{d.domain}</span>
            <span className="chip">{d.type}</span>
          </div>
        ))}
        <p className="section-title" style={{ marginTop:16 }}>Clipboard Intercepts</p>
        {CLIPBOARD_EVENTS.map((e, i) => (
          <div key={i} className="evidence-item warn" style={{ marginBottom:6 }}>
            <div style={{ fontWeight:600, marginBottom:2 }}>{e.type} · {e.time}</div>
            <div>{e.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== AUTH SCREEN =====================
function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', password:'' });

  const handleLogin = () => {
    if (!form.email || !form.password) { alert('Please enter credentials.'); return; }
    const user = { name: form.email.split('@')[0], email: form.email, joined: new Date().toLocaleDateString() };
    onLogin(user);
  };

  const handleRegister = () => {
    if (!form.name || !form.email || !form.password) { alert('Please fill all fields.'); return; }
    const user = { name: form.name, email: form.email, joined: new Date().toLocaleDateString() };
    onLogin(user);
  };

  return (
    <div className="splash">
      <div className="splash-logo">ELYZORID</div>
      <div className="splash-tagline">Android Security Intelligence</div>
      <div className="auth-tabs">
        <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Login</button>
        <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Register</button>
      </div>
      <div className="auth-card">
        {tab === 'login' ? (
          <>
            <h2>Welcome back</h2>
            <div className="form-group"><label>Email</label><input type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
            <div className="form-group"><label>Password</label><input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} /></div>
            <button className="btn-primary" style={{ marginTop:8 }} onClick={handleLogin}>Sign In</button>
          </>
        ) : (
          <>
            <h2>Create account</h2>
            <div className="form-group"><label>Full Name</label><input type="text" placeholder="Jane Doe" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div className="form-group"><label>Email</label><input type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
            <div className="form-group"><label>Password</label><input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} /></div>
            <div className="consent-box">
              <p>By using Elyzorid you agree to our <a href="#">Terms & Conditions</a> and <a href="#">Privacy Policy</a>. We will scan your device's apps, files, and system paths to generate security reports. All data stays on-device unless you choose to export.</p>
              <label className="consent-check">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
                <span>I agree to the Terms, Privacy Policy, and grant Elyzorid permission to scan and monitor my device.</span>
              </label>
            </div>
            <button className="btn-primary" disabled={!consent} onClick={handleRegister}>Create Account & Start Scan</button>
          </>
        )}
      </div>
    </div>
  );
}

// ===================== MAIN APP =====================
export default function ElyzoridApp() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [activeScan, setActiveScan] = useState(null);
  const [subView, setSubView] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [scansRun, setScansRun] = useState(0);
  const [modules, setModules] = useState({ clipboard: false, notification: false, vpn: false });
  const [toolkitLogs, setToolkitLogs] = useState([]);
  const [globalStatus, setGlobalStatus] = useState({
    score: '--', color: 'var(--green)', badgeCls: 'risk-low', badgeText: 'NOT SCANNED',
    xaiMsg: 'Run a scan to analyze your device security posture.'
  });

  const addAlert = useCallback((alertData) => {
    setAlerts(prev => [{ ...alertData, id: Date.now(), time: new Date().toLocaleTimeString() }, ...prev]);
  }, []);

  const addToolkitLog = useCallback((html) => {
    setToolkitLogs(prev => [html, ...prev]);
  }, []);

  const handleScan = (type) => {
    if (type === 'webblock') { setSubView('webblock'); return; }
    setActiveScan(type);
  };

  const handleScanResult = (result) => {
    setScansRun(n => n + 1);
    const riskColors = { LOW: 'var(--green)', MEDIUM: 'var(--yellow)', HIGH: 'var(--red)' };
    const clsMap = { LOW: 'risk-low', MEDIUM: 'risk-medium', HIGH: 'risk-high' };
    const score = result.riskLevel === 'LOW' ? `${Math.floor(85+Math.random()*12)}%` :
                  result.riskLevel === 'MEDIUM' ? `${Math.floor(55+Math.random()*20)}%` :
                  `${Math.floor(20+Math.random()*25)}%`;
    setGlobalStatus({
      score,
      color: riskColors[result.riskLevel],
      badgeCls: clsMap[result.riskLevel],
      badgeText: result.riskLevel + ' RISK',
      xaiMsg: result.xai.title + '. ' + result.xai.text.substring(0, 100) + '…'
    });
    if (result.riskLevel !== 'LOW' && parseInt(result.threats) > 0) {
      addAlert({
        severity: result.riskLevel,
        type: SCAN_CONFIGS[activeScan]?.title || 'Scan',
        title: `Threat Detected in ${SCAN_CONFIGS[activeScan]?.title || 'Scan'}`,
        desc: `${result.threats} threat(s) found. Risk: ${result.riskLevel}.`,
        reco: result.recos ? result.recos[0] : 'Review scan results.'
      });
    }
  };

  const handleToggleModule = (key, val) => {
    setModules(m => ({ ...m, [key]: val }));
    const ts = new Date().toLocaleTimeString();
    const status = val ? '🟢 Enabled' : '🔴 Disabled';
    addToolkitLog(`<span style="color:var(--text2)">[${ts}]</span> <span style="color:var(--accent)">${key.toUpperCase()}</span> → ${status}`);

    if (key === 'clipboard' && val) {
      setTimeout(() => {
        if (!val) return;
        const ts2 = new Date().toLocaleTimeString();
        addToolkitLog(`<span style="color:var(--text2)">[${ts2}]</span> <span style="color:var(--yellow)">CLIPBOARD</span> → Suspicious URL detected in paste buffer`);
        addAlert({ severity:'MEDIUM', type:'Clipboard Monitor', title:'Suspicious URL in Clipboard', desc:'A potentially malicious URL was detected in clipboard: http://malware-phishing-example.xyz/steal.php', reco:'Clear your clipboard immediately.' });
      }, 8000 + Math.random() * 12000);
    }
    if (key === 'notification' && val) {
      setTimeout(() => {
        addAlert({ severity:'LOW', type:'Notification Listener', title:'Phishing Notification Detected', desc:'A notification from "com.unknown.app" contained a phishing link disguised as a bank alert.', reco:'Block notifications from this app and consider uninstalling it.' });
      }, 15000 + Math.random() * 20000);
    }
  };

  if (!user) return (
    <>
      <style>{styles}</style>
      <div className="ely-root"><AuthScreen onLogin={setUser} /></div>
    </>
  );

  const renderSubView = () => {
    if (!subView) return null;
    const props = { onClose: () => setSubView(null) };
    switch (subView) {
      case 'account': return <SubViewAccount {...props} user={user} scansRun={scansRun} alertCount={alerts.length} />;
      case 'notifications': return <SubViewNotifications {...props} alerts={alerts} />;
      case 'about': return <SubViewAbout {...props} />;
      case 'support': return <SubViewSupport {...props} />;
      case 'update': return <SubViewUpdate {...props} />;
      case 'webblock': return <SubViewWebBlock {...props} />;
      default: return null;
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="ely-root">
        <div className="app">
          {/* TOPBAR */}
          <div className="topbar">
            <div className="topbar-logo">ELYZORID</div>
            <div className="topbar-status">
              <div className="status-dot" />
              <span>{user.name}</span>
            </div>
          </div>

          {/* PAGES */}
          <div className="pages">
            {page === 'home' && <HomePage onScan={handleScan} globalStatus={globalStatus} />}
            {page === 'toolkit' && <ToolkitPage modules={modules} onToggle={handleToggleModule} toolkitLogs={toolkitLogs} />}
            {page === 'alert' && <AlertsPage alerts={alerts} onDismiss={id => setAlerts(a => a.filter(x => x.id !== id))} />}
            {page === 'settings' && <SettingsPage onOpen={setSubView} onLogout={() => setUser(null)} />}
          </div>

          {/* BOTTOM NAV */}
          <nav className="bottom-nav">
            {[
              { key:'home', label:'Home', icon:<HomeIcon /> },
              { key:'toolkit', label:'Toolkit', icon:<ToolkitIcon /> },
              { key:'alert', label:'Alert', icon: (
                <div className="nav-icon-wrap">
                  <AlertIcon />
                  {alerts.length > 0 && <span className="alert-badge">{alerts.length}</span>}
                </div>
              )},
              { key:'settings', label:'Settings', icon:<SettingsIcon /> },
            ].map(n => (
              <button key={n.key} className={`nav-item ${page === n.key ? 'active' : ''}`} onClick={() => setPage(n.key)}>
                {n.icon}
                {n.label}
              </button>
            ))}
          </nav>
        </div>

        {/* SCAN MODAL */}
        {activeScan && (
          <ScanModal
            scanType={activeScan}
            onClose={() => setActiveScan(null)}
            onResult={handleScanResult}
          />
        )}

        {/* SUB VIEWS */}
        {renderSubView()}
      </div>
    </>
  );
}
