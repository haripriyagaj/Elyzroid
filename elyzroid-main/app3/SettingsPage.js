// src/pages/SettingsPage.js
import React, { useState } from 'react';
import { Device } from '@capacitor/device';

function SubView({ title, open, onClose, children }) {
  return (
    <div className={`subview ${open ? 'open' : ''}`}>
      <div className="subview-topbar">
        <button className="back-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
          Back
        </button>
        <h3>{title}</h3>
      </div>
      <div className="subview-body">{children}</div>
    </div>
  );
}

const SETTINGS_ITEMS = [
  { id: 'account',  label: 'My Account',        icon: UserIcon },
  { id: 'notif',    label: 'My Notifications',   icon: BellIcon },
  { id: 'about',    label: 'About Us',            icon: InfoIcon },
  { id: 'support',  label: 'Customer Support',    icon: ChatIcon },
  { id: 'update',   label: 'Auto Update',         icon: UpdateIcon },
];

export default function SettingsPage({ user, onLogout }) {
  const [openView, setOpenView] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [supportMsg, setSupportMsg] = useState('');
  const [updateStatus, setUpdateStatus] = useState('Up to date');
  const [autoUpdate, setAutoUpdate] = useState(true);

  const loadDeviceInfo = async () => {
    try {
      const info = await Device.getInfo();
      setDeviceInfo(info);
    } catch { setDeviceInfo({ model: 'Unknown', platform: 'android', osVersion: '—' }); }
  };

  const openSub = (id) => {
    setOpenView(id);
    if (id === 'account') loadDeviceInfo();
  };

  const checkUpdate = async () => {
    setUpdateStatus('Checking…');
    await new Promise(r => setTimeout(r, 1500));
    setUpdateStatus('✅ Up to date — v1.0.0');
  };

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ marginBottom: 4 }}>Settings</h1>
        <p style={{ color: 'var(--text2)', fontSize: '0.82rem' }}>Account, preferences, and information</p>
      </div>

      {/* User Card */}
      <div className="card" style={{ padding: '20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>
          {(user?.name || 'U').charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{user?.name || 'User'}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: 2 }}>{user?.email}</div>
          <div style={{ marginTop: 6 }}><span className="badge badge-info">Professional Plan</span></div>
        </div>
      </div>

      {/* Settings Items */}
      <div className="card" style={{ padding: '0 16px' }}>
        {SETTINGS_ITEMS.map(({ id, label, icon: Icon }, idx) => (
          <div key={id} className="result-row" style={{ cursor: 'pointer', padding: '16px 0' }}
            onClick={() => openSub(id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(0,212,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon/>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{label}</span>
            </div>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--text2)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
          </div>
        ))}
      </div>

      <button className="btn btn-danger" style={{ width: '100%', marginTop: 20 }} onClick={onLogout}>
        Sign Out
      </button>

      {/* ── My Account ── */}
      <SubView title="My Account" open={openView === 'account'} onClose={() => setOpenView(null)}>
        <div className="card" style={{ padding: '24px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user?.name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text2)', marginTop: 4 }}>{user?.email}</div>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 8 }}>
            <span className="badge badge-info">Professional</span>
            <span className="badge badge-low">Verified</span>
          </div>
        </div>
        <div className="card" style={{ padding: '0 16px' }}>
          <div className="result-row"><span className="result-key">Joined</span><span className="result-val">{user?.joined}</span></div>
          <div className="result-row"><span className="result-key">Scans Run</span><span className="result-val">{user?.scansRun || 0}</span></div>
          <div className="result-row"><span className="result-key">Plan</span><span className="result-val">Professional</span></div>
          <div className="result-row"><span className="result-key">Consent Given</span><span className="result-val" style={{ color: 'var(--green)' }}>✓ Verified</span></div>
          <div className="result-row"><span className="result-key">App Version</span><span className="result-val">v1.0.0</span></div>
          {deviceInfo && <>
            <div className="result-row"><span className="result-key">Device</span><span className="result-val">{deviceInfo.model}</span></div>
            <div className="result-row"><span className="result-key">Android</span><span className="result-val">{deviceInfo.osVersion}</span></div>
          </>}
        </div>
      </SubView>

      {/* ── Notifications ── */}
      <SubView title="My Notifications" open={openView === 'notif'} onClose={() => setOpenView(null)}>
        <div className="empty-state">
          <div className="empty-icon">🔔</div>
          <div className="empty-text">No notifications yet.<br/>Enable monitoring in Toolkit to receive alerts.</div>
        </div>
      </SubView>

      {/* ── About ── */}
      <SubView title="About Elyzorid" open={openView === 'about'} onClose={() => setOpenView(null)}>
        <div className="card" style={{ padding: '24px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '1.6rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.2em', marginBottom: 6 }}>ELYZORID</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>Android Security Intelligence · v1.0.0</div>
        </div>
        <div className="card" style={{ padding: '0 16px', marginBottom: 14 }}>
          <div className="result-row"><span className="result-key">ML Models</span><span className="result-val" style={{ fontSize: '0.72rem' }}>MobileNetV2 · RF · IsoForest</span></div>
          <div className="result-row"><span className="result-key">XAI Engine</span><span className="result-val">SHAP</span></div>
          <div className="result-row"><span className="result-key">Dataset</span><span className="result-val" style={{ fontSize: '0.72rem' }}>Drebin + AndroZoo</span></div>
          <div className="result-row"><span className="result-key">Privacy</span><span className="result-val" style={{ color: 'var(--green)' }}>On-Device Only</span></div>
          <div className="result-row"><span className="result-key">License</span><span className="result-val">Pro Commercial</span></div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ marginBottom: 10 }}>Privacy Policy</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text2)', lineHeight: 1.8 }}>
            All scanning is performed on-device. No data is transmitted externally unless you explicitly export a report. Clipboard and notification content is analyzed locally and never stored permanently. You may revoke all permissions via Android Settings at any time.
          </p>
        </div>
      </SubView>

      {/* ── Support ── */}
      <SubView title="Customer Support" open={openView === 'support'} onClose={() => setOpenView(null)}>
        <div className="card" style={{ padding: '20px', marginBottom: 14 }}>
          <h3 style={{ marginBottom: 16 }}>Contact Us</h3>
          <div className="form-field">
            <label className="form-label">Subject</label>
            <input className="form-input" type="text" placeholder="Describe your issue…"/>
          </div>
          <div className="form-field">
            <label className="form-label">Message</label>
            <textarea className="form-input" rows="4" placeholder="Tell us more…"
              style={{ resize: 'none', height: 'auto' }}
              value={supportMsg} onChange={e => setSupportMsg(e.target.value)}/>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }}
            onClick={() => { alert('Message sent! We\'ll respond within 24 hours.'); setSupportMsg(''); }}>
            Send Message
          </button>
        </div>
        <div className="card" style={{ padding: '0 16px' }}>
          <div className="result-row"><span className="result-key">Email</span><span className="result-val" style={{ fontSize: '0.75rem' }}>support@elyzorid.app</span></div>
          <div className="result-row"><span className="result-key">Response</span><span className="result-val">&lt; 24 hours</span></div>
          <div className="result-row"><span className="result-key">Hours</span><span className="result-val" style={{ fontSize: '0.75rem' }}>Mon–Fri 9AM–6PM</span></div>
        </div>
      </SubView>

      {/* ── Auto Update ── */}
      <SubView title="Auto Update" open={openView === 'update'} onClose={() => setOpenView(null)}>
        <div className="card" style={{ padding: '0 16px', marginBottom: 14 }}>
          <div className="result-row"><span className="result-key">Current Version</span><span className="result-val">v1.0.0</span></div>
          <div className="result-row">
            <span className="result-key">Auto Update</span>
            <label className="toggle-wrap">
              <input type="checkbox" checked={autoUpdate} onChange={e => setAutoUpdate(e.target.checked)}/>
              <div className="toggle-track"/>
            </label>
          </div>
          <div className="result-row"><span className="result-key">Status</span><span className="result-val" style={{ fontSize: '0.75rem', color: 'var(--green)' }}>{updateStatus}</span></div>
        </div>
        <button className="btn btn-outline" style={{ width: '100%' }} onClick={checkUpdate}>
          🔄 Check for Updates
        </button>
      </SubView>
    </>
  );
}

const UserIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>;
const BellIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>;
const InfoIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const ChatIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const UpdateIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;
