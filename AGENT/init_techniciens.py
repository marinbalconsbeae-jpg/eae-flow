"""
init_techniciens.py
===================
Crée les comptes Firebase Auth + documents Firestore pour les 8 techniciens.
Les charge_id sont récupérés dynamiquement depuis Firestore (uid de Caroline et Paul).
Utilisation : python init_techniciens.py
"""

import firebase_admin
from firebase_admin import credentials, auth, firestore
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).parent
CREDS_PATH = BASE_DIR / "firebse_credentials.json.json"

MOT_DE_PASSE = "EAE2026!"


def init_app():
    cred = credentials.Certificate(str(CREDS_PATH))
    firebase_admin.initialize_app(cred)
    return firestore.client()


def recuperer_uid_par_email(db, email):
    """Récupère l'uid d'un utilisateur depuis Firestore via son email."""
    from google.cloud.firestore_v1 import FieldFilter
    docs = list(
        db.collection("utilisateurs")
        .where(filter=FieldFilter("email", "==", email))
        .limit(1)
        .stream()
    )
    if not docs:
        raise ValueError(f"Utilisateur introuvable dans Firestore : {email}")
    uid = docs[0].to_dict().get("uid") or docs[0].id
    print(f"[FIRESTORE] uid récupéré pour {email} : {uid}")
    return uid


def creer_technicien(db, tech):
    email = tech["email"]
    prenom = tech["prenom"]
    nom = tech["nom"]

    # 1. Créer ou récupérer le compte Firebase Auth
    try:
        user = auth.create_user(
            email=email,
            password=MOT_DE_PASSE,
            display_name=f"{prenom} {nom}",
        )
        print(f"[AUTH] Compte créé : {email} (uid={user.uid})")
    except auth.EmailAlreadyExistsError:
        user = auth.get_user_by_email(email)
        print(f"[AUTH] Compte existant récupéré : {email} (uid={user.uid})")

    # 2. Créer le document Firestore dans utilisateurs
    doc_ref = db.collection("utilisateurs").document(user.uid)
    doc_ref.set({
        "uid":            user.uid,
        "prenom":         prenom,
        "nom":            nom,
        "email":          email,
        "role":           "technicien",
        "mission":        tech["mission"],
        "fournisseur":    tech["fournisseur"],
        "charge_id":      tech["charge_id"],
        "date_creation":  datetime.now(timezone.utc),
    })
    print(f"[FIRESTORE] Document créé : utilisateurs/{user.uid}")


if __name__ == "__main__":
    print("=== Initialisation des comptes techniciens ===\n")
    db = init_app()

    # Récupération des charge_id depuis Firestore
    print("--- Récupération des uid chargés d'affaires ---")
    uid_caroline = recuperer_uid_par_email(db, "caroline.leplat@sbeae.com")
    uid_paul     = recuperer_uid_par_email(db, "paul.douaran@sbeae.com")
    print()

    TECHNICIENS = [
        {"prenom": "Ahmad",   "nom": "ASSADI",   "email": "ahmad.assadi@sbeae.com",    "mission": "RT_Compteur_Module", "fournisseur": "Iléo", "charge_id": uid_caroline},
        {"prenom": "François","nom": "RINGARD",  "email": "francois.ringard@sbeae.com","mission": "RT_Compteur_Module", "fournisseur": "Iléo", "charge_id": uid_caroline},
        {"prenom": "Jessy",   "nom": "KACZOR",   "email": "jessy.kaczor@sbeae.com",    "mission": "Controle_AC",        "fournisseur": "Iléo", "charge_id": uid_caroline},
        {"prenom": "Omar",    "nom": "LAMMANI",  "email": "omar.lammani@sbeae.com",    "mission": "Controle_AC",        "fournisseur": "Iléo", "charge_id": uid_caroline},
        {"prenom": "Jérome",  "nom": "POIDEVIN", "email": "jerome.poidevin@sbeae.com", "mission": "RT_Compteur_Module", "fournisseur": "CUA",  "charge_id": uid_paul},
        {"prenom": "Mahfoud", "nom": "BELHADJI", "email": "mahfoud.belhadji@sbeae.com","mission": "RT_Compteur_Module", "fournisseur": "CUA",  "charge_id": uid_paul},
        {"prenom": "Maxence", "nom": "COLSON",   "email": "maxence.colson@sbeae.com",  "mission": "Releve_CPT",         "fournisseur": "CUA",  "charge_id": uid_paul},
        {"prenom": "Alain",   "nom": "BETTY",    "email": "alain.betty@sbeae.com",     "mission": "Releve_CPT",         "fournisseur": "CUA",  "charge_id": uid_paul},
    ]

    print("--- Création des techniciens ---")
    for tech in TECHNICIENS:
        creer_technicien(db, tech)
        print()

    print("=== Terminé ===")
