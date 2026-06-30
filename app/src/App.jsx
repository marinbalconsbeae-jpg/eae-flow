import { useState, useEffect, useRef } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, deleteField, query, where } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, createUserWithEmailAndPassword, setPersistence, browserSessionPersistence, verifyBeforeUpdateEmail } from "firebase/auth";

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
// Data-Dense Dashboard — navy professionnel + accent bleu (ui-ux-pro-max)
const T = {
  // Surfaces & neutres — échelle slate
  bg: "#F8FAFC",
  bgSubtle: "#FCFDFE",
  surface: "#FFFFFF",
  surfaceHover: "#F1F5F9",
  border: "#E2E8F0",
  borderSubtle: "#EDF1F6",
  borderHover: "#CBD5E1",

  ink: "#020617",
  inkMid: "#334155",
  inkSub: "#64748B",
  inkMuted: "#94A3B8",

  // Navy (primary) — header, surfaces sombres, emphase
  navy: "#0F172A",
  navyMid: "#1E293B",
  navyLine: "#243349",

  // Accent / CTA — bleu profond
  blue: "#0369A1",
  blueDeep: "#075985",
  blueLight: "#E0F2FE",
  blueMid: "#0284C7",

  green: "#0EA968",
  greenLight: "#E9FBF3",
  red: "#DC2626",
  redLight: "#FEF2F2",
  amber: "#D97706",
  amberLight: "#FFFBEB",

  // Missions — palette catégorielle
  missions: {
    RT_Compteur_Module: "#0369A1",
    Releve_CPT: "#7C3AED",
    Controle_AC: "#B45309",
    RT_CPT_Arras: "#0891B2",
    RT_CPT_SEPIG: "#0E7490",
    RT_CPT_Suez: "#155E75",
    RT_CPT: "#164E63",
    PI_Poteau_Incendie: "#DC2626",
    Controle_ANC: "#059669",
  },

  // Élévation — ombres douces et superposées (style SaaS moderne)
  shadowXs: "0 1px 2px rgba(10,14,23,0.04)",
  shadowSm: "0 1px 3px rgba(10,14,23,0.06), 0 1px 2px -1px rgba(10,14,23,0.04)",
  shadowMd: "0 4px 10px -2px rgba(10,14,23,0.08), 0 2px 4px -2px rgba(10,14,23,0.05)",
  shadowLg: "0 14px 28px -8px rgba(10,14,23,0.12), 0 6px 12px -6px rgba(10,14,23,0.07)",
  shadowXl: "0 28px 56px -16px rgba(10,14,23,0.22)",

  // Easings Emil
  easeOut: "cubic-bezier(0.23, 1, 0.32, 1)",
  easeInOut: "cubic-bezier(0.77, 0, 0.175, 1)",
};

// ─── STYLES GLOBAUX ───────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
    body {
      font-family: 'Fira Sans', system-ui, sans-serif;
      background: ${T.bg};
      color: ${T.ink};
      letter-spacing: -0.006em;
    }
    input, textarea, button, select { font-family: inherit; }

    /* Chiffres tabulaires partout en monospace — évite le décalage des colonnes */
    [style*="Fira Code"] { font-feature-settings: "tnum" 1, "zero" 1; font-variant-numeric: tabular-nums; }

    /* Scrollbar subtile */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 99px; border: 2px solid transparent; background-clip: padding-box; }
    ::-webkit-scrollbar-thumb:hover { background: ${T.borderHover}; background-clip: padding-box; }

    /* Focus visible propre */
    :focus-visible { outline: 2px solid ${T.blue}; outline-offset: 2px; border-radius: 6px; }
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
    .btn-press { transition: transform 140ms ${T.easeOut}, box-shadow 180ms ease, opacity 150ms ease, background 150ms ease; }
    .btn-press:active { transform: scale(0.97); }

    /* Card hover lift — élévation au survol */
    .card-lift { transition: box-shadow 220ms ${T.easeOut}, transform 220ms ${T.easeOut}, border-color 220ms ease; }
    @media (hover: hover) and (pointer: fine) {
      .card-lift:hover { box-shadow: ${T.shadowMd}; transform: translateY(-1px); border-color: ${T.borderHover}; }
    }

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
      border: 1px solid ${T.border};
      border-radius: 10px;
      padding: 10px 13px;
      font-size: 14px;
      color: ${T.ink};
      background: ${T.surface};
      box-shadow: ${T.shadowXs};
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }
    .field-input:hover { border-color: ${T.borderHover}; }
    .field-input:focus {
      outline: none;
      border-color: ${T.blue};
      box-shadow: 0 0 0 3.5px ${T.blueLight};
    }
    .field-input::placeholder { color: ${T.inkMuted}; }
    .field-input:disabled { opacity: 0.55; cursor: not-allowed; background: ${T.bgSubtle}; box-shadow: none; }

    /* Voyant animé */
    @keyframes voyantPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45); }
      50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
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
function getSemaineKeyFromDate(d) {
  // ISO 8601 : semaine 1 = semaine contenant le premier jeudi de l'année
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const num = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return { key: `${utc.getUTCFullYear()}-S${num}`, num, year: utc.getUTCFullYear() };
}
function getNumeroSemaine() { return getSemaineKeyFromDate(new Date()).num; }
function getSemaineKey() { return getSemaineKeyFromDate(new Date()).key; }
function getSemaineParOffset(offsetWeeks) {
  const d = new Date();
  d.setDate(d.getDate() + offsetWeeks * 7);
  return getSemaineKeyFromDate(d);
}
function getJourActuel() { return (new Date().getDay() + 6) % 7; }
function getDateDuJour(jourIdx) {
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() - getJourActuel() + jourIdx);
  return d.toISOString().split("T")[0];
}
// Comme getDateDuJour, mais pour une semaine décalée de offsetWeeks (0 = cette semaine, -1 = S-1, ...)
function getDateDuJourSemaine(offsetWeeks, jourIdx) {
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() + offsetWeeks * 7 - getJourActuel() + jourIdx);
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
async function chargerSaisiesSemaine(techId, semaineKey = getSemaineKey()) {
  const q = query(collection(db, "saisies"), where("semaine", "==", semaineKey), where("tech_id", "==", techId));
  const snap = await getDocs(q);
  const r = {};
  snap.forEach(d => { r[d.data().date] = d.data(); });
  return r;
}
async function chargerHistoriqueSemaine(caId, semaineKey) {
  const techs = await chargerMesTechniciens(caId);
  const techUids = new Set(techs.map(t => t.uid));
  const q = query(collection(db, "saisies"), where("semaine", "==", semaineKey));
  const snap = await getDocs(q);
  const saisiesParTech = {};
  snap.forEach(d => {
    const data = d.data();
    if (techUids.has(data.tech_id)) {
      if (!saisiesParTech[data.tech_id]) saisiesParTech[data.tech_id] = [];
      saisiesParTech[data.tech_id].push(data);
    }
  });
  return { techs, saisiesParTech };
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
  // Utilise une app secondaire pour ne pas déconnecter le CA en cours de session
  const secondaryApp = initializeApp(firebaseConfig, `create-tech-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email, Math.random().toString(36).slice(-10));
    await setDoc(doc(db, "utilisateurs", cred.user.uid), { ...form, role: "technicien", charge_id: caId, uid: cred.user.uid, date_creation: new Date().toISOString() });
    await sendPasswordResetEmail(secondaryAuth, form.email);
  } finally {
    await deleteApp(secondaryApp);
  }
}
async function supprimerTechnicien(uid) {
  // Enqueue d'abord (la règle Firestore vérifie l'appartenance via le doc utilisateur,
  // qui doit donc encore exister), puis supprime le profil.
  await setDoc(doc(db, "suppressions", uid), { uid, demande_le: new Date().toISOString() });
  await deleteDoc(doc(db, "utilisateurs", uid));
}
async function modifierTechnicien(uid, { mission, fournisseur, email }) {
  const data = { mission, fournisseur };
  if (email !== undefined && email !== "") data.email = email;
  await updateDoc(doc(db, "utilisateurs", uid), data);
  // L'email de CONNEXION (Firebase Auth) d'un AUTRE utilisateur ne peut pas être
  // modifié côté client : updateEmail()/verifyBeforeUpdateEmail() ne visent que
  // l'utilisateur courant. Seul le champ Firestore est mis à jour ici ; l'email
  // Auth doit être changé via l'Admin SDK (agent Python) ou une Cloud Function.
  if (data.email) {
    console.warn(
      `[EAE Flow] Email Firestore mis à jour pour ${uid} → ${data.email}. ` +
      `L'email de connexion (Firebase Auth) n'est PAS modifiable côté client pour un autre utilisateur : ` +
      `à mettre à jour via l'Admin SDK (auth.update_user).`
    );
  }
  return Boolean(data.email);
}
// Modifie l'email de l'utilisateur COURANT : Firestore + Firebase Auth (lien de vérification)
async function modifierMonEmail(uid, newEmail) {
  // 1) Auth : envoie un lien de vérification à la nouvelle adresse (peut lever
  //    auth/requires-recent-login → on remonte l'erreur sans toucher Firestore)
  if (auth.currentUser) {
    await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
  }
  // 2) Firestore : email utilisé par les dashboards et les emails de récap de l'agent
  await updateDoc(doc(db, "utilisateurs", uid), { email: newEmail });
}

// Marque un technicien absent jusqu'à dateRetour (string ISO "YYYY-MM-DD" incluse)
async function marquerAbsentTechnicien(uid, dateRetour) {
  await updateDoc(doc(db, "utilisateurs", uid), { absent_jusqu_au: dateRetour });
}
// Retire l'absence (le technicien redevient "présent")
async function marquerPresentTechnicien(uid) {
  await updateDoc(doc(db, "utilisateurs", uid), { absent_jusqu_au: deleteField() });
}
// Un technicien est considéré absent si absent_jusqu_au >= aujourd'hui (comparaison de strings ISO, valide)
function estAbsentAujourdhui(tech) {
  return !!tech.absent_jusqu_au && tech.absent_jusqu_au >= getDateKey();
}

const FOURNISSEURS = ["Iléo", "CUA", "Véolia", "Suez", "SEPIG", "Autre"];

async function chargerFournisseurs() {
  const snap = await getDocs(collection(db, "fournisseurs"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function creerFournisseur(nom, email) {
  const id = nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (!id) throw new Error("NOM_INVALIDE");
  const ref = doc(db, "fournisseurs", id);
  if ((await getDoc(ref)).exists()) throw new Error("DEJA_EXISTANT");
  await setDoc(ref, { nom, email });
}
async function modifierFournisseur(id, email) {
  await updateDoc(doc(db, "fournisseurs", id), { email });
}
async function supprimerFournisseur(id) {
  await deleteDoc(doc(db, "fournisseurs", id));
}

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
const Badge = ({ couleur, label, small, onDark }) => (
  <span style={{
    background: onDark ? "rgba(255,255,255,0.10)" : couleur + "14",
    color: onDark ? "#E2E8F0" : couleur,
    border: `1px solid ${onDark ? "rgba(255,255,255,0.16)" : couleur + "28"}`,
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
const Card = ({ children, style, animate, hover }) => (
  <div className={hover ? "card-lift" : undefined} style={{
    background: T.surface,
    borderRadius: 14,
    border: `1px solid ${T.border}`,
    boxShadow: T.shadowSm,
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
    background: `linear-gradient(135deg, ${couleur}22, ${couleur}12)`,
    color: couleur,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: Math.round(size * 0.32),
    fontWeight: 700,
    flexShrink: 0,
    fontFamily: "'Fira Code', monospace",
    letterSpacing: "-0.02em",
    boxShadow: `inset 0 0 0 1px ${couleur}1f`,
    transition: `background 200ms ${T.easeOut}`,
  }}>
    {prenom?.[0]}{nom?.[0]}
  </div>
);

// Bouton avec feedback press
const Btn = ({ children, onClick, variant = "primary", style, disabled, type = "button", loading }) => {
  const variants = {
    primary: { background: `linear-gradient(180deg, ${T.blueMid}, ${T.blue})`, color: "#fff", border: `1px solid ${T.blueDeep}`, boxShadow: `${T.shadowSm}, inset 0 1px 0 rgba(255,255,255,0.18)` },
    secondary: { background: T.surface, color: T.inkMid, border: `1px solid ${T.border}`, boxShadow: T.shadowXs },
    ghost: { background: "transparent", color: T.inkSub, border: "1px solid transparent" },
    danger: { background: T.redLight, color: T.red, border: `1px solid #FECDCA`, boxShadow: T.shadowXs },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className="btn-press" style={{
      ...variants[variant],
      borderRadius: 9,
      padding: "8px 16px",
      fontSize: 13,
      fontWeight: 600,
      cursor: (disabled || loading) ? "not-allowed" : "pointer",
      opacity: (disabled || loading) ? 0.55 : 1,
      display: "inline-flex", alignItems: "center", gap: 7,
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
      fontFamily: "'Fira Code', monospace",
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

// Modal centrée avec backdrop — fermeture au clic en dehors ou sur Échap
const Modal = ({ onClose, children, maxWidth = 420 }) => {
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(10,14,23,0.45)", backdropFilter: "blur(2px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      animation: `fadeIn 150ms ease both`,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.surface, borderRadius: 16, boxShadow: T.shadowXl,
        maxWidth, width: "100%", maxHeight: "85vh", overflow: "auto",
        animation: `slideDown 180ms ${T.easeOut} both`,
      }}>
        {children}
      </div>
    </div>
  );
};

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
    <div style={{ minHeight: "100dvh", background: "#080C16", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      {/* Grille décorative subtile */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)",
        backgroundSize: "32px 32px",
      }} />
      {/* Halo ambiant bleu */}
      <div style={{
        position: "fixed", top: "-10%", left: "50%", transform: "translateX(-50%)",
        width: 620, height: 620, pointerEvents: "none",
        background: `radial-gradient(circle, ${T.blue}33 0%, transparent 60%)`,
        filter: "blur(40px)",
      }} />

      <div style={{ width: "100%", maxWidth: 384, position: "relative", animation: `fadeUp 350ms ${T.easeOut} both` }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56,
            background: `linear-gradient(135deg, ${T.blueMid} 0%, ${T.blueDeep} 100%)`,
            borderRadius: 16,
            margin: "0 auto 18px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 8px 28px ${T.blue}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
          }}>
            <svg width="26" height="26" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2C8 2 4 5.5 4 10c0 6 8 12 8 12s8-6 8-12c0-4.5-4-8-8-8z" strokeLinejoin="round"/>
              <circle cx="12" cy="10" r="2.5" fill="#fff" stroke="none"/>
            </svg>
          </div>
          <h1 style={{ color: "#F8FAFC", fontSize: 24, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.03em" }}>EAE Flow</h1>
          <p style={{ color: "#64748B", fontSize: 13 }}>Suivi hebdomadaire · Techniciens terrain</p>
        </div>

        {/* Card connexion */}
        <div style={{
          background: "linear-gradient(180deg, #141E33 0%, #111A2C 100%)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 18,
          padding: 30,
          boxShadow: "0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
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
    ? [{ id: "saisie", label: "Saisie du jour" }, { id: "mon_suivi", label: "Mon suivi" }, { id: "historique", label: "Historique" }]
    : [{ id: "dashboard", label: "Dashboard" }, { id: "historique", label: "Historique" }, { id: "gestion", label: "Mes techniciens" }, { id: "fournisseurs", label: "Fournisseurs" }];

  return (
    <header style={{
      background: `linear-gradient(180deg, ${T.navy}, ${T.navyMid})`,
      borderBottom: `1px solid ${T.navyLine}`,
      padding: "0 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 60,
      position: "sticky", top: 0, zIndex: 100,
      boxShadow: T.shadowMd,
    }}>
      {/* Logo + Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 22, borderRight: `1px solid ${T.navyLine}` }}>
          <div style={{ width: 30, height: 30, background: `linear-gradient(135deg, ${T.blueMid}, ${T.blueDeep})`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 10px ${T.blue}66, inset 0 1px 0 rgba(255,255,255,0.25)` }}>
            <svg width="15" height="15" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2C8 2 4 5.5 4 10c0 6 8 12 8 12s8-6 8-12c0-4.5-4-8-8-8z" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#F8FAFC", letterSpacing: "-0.02em" }}>EAE Flow</span>
        </div>

        <nav style={{ display: "flex", gap: 2 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => onChangePage(item.id)} className="btn-press" style={{
              background: page === item.id ? "rgba(255,255,255,0.10)" : "transparent",
              color: page === item.id ? "#FFFFFF" : "#94A3B8",
              border: "1px solid transparent",
              boxShadow: page === item.id ? `inset 0 0 0 1px ${T.navyLine}` : "none",
              borderRadius: 8,
              padding: "6px 14px", fontSize: 13,
              fontWeight: page === item.id ? 600 : 500,
              cursor: "pointer",
              transition: `background 150ms ${T.easeOut}, color 150ms ${T.easeOut}`,
            }}>{item.label}</button>
          ))}
        </nav>
      </div>

      {/* Profil */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {mission && <Badge couleur={mission.couleur} label={mission.label} onDark />}
        <button
          onClick={() => onChangePage("mon_profil")}
          title="Mon profil"
          className="btn-press"
          style={{
            textAlign: "right", background: page === "mon_profil" ? "rgba(255,255,255,0.10)" : "transparent",
            border: "1px solid transparent", boxShadow: page === "mon_profil" ? `inset 0 0 0 1px ${T.navyLine}` : "none",
            borderRadius: 8, padding: "4px 10px", cursor: "pointer",
            transition: `background 150ms ${T.easeOut}`,
          }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9" }}>{user.prenom} {user.nom}</div>
          <div style={{ fontSize: 11, color: "#7C879B" }}>{{ technicien: "Technicien", charge_affaires: "Chargé d'affaires" }[user.role] || user.role}</div>
        </button>
        <button
          onClick={async () => { await signOut(auth); window.location.reload(); }}
          title="Changer de compte"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#7C879B", padding: "4px 6px", borderRadius: 5, transition: `color 150ms ease` }}
          onMouseOver={e => e.currentTarget.style.color = "#CBD5E1"}
          onMouseOut={e => e.currentTarget.style.color = "#7C879B"}
        >Changer de compte</button>
        <button onClick={onLogout} title="Déconnexion" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, borderRadius: "50%" }}>
          <Avatar prenom={user.prenom} nom={user.nom} couleur={isTech ? T.blueMid : T.green} size={34} />
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
                  style={{ fontFamily: champ.type === "number" ? "'Fira Code', monospace" : "inherit", fontWeight: champ.type === "number" ? 500 : 400 }}
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
  const champKeys = CHAMPS_PAR_MISSION[user.mission] || mission?.champs.filter(c => c.type === "number").slice(0, 3).map(c => c.key) || [];
  const champsPrincipaux = champKeys.map(k => mission?.champs.find(c => c.key === k)).filter(Boolean);

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
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, fontFamily: "'Fira Code', monospace", lineHeight: 1, marginBottom: 3 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${champsPrincipaux.length || 1}, 1fr)`, gap: 0 }}>
          {champsPrincipaux.map((champ, i) => {
            const total = JOURS.reduce((acc, _, idx) => acc + ((saisiesSem[getDateDuJour(idx)]?.[champ.key]) || 0), 0);
            return (
              <div key={champ.key} style={{
                padding: "20px 16px", textAlign: "center",
                borderRight: i < champsPrincipaux.length - 1 ? `1px solid ${T.border}` : "none",
              }}>
                <div style={{ fontSize: 34, fontWeight: 700, color: mission?.couleur, fontFamily: "'Fira Code', monospace", lineHeight: 1, marginBottom: 6 }}>
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

// ─── VUE HISTORIQUE TECHNICIEN ────────────────────────────────────────────────
// Symétrique de VueHistorique (CA) : sélecteur de semaine + détail jour par jour
// pour le technicien connecté, réutilisant Card / Badge / Voyant.
const VueHistoriqueTech = ({ user }) => {
  const mission = MISSIONS[user.mission];
  const [semOffset, setSemOffset] = useState(0);
  const [saisiesSem, setSaisiesSem] = useState({});
  const [loading, setLoading] = useState(true);
  const [detailJour, setDetailJour] = useState(null); // { jour, dateStr, saisie } | null

  const semaine = getSemaineParOffset(semOffset);
  const offsets = [0, -1, -2, -3];
  const jours5 = JOURS.slice(0, 5);
  const champKeys = CHAMPS_PAR_MISSION[user.mission] || mission?.champs.filter(c => c.type === "number").slice(0, 4).map(c => c.key) || [];
  const champs4 = champKeys.map(k => mission?.champs.find(c => c.key === k)).filter(Boolean);

  useEffect(() => {
    setLoading(true);
    chargerSaisiesSemaine(user.uid, semaine.key).then(d => { setSaisiesSem(d); setLoading(false); });
  }, [semaine.key]);

  const nbJours = jours5.filter((_, idx) => saisiesSem[getDateDuJourSemaine(semOffset, idx)]).length;
  const complet = nbJours >= 5;
  const statutCouleur = complet ? T.green : nbJours > 0 ? T.amber : T.red;

  // Totaux hebdomadaires (somme des champs numériques de toutes les saisies chargées)
  const totaux = {};
  Object.values(saisiesSem).forEach(s => {
    Object.keys(s).forEach(k => { if (typeof s[k] === "number" && k !== "semaine") totaux[k] = (totaux[k] || 0) + s[k]; });
  });

  return (
    <div style={{ padding: "28px 24px", maxWidth: 760, margin: "0 auto" }}>
      {/* En-tête + sélecteur de semaine (identique à VueHistorique CA) */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, animation: `fadeUp 250ms ${T.easeOut} both` }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", marginBottom: 4 }}>Historique</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ fontSize: 13, color: T.inkSub }}>Semaine S{semaine.num} · {semaine.year}</p>
            {mission && <Badge couleur={mission.couleur} label={mission.label} small />}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, background: T.bg, borderRadius: 10, padding: 4 }}>
          {offsets.map(o => {
            const s = getSemaineParOffset(o);
            return (
              <button key={o} onClick={() => setSemOffset(o)} style={{
                background: semOffset === o ? T.surface : "transparent",
                color: semOffset === o ? T.ink : T.inkSub,
                border: "none", borderRadius: 7, padding: "5px 14px",
                fontSize: 13, fontWeight: semOffset === o ? 600 : 500,
                cursor: "pointer",
                boxShadow: semOffset === o ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: `all 180ms ${T.easeOut}`,
              }}>
                {o === 0 ? "Cette sem." : `S${s.num}`}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Bandeau résumé */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 2px" }}>
            <div style={{ width: 3, height: 16, borderRadius: 99, background: mission?.couleur }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: T.inkMid, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Détail jour par jour
            </span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7 }}>
              <Voyant saisi={complet} />
              <span style={{ fontSize: 12, fontWeight: 600, color: statutCouleur }}>
                {nbJours}/5 jours saisis
              </span>
            </div>
          </div>

          <Card style={{ marginBottom: 24 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Jour", "Date", ...champs4.map(c => c.label), "Heures", "Statut"].map(h => (
                    <th key={h} style={{
                      textAlign: h === "Jour" ? "left" : "center",
                      padding: "10px 16px",
                      fontSize: 10, color: T.inkMuted, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.08em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jours5.map((jour, idx) => {
                  const dateStr = getDateDuJourSemaine(semOffset, idx);
                  const saisie = saisiesSem[dateStr];
                  return (
                    <tr key={jour} className="table-row"
                      onClick={() => saisie && setDetailJour({ jour, dateStr, saisie })}
                      title={saisie ? "Voir le détail de la journée" : undefined}
                      style={{
                        borderBottom: idx < jours5.length - 1 ? `1px solid ${T.border}` : "none",
                        background: !saisie ? "#FFFBFB" : T.surface,
                        cursor: saisie ? "pointer" : "default",
                      }}>
                      <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, color: T.ink }}>{jour}</td>
                      <td style={{ padding: "13px 16px", textAlign: "center", fontSize: 12, color: T.inkSub, fontFamily: "'Fira Code', monospace" }}>
                        {new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </td>
                      {champs4.map((champ, ci) => (
                        <td key={champ.key} style={{ padding: "13px 16px", textAlign: "center" }}>
                          <span style={{
                            fontSize: ci === 0 ? 16 : 14,
                            fontWeight: ci === 0 ? 700 : 600,
                            color: saisie ? (ci === 0 ? mission?.couleur : T.inkMid) : T.border,
                            fontFamily: "'Fira Code', monospace",
                          }}>
                            {saisie ? (saisie[champ.key] ?? 0) : "—"}
                          </span>
                        </td>
                      ))}
                      <td style={{ padding: "13px 16px", textAlign: "center" }}>
                        <span style={{ fontSize: 13, color: saisie ? T.inkSub : T.border, fontFamily: "'Fira Code', monospace" }}>
                          {saisie ? `${saisie.total_heures || 0}h` : "—"}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                          <Voyant saisi={!!saisie} />
                          <span style={{ fontSize: 12, fontWeight: 500, color: saisie ? T.green : T.red, whiteSpace: "nowrap" }}>
                            {saisie ? "Saisi" : "Non saisi"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Totaux semaine */}
          {champs4.length > 0 && (
            <Card animate>
              <div style={{ padding: "18px 20px", borderBottom: `1px solid ${T.border}` }}>
                <SectionLabel>Totaux semaine</SectionLabel>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${champs4.length}, 1fr)`, gap: 0 }}>
                {champs4.map((champ, i) => (
                  <div key={champ.key} style={{
                    padding: "20px 16px", textAlign: "center",
                    borderRight: i < champs4.length - 1 ? `1px solid ${T.border}` : "none",
                  }}>
                    <div style={{ fontSize: 34, fontWeight: 700, color: mission?.couleur, fontFamily: "'Fira Code', monospace", lineHeight: 1, marginBottom: 6 }}>
                      {totaux[champ.key] || 0}
                    </div>
                    <div style={{ fontSize: 11, color: T.inkSub, fontWeight: 500 }}>{champ.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modal détail complet d'une journée — TOUS les champs de la mission, pas seulement les 4 principaux */}
      {detailJour && (() => {
        const champsNum = mission?.champs.filter(c => c.type === "number") || [];
        return (
          <Modal maxWidth={460} onClose={() => setDetailJour(null)}>
            <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{detailJour.jour}</div>
                <div style={{ fontSize: 12, color: T.inkSub }}>
                  {new Date(detailJour.dateStr + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </div>
              </div>
              {mission && <Badge couleur={mission.couleur} label={mission.label} small />}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
              {champsNum.map((champ, i) => (
                <div key={champ.key} style={{
                  padding: "16px 12px", textAlign: "center",
                  borderRight: (i + 1) % 3 !== 0 ? `1px solid ${T.border}` : "none",
                  borderBottom: i < champsNum.length - (champsNum.length % 3 === 0 ? 3 : champsNum.length % 3) ? `1px solid ${T.border}` : "none",
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: mission?.couleur, fontFamily: "'Fira Code', monospace", lineHeight: 1, marginBottom: 5 }}>
                    {detailJour.saisie[champ.key] ?? 0}
                  </div>
                  <div style={{ fontSize: 10, color: T.inkSub, fontWeight: 500, lineHeight: 1.3 }}>{champ.label}</div>
                </div>
              ))}
            </div>

            {detailJour.saisie.commentaires && (
              <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, fontSize: 13, color: T.inkMid, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, fontSize: 11, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Commentaires</span>
                {detailJour.saisie.commentaires}
              </div>
            )}

            <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, textAlign: "right" }}>
              <Btn variant="secondary" onClick={() => setDetailJour(null)}>Fermer</Btn>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

// ─── VUE DASHBOARD CA ─────────────────────────────────────────────────────────
const VueDashboard = ({ user, onVoirProfil }) => {
  const [techniciens, setTechniciens] = useState([]);
  const [saisiesJour, setSaisiesJour] = useState({});
  const [saisiesSemaine, setSaisiesSemaine] = useState({});
  const [tousTechs, setTousTechs] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef(null);

  useEffect(() => {
    Promise.all([chargerMesTechniciens(user.uid), chargerSaisiesJour(), chargerTousTechniciens()])
      .then(([techs, saisies, tous]) => {
        setTechniciens(techs);
        setSaisiesJour(saisies);
        setTousTechs(tous);
        setLoading(false);
        // Charge les saisies de la semaine pour chaque technicien en parallèle
        Promise.all(techs.map(t => chargerSaisiesSemaine(t.uid).then(s => [t.uid, s])))
          .then(results => setSaisiesSemaine(Object.fromEntries(results)))
          .catch(err => console.error("Chargement des saisies hebdo échoué", err));
      })
      .catch(err => { console.error("Chargement du dashboard échoué", err); setLoading(false); });
  }, []);

  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [openComment, setOpenComment] = useState(null);
  const parMission = techniciens.reduce((acc, t) => { if (!acc[t.mission]) acc[t.mission] = []; acc[t.mission].push(t); return acc; }, {});
  const autresTech = recherche.length > 1 ? tousTechs.filter(t => t.charge_id !== user.uid && (`${t.nom} ${t.prenom}`).toLowerCase().includes(recherche.toLowerCase())) : [];
  const nbNonSaisi = techniciens.filter(t => !saisiesJour[t.uid] && !estAbsentAujourdhui(t)).length;
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
              <span style={{ fontSize: 12, color: T.inkSub, fontFamily: "'Fira Code', monospace" }}>
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
                  fontFamily: "'Fira Code', monospace",
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
                    const absent = estAbsentAujourdhui(tech);
                    return (
                      <>
                      <tr key={tech.uid} className="table-row" style={{
                        borderBottom: openComment === tech.uid ? "none" : (i < techs.length - 1 ? `1px solid ${T.border}` : "none"),
                        background: absent ? T.amberLight : (!saisie ? "#FFFBFB" : T.surface),
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
                              fontFamily: "'Fira Code', monospace",
                            }}>
                              {saisie ? (saisie[champ.key] ?? 0) : "—"}
                            </span>
                          </td>
                        ))}
                        <td style={{ padding: "13px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                            {absent ? (
                              <span style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A", borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>
                                Absent jusqu'au {new Date(tech.absent_jusqu_au + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                              </span>
                            ) : (
                              <>
                                <Voyant saisi={!!saisie} />
                                <span style={{ fontSize: 12, fontWeight: 500, color: saisie ? T.green : T.red }}>
                                  {saisie ? "Saisi" : "Non saisi"}
                                </span>
                              </>
                            )}
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

      {/* ── VUE SEMAINE ─────────────────────────────────────────────────── */}
      {techniciens.length > 0 && (
        <div style={{ marginTop: 8, animation: `fadeUp 350ms ${T.easeOut} both` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 2px" }}>
            <div style={{ width: 3, height: 16, borderRadius: 99, background: T.inkMuted }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: T.inkMid, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Vue semaine — S{getNumeroSemaine()}
            </span>
          </div>
          <Card>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, color: T.inkMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Technicien</th>
                  {JOURS.slice(0, 5).map(j => (
                    <th key={j} style={{ textAlign: "center", padding: "10px 12px", fontSize: 10, color: T.inkMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{j.slice(0, 3)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {techniciens.map((tech, i) => {
                  const mission = MISSIONS[tech.mission];
                  const champKeys = CHAMPS_PAR_MISSION[tech.mission] || [];
                  const champPrincipal = champKeys.map(k => mission?.champs.find(c => c.key === k)).find(Boolean);
                  const semTech = saisiesSemaine[tech.uid] || {};
                  const jourActuel = getJourActuel();

                  return (
                    <tr key={tech.uid} className="table-row" style={{ borderBottom: i < techniciens.length - 1 ? `1px solid ${T.border}` : "none" }}>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <Avatar prenom={tech.prenom} nom={tech.nom} couleur={mission?.couleur || T.inkSub} size={28} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.2 }}>{tech.prenom} {tech.nom}</div>
                            {mission && <Badge couleur={mission.couleur} label={mission.label} small />}
                          </div>
                        </div>
                      </td>
                      {JOURS.slice(0, 5).map((jour, idx) => {
                        const date = getDateDuJour(idx);
                        const saisie = semTech[date];
                        const estFutur = idx > jourActuel;
                        const valeur = saisie && champPrincipal ? (saisie[champPrincipal.key] ?? 0) : null;
                        return (
                          <td key={jour} style={{ padding: "10px 12px", textAlign: "center", opacity: estFutur ? 0.3 : 1 }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                              <Voyant saisi={!!saisie} size={7} />
                              {saisie && valeur !== null ? (
                                <span style={{ fontSize: 13, fontWeight: 700, color: mission?.couleur, fontFamily: "'Fira Code', monospace" }}>
                                  {valeur}
                                </span>
                              ) : !estFutur && !saisie ? (
                                <span style={{ fontSize: 11, color: T.border }}>—</span>
                              ) : null}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
};

// ─── VUE GESTION TECHNICIENS ──────────────────────────────────────────────────
const VueGestion = ({ user }) => {
  const [techniciens, setTechniciens] = useState([]);
  const [fournisseursList, setFournisseursList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", mission: "RT_Compteur_Module", fournisseur: "" });
  const [saving, setSaving] = useState(false);
  const [succes, setSucces] = useState("");
  const [erreur, setErreur] = useState("");
  const [confirmSuppr, setConfirmSuppr] = useState(null);
  const [editUid, setEditUid] = useState(null);
  const [editForm, setEditForm] = useState({ mission: "", fournisseur: "", email: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [absenceTech, setAbsenceTech] = useState(null); // technicien dont la modal "Marquer absent" est ouverte
  const [dateRetour, setDateRetour] = useState("");
  const [savingAbsence, setSavingAbsence] = useState(false);

  const recharger = () => chargerMesTechniciens(user.uid).then(t => { setTechniciens(t); setLoading(false); });
  useEffect(() => {
    recharger();
    chargerFournisseurs().then(f => setFournisseursList(f.map(x => x.nom)));
  }, []);

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
                <select className="field-input" value={form.fournisseur} onChange={e => setForm(p => ({ ...p, fournisseur: e.target.value }))} required>
                  <option value="">— Choisir un fournisseur —</option>
                  {fournisseursList.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
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
                          {fournisseursList.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <input className="field-input" type="email" value={editForm.email}
                          onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                          style={{ fontSize: 12, padding: "6px 10px", width: "100%", fontFamily: "'Fira Code', monospace" }} />
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <Btn loading={savingEdit} style={{ fontSize: 11, padding: "4px 12px" }} onClick={async () => {
                            setSavingEdit(true); setErreur(""); setSucces("");
                            try {
                              const emailChange = tech.email !== editForm.email;
                              await modifierTechnicien(tech.uid, editForm);
                              setEditUid(null);
                              setSucces(
                                emailChange
                                  ? `${tech.prenom} ${tech.nom} mis à jour. ⚠️ L'email de connexion (Auth) doit être changé via l'Admin SDK — seul l'email de réception a été modifié.`
                                  : `${tech.prenom} ${tech.nom} mis à jour.`
                              );
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

                const absent = estAbsentAujourdhui(tech);

                return (
                  <tr key={tech.uid} className="table-row" style={borderStyle}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar prenom={tech.prenom} nom={tech.nom} couleur={mission?.couleur || T.inkSub} size={32} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{tech.prenom} {tech.nom}</div>
                          {absent && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: T.amber }}>
                              Absent jusqu'au {new Date(tech.absent_jusqu_au + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "center" }}>
                      {mission && <Badge couleur={mission.couleur} label={mission.label} small />}
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "center", fontSize: 13, color: T.inkSub }}>{tech.fournisseur}</td>
                    <td style={{ padding: "13px 16px", textAlign: "center", fontSize: 12, color: T.inkMuted, fontFamily: "'Fira Code', monospace" }}>{tech.email}</td>
                    <td style={{ padding: "13px 16px", textAlign: "center", whiteSpace: "nowrap" }}>
                      {confirmSuppr === tech.uid ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <Btn variant="danger" style={{ fontSize: 11, padding: "3px 10px" }} onClick={async () => {
                            try {
                              await supprimerTechnicien(tech.uid);
                              setSucces(`${tech.prenom} ${tech.nom} supprimé.`);
                              recharger();
                            } catch { setErreur("Erreur lors de la suppression du technicien."); }
                            finally { setConfirmSuppr(null); }
                          }}>Confirmer</Btn>
                          <Btn variant="ghost" style={{ fontSize: 11, padding: "3px 10px" }} onClick={() => setConfirmSuppr(null)}>Annuler</Btn>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                          <Btn variant="ghost" style={{ fontSize: 11, padding: "3px 10px", color: T.blue }} onClick={() => {
                            setEditUid(tech.uid);
                            setEditForm({ mission: tech.mission, fournisseur: tech.fournisseur, email: tech.email || "" });
                            setConfirmSuppr(null);
                            setSucces(""); setErreur("");
                          }}>Modifier</Btn>
                          {absent ? (
                            <Btn variant="ghost" style={{ fontSize: 11, padding: "3px 10px", color: T.amber }} onClick={async () => {
                              setErreur(""); setSucces("");
                              try {
                                await marquerPresentTechnicien(tech.uid);
                                setSucces(`${tech.prenom} ${tech.nom} marqué présent.`);
                                recharger();
                              } catch { setErreur("Erreur lors du marquage de présence."); }
                            }}>Marquer présent</Btn>
                          ) : (
                            <Btn variant="ghost" style={{ fontSize: 11, padding: "3px 10px", color: T.amber }} onClick={() => {
                              setAbsenceTech(tech); setDateRetour("");
                              setEditUid(null); setConfirmSuppr(null);
                              setSucces(""); setErreur("");
                            }}>Marquer absent</Btn>
                          )}
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

      {/* Modal "Marquer absent" — centrée, ne déforme jamais la ligne du tableau */}
      {absenceTech && (
        <Modal maxWidth={380} onClose={() => { setAbsenceTech(null); setDateRetour(""); }}>
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Avatar prenom={absenceTech.prenom} nom={absenceTech.nom} couleur={MISSIONS[absenceTech.mission]?.couleur || T.inkSub} size={36} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Marquer absent</div>
                <div style={{ fontSize: 12, color: T.inkSub }}>{absenceTech.prenom} {absenceTech.nom}</div>
              </div>
            </div>
            <Field label="Date de retour prévue">
              <input type="date" className="field-input" value={dateRetour} min={getDateKey()}
                onChange={e => setDateRetour(e.target.value)} autoFocus />
            </Field>
            <p style={{ fontSize: 12, color: T.inkMuted, margin: "8px 0 18px" }}>
              Le technicien sera exclu des rappels et compteurs "non saisi" jusqu'à cette date incluse.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Btn variant="secondary" onClick={() => { setAbsenceTech(null); setDateRetour(""); }}>Annuler</Btn>
              <Btn loading={savingAbsence} onClick={async () => {
                if (!dateRetour) { setErreur("Choisis une date de retour."); return; }
                setSavingAbsence(true); setErreur("");
                try {
                  await marquerAbsentTechnicien(absenceTech.uid, dateRetour);
                  setSucces(`${absenceTech.prenom} ${absenceTech.nom} marqué absent jusqu'au ${new Date(dateRetour + "T00:00:00").toLocaleDateString("fr-FR")}.`);
                  setAbsenceTech(null); setDateRetour("");
                  recharger();
                } catch { setErreur("Erreur lors du marquage d'absence."); }
                finally { setSavingAbsence(false); }
              }}>Confirmer</Btn>
            </div>
          </div>
        </Modal>
      )}
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
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Fira Code', monospace", color: mission?.couleur }}>
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
                      <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, fontFamily: "'Fira Code', monospace", lineHeight: 1, marginBottom: 3 }}>
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
                      <div style={{ fontSize: 26, fontWeight: 700, color: mission?.couleur, fontFamily: "'Fira Code', monospace", lineHeight: 1, marginBottom: 5 }}>
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
const VueHistorique = ({ user }) => {
  const [semOffset, setSemOffset] = useState(0);
  const [techniciens, setTechniciens] = useState([]);
  const [saisiesParTech, setSaisiesParTech] = useState({});
  const [loading, setLoading] = useState(true);

  const semaine = getSemaineParOffset(semOffset);
  const offsets = [0, -1, -2, -3];

  useEffect(() => {
    setLoading(true);
    chargerHistoriqueSemaine(user.uid, semaine.key).then(({ techs, saisiesParTech: sp }) => {
      setTechniciens(techs);
      setSaisiesParTech(sp);
      setLoading(false);
    });
  }, [semaine.key]);

  // Calcule les totaux hebdomadaires d'un technicien
  function calcTotaux(uid) {
    const saisies = saisiesParTech[uid] || [];
    const total = { nb_jours: saisies.length };
    saisies.forEach(s => {
      Object.keys(s).forEach(k => {
        if (typeof s[k] === "number" && k !== "semaine") total[k] = (total[k] || 0) + s[k];
      });
    });
    return total;
  }

  const parMission = techniciens.reduce((acc, t) => {
    if (!acc[t.mission]) acc[t.mission] = [];
    acc[t.mission].push(t);
    return acc;
  }, {});

  return (
    <div style={{ padding: "28px 24px", maxWidth: 960, margin: "0 auto" }}>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, animation: `fadeUp 250ms ${T.easeOut} both` }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", marginBottom: 4 }}>Historique</h1>
          <p style={{ fontSize: 13, color: T.inkSub }}>
            Semaine S{semaine.num} · {semaine.year} · {techniciens.length} technicien{techniciens.length > 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 4, background: T.bg, borderRadius: 10, padding: 4 }}>
          {offsets.map(o => {
            const s = getSemaineParOffset(o);
            return (
              <button key={o} onClick={() => setSemOffset(o)} style={{
                background: semOffset === o ? T.surface : "transparent",
                color: semOffset === o ? T.ink : T.inkSub,
                border: "none", borderRadius: 7, padding: "5px 14px",
                fontSize: 13, fontWeight: semOffset === o ? 600 : 500,
                cursor: "pointer",
                boxShadow: semOffset === o ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: `all 180ms ${T.easeOut}`,
              }}>
                {o === 0 ? "Cette sem." : `S${s.num}`}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? <Spinner /> : (
        techniciens.length === 0 ? (
          <Card animate>
            <div style={{ padding: "48px 24px", textAlign: "center", color: T.inkMuted, fontSize: 14 }}>
              Aucun technicien dans votre équipe.
            </div>
          </Card>
        ) : (
          Object.entries(parMission).map(([missionKey, techs]) => {
            const mission = MISSIONS[missionKey];
            const champKeys = CHAMPS_PAR_MISSION[missionKey] || mission?.champs.filter(c => c.type === "number").slice(0, 4).map(c => c.key) || [];
            const champs4 = champKeys.map(k => mission?.champs.find(c => c.key === k)).filter(Boolean);
            const totalMission = techs.reduce((acc, t) => acc + (calcTotaux(t.uid)[champs4[0]?.key] || 0), 0);

            return (
              <div key={missionKey} style={{ marginBottom: 24, animation: `fadeUp 300ms ${T.easeOut} both` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 2px" }}>
                  <div style={{ width: 3, height: 16, borderRadius: 99, background: mission?.couleur }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.inkMid, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {mission?.label}
                  </span>
                  <span style={{ fontSize: 11, color: T.inkMuted }}>— {techs.length} technicien{techs.length > 1 ? "s" : ""}</span>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: T.inkSub }}>Total semaine :</span>
                    <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 14, fontWeight: 700, color: mission?.couleur, background: (mission?.couleur || T.blue) + "12", padding: "2px 10px", borderRadius: 6 }}>
                      {totalMission}
                    </span>
                  </div>
                </div>

                <Card>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                        {["Technicien", "Jours", ...champs4.map(c => c.label), "Heures", "Statut"].map(h => (
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
                        const totaux = calcTotaux(tech.uid);
                        const nbJours = totaux.nb_jours || 0;
                        const complet = nbJours >= 5;
                        const partiel = nbJours >= 3 && nbJours < 5;
                        const statutCouleur = complet ? T.green : partiel ? T.amber : T.red;
                        const statutTexte = complet ? "Complet" : nbJours > 0 ? `${nbJours}/5 jours` : "Aucune saisie";

                        return (
                          <tr key={tech.uid} className="table-row" style={{
                            borderBottom: i < techs.length - 1 ? `1px solid ${T.border}` : "none",
                            background: nbJours === 0 ? "#FFFBFB" : T.surface,
                          }}>
                            <td style={{ padding: "13px 16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <Avatar prenom={tech.prenom} nom={tech.nom} couleur={mission?.couleur || T.inkSub} size={32} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{tech.prenom} {tech.nom}</span>
                              </div>
                            </td>
                            <td style={{ padding: "13px 16px", textAlign: "center" }}>
                              <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 14, fontWeight: 700, color: statutCouleur }}>
                                {nbJours}/5
                              </span>
                            </td>
                            {champs4.map((champ, ci) => (
                              <td key={champ.key} style={{ padding: "13px 16px", textAlign: "center" }}>
                                <span style={{
                                  fontSize: ci === 0 ? 16 : 14,
                                  fontWeight: ci === 0 ? 700 : 600,
                                  color: nbJours > 0 ? (ci === 0 ? mission?.couleur : T.inkMid) : T.border,
                                  fontFamily: "'Fira Code', monospace",
                                }}>
                                  {nbJours > 0 ? (totaux[champ.key] ?? 0) : "—"}
                                </span>
                              </td>
                            ))}
                            <td style={{ padding: "13px 16px", textAlign: "center" }}>
                              <span style={{ fontSize: 13, color: nbJours > 0 ? T.inkSub : T.border, fontFamily: "'Fira Code', monospace" }}>
                                {nbJours > 0 ? `${totaux.total_heures || 0}h` : "—"}
                              </span>
                            </td>
                            <td style={{ padding: "13px 16px" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                                <Voyant saisi={complet} />
                                <span style={{ fontSize: 12, fontWeight: 500, color: statutCouleur, whiteSpace: "nowrap" }}>
                                  {statutTexte}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </div>
            );
          })
        )
      )}
    </div>
  );
};

// ─── VUE FOURNISSEURS ────────────────────────────────────────────────────────
const VueFournisseurs = ({ user }) => {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [succes, setSucces] = useState("");
  const [erreur, setErreur] = useState("");
  const [editId, setEditId] = useState(null);
  const [editEmail, setEditEmail] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmSuppr, setConfirmSuppr] = useState(null);

  const recharger = () => chargerFournisseurs().then(f => { setFournisseurs(f); setLoading(false); });
  useEffect(() => { recharger(); }, []);

  const handleCreer = async (e) => {
    e.preventDefault();
    setSaving(true); setErreur("");
    try {
      await creerFournisseur(form.nom, form.email);
      setSucces(`Fournisseur "${form.nom}" ajouté.`);
      setShowForm(false);
      setForm({ nom: "", email: "" });
      recharger();
    } catch (e) {
      if (e.message === "NOM_INVALIDE") setErreur("Nom invalide : utilisez au moins une lettre ou un chiffre.");
      else if (e.message === "DEJA_EXISTANT") setErreur("Un fournisseur portant ce nom existe déjà.");
      else setErreur("Erreur lors de la création du fournisseur.");
    }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ padding: "28px 24px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, animation: `fadeUp 250ms ${T.easeOut} both` }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", marginBottom: 4 }}>Fournisseurs</h1>
          <p style={{ fontSize: 13, color: T.inkSub }}>
            {fournisseurs.length} fournisseur{fournisseurs.length !== 1 ? "s" : ""} · récap hebdo envoyé chaque vendredi à 21h
          </p>
        </div>
        <Btn onClick={() => { setShowForm(v => !v); setSucces(""); setErreur(""); }}>
          {showForm ? "Annuler" : "+ Ajouter"}
        </Btn>
      </div>

      {succes && <Alert type="success" style={{ marginBottom: 20 }}>{succes}</Alert>}
      {erreur && <Alert type="error" style={{ marginBottom: 20 }}>{erreur}</Alert>}

      {showForm && (
        <Card animate style={{ marginBottom: 20, padding: 24 }}>
          <SectionLabel>Nouveau fournisseur</SectionLabel>
          <form onSubmit={handleCreer}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <Field label="Nom du fournisseur">
                <input className="field-input" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required placeholder="Iléo, CUA, Véolia…" />
              </Field>
              <Field label="Email de réception récap">
                <input className="field-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required placeholder="contact@fournisseur.fr" />
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Btn variant="secondary" onClick={() => setShowForm(false)}>Annuler</Btn>
              <Btn type="submit" loading={saving}>Ajouter</Btn>
            </div>
          </form>
        </Card>
      )}

      <Card animate>
        {fournisseurs.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: T.inkMuted, fontSize: 14 }}>
            Aucun fournisseur configuré.<br />
            <span style={{ fontSize: 13 }}>Sans fournisseur, aucun récap hebdo ne sera envoyé le vendredi.</span>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Fournisseur", "Email de réception", ""].map(h => (
                  <th key={h} style={{
                    textAlign: h === "Fournisseur" ? "left" : "center",
                    padding: "10px 16px",
                    fontSize: 10, color: T.inkMuted, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.08em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fournisseurs.map((four, i) => {
                const isEditing = editId === four.id;
                const borderStyle = { borderBottom: i < fournisseurs.length - 1 ? `1px solid ${T.border}` : "none" };

                if (isEditing) {
                  return (
                    <tr key={four.id} style={{ ...borderStyle, background: T.blueLight }}>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: T.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{(four.nom?.[0] ?? "?").toUpperCase()}</span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{four.nom}</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <input className="field-input" type="email" value={editEmail}
                          onChange={e => setEditEmail(e.target.value)}
                          style={{ fontSize: 12, padding: "6px 10px", width: "100%" }} />
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <Btn loading={savingEdit} style={{ fontSize: 11, padding: "4px 12px" }} onClick={async () => {
                            setSavingEdit(true);
                            try {
                              await modifierFournisseur(four.id, editEmail);
                              setEditId(null);
                              setSucces(`Email de ${four.nom} mis à jour.`);
                              recharger();
                            } catch { setErreur("Erreur lors de la modification."); }
                            finally { setSavingEdit(false); }
                          }}>Sauvegarder</Btn>
                          <Btn variant="secondary" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setEditId(null)}>Annuler</Btn>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={four.id} className="table-row" style={borderStyle}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: T.blue + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.blue }}>{(four.nom?.[0] ?? "?").toUpperCase()}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{four.nom}</span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "center", fontSize: 12, color: T.inkMuted, fontFamily: "'Fira Code', monospace" }}>{four.email}</td>
                    <td style={{ padding: "13px 16px", textAlign: "center", whiteSpace: "nowrap" }}>
                      {confirmSuppr === four.id ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <Btn variant="danger" style={{ fontSize: 11, padding: "3px 10px" }} onClick={async () => {
                            try {
                              await supprimerFournisseur(four.id);
                              setSucces(`${four.nom} supprimé.`);
                              recharger();
                            } catch { setErreur("Erreur lors de la suppression du fournisseur."); }
                            finally { setConfirmSuppr(null); }
                          }}>Confirmer</Btn>
                          <Btn variant="ghost" style={{ fontSize: 11, padding: "3px 10px" }} onClick={() => setConfirmSuppr(null)}>Annuler</Btn>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <Btn variant="ghost" style={{ fontSize: 11, padding: "3px 10px", color: T.blue }} onClick={() => {
                            setEditId(four.id); setEditEmail(four.email);
                            setConfirmSuppr(null); setSucces(""); setErreur("");
                          }}>Modifier</Btn>
                          <Btn variant="ghost" style={{ fontSize: 11, padding: "3px 10px", color: T.red }} onClick={() => { setConfirmSuppr(four.id); setEditId(null); }}>Supprimer</Btn>
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

// ─── VUE MON PROFIL ───────────────────────────────────────────────────────────
const VueMonProfil = ({ user }) => {
  const isTech = user.role === "technicien";
  const mission = isTech ? MISSIONS[user.mission] : null;
  const roleLabel = { technicien: "Technicien", charge_affaires: "Chargé d'affaires" }[user.role] || user.role;

  const [emailActuel, setEmailActuel] = useState(user.email || auth.currentUser?.email || "");
  const [editing, setEditing] = useState(false);
  const [nouvelEmail, setNouvelEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [succes, setSucces] = useState("");
  const [erreur, setErreur] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setErreur(""); setSucces("");
    const cible = nouvelEmail.trim();
    if (!cible || cible === emailActuel) { setErreur("Saisis une nouvelle adresse différente."); setSaving(false); return; }
    try {
      await modifierMonEmail(user.uid, cible);
      setEmailActuel(cible);
      setEditing(false);
      setNouvelEmail("");
      setSucces(`Email mis à jour. Un lien de vérification a été envoyé à ${cible} — clique dessus pour confirmer ton email de connexion.`);
    } catch (err) {
      if (err?.code === "auth/requires-recent-login") {
        setErreur("Pour des raisons de sécurité, reconnecte-toi (déconnexion puis reconnexion) avant de changer ton email.");
      } else if (err?.code === "auth/email-already-in-use") {
        setErreur("Cette adresse est déjà utilisée par un autre compte.");
      } else if (err?.code === "auth/invalid-email") {
        setErreur("Adresse email invalide.");
      } else {
        setErreur("Erreur lors de la modification de l'email.");
      }
    } finally { setSaving(false); }
  };

  const Ligne = ({ label, valeur, mono }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: `1px solid ${T.borderSubtle}` }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: mono ? "'Fira Code', monospace" : "inherit" }}>{valeur}</span>
    </div>
  );

  return (
    <div style={{ padding: "28px 24px", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, animation: `fadeUp 250ms ${T.easeOut} both` }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", marginBottom: 4 }}>Mon profil</h1>
        <p style={{ fontSize: 13, color: T.inkSub }}>Tes informations de compte</p>
      </div>

      {succes && <Alert type="success" style={{ marginBottom: 20 }}>{succes}</Alert>}
      {erreur && <Alert type="error" style={{ marginBottom: 20 }}>{erreur}</Alert>}

      <Card animate style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <Avatar prenom={user.prenom} nom={user.nom} couleur={mission?.couleur || (isTech ? T.blueMid : T.green)} size={52} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>{user.prenom} {user.nom}</div>
            <div style={{ marginTop: 4 }}>
              {mission ? <Badge couleur={mission.couleur} label={mission.label} small /> : <span style={{ fontSize: 12, color: T.inkSub }}>{roleLabel}</span>}
            </div>
          </div>
        </div>

        <Ligne label="Prénom" valeur={user.prenom} />
        <Ligne label="Nom" valeur={user.nom} />
        <Ligne label="Rôle" valeur={roleLabel} />
        {isTech && user.fournisseur && <Ligne label="Fournisseur" valeur={user.fournisseur} />}

        <div style={{ padding: "13px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: "'Fira Code', monospace" }}>{emailActuel}</span>
          </div>

          {!editing ? (
            <div style={{ marginTop: 14, textAlign: "right" }}>
              <Btn variant="secondary" onClick={() => { setEditing(true); setNouvelEmail(emailActuel); setSucces(""); setErreur(""); }}>
                Modifier mon email
              </Btn>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ marginTop: 14 }}>
              <Field label="Nouvelle adresse email">
                <input className="field-input" type="email" value={nouvelEmail} required
                  onChange={e => setNouvelEmail(e.target.value)} placeholder="nouvelle@adresse.fr"
                  style={{ fontFamily: "'Fira Code', monospace" }} />
              </Field>
              <p style={{ fontSize: 12, color: T.inkSub, margin: "8px 0 14px", lineHeight: 1.5 }}>
                Un lien de vérification sera envoyé à la nouvelle adresse. Ton email de connexion ne changera qu'une fois ce lien validé.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <Btn variant="secondary" onClick={() => { setEditing(false); setNouvelEmail(""); setErreur(""); }}>Annuler</Btn>
                <Btn type="submit" loading={saving}>Enregistrer</Btn>
              </div>
            </form>
          )}
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
          {page === "historique" && (user.role === "technicien" ? <VueHistoriqueTech user={user} /> : <VueHistorique user={user} />)}

          {page === "gestion" && <VueGestion user={user} />}
          {page === "fournisseurs" && <VueFournisseurs user={user} />}
          {page === "mon_profil" && <VueMonProfil user={user} />}
          {page === "profil" && profilTech && <VueProfilTechnicien tech={profilTech} onRetour={() => { setProfilTech(null); setPage("dashboard"); }} />}
        </main>
      </div>
    </>
  );
}
