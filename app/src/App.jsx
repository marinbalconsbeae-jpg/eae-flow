import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, query, where } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, createUserWithEmailAndPassword, setPersistence, browserSessionPersistence } from "firebase/auth";

// ─── FIREBASE ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCCw7QDvwDgMIlu6mffq2IDxqKTnnmRZX4",
  authDomain: "eae-flow.firebaseapp.com",
  projectId: "eae-flow",
  storageBucket: "eae-flow.firebasestorage.app",
  messagingSenderId: "451736942421",
  appId: "1:451736942421:web:391558bb21c4fca30521dc"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
setPersistence(auth, browserSessionPersistence);

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
// Palette industrielle eau — sobre, précis, terrain
const T = {
  // Couleurs
  bg: "#F5F6F8",
  surface: "#FFFFFF",
  surfaceHover: "#F8F9FB",
  border: "#E4E6EA",
  borderHover: "#C8CBD2",

  ink: "#0D1117",
  inkMid: "#3D4450",
  inkSub: "#6B7280",
  inkMuted: "#9CA3AF",

  blue: "#1A56DB",
  blueLight: "#EBF2FF",
  blueMid: "#3B7EFF",

  green: "#12B76A",
  greenLight: "#ECFDF5",
  red: "#F04438",
  redLight: "#FEF3F2",
  amber: "#F59E0B",
  amberLight: "#FFFBEB",

  // Missions
  missions: {
    RT_Compteur_Module: "#1A56DB",
    Releve_CPT: "#6D28D9",
    Controle_AC: "#B45309",
    RT_CPT_Arras: "#0891B2",
    RT_CPT_SEPIG: "#0E7490",
    RT_CPT_Suez: "#155E75",
    RT_CPT: "#164E63",
    PI_Poteau_Incendie: "#DC2626",
    Controle_ANC: "#059669",
  },

  // Easings Emil
  easeOut: "cubic-bezier(0.23, 1, 0.32, 1)",
  easeInOut: "cubic-bezier(0.77, 0, 0.175, 1)",
};

// ─── STYLES GLOBAUX ───────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-font-smoothing: antialiased; }
    body {
      font-family: 'IBM Plex Sans', system-ui, sans-serif;
      background: ${T.bg};
      color: ${T.ink};
    }
    input, textarea, button, select { font-family: inherit; }

    /* Scrollbar subtile */
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 99px; }

    /* Focus visible propre */
    :focus-visible { outline: 2px solid ${T.blue}; outline-offset: 2px; border-radius: 4px; }
    button:focus:not(:focus-visible) { outline: none; }

    /* Animations globales */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-6px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Hover rows */
    .table-row {
      transition: background 150ms ${T.easeOut};
    }
    .table-row:hover { background: ${T.surfaceHover} !important; }

    /* Btn press feedback */
    .btn-press:active { transform: scale(0.97); }

    /* Stagger children */
    .stagger > *:nth-child(1) { animation-delay: 0ms; }
    .stagger > *:nth-child(2) { animation-delay: 40ms; }
    .stagger > *:nth-child(3) { animation-delay: 80ms; }
    .stagger > *:nth-child(4) { animation-delay: 120ms; }
    .stagger > *:nth-child(5) { animation-delay: 160ms; }
    .stagger > *:nth-child(6) { animation-delay: 200ms; }
    .stagger > * {
      animation: fadeUp 280ms ${T.easeOut} both;
    }

    /* Input styles */
    .field-input {
      width: 100%;
      border: 1.5px solid ${T.border};
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 14px;
      color: ${T.ink};
      background: ${T.surface};
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }
    .field-input:hover { border-color: ${T.borderHover}; }
    .field-input:focus {
      outline: none;
      border-color: ${T.blue};
      box-shadow: 0 0 0 3px ${T.blueLight};
    }
    .field-input::placeholder { color: ${T.inkMuted}; }
    .field-input:disabled { opacity: 0.5; cursor: not-allowed; background: ${T.bg}; }

    /* Voyant animé */
    @keyframes voyantPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(240, 68, 56, 0.4); }
      50% { box-shadow: 0 0 0 4px rgba(240, 68, 56, 0); }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }

    @media (hover: hover) and (pointer: fine) {
      .hoverable:hover { background: ${T.surfaceHover}; }
    }
  `}</style>
);

// ─── DONNÉES MÉTIER ───────────────────────────────────────────────────────────
const MISSIONS = {
  RT_Compteur_Module: { label: "RT Compteur + Module", couleur: T.missions.RT_Compteur_Module, champs: [
    { key: "total_heures", label: "Total heures", type: "number" },
    { key: "paniers_midi", label: "Paniers midi", type: "number" },
    { key: "paniers_soir", label: "Paniers soir", type: "number" },
    { key: "rdv_jour", label: "RDV jour", type: "number" },
    { key: "cpt_dn15_20", label: "CPT DN15-20", type: "number" },
    { key: "cpt_dn_sup20", label: "CPT DN > 20", type: "number" },
    { key: "rac", label: "RAC", type: "number" },
    { key: "clapets_fact", label: "Clapets facturables", type: "number" },
    { key: "clapets_non_fact", label: "Clapets non fact.", type: "number" },
    { key: "sr_laiton", label: "SR Laiton & divers", type: "number" },
    { key: "reducteurs", label: "Réducteurs pression", type: "number" },
    { key: "mo_heures", label: "MO à déclarer (h)", type: "number" },
    { key: "modules_poses", label: "Modules posés / changés", type: "number" },
    { key: "modules_relances", label: "Modules relancés", type: "number" },
    { key: "cpt_non_faits", label: "CPT vus non faits", type: "number" },
    { key: "depl_injustifies", label: "Dépl. injustifiés", type: "number" },
    { key: "clients_absents", label: "Clients absents avisés", type: "number" },
    { key: "commentaires", label: "Commentaires", type: "textarea" },
  ]},
  Releve_CPT: { label: "Relevé CPT", couleur: T.missions.Releve_CPT, champs: [
    { key: "total_heures", label: "Total heures", type: "number" },
    { key: "paniers_midi", label: "Paniers midi", type: "number" },
    { key: "paniers_soir", label: "Paniers soir", type: "number" },
    { key: "secteurs", label: "Secteurs traités", type: "text" },
    { key: "cpt_releves", label: "CPT relevés", type: "number" },
    { key: "infructueux", label: "Infructueux", type: "number" },
    { key: "absents_pda", label: "CPT absents du PDA", type: "number" },
    { key: "commentaires", label: "Commentaires", type: "textarea" },
  ]},
  Controle_AC: { label: "Contrôle AC", couleur: T.missions.Controle_AC, champs: [
    { key: "total_heures", label: "Total heures", type: "number" },
    { key: "paniers_midi", label: "Paniers midi", type: "number" },
    { key: "paniers_soir", label: "Paniers soir", type: "number" },
    { key: "rdv_eae", label: "RDV pris par EAE", type: "number" },
    { key: "ctrl_vente_inf10", label: "Ctrl AC Vente < 10 pts", type: "number" },
    { key: "ctrl_vente_sup10", label: "Ctrl AC Vente > 10 pts", type: "number" },
    { key: "ctrl_contrat_inf10", label: "Ctrl AC Contrat. < 10 pts", type: "number" },
    { key: "ctrl_contrat_sup10", label: "Ctrl AC Contrat. > 10 pts", type: "number" },
    { key: "clients_absents", label: "Clients absents avisés", type: "number" },
    { key: "commentaires", label: "Commentaires", type: "textarea" },
  ]},
  RT_CPT_Arras: { label: "RT CPT Arras", couleur: T.missions.RT_CPT_Arras, champs: [
    { key: "total_heures", label: "Total heures", type: "number" },
    { key: "paniers_midi", label: "Paniers midi", type: "number" },
    { key: "paniers_soir", label: "Paniers soir", type: "number" },
    { key: "rdv_jour", label: "RDV jour", type: "number" },
    { key: "cpt_dn15_20", label: "CPT DN15-20", type: "number" },
    { key: "cpt_dn_sup20", label: "CPT DN > 20", type: "number" },
    { key: "rac", label: "RAC", type: "number" },
    { key: "clapets_fact", label: "Clapets facturables", type: "number" },
    { key: "modules_poses", label: "Modules posés / changés", type: "number" },
    { key: "cpt_non_faits", label: "CPT vus non faits", type: "number" },
    { key: "depl_injustifies", label: "Dépl. injustifiés", type: "number" },
    { key: "clients_absents", label: "Clients absents avisés", type: "number" },
    { key: "commentaires", label: "Commentaires", type: "textarea" },
  ]},
  RT_CPT_SEPIG: { label: "RT CPT SEPIG DN30-40", couleur: T.missions.RT_CPT_SEPIG, champs: [
    { key: "total_heures", label: "Total heures", type: "number" },
    { key: "paniers_midi", label: "Paniers midi", type: "number" },
    { key: "paniers_soir", label: "Paniers soir", type: "number" },
    { key: "rdv_jour", label: "RDV jour", type: "number" },
    { key: "cpt_dn30_40", label: "CPT DN30-40", type: "number" },
    { key: "rac", label: "RAC", type: "number" },
    { key: "clapets_fact", label: "Clapets facturables", type: "number" },
    { key: "mo_heures", label: "MO à déclarer (h)", type: "number" },
    { key: "cpt_non_faits", label: "CPT vus non faits", type: "number" },
    { key: "depl_injustifies", label: "Dépl. injustifiés", type: "number" },
    { key: "clients_absents", label: "Clients absents avisés", type: "number" },
    { key: "commentaires", label: "Commentaires", type: "textarea" },
  ]},
  RT_CPT_Suez: { label: "RT CPT Suez PRC", couleur: T.missions.RT_CPT_Suez, champs: [
    { key: "total_heures", label: "Total heures", type: "number" },
    { key: "paniers_midi", label: "Paniers midi", type: "number" },
    { key: "paniers_soir", label: "Paniers soir", type: "number" },
    { key: "rdv_jour", label: "RDV jour", type: "number" },
    { key: "cpt_dn15_20", label: "CPT DN15-20", type: "number" },
    { key: "cpt_dn_sup20", label: "CPT DN > 20", type: "number" },
    { key: "rac", label: "RAC", type: "number" },
    { key: "clapets_fact", label: "Clapets facturables", type: "number" },
    { key: "modules_poses", label: "Modules posés / changés", type: "number" },
    { key: "cpt_non_faits", label: "CPT vus non faits", type: "number" },
    { key: "clients_absents", label: "Clients absents avisés", type: "number" },
    { key: "commentaires", label: "Commentaires", type: "textarea" },
  ]},
  RT_CPT: { label: "RT CPT générique", couleur: T.missions.RT_CPT, champs: [
    { key: "total_heures", label: "Total heures", type: "number" },
    { key: "paniers_midi", label: "Paniers midi", type: "number" },
    { key: "paniers_soir", label: "Paniers soir", type: "number" },
    { key: "rdv_jour", label: "RDV jour", type: "number" },
    { key: "cpt_dn15_20", label: "CPT DN15-20", type: "number" },
    { key: "cpt_dn_sup20", label: "CPT DN > 20", type: "number" },
    { key: "rac", label: "RAC", type: "number" },
    { key: "cpt_non_faits", label: "CPT vus non faits", type: "number" },
    { key: "clients_absents", label: "Clients absents avisés", type: "number" },
    { key: "commentaires", label: "Commentaires", type: "textarea" },
  ]},
  PI_Poteau_Incendie: { label: "PI Poteau Incendie", couleur: T.missions.PI_Poteau_Incendie, champs: [
    { key: "total_heures", label: "Total heures", type: "number" },
    { key: "paniers_midi", label: "Paniers midi", type: "number" },
    { key: "paniers_soir", label: "Paniers soir", type: "number" },
    { key: "pi_visites", label: "PI visités", type: "number" },
    { key: "pi_conformes", label: "PI conformes", type: "number" },
    { key: "pi_non_conformes", label: "PI non conformes", type: "number" },
    { key: "pi_inaccessibles", label: "PI inaccessibles", type: "number" },
    { key: "commentaires", label: "Commentaires", type: "textarea" },
  ]},
  Controle_ANC: { label: "Contrôle ANC", couleur: T.missions.Controle_ANC, champs: [
    { key: "total_heures", label: "Total heures", type: "number" },
    { key: "paniers_midi", label: "Paniers midi", type: "number" },
    { key: "paniers_soir", label: "Paniers soir", type: "number" },
    { key: "rdv_eae", label: "RDV pris par EAE", type: "number" },
    { key: "ctrl_anc_conformes", label: "ANC conformes", type: "number" },
    { key: "ctrl_anc_non_conformes", label: "ANC non conformes", type: "number" },
    { key: "ctrl_anc_inaccessibles", label: "ANC inaccessibles", type: "number" },
    { key: "clients_absents", label: "Clients absents avisés", type: "number" },
    { key: "commentaires", label: "Commentaires", type: "textarea" },
  ]},
};

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const CHAMPS_PAR_MISSION = {
  RT_Compteur_Module: ["cpt_dn15_20", "cpt_dn_sup20", "modules_poses", "rac"],
  Releve_CPT:         ["cpt_releves", "infructueux", "absents_pda", "total_heures"],
  Controle_AC:        ["ctrl_vente_inf10", "ctrl_vente_sup10", "ctrl_contrat_inf10", "clients_absents"],
  RT_CPT_Arras:       ["cpt_dn15_20", "cpt_dn_sup20", "rac", "total_heures"],
  RT_CPT_SEPIG:       ["cpt_dn30_40", "rac", "mo_heures", "total_heures"],
  RT_CPT_Suez:        ["cpt_dn15_20", "cpt_dn_sup20", "modules_poses", "total_heures"],
  RT_CPT:             ["cpt_dn15_20", "cpt_dn_sup20", "rac", "total_heures"],
  PI_Poteau_Incendie: ["pi_visites", "pi_conformes", "pi_non_conformes", "total_heures"],
  Controle_ANC:       ["ctrl_anc_conformes", "ctrl_anc_non_conformes", "ctrl_anc_inaccessibles", "total_heures"],
};

function getDateKey() { return new Date().toISOString().split("T")[0]; }
function getNumeroSemaine() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
}
function getSemaineKey() { return `${new Date().getFullYear()}-S${getNumeroSemaine()}`; }
function getJourActuel() { return (new Date().getDay() + 6) % 7; }
function getDateDuJour(jourIdx) {
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() - getJourActuel() + jourIdx);
  return d.toISOString().split("T")[0];
}

// ─── FIREBASE HELPERS ─────────────────────────────────────────────────────────
async function chargerProfil(uid) {
  const snap = await getDoc(doc(db, "utilisateurs", uid));
  return snap.exists() ? snap.data() : null;
}
async function chargerSaisiesJour() {
  const q = query(collection(db, "saisies"), where("date", "==", getDateKey()));
  const snap = await getDocs(q);
  const r = {};
  snap.forEach(d => { r[d.data().tech_id] = d.data(); });
  return r;
}
async function chargerSaisiesSemaine(techId) {
  const q = query(collection(db, "saisies"), where("semaine", "==", getSemaineKey()), where("tech_id", "==", techId));
  const snap = await getDocs(q);
  const r = {};
  snap.forEach(d => { r[d.data().date] = d.data(); });
  return r;
}
async function chargerMesTechniciens(caId) {
  const q = query(collection(db, "utilisateurs"), where("role", "==", "technicien"), where("charge_id", "==", caId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}
async function chargerTousTechniciens() {
  const q = query(collection(db, "utilisateurs"), where("role", "==", "technicien"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}
async function sauvegarderSaisie(techId, data) {
  await setDoc(doc(db, "saisies", `${techId}_${getDateKey()}`), {
    ...data, tech_id: techId, date: getDateKey(), semaine: getSemaineKey(),
    timestamp: new Date().toISOString(),
  });
}
async function creerTechnicien(caId, form) {
  const cred = await createUserWithEmailAndPassword(auth, form.email, Math.random().toString(36).slice(-10));
  await setDoc(doc(db, "utilisateurs", cred.user.uid), { ...form, role: "technicien", charge_id: caId, uid: cred.user.uid, date_creation: new Date().toISOString() });
  await sendPasswordResetEmail(auth, form.email);
}
async function supprimerTechnicien(uid) { await deleteDoc(doc(db, "utilisateurs", uid)); }
async function modifierTechnicien(uid, { mission, fournisseur }) {
  await updateDoc(doc(db, "utilisateurs", uid), { mission, fournisseur });
}

const FOURNISSEURS = ["Iléo", "CUA", "Véolia", "Suez", "SEPIG", "Autre"];

// ─── COMPOSANTS PRIMITIFS ─────────────────────────────────────────────────────

// Voyant avec animation pulse pour non-saisi
const Voyant = ({ saisi, size = 8 }) => (
  <span style={{
    display: "inline-block",
    width: size, height: size,
    borderRadius: "50%",
    background: saisi ? T.green : T.red,
    flexShrink: 0,
    animation: saisi ? "none" : "voyantPulse 2s ease-in-out infinite",
    transition: `background 300ms ${T.easeOut}`,
  }} />
);

// Badge mission avec monospace pour les chiffres
const Badge = ({ couleur, label, small }) => (
  <span style={{
    background: couleur + "14",
    color: couleur,
    border: `1px solid ${couleur}28`,
    borderRadius: 6,
    padding: small ? "1px 7px" : "2px 9px",
    fontSize: small ? 10 : 11,
    fontWeight: 600,
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    transition: `background 150ms ${T.easeOut}`,
  }}>{label}</span>
);

// Card avec hover subtil
const Card = ({ children, style, animate }) => (
  <div style={{
    background: T.surface,
    borderRadius: 12,
    border: `1px solid ${T.border}`,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    overflow: "hidden",
    animation: animate ? `fadeUp 280ms ${T.easeOut} both` : "none",
    ...style,
  }}>{children}</div>
);

// Avatar avec initiales
const Avatar = ({ prenom, nom, couleur, size = 36 }) => (
  <div style={{
    width: size, height: size,
    borderRadius: "50%",
    background: couleur + "18",
    color: couleur,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: Math.round(size * 0.32),
    fontWeight: 700,
    flexShrink: 0,
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "-0.02em",
    transition: `background 200ms ${T.easeOut}`,
  }}>
    {prenom?.[0]}{nom?.[0]}
  </div>
);

// Bouton avec feedback press
const Btn = ({ children, onClick, variant = "primary", style, disabled, type = "button", loading }) => {
  const variants = {
    primary: { background: T.blue, color: "#fff", border: "none", boxShadow: `0 1px 2px rgba(26,86,219,0.3)` },
    secondary: { background: T.surface, color: T.inkMid, border: `1.5px solid ${T.border}` },
    ghost: { background: "transparent", color: T.inkSub, border: "1.5px solid transparent" },
    danger: { background: T.redLight, color: T.red, border: `1.5px solid #FECDCA` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className="btn-press" style={{
      ...variants[variant],
      borderRadius: 8,
      padding: "8px 16px",
      fontSize: 13,
      fontWeight: 600,
      cursor: (disabled || loading) ? "not-allowed" : "pointer",
      opacity: (disabled || loading) ? 0.55 : 1,
      display: "inline-flex", alignItems: "center", gap: 7,
      transition: `opacity 150ms ease, transform 100ms ${T.easeOut}, box-shadow 150ms ease`,
      whiteSpace: "nowrap",
      ...style,
    }}>
      {loading && <div style={{ width: 12, height: 12, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
      {children}
    </button>
  );
};

// Spinner
const Spinner = ({ full }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: full ? 0 : 48, minHeight: full ? "100vh" : "auto" }}>
    <div style={{ width: 24, height: 24, border: `2.5px solid ${T.border}`, borderTopColor: T.blue, borderRadius: "50%", animation: "spin 0.65s linear infinite" }} />
  </div>
);

// Champ de saisie
const Field = ({ label, sublabel, error, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    {label && (
      <label style={{ fontSize: 12, fontWeight: 600, color: T.inkMid, display: "flex", alignItems: "center", gap: 6 }}>
        {label}
        {sublabel && <span style={{ fontWeight: 400, color: T.inkMuted }}>{sublabel}</span>}
      </label>
    )}
    {children}
    {error && <p style={{ fontSize: 11, color: T.red, margin: 0 }}>{error}</p>}
  </div>
);

// Stat block avec monospace pour les chiffres
const StatBlock = ({ value, label, couleur, style }) => (
  <div style={{ textAlign: "center", padding: "18px 12px", background: T.bg, borderRadius: 10, ...style }}>
    <div style={{
      fontSize: 32, fontWeight: 700,
      color: couleur || T.ink,
      fontFamily: "'IBM Plex Mono', monospace",
      lineHeight: 1,
      marginBottom: 6,
      transition: `color 300ms ${T.easeOut}`,
    }}>{value}</div>
    <div style={{ fontSize: 11, color: T.inkSub, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
  </div>
);

// Alert banner
const Alert = ({ type = "warning", children, style }) => {
  const cfg = {
    warning: { bg: T.amberLight, border: "#FDE68A", color: "#92400E" },
    success: { bg: T.greenLight, border: "#A7F3D0", color: "#065F46" },
    error: { bg: T.redLight, border: "#FECDCA", color: "#9B1C1C" },
    info: { bg: T.blueLight, border: "#BFDBFE", color: "#1E40AF" },
  }[type];
  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 10, padding: "11px 16px",
      fontSize: 13, color: cfg.color,
      display: "flex", alignItems: "flex-start", gap: 10,
      animation: `fadeUp 200ms ${T.easeOut} both`,
      ...style,
    }}>{children}</div>
  );
};

// Divider avec label
const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, color: T.inkMuted,
    textTransform: "uppercase", letterSpacing: "0.1em",
    marginBottom: 10,
    display: "flex", alignItems: "center", gap: 10,
  }}>
    <span>{children}</span>
    <div style={{ flex: 1, height: 1, background: T.border }} />
  </div>
);

// ─── ÉCRAN CONNEXION ──────────────────────────────────────────────────────────
const VueConnexion = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);
  const [reinit, setReinit] = useState(false);
  const [reinitOk, setReinitOk] = useState(false);

  const handleConnexion = async (e) => {
    e.preventDefault();
    setErreur(""); setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, mdp);
      const profil = await chargerProfil(cred.user.uid);
      if (!profil) throw new Error("Profil introuvable");
      onLogin({ ...profil, uid: cred.user.uid });
    } catch { setErreur("Email ou mot de passe incorrect."); }
    finally { setLoading(false); }
  };

  const handleReinit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await sendPasswordResetEmail(auth, email); setReinitOk(true); }
    catch { setErreur("Email introuvable."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {/* Grille décorative subtile */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
        backgroundSize: "32px 32px",
      }} />

      <div style={{ width: "100%", maxWidth: 380, animation: `fadeUp 350ms ${T.easeOut} both` }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52,
            background: "linear-gradient(135deg, #1A56DB 0%, #3B7EFF 100%)",
            borderRadius: 14,
            margin: "0 auto 16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(26,86,219,0.4)",
          }}>
            <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2C8 2 4 5.5 4 10c0 6 8 12 8 12s8-6 8-12c0-4.5-4-8-8-8z" strokeLinejoin="round"/>
              <circle cx="12" cy="10" r="2.5" fill="#fff" stroke="none"/>
            </svg>
          </div>
          <h1 style={{ color: "#F1F5F9", fontSize: 22, fontWeight: 700, margin: "0 0 5px", letterSpacing: "-0.02em" }}>EAE Flow</h1>
          <p style={{ color: "#475569", fontSize: 13 }}>Suivi hebdomadaire · Techniciens terrain</p>
        </div>

        {/* Card connexion */}
        <div style={{
          background: "#131C2E",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          {!reinit ? (
            <>
              <p style={{ color: "#64748B", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Connexion</p>
              <form onSubmit={handleConnexion} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 6 }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="votre@email.com"
                    style={{ width: "100%", background: "#0B1220", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#F1F5F9", transition: "border-color 150ms ease" }}
                    onFocus={e => e.target.style.borderColor = T.blue}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 6 }}>Mot de passe</label>
                  <input type="password" value={mdp} onChange={e => setMdp(e.target.value)} required placeholder="••••••••"
                    style={{ width: "100%", background: "#0B1220", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#F1F5F9", transition: "border-color 150ms ease" }}
                    onFocus={e => e.target.style.borderColor = T.blue}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>
                {erreur && <Alert type="error">{erreur}</Alert>}
                <button type="submit" disabled={loading} className="btn-press" style={{
                  background: "linear-gradient(135deg, #1A56DB, #2D6FF5)",
                  color: "#fff", border: "none", borderRadius: 9,
                  padding: "11px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(26,86,219,0.4)",
                  transition: `opacity 150ms ease, transform 100ms ${T.easeOut}`,
                  opacity: loading ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  {loading && <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.65s linear infinite" }} />}
                  {loading ? "Connexion..." : "Se connecter"}
                </button>
                <button type="button" onClick={() => { setReinit(true); setErreur(""); }}
                  style={{ background: "none", border: "none", color: "#475569", fontSize: 12, cursor: "pointer", textAlign: "center", padding: "4px", transition: "color 150ms ease" }}
                  onMouseOver={e => e.target.style.color = "#94A3B8"}
                  onMouseOut={e => e.target.style.color = "#475569"}>
                  Mot de passe oublié
                </button>
              </form>
            </>
          ) : (
            <>
              <p style={{ color: "#64748B", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Réinitialisation</p>
              {reinitOk ? (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <Alert type="success" style={{ marginBottom: 16 }}>Lien de réinitialisation envoyé à {email}</Alert>
                  <button onClick={() => { setReinit(false); setReinitOk(false); }} style={{ background: "none", border: "none", color: "#64748B", fontSize: 13, cursor: "pointer" }}>
                    Retour à la connexion
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReinit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 6 }}>Votre email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      style={{ width: "100%", background: "#0B1220", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#F1F5F9" }} />
                  </div>
                  {erreur && <Alert type="error">{erreur}</Alert>}
                  <button type="submit" disabled={loading} style={{ background: T.blue, color: "#fff", border: "none", borderRadius: 9, padding: "11px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    {loading ? "Envoi..." : "Envoyer le lien"}
                  </button>
                  <button type="button" onClick={() => setReinit(false)} style={{ background: "none", border: "none", color: "#475569", fontSize: 12, cursor: "pointer" }}>Retour</button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── HEADER ───────────────────────────────────────────────────────────────────
const Header = ({ user, onLogout, page, onChangePage }) => {
  const isTech = user.role === "technicien";
  const mission = isTech && user.mission ? MISSIONS[user.mission] : null;

  const navItems = isTech
    ? [{ id: "saisie", label: "Saisie du jour" }, { id: "mon_suivi", label: "Mon suivi" }]
    : [{ id: "dashboard", label: "Dashboard" }, { id: "historique", label: "Historique" }, { id: "gestion", label: "Mes techniciens" }];

  return (
    <header style={{
      background: T.surface,
      borderBottom: `1px solid ${T.border}`,
      padding: "0 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 56,
      position: "sticky", top: 0, zIndex: 100,
      boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
    }}>
      {/* Logo + Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, paddingRight: 20, borderRight: `1px solid ${T.border}` }}>
          <div style={{ width: 26, height: 26, background: T.blue, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="13" height="13" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2C8 2 4 5.5 4 10c0 6 8 12 8 12s8-6 8-12c0-4.5-4-8-8-8z" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 13, color: T.ink, letterSpacing: "-0.01em" }}>EAE Flow</span>
        </div>

        <nav style={{ display: "flex", gap: 2 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => onChangePage(item.id)} style={{
              background: page === item.id ? T.blueLight : "transparent",
              color: page === item.id ? T.blue : T.inkSub,
              border: "none", borderRadius: 7,
              padding: "5px 13px", fontSize: 13,
              fontWeight: page === item.id ? 600 : 500,
              cursor: "pointer",
              transition: `background 150ms ${T.easeOut}, color 150ms ${T.easeOut}`,
            }}>{item.label}</button>
          ))}
        </nav>
      </div>

      {/* Profil */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {mission && <Badge couleur={mission.couleur} label={mission.label} />}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{user.prenom} {user.nom}</div>
          <div style={{ fontSize: 11, color: T.inkMuted }}>{{ technicien: "Technicien", charge_affaires: "Chargé d'affaires" }[user.role] || user.role}</div>
        </div>
        <button
          onClick={async () => { await signOut(auth); window.location.reload(); }}
          title="Changer de compte"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: T.inkMuted, padding: "4px 6px", borderRadius: 5, transition: `color 150ms ease` }}
          onMouseOver={e => e.currentTarget.style.color = T.inkSub}
          onMouseOut={e => e.currentTarget.style.color = T.inkMuted}
        >Changer de compte</button>
        <button onClick={onLogout} title="Déconnexion" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, borderRadius: "50%" }}>
          <Avatar prenom={user.prenom} nom={user.nom} couleur={isTech ? T.blue : T.green} size={34} />
        </button>
      </div>
    </header>
  );
};

// ─── VUE SAISIE TECHNICIEN ────────────────────────────────────────────────────
const VueSaisie = ({ user }) => {
  const mission = MISSIONS[user.mission];
  const jourIdx = getJourActuel();
  const [form, setForm] = useState({});
  const [statut, setStatut] = useState("loading");
  const [dejaModifie, setDejaModifie] = useState(false);

  useEffect(() => {
    chargerSaisiesJour().then(s => {
      if (s[user.uid]) { setForm(s[user.uid]); setDejaModifie(!!s[user.uid].modifie); }
      setStatut("idle");
    }).catch(() => setStatut("idle"));
  }, []);

  const handleSubmit = async () => {
    if (dejaModifie) return;
    setStatut("saving");
    try {
      await sauvegarderSaisie(user.uid, { ...form, modifie: !!form.tech_id });
      setStatut("saved");
      if (form.tech_id) setDejaModifie(true);
    } catch { setStatut("error"); }
  };

  if (statut === "loading") return <Spinner />;

  return (
    <div style={{ padding: "28px 24px", maxWidth: 640, margin: "0 auto" }}>
      {/* En-tête */}
      <div style={{ marginBottom: 24, animation: `fadeUp 250ms ${T.easeOut} both` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>
            Saisie — <span style={{ color: mission?.couleur }}>{JOURS[jourIdx] || "Aujourd'hui"}</span>
          </h1>
          {mission && <Badge couleur={mission.couleur} label={mission.label} />}
        </div>
        <p style={{ color: T.inkSub, fontSize: 13 }}>
          {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Bannières état */}
      {form.tech_id && statut !== "saved" && !dejaModifie && (
        <Alert type="warning" style={{ marginBottom: 20 }}>
          Vous avez déjà saisi aujourd'hui. Modification possible une seule fois.
        </Alert>
      )}
      {dejaModifie && (
        <Alert type="info" style={{ marginBottom: 20 }}>
          Saisie verrouillée — modification déjà effectuée aujourd'hui.
        </Alert>
      )}
      {statut === "saved" && (
        <Alert type="success" style={{ marginBottom: 20 }}>
          Saisie enregistrée. Merci !
        </Alert>
      )}
      {statut === "error" && (
        <Alert type="error" style={{ marginBottom: 20 }}>
          Erreur lors de l'enregistrement. Vérifiez votre connexion.
        </Alert>
      )}

      {/* Formulaire */}
      {mission && (
        <Card animate style={{ padding: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {mission.champs.map((champ, i) => champ.type === "textarea" ? (
              <Field key={champ.key} label={champ.label} style={{ gridColumn: "1/-1" }}>
                <textarea
                  value={form[champ.key] || ""} rows={3} disabled={dejaModifie}
                  onChange={e => setForm(p => ({ ...p, [champ.key]: e.target.value }))}
                  className="field-input"
                  style={{ resize: "vertical", fontFamily: "inherit", gridColumn: "1/-1" }}
                  placeholder="Vos commentaires..."
                />
              </Field>
            ) : (
              <Field key={champ.key} label={champ.label}>
                <input
                  type={champ.type} value={form[champ.key] ?? ""} min={0}
                  disabled={dejaModifie}
                  onChange={e => setForm(p => ({ ...p, [champ.key]: champ.type === "number" ? Number(e.target.value) : e.target.value }))}
                  className="field-input"
                  style={{ fontFamily: champ.type === "number" ? "'IBM Plex Mono', monospace" : "inherit", fontWeight: champ.type === "number" ? 500 : 400 }}
                  placeholder="0"
                />
              </Field>
            ))}
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end" }}>
            <Btn onClick={handleSubmit} disabled={dejaModifie} loading={statut === "saving"}>
              {form.tech_id ? "Modifier la saisie" : "Valider ma saisie"}
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
};

// ─── VUE MON SUIVI ────────────────────────────────────────────────────────────
const VueMonSuivi = ({ user }) => {
  const mission = MISSIONS[user.mission];
  const jourActuel = getJourActuel();
  const [saisiesSem, setSaisiesSem] = useState({});
  const [loading, setLoading] = useState(true);
  const champsPrincipaux = mission?.champs.filter(c => c.type === "number").slice(0, 3) || [];

  useEffect(() => {
    chargerSaisiesSemaine(user.uid).then(d => { setSaisiesSem(d); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;

  return (
    <div style={{ padding: "28px 24px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, animation: `fadeUp 250ms ${T.easeOut} both` }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", marginBottom: 4 }}>Mon suivi</h1>
        <p style={{ color: T.inkSub, fontSize: 13 }}>Semaine S{getNumeroSemaine()} · {new Date().getFullYear()}</p>
      </div>

      {/* Grille jours — stagger */}
      <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 20 }}>
        {JOURS.map((jour, idx) => {
          const saisie = saisiesSem[getDateDuJour(idx)];
          const estAujourdHui = idx === jourActuel;
          const estFutur = idx > jourActuel;
          return (
            <div key={jour} style={{
              background: T.surface,
              borderRadius: 10,
              border: estAujourdHui ? `2px solid ${T.blue}` : `1px solid ${T.border}`,
              padding: "14px 8px",
              textAlign: "center",
              opacity: estFutur ? 0.35 : 1,
              transition: `border-color 200ms ${T.easeOut}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                {jour.slice(0, 3)}
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                <Voyant saisi={!!saisie} size={9} />
              </div>
              {saisie && champsPrincipaux[0] && (
                <>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1, marginBottom: 3 }}>
                    {saisie[champsPrincipaux[0].key] || 0}
                  </div>
                  <div style={{ fontSize: 9, color: T.inkMuted, lineHeight: 1.3 }}>{champsPrincipaux[0].label}</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Totaux */}
      <Card animate style={{ marginBottom: 16 }}>
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${T.border}` }}>
          <SectionLabel>Totaux semaine</SectionLabel>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {champsPrincipaux.map((champ, i) => {
            const total = JOURS.reduce((acc, _, idx) => acc + ((saisiesSem[getDateDuJour(idx)]?.[champ.key]) || 0), 0);
            return (
              <div key={champ.key} style={{
                padding: "20px 16px", textAlign: "center",
                borderRight: i < champsPrincipaux.length - 1 ? `1px solid ${T.border}` : "none",
              }}>
                <div style={{ fontSize: 34, fontWeight: 700, color: mission?.couleur, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1, marginBottom: 6 }}>
                  {total}
                </div>
                <div style={{ fontSize: 11, color: T.inkSub, fontWeight: 500 }}>{champ.label}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

// ─── VUE DASHBOARD CA ─────────────────────────────────────────────────────────
const VueDashboard = ({ user, onVoirProfil }) => {
  const [techniciens, setTechniciens] = useState([]);
  const [saisiesJour, setSaisiesJour] = useState({});
  const [tousTechs, setTousTechs] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef(null);

  useEffect(() => {
    Promise.all([chargerMesTechniciens(user.uid), chargerSaisiesJour(), chargerTousTechniciens()])
      .then(([techs, saisies, tous]) => { setTechniciens(techs); setSaisiesJour(saisies); setTousTechs(tous); setLoading(false); });
  }, []);

  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [openComment, setOpenComment] = useState(null);
  const parMission = techniciens.reduce((acc, t) => { if (!acc[t.mission]) acc[t.mission] = []; acc[t.mission].push(t); return acc; }, {});
  const autresTech = recherche.length > 1 ? tousTechs.filter(t => t.charge_id !== user.uid && (`${t.nom} ${t.prenom}`).toLowerCase().includes(recherche.toLowerCase())) : [];
  const nbNonSaisi = techniciens.filter(t => !saisiesJour[t.uid]).length;
  const nbSaisi = techniciens.length - nbNonSaisi;

  if (loading) return <Spinner />;

  return (
    <div style={{ padding: "28px 24px" }}>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, animation: `fadeUp 250ms ${T.easeOut} both` }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", marginBottom: 4 }}>
            Dashboard <span style={{ color: T.inkMuted, fontWeight: 500 }}>— S{getNumeroSemaine()}</span>
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: T.inkSub }}>{techniciens.length} techniciens</span>
            <span style={{ fontSize: 13, color: T.inkSub }}>·</span>
            <span style={{ fontSize: 13, color: T.inkSub }}>
              {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            </span>
            {/* Barre de progression saisies du jour */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
              <div style={{ width: 80, height: 5, background: T.border, borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${techniciens.length > 0 ? (nbSaisi / techniciens.length) * 100 : 0}%`,
                  background: nbSaisi === techniciens.length ? T.green : T.blue,
                  borderRadius: 99,
                  transition: `width 600ms ${T.easeOut}`,
                }} />
              </div>
              <span style={{ fontSize: 12, color: T.inkSub, fontFamily: "'IBM Plex Mono', monospace" }}>
                {nbSaisi}/{techniciens.length}
              </span>
            </div>
          </div>
        </div>

        {/* Recherche */}
        <div ref={searchRef} style={{ position: "relative" }}>
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: T.inkMuted, pointerEvents: "none" }}
              width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="Rechercher un technicien..." value={recherche}
              onChange={e => { setRecherche(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              className="field-input"
              style={{ paddingLeft: 34, width: 260, fontSize: 13 }} />
          </div>

          {showDropdown && autresTech.length > 0 && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
              zIndex: 50, width: 320, padding: 8,
              animation: `slideDown 180ms ${T.easeOut} both`,
            }}>
              <div style={{ fontSize: 10, color: T.inkMuted, padding: "4px 10px 8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Autres techniciens
              </div>
              {autresTech.map(t => {
                const m = MISSIONS[t.mission];
                return (
                  <div key={t.uid}
                    onClick={() => { onVoirProfil(t); setShowDropdown(false); setRecherche(""); }}
                    className="hoverable"
                    style={{ padding: "9px 10px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: `background 120ms ${T.easeOut}` }}>
                    <Avatar prenom={t.prenom} nom={t.nom} couleur={m?.couleur || T.inkSub} size={30} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{t.prenom} {t.nom}</div>
                      <div style={{ fontSize: 11, color: T.inkSub }}>{m?.label} · {t.fournisseur}</div>
                    </div>
                    <Voyant saisi={!!saisiesJour[t.uid]} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Alerte non-saisies */}
      {nbNonSaisi > 0 && (
        <Alert type="error" style={{ marginBottom: 20 }}>
          <Voyant saisi={false} />
          <span>
            <strong>{nbNonSaisi} technicien{nbNonSaisi > 1 ? "s" : ""}</strong> sans saisie aujourd'hui.
            Rappel automatique à 20h.
          </span>
        </Alert>
      )}

      {/* Tableaux par mission */}
      {Object.entries(parMission).map(([missionKey, techs]) => {
        const mission = MISSIONS[missionKey];
        const champKeys = CHAMPS_PAR_MISSION[missionKey] || mission?.champs.filter(c => c.type === "number").slice(0, 4).map(c => c.key) || [];
        const champs4 = champKeys.map(k => mission?.champs.find(c => c.key === k)).filter(Boolean);
        const total = techs.reduce((acc, t) => acc + ((saisiesJour[t.uid]?.[champs4[0]?.key]) || 0), 0);

        return (
          <div key={missionKey} style={{ marginBottom: 24, animation: `fadeUp 300ms ${T.easeOut} both` }}>
            {/* Header groupe */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 2px" }}>
              <div style={{ width: 3, height: 16, borderRadius: 99, background: mission?.couleur }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: T.inkMid, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {mission?.label}
              </span>
              <span style={{ fontSize: 11, color: T.inkMuted }}>— {techs.length} technicien{techs.length > 1 ? "s" : ""}</span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: T.inkSub }}>Total jour :</span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 14, fontWeight: 700,
                  color: mission?.couleur,
                  background: (mission?.couleur || T.blue) + "12",
                  padding: "2px 10px", borderRadius: 6,
                }}>{total}</span>
              </div>
            </div>

            <Card>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Technicien", "Fournisseur", ...champs4.map(c => c.label), "Statut"].map(h => (
                      <th key={h} style={{
                        textAlign: h === "Technicien" ? "left" : "center",
                        padding: "10px 16px",
                        fontSize: 10, color: T.inkMuted, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.08em",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {techs.map((tech, i) => {
                    const saisie = saisiesJour[tech.uid];
                    return (
                      <>
                      <tr key={tech.uid} className="table-row" style={{
                        borderBottom: openComment === tech.uid ? "none" : (i < techs.length - 1 ? `1px solid ${T.border}` : "none"),
                        background: !saisie ? "#FFFBFB" : T.surface,
                      }}>
                        <td style={{ padding: "13px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar prenom={tech.prenom} nom={tech.nom} couleur={mission?.couleur || T.inkSub} size={32} />
                            <span
                              onClick={() => onVoirProfil(tech)}
                              style={{ fontSize: 13, fontWeight: 600, color: T.blue, cursor: "pointer", textDecoration: "underline", textDecorationColor: T.blue + "60" }}
                            >{tech.prenom} {tech.nom}</span>
                          </div>
                        </td>
                        <td style={{ padding: "13px 16px", textAlign: "center" }}>
                          <span style={{ fontSize: 12, color: T.inkSub }}>{tech.fournisseur}</span>
                        </td>
                        {champs4.map((champ, ci) => (
                          <td key={champ.key} style={{ padding: "13px 16px", textAlign: "center" }}>
                            <span style={{
                              fontSize: ci === 0 ? 16 : 14,
                              fontWeight: ci === 0 ? 700 : 600,
                              color: saisie ? (ci === 0 ? mission?.couleur : T.inkMid) : T.border,
                              fontFamily: "'IBM Plex Mono', monospace",
                            }}>
                              {saisie ? (saisie[champ.key] ?? 0) : "—"}
                            </span>
                          </td>
                        ))}
                        <td style={{ padding: "13px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                            <Voyant saisi={!!saisie} />
                            <span style={{ fontSize: 12, fontWeight: 500, color: saisie ? T.green : T.red }}>
                              {saisie ? "Saisi" : "Non saisi"}
                            </span>
                            {saisie?.commentaires && (
                              <button
                                onClick={() => setOpenComment(openComment === tech.uid ? null : tech.uid)}
                                title="Voir commentaires"
                                style={{ background: openComment === tech.uid ? T.amberLight : "transparent", border: `1px solid ${openComment === tech.uid ? "#FDE68A" : T.border}`, borderRadius: 5, padding: "2px 5px", cursor: "pointer", lineHeight: 1, fontSize: 12, transition: `background 150ms ease` }}
                              >💬</button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {openComment === tech.uid && saisie?.commentaires && (
                        <tr style={{ background: T.amberLight }}>
                          <td colSpan={champs4.length + 3} style={{ padding: "10px 16px 12px 72px", borderBottom: i < techs.length - 1 ? `1px solid #FDE68A` : "none" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 10 }}>Commentaires</span>
                            <span style={{ fontSize: 13, color: "#78350F", lineHeight: 1.5 }}>{saisie.commentaires}</span>
                          </td>
                        </tr>
                      )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

// ─── VUE GESTION TECHNICIENS ──────────────────────────────────────────────────
const VueGestion = ({ user }) => {
  const [techniciens, setTechniciens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", mission: "RT_Compteur_Module", fournisseur: "" });
  const [saving, setSaving] = useState(false);
  const [succes, setSucces] = useState("");
  const [erreur, setErreur] = useState("");
  const [confirmSuppr, setConfirmSuppr] = useState(null);
  const [editUid, setEditUid] = useState(null);
  const [editForm, setEditForm] = useState({ mission: "", fournisseur: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const recharger = () => chargerMesTechniciens(user.uid).then(t => { setTechniciens(t); setLoading(false); });
  useEffect(() => { recharger(); }, []);

  const handleCreer = async (e) => {
    e.preventDefault(); setSaving(true); setErreur("");
    try {
      await creerTechnicien(user.uid, form);
      setSucces(`Compte créé pour ${form.prenom} ${form.nom}. Un email de connexion a été envoyé.`);
      setShowForm(false);
      setForm({ nom: "", prenom: "", email: "", mission: "RT_Compteur_Module", fournisseur: "" });
      recharger();
    } catch { setErreur("Erreur lors de la création. Email déjà utilisé ?"); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ padding: "28px 24px", maxWidth: 820, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, animation: `fadeUp 250ms ${T.easeOut} both` }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", marginBottom: 4 }}>Mes techniciens</h1>
          <p style={{ fontSize: 13, color: T.inkSub }}>{techniciens.length} technicien{techniciens.length > 1 ? "s" : ""} dans votre équipe</p>
        </div>
        <Btn onClick={() => { setShowForm(!showForm); setSucces(""); setErreur(""); }}>
          {showForm ? "Annuler" : "+ Ajouter un technicien"}
        </Btn>
      </div>

      {succes && <Alert type="success" style={{ marginBottom: 20 }}>{succes}</Alert>}
      {erreur && <Alert type="error" style={{ marginBottom: 20 }}>{erreur}</Alert>}

      {showForm && (
        <Card animate style={{ marginBottom: 20, padding: 24 }}>
          <SectionLabel>Nouveau technicien</SectionLabel>
          <form onSubmit={handleCreer}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <Field label="Nom">
                <input className="field-input" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value.toUpperCase() }))} required placeholder="DUPONT" />
              </Field>
              <Field label="Prénom">
                <input className="field-input" value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} required placeholder="Jean" />
              </Field>
              <Field label="Email" style={{ gridColumn: "1/-1" }}>
                <input className="field-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required placeholder="jean.dupont@email.com" />
              </Field>
              <Field label="Mission">
                <select className="field-input" value={form.mission} onChange={e => setForm(p => ({ ...p, mission: e.target.value }))}>
                  {Object.entries(MISSIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Fournisseur">
                <input className="field-input" value={form.fournisseur} onChange={e => setForm(p => ({ ...p, fournisseur: e.target.value }))} required placeholder="Iléo, CUA, Véolia..." />
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Btn variant="secondary" onClick={() => setShowForm(false)}>Annuler</Btn>
              <Btn type="submit" loading={saving}>Créer le compte</Btn>
            </div>
          </form>
        </Card>
      )}

      <Card animate>
        {techniciens.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: T.inkMuted, fontSize: 14 }}>
            Aucun technicien dans votre équipe.<br />
            <span style={{ fontSize: 13 }}>Utilisez le bouton ci-dessus pour en ajouter un.</span>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Technicien", "Mission", "Fournisseur", "Email", ""].map(h => (
                  <th key={h} style={{ textAlign: h === "Technicien" ? "left" : "center", padding: "10px 16px", fontSize: 10, color: T.inkMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {techniciens.map((tech, i) => {
                const mission = MISSIONS[tech.mission];
                const isEditing = editUid === tech.uid;
                const borderStyle = { borderBottom: i < techniciens.length - 1 ? `1px solid ${T.border}` : "none" };

                if (isEditing) {
                  const editMission = MISSIONS[editForm.mission];
                  return (
                    <tr key={tech.uid} style={{ ...borderStyle, background: T.blueLight }}>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar prenom={tech.prenom} nom={tech.nom} couleur={editMission?.couleur || T.inkSub} size={32} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{tech.prenom} {tech.nom}</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <select className="field-input" value={editForm.mission}
                          onChange={e => setEditForm(p => ({ ...p, mission: e.target.value }))}
                          style={{ fontSize: 12, padding: "6px 10px" }}>
                          {Object.entries(MISSIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <select className="field-input" value={editForm.fournisseur}
                          onChange={e => setEditForm(p => ({ ...p, fournisseur: e.target.value }))}
                          style={{ fontSize: 12, padding: "6px 10px" }}>
                          {FOURNISSEURS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "center", fontSize: 12, color: T.inkMuted, fontFamily: "'IBM Plex Mono', monospace" }}>{tech.email}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <Btn loading={savingEdit} style={{ fontSize: 11, padding: "4px 12px" }} onClick={async () => {
                            setSavingEdit(true);
                            try {
                              await modifierTechnicien(tech.uid, editForm);
                              setEditUid(null);
                              setSucces(`Mission de ${tech.prenom} ${tech.nom} mise à jour.`);
                              recharger();
                            } catch { setErreur("Erreur lors de la modification."); }
                            finally { setSavingEdit(false); }
                          }}>Sauvegarder</Btn>
                          <Btn variant="secondary" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setEditUid(null)}>Annuler</Btn>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={tech.uid} className="table-row" style={borderStyle}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar prenom={tech.prenom} nom={tech.nom} couleur={mission?.couleur || T.inkSub} size={32} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{tech.prenom} {tech.nom}</span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "center" }}>
                      {mission && <Badge couleur={mission.couleur} label={mission.label} small />}
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "center", fontSize: 13, color: T.inkSub }}>{tech.fournisseur}</td>
                    <td style={{ padding: "13px 16px", textAlign: "center", fontSize: 12, color: T.inkMuted, fontFamily: "'IBM Plex Mono', monospace" }}>{tech.email}</td>
                    <td style={{ padding: "13px 16px", textAlign: "center", whiteSpace: "nowrap" }}>
                      {confirmSuppr === tech.uid ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <Btn variant="danger" style={{ fontSize: 11, padding: "3px 10px" }} onClick={async () => { await supprimerTechnicien(tech.uid); setConfirmSuppr(null); recharger(); }}>Confirmer</Btn>
                          <Btn variant="ghost" style={{ fontSize: 11, padding: "3px 10px" }} onClick={() => setConfirmSuppr(null)}>Annuler</Btn>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <Btn variant="ghost" style={{ fontSize: 11, padding: "3px 10px", color: T.blue }} onClick={() => {
                            setEditUid(tech.uid);
                            setEditForm({ mission: tech.mission, fournisseur: tech.fournisseur });
                            setConfirmSuppr(null);
                            setSucces(""); setErreur("");
                          }}>Modifier</Btn>
                          <Btn variant="ghost" style={{ fontSize: 11, padding: "3px 10px", color: T.red }} onClick={() => { setConfirmSuppr(tech.uid); setEditUid(null); }}>Supprimer</Btn>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};

// ─── VUE PROFIL TECHNICIEN ────────────────────────────────────────────────────
const VueProfilTechnicien = ({ tech, onRetour }) => {
  const mission = MISSIONS[tech.mission];
  const [saisiesSem, setSaisiesSem] = useState({});
  const [loading, setLoading] = useState(true);
  const jourActuel = getJourActuel();
  const champPrincipal = mission?.champs.find(c => ["cpt_dn15_20", "cpt_releves", "ctrl_vente_inf10"].includes(c.key));

  useEffect(() => {
    chargerSaisiesSemaine(tech.uid).then(d => { setSaisiesSem(d); setLoading(false); });
  }, [tech.uid]);

  return (
    <div style={{ padding: "28px 24px", maxWidth: 720, margin: "0 auto" }}>
      <button onClick={onRetour} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkSub, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, marginBottom: 24, padding: 0, transition: `color 150ms ${T.easeOut}` }}
        onMouseOver={e => e.currentTarget.style.color = T.ink}
        onMouseOut={e => e.currentTarget.style.color = T.inkSub}>
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Retour au dashboard
      </button>

      <Card animate style={{ marginBottom: 16, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar prenom={tech.prenom} nom={tech.nom} couleur={mission?.couleur || T.inkSub} size={52} />
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", marginBottom: 6 }}>{tech.prenom} {tech.nom}</h2>
            <div style={{ display: "flex", gap: 8 }}>
              {mission && <Badge couleur={mission.couleur} label={mission.label} />}
              <span style={{ fontSize: 12, color: T.inkMuted, alignSelf: "center" }}>{tech.fournisseur}</span>
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "center", padding: "12px 20px", background: T.bg, borderRadius: 10 }}>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: mission?.couleur }}>
              {[0,1,2,3,4].filter(idx => saisiesSem[getDateDuJour(idx)]).length}
              <span style={{ fontSize: 14, color: T.inkMuted, fontWeight: 400 }}>/5</span>
            </div>
            <div style={{ fontSize: 10, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>Jours saisis</div>
          </div>
        </div>
      </Card>

      {loading ? <Spinner /> : (
        <>
          {/* Grille hebdo */}
          <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {JOURS.slice(0, 5).map((jour, idx) => {
              const saisie = saisiesSem[getDateDuJour(idx)];
              return (
                <div key={jour} style={{
                  background: T.surface, borderRadius: 10,
                  border: idx === jourActuel ? `2px solid ${T.blue}` : `1px solid ${T.border}`,
                  padding: "14px 10px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{jour.slice(0, 3)}</div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><Voyant saisi={!!saisie} /></div>
                  {saisie && champPrincipal ? (
                    <>
                      <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1, marginBottom: 3 }}>
                        {saisie[champPrincipal.key] || 0}
                      </div>
                      <div style={{ fontSize: 9, color: T.inkMuted }}>{champPrincipal.label}</div>
                    </>
                  ) : !saisie && (
                    <div style={{ fontSize: 11, color: T.border }}>—</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stats complètes du jour */}
          {(() => {
            const saisieJour = saisiesSem[getDateKey()];
            if (!saisieJour) return (
              <div style={{ marginTop: 16, padding: "20px 24px", background: T.bg, borderRadius: 12, textAlign: "center", color: T.inkMuted, fontSize: 13 }}>
                Aucune saisie aujourd'hui.
              </div>
            );
            const champsNum = mission?.champs.filter(c => c.type === "number") || [];
            return (
              <Card animate style={{ marginTop: 16 }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}` }}>
                  <SectionLabel>Saisie du jour — détail complet</SectionLabel>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
                  {champsNum.map((champ, i) => (
                    <div key={champ.key} style={{
                      padding: "16px 12px", textAlign: "center",
                      borderRight: (i + 1) % 4 !== 0 ? `1px solid ${T.border}` : "none",
                      borderBottom: i < champsNum.length - 4 ? `1px solid ${T.border}` : "none",
                    }}>
                      <div style={{ fontSize: 26, fontWeight: 700, color: mission?.couleur, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1, marginBottom: 5 }}>
                        {saisieJour[champ.key] ?? 0}
                      </div>
                      <div style={{ fontSize: 10, color: T.inkSub, fontWeight: 500, lineHeight: 1.3 }}>{champ.label}</div>
                    </div>
                  ))}
                </div>
                {saisieJour.commentaires && (
                  <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, fontSize: 13, color: T.inkMid, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 700, fontSize: 11, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 8 }}>Commentaires</span>
                    {saisieJour.commentaires}
                  </div>
                )}
              </Card>
            );
          })()}
        </>
      )}
    </div>
  );
};

// ─── VUE HISTORIQUE ───────────────────────────────────────────────────────────
const VueHistorique = () => {
  const semActuelle = getNumeroSemaine();
  const [sem, setSem] = useState(semActuelle);
  const semaines = [semActuelle, semActuelle - 1, semActuelle - 2, semActuelle - 3];

  return (
    <div style={{ padding: "28px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, animation: `fadeUp 250ms ${T.easeOut} both` }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>Historique</h1>
        <div style={{ display: "flex", gap: 4, background: T.bg, borderRadius: 10, padding: 4 }}>
          {semaines.map(s => (
            <button key={s} onClick={() => setSem(s)} style={{
              background: sem === s ? T.surface : "transparent",
              color: sem === s ? T.ink : T.inkSub,
              border: "none", borderRadius: 7, padding: "5px 14px",
              fontSize: 13, fontWeight: sem === s ? 600 : 500, cursor: "pointer",
              boxShadow: sem === s ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: `all 180ms ${T.easeOut}`,
            }}>S{s}</button>
          ))}
        </div>
      </div>
      <Card animate>
        <div style={{ padding: "48px 24px", textAlign: "center", color: T.inkMuted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <p style={{ fontSize: 14, marginBottom: 6 }}>Données semaine S{sem}</p>
          <p style={{ fontSize: 13 }}>Disponibles une fois les saisies réelles en place.</p>
        </div>
      </Card>
    </div>
  );
};

// ─── APP PRINCIPALE ───────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(null);
  const [profilTech, setProfilTech] = useState(null);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (fu) => {
      if (fu) {
        const profil = await chargerProfil(fu.uid);
        if (profil) { setUser({ ...profil, uid: fu.uid }); setPage(profil.role === "technicien" ? "saisie" : "dashboard"); }
      }
      setInitLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = (u) => { setUser(u); setPage(u.role === "technicien" ? "saisie" : "dashboard"); };
  const handleLogout = async () => { await signOut(auth); setUser(null); setPage(null); setProfilTech(null); };
  const handleChangePage = (p) => { setProfilTech(null); setPage(p); };

  if (initLoading) return <><GlobalStyles /><Spinner full /></>;
  if (!user) return <><GlobalStyles /><VueConnexion onLogin={handleLogin} /></>;

  return (
    <>
      <GlobalStyles />
      <div style={{ minHeight: "100vh", background: T.bg }}>
        <Header user={user} onLogout={handleLogout} page={page} onChangePage={handleChangePage} />
        <main>
          {page === "saisie" && <VueSaisie user={user} />}
          {page === "mon_suivi" && <VueMonSuivi user={user} />}
          {page === "dashboard" && <VueDashboard user={user} onVoirProfil={t => { setProfilTech(t); setPage("profil"); }} />}
          {page === "historique" && <VueHistorique user={user} />}
          {page === "gestion" && <VueGestion user={user} />}
          {page === "profil" && profilTech && <VueProfilTechnicien tech={profilTech} onRetour={() => { setProfilTech(null); setPage("dashboard"); }} />}
        </main>
      </div>
    </>
  );
}
