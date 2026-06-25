"""
init_comptes.py
===============
Crée les comptes Firebase Auth + documents Firestore pour les chargés d'affaires.
Utilisation : python init_comptes.py
"""

import firebase_admin
from firebase_admin import credentials, auth, firestore
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).parent
CREDS_PATH = BASE_DIR / "firebse_credentials.json.json"

CHARGES_AFFAIRES = [
    {"prenom": "Caroline",  "nom": "LEPLAT",  "email": "caroline.leplat@sbeae.com"},
    {"prenom": "Paul",      "nom": "DOUARAN", "email": "paul.douaran@sbeae.com"},
    {"prenom": "Mathilde",  "nom": "DOUARAN", "email": "mathilde.douaran@sbeae.com"},
    {"prenom": "Jean",      "nom": "DUPOND",  "email": "jean.dupond@sbeae.com"},
    {"prenom": "Michel",    "nom": "BLANC",   "email": "michel.blanc@sbeae.com"},
    {"prenom": "Sabine",    "nom": "DUFOUR",  "email": "sabine.dufour@sbeae.com"},
]

MOT_DE_PASSE = "EAE2026!"


def init_app():
    cred = credentials.Certificate(str(CREDS_PATH))
    firebase_admin.initialize_app(cred)
    return firestore.client()


def creer_compte(db, ca):
    email = ca["email"]
    prenom = ca["prenom"]
    nom = ca["nom"]

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
        "role":           "charge_affaires",
        "date_creation":  datetime.now(timezone.utc),
    })
    print(f"[FIRESTORE] Document créé : utilisateurs/{user.uid}")


if __name__ == "__main__":
    print("=== Initialisation des comptes chargés d'affaires ===\n")
    db = init_app()

    for ca in CHARGES_AFFAIRES:
        creer_compte(db, ca)
        print()

    print("=== Terminé ===")
