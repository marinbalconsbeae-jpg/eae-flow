"""
firebase_client.py
==================
Lecture des données EAE Flow depuis Firestore.
"""

import json
import os
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import FieldFilter
from datetime import date
from pathlib import Path

BASE_DIR = Path(__file__).parent
CREDS_PATH = BASE_DIR / "firebse_credentials.json.json"

_db = None

def _get_db():
    global _db
    if _db is None:
        if not firebase_admin._apps:
            env_creds = os.environ.get("FIREBASE_CREDENTIALS")
            if env_creds:
                cred = credentials.Certificate(json.loads(env_creds))
            elif CREDS_PATH.exists():
                cred = credentials.Certificate(str(CREDS_PATH))
            else:
                raise RuntimeError(
                    "Credentials Firebase introuvables : définir la variable "
                    "d'environnement FIREBASE_CREDENTIALS ou placer le fichier "
                    f"{CREDS_PATH.name} dans {BASE_DIR}"
                )
            firebase_admin.initialize_app(cred)
        _db = firestore.client()
    return _db


def _charger_utilisateurs_par_role(role):
    """Lit la collection utilisateurs filtrée par rôle et normalise les champs."""
    db = _get_db()
    docs = db.collection("utilisateurs").where(filter=FieldFilter("role", "==", role)).stream()
    utilisateurs = []
    for doc in docs:
        data = doc.to_dict()
        # Force uid = doc.id (UID Firebase) inconditionnellement — évite qu'un
        # champ "id" ou "uid" pré-existant avec une valeur différente crée un mismatch
        data["uid"] = doc.id
        data["id"] = doc.id  # alias pour compatibilité avec l'agent
        utilisateurs.append(data)
    return utilisateurs


def charger_techniciens():
    """Retourne les techniciens depuis la collection utilisateurs (role='technicien')."""
    return _charger_utilisateurs_par_role("technicien")


def charger_charges_affaires():
    """Retourne les chargés d'affaires depuis la collection utilisateurs (role='charge_affaires')."""
    return _charger_utilisateurs_par_role("charge_affaires")


def charger_saisies_du_jour():
    """Retourne les saisies du jour depuis Firestore."""
    db = _get_db()
    aujourd_hui = date.today().isoformat()
    docs = db.collection("saisies").where(filter=FieldFilter("date", "==", aujourd_hui)).stream()
    return [doc.to_dict() for doc in docs]


def charger_saisies_semaine():
    """Retourne les saisies de la semaine courante depuis Firestore."""
    db = _get_db()
    semaine_key = f"{date.today().year}-S{date.today().isocalendar()[1]}"
    docs = db.collection("saisies").where(filter=FieldFilter("semaine", "==", semaine_key)).stream()
    return [doc.to_dict() for doc in docs]
