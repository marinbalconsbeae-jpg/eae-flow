"""
SBEAE Agent - Suivi hebdomadaire techniciens terrain
=====================================================
Cet agent tourne en arrière-plan et gère :
- Rappels automatiques à 20h si saisie manquante
- Récap journalier envoyé aux chargés d'affaires à 20h30
- Compilation vendredi soir + remplissage Excel + envoi mails fournisseurs

Lancement : python agent.py
"""

import base64
import json
import os
import schedule
import time
import logging
import traceback
import anthropic
import resend
from firebase_client import (
    charger_techniciens as fb_charger_techniciens,
    charger_charges_affaires as fb_charger_charges_affaires,
    charger_fournisseurs as fb_charger_fournisseurs,
    charger_missions_custom as fb_charger_missions_custom,
    charger_saisies_du_jour,
    charger_saisies_semaine,
)
from datetime import datetime, date
from pathlib import Path
from zoneinfo import ZoneInfo

# ─── CONFIGURATION ────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR.parent / "data"

TEST_EMAIL_REDIRECT = None  # Si défini, tous les mails sont redirigés vers cette adresse
CONFIG_PATH = BASE_DIR / "config.json"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(BASE_DIR / "agent.log"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

# Vérification des variables d'environnement critiques au démarrage
_RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
if _RESEND_API_KEY:
    resend.api_key = _RESEND_API_KEY
else:
    log.warning("RESEND_API_KEY non définie — les emails ne seront pas envoyés")

# ─── FUSEAU HORAIRE ───────────────────────────────────────────────────────────
# Adresse qui reçoit les alertes d'échec des tâches planifiées
ALERTE_EMAIL = "marin.balcon.sbeae@gmail.com"
PARIS_TZ = ZoneInfo("Europe/Paris")  # nécessite le package tzdata sur les hôtes sans base IANA

def configurer_fuseau_paris():
    """Force le process à tourner en heure de Paris (et non UTC sur Railway).

    On règle TZ + time.tzset() : le scheduler (qui calcule en heure locale) et
    toutes les dates (date.today(), est_vendredi(), …) suivent alors l'heure de
    Paris, avec le passage heure d'été/hiver géré automatiquement par l'OS.
    time.tzset() n'existe pas sous Windows : on log un avertissement le cas échéant.
    """
    os.environ["TZ"] = "Europe/Paris"
    if hasattr(time, "tzset"):
        time.tzset()
        log.info(f"Fuseau horaire process : Europe/Paris — il est {datetime.now():%d/%m/%Y %H:%M %Z}")
    else:
        log.warning(
            "time.tzset() indisponible (Windows) — le scheduler suivra l'heure système locale. "
            f"Référence Paris : {datetime.now(PARIS_TZ):%H:%M %Z}"
        )

# Appliqué dès le chargement du module pour couvrir tous les points d'entrée
configurer_fuseau_paris()

# ─── CHARGEMENT DES DONNÉES ───────────────────────────────────────────────────
def charger_config():
    env_config = os.environ.get("AGENT_CONFIG")
    if env_config:
        try:
            return json.loads(env_config)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Variable AGENT_CONFIG contient du JSON invalide : {e}") from e
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def charger_techniciens():
    return fb_charger_techniciens()

def charger_charges_affaires():
    return fb_charger_charges_affaires()

def charger_fournisseurs():
    return fb_charger_fournisseurs()

def charger_missions_custom(ca_id):
    return fb_charger_missions_custom(ca_id)

def charger_saisies():
    raise NotImplementedError("charger_saisies() supprimée — utiliser charger_saisies_du_jour() ou charger_saisies_semaine() depuis firebase_client.")

def sauvegarder_saisies(saisies):
    raise NotImplementedError("sauvegarder_saisies() supprimée — les saisies sont écrites par l'appli web dans Firestore.")

# ─── UTILITAIRES ──────────────────────────────────────────────────────────────
def get_date_aujourdhui():
    return date.today().isoformat()

def get_semaine_courante():
    return date.today().isocalendar()[1]

def get_annee_courante():
    return date.today().year

def est_vendredi():
    return date.today().weekday() == 4

def est_absent(tech, aujourd_hui=None):
    """True si le technicien est marqué absent jusqu'à une date >= aujourd'hui.

    absent_jusqu_au est une string ISO "YYYY-MM-DD" écrite par l'appli web
    (VueGestion) ; la comparaison lexicographique de strings ISO est valide.
    """
    aujourd_hui = aujourd_hui or get_date_aujourdhui()
    absent_jusqu_au = tech.get("absent_jusqu_au")
    return bool(absent_jusqu_au) and absent_jusqu_au >= aujourd_hui

def techniciens_non_saisis(techniciens, saisies):
    """Retourne les techniciens qui n'ont pas saisi aujourd'hui, hors absents."""
    aujourd_hui = get_date_aujourdhui()
    ids_saisis = {s["tech_id"] for s in saisies if s["date"] == aujourd_hui}
    return [
        t for t in techniciens
        if t["uid"] not in ids_saisis and not est_absent(t, aujourd_hui)
    ]

def saisies_du_jour(saisies):
    raise NotImplementedError("saisies_du_jour() supprimée — utiliser charger_saisies_du_jour() depuis firebase_client.")

def saisies_de_la_semaine(saisies):
    raise NotImplementedError("saisies_de_la_semaine() supprimée — utiliser charger_saisies_semaine() depuis firebase_client.")

# ─── ENVOI D'EMAILS ───────────────────────────────────────────────────────────
def envoyer_email(config, destinataire_email, destinataire_nom, sujet, corps_html, pieces_jointes=None):
    """Envoie un email via l'API Resend."""
    try:
        if TEST_EMAIL_REDIRECT:
            sujet = f"[TEST >> {destinataire_email}] {sujet}"
            destinataire_email = TEST_EMAIL_REDIRECT

        params = {
            "from": "noreply@resend.dev",
            "to": [destinataire_email],
            "subject": sujet,
            "html": corps_html,
        }

        if pieces_jointes:
            attachments = []
            for chemin_fichier in pieces_jointes:
                with open(chemin_fichier, "rb") as f:
                    attachments.append({
                        "filename": Path(chemin_fichier).name,
                        "content": base64.b64encode(f.read()).decode("utf-8"),
                    })
            params["attachments"] = attachments

        resend.Emails.send(params)
        log.info(f"Email envoyé à {destinataire_nom} ({destinataire_email}) : {sujet}")
        return True

    except Exception as e:
        log.error(f"Erreur envoi email à {destinataire_email} : {e}")
        return False

# ─── ALERTE D'ÉCHEC ───────────────────────────────────────────────────────────
def envoyer_alerte_echec(erreur, nom_tache=None):
    """Envoie une alerte email à l'admin quand une tâche planifiée échoue.

    Appelée depuis le bloc except qui entoure chaque tâche : traceback.format_exc()
    récupère donc la stack de l'exception en cours. Toute erreur d'envoi de l'alerte
    elle-même est loguée et avalée (ne doit jamais faire planter la boucle).
    """
    try:
        trace = traceback.format_exc()
        if not trace or trace.strip() == "NoneType: None":
            trace = str(erreur)
        sujet = f"[EAE Flow] ⚠️ Échec tâche {nom_tache}".strip() if nom_tache else "[EAE Flow] ⚠️ Échec d'une tâche planifiée"
        corps = f"""
        <html><body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 640px; margin: 0 auto; padding: 20px;">
            <div style="background: #DC2626; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0; font-size: 18px;">EAE Flow — Échec d'une tâche planifiée</h2>
            </div>
            <div style="background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
                <p style="margin: 0 0 8px;"><strong>Tâche :</strong> {nom_tache or 'inconnue'}</p>
                <p style="margin: 0 0 8px;"><strong>Horodatage :</strong> {datetime.now():%A %d %B %Y %H:%M %Z}</p>
                <p style="margin: 0 0 6px;"><strong>Erreur :</strong></p>
                <pre style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 6px; font-size: 12px; white-space: pre-wrap; word-break: break-word; color: #991B1B;">{trace}</pre>
                <p style="color: #999; font-size: 12px; margin-top: 16px;">Message automatique EAE Flow — surveillance des tâches.</p>
            </div>
        </div>
        </body></html>
        """
        envoyer_email(None, ALERTE_EMAIL, "Admin EAE Flow", sujet, corps)
        log.info(f"Alerte d'échec envoyée à {ALERTE_EMAIL} pour la tâche '{nom_tache}'")
    except Exception as e:
        log.error(f"Impossible d'envoyer l'alerte d'échec : {e}")

# ─── SUPPRESSION COMPTES AUTH ─────────────────────────────────────────────────
def traiter_suppressions():
    """Supprime les comptes Firebase Auth en queue (écrits par l'appli web)."""
    from firebase_admin import auth as fb_auth
    from firebase_client import _get_db
    db = _get_db()
    docs = list(db.collection("suppressions").stream())
    if not docs:
        return
    for snap in docs:
        uid = snap.to_dict().get("uid") or snap.id
        try:
            fb_auth.delete_user(uid)
            log.info(f"Compte Auth supprimé : {uid}")
        except Exception as e:
            log.error(f"Erreur suppression Auth {uid} : {e}")
        snap.reference.delete()

# ─── CHAMPS PAR MISSION ───────────────────────────────────────────────────────
LABELS_CHAMPS = {
    "cpt_dn15_20":       "CPT DN15-20",
    "cpt_dn_sup20":      "CPT DN>20",
    "cpt_dn30_40":       "CPT DN30-40",
    "modules_poses":     "Modules",
    "modules_relances":  "Modules relancés",
    "rac":               "RAC",
    "mo_heures":         "MO (h)",
    "clapets_fact":      "Clapets fact.",
    "cpt_releves":       "CPT relevés",
    "infructueux":       "Infructueux",
    "absents_pda":       "Abs. PDA",
    "ctrl_vente_inf10":  "Ctrl AC <10pts",
    "ctrl_vente_sup10":  "Ctrl AC >10pts",
    "ctrl_contrat_inf10":"Ctrl Ctr <10pts",
    "ctrl_contrat_sup10":"Ctrl Ctr >10pts",
    "clients_absents":   "Cl. absents",
    "pi_visites":        "PI visités",
    "pi_conformes":      "PI conformes",
    "pi_non_conformes":  "PI non conf.",
    "pi_inaccessibles":  "PI inaccessibles",
    "anc_controles":     "ANC contrôlés",
    "anc_conformes":     "ANC conformes",
    "anc_non_conformes": "ANC non conf.",
    "total_heures":      "Heures",
}

CHAMPS_PAR_MISSION = {
    "RT_Compteur_Module": ["cpt_dn15_20", "cpt_dn_sup20", "modules_poses", "rac", "mo_heures"],
    "Releve_CPT":         ["cpt_releves", "infructueux", "absents_pda"],
    "Controle_AC":        ["ctrl_vente_inf10", "ctrl_vente_sup10", "ctrl_contrat_inf10", "clients_absents"],
    "RT_CPT_Arras":       ["cpt_dn15_20", "cpt_dn_sup20", "rac"],
    "RT_CPT_SEPIG":       ["cpt_dn30_40", "rac", "mo_heures"],
    "RT_CPT_Suez":        ["cpt_dn15_20", "cpt_dn_sup20", "modules_poses"],
    "RT_CPT":             ["cpt_dn15_20", "cpt_dn_sup20", "rac"],
    "PI_Poteau_Incendie": ["pi_visites", "pi_conformes", "pi_non_conformes"],
    "Controle_ANC":       ["anc_controles", "anc_conformes", "anc_non_conformes"],
}

def get_champs_mission(mission_key, missions_custom=None):
    """Résout la liste des clés de champs d'une mission, STATIQUE ou PERSONNALISÉE
    (missions_custom : liste de docs Firestore {id, ca_id, label, couleur, champs:
    [{key,label,type}], ...} pour le CA concerné — voir charger_missions_custom).
    Même pattern que getMissionData() côté React : statique d'abord, puis custom."""
    if mission_key in CHAMPS_PAR_MISSION:
        return CHAMPS_PAR_MISSION[mission_key]
    for m in (missions_custom or []):
        if m.get("id") == mission_key:
            return [c["key"] for c in m.get("champs", [])]
    return []

def get_label_mission(mission_key, missions_custom=None):
    """Résout le libellé affichable d'une mission, statique ou personnalisée. Contrairement
    à MISSIONS côté React, l'agent n'a pas de libellé français dédié pour les missions
    statiques : on en dérive un depuis la clé (RT_Compteur_Module -> "RT Compteur Module").
    Pour une mission personnalisée, utilise le label réellement saisi par le CA."""
    for m in (missions_custom or []):
        if m.get("id") == mission_key:
            return m.get("label", mission_key)
    return (mission_key or "").replace("_", " ")

def _labels_pour_missions(missions_custom=None):
    """Fusionne LABELS_CHAMPS (statique) avec les labels des champs de toutes les
    missions personnalisées fournies, pour que le libellé affiché d'un champ custom
    soit celui saisi par le CA plutôt que sa clé technique (slug)."""
    labels = dict(LABELS_CHAMPS)
    for m in (missions_custom or []):
        for c in m.get("champs", []):
            labels.setdefault(c["key"], c.get("label", c["key"]))
    return labels

def _union_champs_missions(missions, missions_custom=None):
    """Union ordonnée et dédupliquée des champs (statiques OU personnalisés) pour un
    ensemble de missions. Utilisée quand un technicien a changé de mission en cours de
    semaine : on veut afficher les champs de TOUTES les missions réellement rencontrées,
    pas seulement de sa mission actuelle, pour ne perdre aucune donnée déjà calculée."""
    vus = set()
    champs = []
    for m in missions:
        for k in get_champs_mission(m, missions_custom):
            if k not in vus:
                vus.add(k)
                champs.append(k)
    return champs

def _stats_paires_mission(saisie, mission, missions_custom=None):
    """Retourne [(label, valeur), ...] des champs renseignés d'une saisie, pour une
    mission statique OU personnalisée. Ajoute "Heures" en fin de liste si le champ
    total_heures n'est pas déjà listé par la mission elle-même. Brique commune à
    _formater_stats_mission (HTML) et generer_analyse_claude (texte brut pour Claude) —
    garantit que les deux reçoivent exactement les mêmes libellés et valeurs."""
    labels = _labels_pour_missions(missions_custom)
    champs = get_champs_mission(mission, missions_custom)
    paires = []
    for key in champs:
        val = saisie.get(key)
        if val is not None:
            paires.append((labels.get(key, key), val))
    if "total_heures" not in champs:
        heures = saisie.get("total_heures")
        if heures is not None:
            paires.append((labels.get("total_heures", "Heures"), heures))
    return paires

# ─── TÂCHE 1 : RAPPEL 20H AUX TECHNICIENS ────────────────────────────────────
def tache_rappel_techniciens():
    """Envoie un rappel aux techniciens qui n'ont pas saisi leur journée."""
    log.info("=== TÂCHE : Rappels techniciens ===")

    config = charger_config()
    techniciens = charger_techniciens()
    saisies = charger_saisies_du_jour()

    absents = [t for t in techniciens if est_absent(t)]
    if absents:
        log.info(f"{len(absents)} technicien(s) absent(s) exclu(s) des rappels : {[t['nom'] for t in absents]}")

    # techniciens_non_saisis() exclut déjà les absents (voir est_absent())
    non_saisis = techniciens_non_saisis(techniciens, saisies)

    if not non_saisis:
        log.info("Tous les techniciens ont saisi leur journée (ou sont absents). Aucun rappel nécessaire.")
        return

    log.info(f"{len(non_saisis)} technicien(s) sans saisie : {[t['nom'] for t in non_saisis]}")

    for tech in non_saisis:
        sujet = f"[EAE Flow] Rappel saisie journalière — {datetime.now().strftime('%d/%m/%Y')}"
        corps = f"""
        <html><body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1A56DB; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0; font-size: 18px;">EAE Flow — Rappel saisie</h2>
            </div>
            <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
                <p>Bonjour <strong>{tech['prenom']} {tech['nom']}</strong>,</p>
                <p>Vous n'avez pas encore saisi vos statistiques du jour
                (<strong>{datetime.now().strftime('%A %d %B %Y')}</strong>).</p>
                <p>Merci de vous connecter à EAE Flow pour enregistrer votre journée.</p>
                <br>
                <p style="color: #666; font-size: 13px;">
                    Ce message est automatique. Ne pas répondre à cet email.
                </p>
            </div>
        </div>
        </body></html>
        """
        envoyer_email(config, tech["email"], f"{tech['prenom']} {tech['nom']}", sujet, corps)

# ─── ANALYSE CLAUDE ───────────────────────────────────────────────────────────
def generer_analyse_claude(ca, mes_techs, saisies_jour, non_saisis_ids, missions_custom=None):
    """Génère une analyse narrative de la journée via Claude API.

    missions_custom : missions personnalisées DU CA concerné (charger_missions_custom),
    nécessaire pour que les champs et le libellé de mission soient corrects même pour
    un technicien affecté à une mission personnalisée (et pas seulement statique).
    """
    try:
        lignes = []
        for tech in mes_techs:
            saisie = next((s for s in saisies_jour if s["tech_id"] == tech["uid"]), None)
            # Mission au moment de CETTE saisie (fallback mission actuelle) — évite de
            # mal libeller un technicien dont la mission a changé après sa saisie du matin.
            mission_key = (saisie.get("mission_au_moment_saisie") if saisie else None) or tech["mission"]
            mission_label = get_label_mission(mission_key, missions_custom)
            if saisie:
                paires = _stats_paires_mission(saisie, mission_key, missions_custom)
                stats_str = ", ".join(f"{label}: {val}" for label, val in paires)
                lignes.append(f"- {tech['prenom']} {tech['nom']} ({mission_label}) : {stats_str or 'données saisies'}")
            else:
                lignes.append(f"- {tech['prenom']} {tech['nom']} ({mission_label}) : NON SAISI")

        donnees = "\n".join(lignes)
        date_str = datetime.now().strftime("%A %d %B %Y")

        prompt = f"""Tu es analyste pour SBEAE, une entreprise de travaux sur compteurs d'eau (remplacement, relevé, contrôle).
Rédige une analyse narrative courte (3 à 5 phrases) en français pour le chargé d'affaires {ca['prenom']} {ca['nom']}, basée sur les saisies du {date_str}.

Données des techniciens :
{donnees}

Sois direct et factuel. Mets en avant les performances notables et les manques (saisies manquantes ou volumes faibles). Ne génère pas de HTML, juste du texte pur."""

        client_claude = anthropic.Anthropic()
        response = client_claude.messages.create(
            model="claude-opus-4-8",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}]
        )
        texte = response.content[0].text.strip()
        log.info(f"Analyse Claude generee pour {ca['prenom']} {ca['nom']}")
        return texte

    except Exception as e:
        log.error(f"Erreur analyse Claude pour {ca.get('nom', '?')} : {e}")
        return ""


# ─── ANALYSE CLAUDE HEBDO ────────────────────────────────────────────────────
def generer_analyse_claude_semaine(ca, mes_techs, totaux, semaine, missions_custom=None):
    """Génère une analyse narrative hebdomadaire via Claude API.

    missions_custom : missions personnalisées DU CA concerné (charger_missions_custom),
    nécessaire pour que les champs et le libellé de mission soient corrects même pour
    un technicien affecté à une mission personnalisée.
    """
    try:
        labels = _labels_pour_missions(missions_custom)
        lignes = []
        for tech in mes_techs:
            total = totaux.get(tech["uid"], {})
            nb_jours = total.get("nb_jours", 0)
            mission = get_label_mission(tech["mission"], missions_custom)
            # Union des champs des missions effectivement rencontrées dans la semaine
            # (total["missions_semaine"], calculé par _calculer_totaux_pour_saisies) —
            # pas seulement la mission actuelle, pour ne pas faire dire à Claude qu'un
            # technicien "n'a presque rien fait" alors qu'il a travaillé sous une autre
            # mission avant d'être réaffecté en cours de semaine.
            champs = _union_champs_missions(total.get("missions_semaine") or [tech["mission"]], missions_custom)
            stats = ", ".join(
                f"{labels.get(k, k)}: {total.get(k, 0)}"
                for k in champs if total.get(k) is not None
            )
            lignes.append(
                f"- {tech['prenom']} {tech['nom']} ({mission}, {nb_jours}/5 jours) : {stats or 'aucune saisie'}"
            )

        donnees = "\n".join(lignes)
        prompt = f"""Tu es analyste pour SBEAE, entreprise de travaux sur compteurs d'eau.
Rédige une analyse narrative courte (3 à 5 phrases) en français pour le chargé d'affaires {ca['prenom']} {ca['nom']}, basée sur les totaux de la semaine S{semaine}.

Données des techniciens :
{donnees}

Sois direct et factuel. Note les bons performers, les absences fréquentes, les volumes inhabituels. Ne génère pas de HTML, juste du texte pur."""

        client_claude = anthropic.Anthropic()
        response = client_claude.messages.create(
            model="claude-opus-4-8",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}]
        )
        texte = response.content[0].text.strip()
        log.info(f"Analyse Claude semaine générée pour {ca['prenom']} {ca['nom']}")
        return texte

    except Exception as e:
        log.error(f"Erreur analyse Claude semaine pour {ca.get('nom', '?')} : {e}")
        return ""


# ─── TÂCHE 2 : RÉCAP JOURNALIER AUX CHARGÉS D'AFFAIRES ──────────────────────
def tache_recap_journalier():
    """Envoie le récap du jour à chaque chargé d'affaires."""
    log.info("=== TÂCHE : Récap journalier chargés d'affaires ===")

    config = charger_config()
    techniciens = charger_techniciens()
    charges = charger_charges_affaires()
    saisies_jour = charger_saisies_du_jour()
    non_saisis = techniciens_non_saisis(techniciens, saisies_jour)
    non_saisis_ids = {t["uid"] for t in non_saisis}

    for ca in charges:
        # Un technicien dépend de ce CA aujourd'hui si sa saisie du jour porte
        # charge_id_au_moment_saisie == ca["id"] (capturé à l'écriture) ; à défaut
        # (pas de saisie aujourd'hui, ou saisie antérieure à ce champ), on retombe
        # sur son charge_id ACTUEL — un transfert de CA en cours de journée avant
        # 20h30 ne doit pas faire disparaître/réapparaître le technicien à tort.
        mes_techs = []
        for t in techniciens:
            saisie_t = next((s for s in saisies_jour if s["tech_id"] == t["uid"]), None)
            ca_du_jour = (saisie_t.get("charge_id_au_moment_saisie") if saisie_t else None) or t.get("charge_id")
            if ca_du_jour == ca["id"]:
                mes_techs.append(t)
        if not mes_techs:
            continue

        # Missions personnalisées DE CE CA — nécessaire pour résoudre correctement les
        # champs/libellés d'un technicien affecté à une mission personnalisée.
        missions_custom_ca = charger_missions_custom(ca["id"])

        # Construire le tableau HTML des techniciens
        lignes_html = ""
        for tech in mes_techs:
            saisie = next((s for s in saisies_jour if s["tech_id"] == tech["uid"]), None)
            statut_couleur = "#16A34A" if saisie else "#DC2626"
            statut_texte = "Saisi" if saisie else "Non saisi"
            # Mission AU MOMENT de cette saisie précise (fallback mission actuelle) — un
            # changement de mission après la saisie du matin ne doit pas faire chercher
            # les mauvais champs dans les données réellement saisies.
            mission_du_jour = (saisie.get("mission_au_moment_saisie") if saisie else None) or tech.get("mission", "")

            if saisie:
                stats = _formater_stats_mission(saisie, mission_du_jour, missions_custom_ca)
            else:
                stats = "<em style='color:#999'>—</em>"

            lignes_html += f"""
            <tr style="border-bottom: 1px solid #f0f0f0; background: {'#fff' if saisie else '#fff5f5'};">
                <td style="padding: 10px 16px; font-weight: 600;">{tech['prenom']} {tech['nom']}</td>
                <td style="padding: 10px 16px; color: #666; font-size: 13px;">{get_label_mission(mission_du_jour, missions_custom_ca)}</td>
                <td style="padding: 10px 16px; font-size: 13px;">{stats}</td>
                <td style="padding: 10px 16px; text-align: center;">
                    <span style="background: {statut_couleur}20; color: {statut_couleur}; padding: 3px 10px; border-radius: 5px; font-size: 12px; font-weight: 600;">
                        {statut_texte}
                    </span>
                </td>
            </tr>
            """

        nb_saisis = len(mes_techs) - len([t for t in mes_techs if t["uid"] in non_saisis_ids])
        nb_total = len(mes_techs)

        analyse = generer_analyse_claude(ca, mes_techs, saisies_jour, non_saisis_ids, missions_custom_ca)
        bloc_analyse = f"""
                <div style="background: #F0F7FF; border-left: 4px solid #1A56DB; margin: 0 24px 16px; padding: 14px 16px; border-radius: 0 6px 6px 0; font-size: 14px; line-height: 1.6; color: #1e3a5f;">
                    <strong style="display: block; margin-bottom: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #1A56DB;">Analyse du jour · Claude</strong>
                    {analyse}
                </div>""" if analyse else ""

        sujet = f"[EAE Flow] Récap journalier — {datetime.now().strftime('%d/%m/%Y')} — {nb_saisis}/{nb_total} saisies"
        corps = f"""
        <html><body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
            <div style="background: #0F172A; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0; font-size: 18px;">EAE Flow — Récap journalier</h2>
                <p style="margin: 4px 0 0; color: #94A3B8; font-size: 13px;">
                    {datetime.now().strftime('%A %d %B %Y')} · {nb_saisis}/{nb_total} techniciens ont saisi
                </p>
            </div>
            <div style="background: #fff; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden;">
                <p style="padding: 16px 24px 0; margin: 0;">Bonjour <strong>{ca['prenom']} {ca['nom']}</strong>,</p>
                <p style="padding: 8px 24px 16px; margin: 0; color: #666;">
                    Voici le bilan de la journée pour vos {nb_total} techniciens.
                </p>
                {bloc_analyse}
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #F8FAFC; border-bottom: 2px solid #e0e0e0;">
                            <th style="padding: 10px 16px; text-align: left; font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.05em;">Technicien</th>
                            <th style="padding: 10px 16px; text-align: left; font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.05em;">Mission</th>
                            <th style="padding: 10px 16px; text-align: left; font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.05em;">Stats du jour</th>
                            <th style="padding: 10px 16px; text-align: center; font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.05em;">Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lignes_html}
                    </tbody>
                </table>
                <p style="padding: 16px 24px; color: #999; font-size: 12px; border-top: 1px solid #f0f0f0;">
                    Ce message est envoyé automatiquement chaque soir à 20h30. Ne pas répondre.
                </p>
            </div>
        </div>
        </body></html>
        """
        envoyer_email(config, ca["email"], f"{ca['prenom']} {ca['nom']}", sujet, corps)

def _formater_stats_mission(saisie, mission, missions_custom=None):
    """Formate les stats d'une saisie selon la mission du technicien (statique ou
    personnalisée — missions_custom : liste des missions du CA concerné)."""
    paires = _stats_paires_mission(saisie, mission, missions_custom)
    parts = [f"{label} : <strong>{val}</strong>" for label, val in paires]
    html = " · ".join(parts) if parts else "Données saisies"
    commentaires = (saisie.get("commentaires") or "").strip()
    if commentaires:
        html += f'<br><em style="color:#666; font-size:12px;">💬 {commentaires}</em>'
    return html

# ─── UTILITAIRE FORMATAGE TOTAUX HEBDO ───────────────────────────────────────
def _formater_totaux_mission(total, mission_fallback, missions_custom=None):
    """Formate les totaux hebdomadaires d'un technicien (statique ou personnalisée —
    missions_custom : liste des missions du CA concerné).

    Utilise l'union des champs de TOUTES les missions effectivement rencontrées dans
    la semaine (total["missions_semaine"], calculé par _calculer_totaux_pour_saisies) :
    si le technicien a changé de mission en cours de semaine, les totaux de l'ancienne
    mission (réellement calculés dans `total`) restent affichés au lieu d'être masqués
    par un filtrage sur la seule mission actuelle. À défaut (pas de saisie cette semaine,
    ou anciennes saisies sans le champ), retombe sur mission_fallback (mission actuelle).
    """
    labels = _labels_pour_missions(missions_custom)
    champs = _union_champs_missions(total.get("missions_semaine") or [mission_fallback], missions_custom)
    parts = []
    for key in champs:
        val = total.get(key)
        if val is not None:
            parts.append(f"{labels.get(key, key)} : <strong>{val}</strong>")
    heures = total.get("total_heures")
    if heures is not None and "total_heures" not in champs:
        parts.append(f"Heures : <strong>{heures}h</strong>")
    return " · ".join(parts) if parts else "—"


# ─── TÂCHE 3 : RÉCAP HEBDO CHARGÉS D'AFFAIRES ────────────────────────────────
def tache_recap_hebdo_ca():
    """Envoie à chaque CA un récap hebdo de ses techniciens groupé par mission, avec analyse Claude."""
    log.info("=== TÂCHE : Récap hebdo chargés d'affaires ===")

    config = charger_config()
    techniciens = charger_techniciens()
    charges = charger_charges_affaires()
    saisies_sem = charger_saisies_semaine()
    semaine = get_semaine_courante()
    annee = get_annee_courante()

    techs_par_uid = {t["uid"]: t for t in techniciens}

    for ca in charges:
        # Chaque SAISIE de la semaine est attribuée au CA en vigueur AU MOMENT où elle a
        # été faite (charge_id_au_moment_saisie), avec repli sur le charge_id ACTUEL du
        # technicien pour les saisies antérieures à ce champ. Un technicien transféré
        # vers un autre CA en cours de semaine apparaît donc, chez chaque CA, avec
        # uniquement les jours où il dépendait réellement de lui — pas la semaine
        # entière chez le nouveau CA et zéro chez l'ancien.
        saisies_ca_par_tech = {}
        for s in saisies_sem:
            tech = techs_par_uid.get(s["tech_id"])
            if not tech:
                continue  # technicien supprimé entre-temps
            ca_saisie = s.get("charge_id_au_moment_saisie") or tech.get("charge_id")
            if ca_saisie == ca["id"]:
                saisies_ca_par_tech.setdefault(s["tech_id"], []).append(s)

        # Techniciens à afficher : ceux actuellement rattachés à ce CA (même sans saisie
        # cette semaine, pour qu'ils apparaissent à 0/5) + ceux dont au moins une saisie
        # de la semaine lui est attribuée (transférés depuis, mais dont les jours
        # antérieurs au transfert restent visibles ici).
        uids_actuels = {t["uid"] for t in techniciens if t.get("charge_id") == ca["id"]}
        uids_a_afficher = uids_actuels | set(saisies_ca_par_tech.keys())
        if not uids_a_afficher:
            continue
        mes_techs = [techs_par_uid[uid] for uid in uids_a_afficher if uid in techs_par_uid]
        totaux = {
            uid: _calculer_totaux_pour_saisies(techs_par_uid[uid], saisies_ca_par_tech.get(uid, []))
            for uid in uids_a_afficher if uid in techs_par_uid
        }

        # Missions personnalisées DE CE CA — nécessaire pour résoudre correctement les
        # champs/libellés d'un technicien affecté à une mission personnalisée.
        missions_custom_ca = charger_missions_custom(ca["id"])

        # Grouper par mission
        missions_map = {}
        for tech in mes_techs:
            m = tech.get("mission", "Autre")
            missions_map.setdefault(m, []).append(tech)

        # Construire les blocs HTML par mission
        blocs_html = ""
        for mission, techs in sorted(missions_map.items()):
            lignes_mission = ""
            for tech in techs:
                total = totaux.get(tech["uid"], {})
                nb_jours = total.get("nb_jours", 0)
                stats_html = _formater_totaux_mission(total, mission, missions_custom_ca)
                if nb_jours >= 4:
                    badge_bg, badge_color = "#D1FAE5", "#065F46"
                elif nb_jours == 0:
                    badge_bg, badge_color = "#FEE2E2", "#991B1B"
                else:
                    badge_bg, badge_color = "#FEF3C7", "#92400E"
                lignes_mission += f"""
                <tr style="border-bottom:1px solid #F1F5F9; background:{'#FFF5F5' if nb_jours==0 else '#FFFFFF'};">
                    <td style="padding:9px 16px; font-weight:600; color:#020617;">{tech['prenom']} {tech['nom']}</td>
                    <td style="padding:9px 16px; text-align:center;">
                        <span style="background:{badge_bg}; color:{badge_color}; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:700;">{nb_jours}/5</span>
                    </td>
                    <td style="padding:9px 16px; font-size:13px; color:#334155;">{stats_html}</td>
                </tr>"""

            blocs_html += f"""
            <tr>
                <td colspan="3" style="padding:8px 16px 6px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#0369A1; background:#F0F7FF; border-top:2px solid #BFDBFE;">
                    {get_label_mission(mission, missions_custom_ca)}
                </td>
            </tr>
            {lignes_mission}"""

        analyse = generer_analyse_claude_semaine(ca, mes_techs, totaux, semaine, missions_custom_ca)
        bloc_analyse = f"""
        <div style="background:#F0F7FF; border-left:4px solid #0369A1; margin:16px 24px; padding:14px 16px; border-radius:0 6px 6px 0; font-size:14px; line-height:1.6; color:#1e3a5f;">
            <strong style="display:block; margin-bottom:6px; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#0369A1;">Analyse de la semaine · Claude</strong>
            {analyse}
        </div>""" if analyse else ""

        nb_actifs = sum(1 for t in mes_techs if totaux.get(t["uid"], {}).get("nb_jours", 0) > 0)
        total_heures_equipe = sum(totaux.get(t["uid"], {}).get("total_heures", 0) or 0 for t in mes_techs)

        sujet = f"[EAE Flow] Récap semaine S{semaine}/{annee} — {nb_actifs}/{len(mes_techs)} actifs"
        corps = f"""
        <html><body style="font-family: Arial, sans-serif; color: #333; background: #F8FAFC;">
        <div style="max-width: 720px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(180deg, #0F172A, #1E293B); color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0; font-size: 19px; font-weight: 700; letter-spacing: -0.02em;">EAE Flow — Récap semaine S{semaine}</h2>
                <p style="margin: 6px 0 0; color: #94A3B8; font-size: 13px;">
                    {annee} · {nb_actifs}/{len(mes_techs)} techniciens actifs · {total_heures_equipe}h total équipe
                </p>
            </div>
            <div style="background: #fff; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden;">
                <p style="padding: 16px 24px 4px; margin: 0;">Bonjour <strong>{ca['prenom']} {ca['nom']}</strong>,</p>
                <p style="padding: 4px 24px 12px; margin: 0; color: #64748B; font-size: 14px;">
                    Voici le bilan de la semaine S{semaine} pour vos {len(mes_techs)} techniciens.
                </p>
                {bloc_analyse}
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #F8FAFC; border-bottom: 2px solid #E2E8F0;">
                            <th style="padding: 10px 16px; text-align: left; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em;">Technicien</th>
                            <th style="padding: 10px 16px; text-align: center; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em;">Jours</th>
                            <th style="padding: 10px 16px; text-align: left; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em;">Totaux semaine</th>
                        </tr>
                    </thead>
                    <tbody>{blocs_html}</tbody>
                </table>
                <p style="padding: 16px 24px; color: #94A3B8; font-size: 12px; border-top: 1px solid #F1F5F9; margin: 0;">
                    Message automatique EAE Flow · chaque vendredi à 21h. Ne pas répondre.
                </p>
            </div>
        </div>
        </body></html>
        """
        envoyer_email(config, ca["email"], f"{ca['prenom']} {ca['nom']}", sujet, corps)

    log.info("=== Récap hebdo CA terminé ===")


# ─── TÂCHE 4 : RÉCAP HEBDO FOURNISSEURS ──────────────────────────────────────
def tache_recap_hebdo_fournisseur():
    """Envoie à chaque fournisseur un récap hebdo des techniciens associés."""
    log.info("=== TÂCHE : Récap hebdo fournisseurs ===")

    config = charger_config()
    techniciens = charger_techniciens()
    fournisseurs = charger_fournisseurs()
    saisies_sem = charger_saisies_semaine()
    semaine = get_semaine_courante()
    annee = get_annee_courante()

    techs_par_uid = {t["uid"]: t for t in techniciens}

    for four in fournisseurs:
        nom_four = four.get("nom", "")
        email_four = four.get("email")
        if not email_four:
            log.warning(f"Fournisseur '{nom_four}' sans email — mail ignoré")
            continue
        # Comparaison insensible à la casse et aux espaces pour tolérer les saisies manuelles
        cle_four = nom_four.strip().casefold()

        # Même logique que pour les CA : chaque saisie est attribuée au fournisseur en
        # vigueur AU MOMENT où elle a été faite (fournisseur_au_moment_saisie), avec
        # repli sur le fournisseur ACTUEL du technicien pour les anciennes saisies sans
        # ce champ. Un technicien réaffecté d'un fournisseur à un autre en cours de
        # semaine n'est donc plus facturé/compté en double ou en l'absence de l'un d'eux.
        saisies_four_par_tech = {}
        for s in saisies_sem:
            tech = techs_par_uid.get(s["tech_id"])
            if not tech:
                continue
            four_saisie = (s.get("fournisseur_au_moment_saisie") or tech.get("fournisseur") or "").strip().casefold()
            if four_saisie == cle_four:
                saisies_four_par_tech.setdefault(s["tech_id"], []).append(s)

        uids_actuels = {t["uid"] for t in techniciens if (t.get("fournisseur") or "").strip().casefold() == cle_four}
        uids_a_afficher = uids_actuels | set(saisies_four_par_tech.keys())
        if not uids_a_afficher:
            log.info(f"Aucun technicien pour le fournisseur '{nom_four}' — mail ignoré")
            continue
        ses_techs = [techs_par_uid[uid] for uid in uids_a_afficher if uid in techs_par_uid]
        totaux = {
            uid: _calculer_totaux_pour_saisies(techs_par_uid[uid], saisies_four_par_tech.get(uid, []))
            for uid in uids_a_afficher if uid in techs_par_uid
        }

        lignes_html = ""
        for tech in ses_techs:
            total = totaux.get(tech["uid"], {})
            nb_jours = total.get("nb_jours", 0)
            mission = tech.get("mission", "").replace("_", " ")
            stats = _formater_totaux_mission(total, tech.get("mission", ""))
            lignes_html += f"""
            <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 10px 16px; font-weight: 600; color: #020617;">{tech['prenom']} {tech['nom']}</td>
                <td style="padding: 10px 16px; color: #64748B; font-size: 13px;">{mission}</td>
                <td style="padding: 10px 16px; text-align: center; font-size: 13px; font-weight: 700;">{nb_jours}/5</td>
                <td style="padding: 10px 16px; font-size: 13px; color: #334155;">{stats}</td>
            </tr>"""

        nb_actifs = sum(1 for t in ses_techs if totaux.get(t["uid"], {}).get("nb_jours", 0) > 0)
        contact = four.get("contact") or nom_four or "Madame, Monsieur"

        sujet = f"Bilan semaine S{semaine}/{annee} — Techniciens SBEAE"
        corps = f"""
        <html><body style="font-family: Arial, sans-serif; color: #333; background: #F8FAFC;">
        <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
            <div style="background: #0F172A; color: white; padding: 18px 24px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 700;">Bilan semaine S{semaine} — SBEAE</h2>
                <p style="margin: 5px 0 0; color: #94A3B8; font-size: 13px;">
                    {annee} · {nb_actifs}/{len(ses_techs)} techniciens actifs cette semaine
                </p>
            </div>
            <div style="background: #fff; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden;">
                <p style="padding: 16px 24px 8px; margin: 0;">Bonjour <strong>{contact}</strong>,</p>
                <p style="padding: 0 24px 16px; margin: 0; color: #64748B; font-size: 14px;">
                    Voici les statistiques de la semaine S{semaine} pour les techniciens SBEAE affectés à {nom_four}.
                </p>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #F8FAFC; border-bottom: 2px solid #E2E8F0;">
                            <th style="padding: 10px 16px; text-align: left; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em;">Technicien</th>
                            <th style="padding: 10px 16px; text-align: left; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em;">Mission</th>
                            <th style="padding: 10px 16px; text-align: center; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em;">Jours</th>
                            <th style="padding: 10px 16px; text-align: left; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em;">Totaux</th>
                        </tr>
                    </thead>
                    <tbody>{lignes_html}</tbody>
                </table>
                <p style="padding: 16px 24px; color: #94A3B8; font-size: 12px; border-top: 1px solid #F1F5F9; margin: 0;">
                    Ce bilan est transmis automatiquement chaque vendredi soir par SBEAE.
                </p>
            </div>
        </div>
        </body></html>
        """
        envoyer_email(config, email_four, contact, sujet, corps)

    log.info("=== Récap hebdo fournisseurs terminé ===")

CHAMPS_NUMERIQUES = [
    "total_heures", "paniers_midi", "paniers_soir", "rdv_jour",
    "cpt_dn15_20", "cpt_dn_sup20", "rac", "clapets_fact", "clapets_non_fact",
    "sr_laiton", "reducteurs", "mo_heures", "modules_poses", "modules_relances",
    "cpt_non_faits", "depl_injustifies", "clients_absents",
    "cpt_releves", "infructueux", "absents_pda",
    "ctrl_vente_inf10", "ctrl_vente_sup10", "ctrl_contrat_inf10", "ctrl_contrat_sup10",
]

def _calculer_totaux_pour_saisies(tech, saisies_tech):
    """Calcule les totaux hebdomadaires d'un technicien à partir d'un sous-ensemble de
    saisies déjà filtré (ex: uniquement les jours où il dépendait d'un CA ou d'un
    fournisseur donné — voir tache_recap_hebdo_ca/fournisseur).

    Calcule aussi missions_semaine : l'ensemble des missions effectivement rencontrées
    dans ces saisies (mission_au_moment_saisie, fallback mission actuelle du technicien
    pour les anciennes saisies sans ce champ) — consommé par _formater_totaux_mission
    pour ne perdre aucun champ si la mission a changé en cours de semaine.
    """
    total = {"tech_id": tech["uid"], "nb_jours": len(saisies_tech)}
    for champ in CHAMPS_NUMERIQUES:
        total[champ] = sum(s.get(champ, 0) or 0 for s in saisies_tech)
    missions = {s.get("mission_au_moment_saisie") or tech.get("mission", "") for s in saisies_tech}
    missions.discard("")
    if not missions and tech.get("mission"):
        missions.add(tech["mission"])
    total["missions_semaine"] = sorted(missions)
    return total


# ─── PLANIFICATEUR ────────────────────────────────────────────────────────────
def _executer_protege(tache):
    """Enveloppe une tâche planifiée : toute exception est loguée et déclenche
    une alerte email (envoyer_alerte_echec), sans interrompre la boucle du scheduler."""
    def _wrapper():
        try:
            tache()
        except Exception as e:
            log.exception(f"Échec de la tâche planifiée '{tache.__name__}'")
            envoyer_alerte_echec(e, tache.__name__)
    return _wrapper


def demarrer_agent():
    """Démarre l'agent et planifie les tâches."""
    config = charger_config()
    horaires = config["horaires"]

    horaire_hebdo = horaires.get("recap_hebdo", "21:00")

    log.info("=" * 50)
    log.info("EAE Flow Agent démarré")
    log.info(f"Rappels techniciens    : {horaires['rappel_saisie']}")
    log.info(f"Récap chargés d'aff.  : {horaires['recap_journalier']}")
    log.info(f"Récap hebdo CA         : vendredi {horaire_hebdo}")
    log.info(f"Récap hebdo fournisseurs : vendredi {horaire_hebdo}")
    log.info("=" * 50)

    # Traiter les suppressions de comptes en attente (puis toutes les heures)
    traiter_suppressions()

    # Planifier les tâches (chacune protégée : un échec déclenche une alerte email)
    schedule.every().day.at(horaires["rappel_saisie"]).do(_executer_protege(tache_rappel_techniciens))
    schedule.every().day.at(horaires["recap_journalier"]).do(_executer_protege(tache_recap_journalier))
    schedule.every().friday.at(horaire_hebdo).do(_executer_protege(tache_recap_hebdo_ca))
    schedule.every().friday.at(horaire_hebdo).do(_executer_protege(tache_recap_hebdo_fournisseur))
    schedule.every().hour.do(_executer_protege(traiter_suppressions))

    # Boucle principale
    while True:
        schedule.run_pending()
        time.sleep(30)

# ─── MODE TEST ────────────────────────────────────────────────────────────────
def tester_agent(redirect_email=None):
    """Lance toutes les tâches immédiatement pour tester."""
    global TEST_EMAIL_REDIRECT
    TEST_EMAIL_REDIRECT = redirect_email
    if redirect_email:
        log.info(f"=== MODE TEST — Tous les mails redirigés vers {redirect_email} ===")
    else:
        log.info("=== MODE TEST — Exécution immédiate de toutes les tâches ===")
    tache_rappel_techniciens()
    tache_recap_journalier()
    tache_recap_hebdo_ca()
    tache_recap_hebdo_fournisseur()
    log.info("=== TEST TERMINÉ ===")

# ─── POINT D'ENTRÉE ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        redirect = sys.argv[2] if len(sys.argv) > 2 else "marin.balcon.sbeae@gmail.com"
        tester_agent(redirect_email=redirect)
    else:
        demarrer_agent()
