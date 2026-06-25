"""
init_firebase.py
================
Initialise Firestore avec les données techniciens et chargés d'affaires.
Utilisation : python init_firebase.py
"""

import json
import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR.parent / "data"
CREDS_PATH = BASE_DIR / "firebse_credentials.json.json"

def init_app():
    cred = credentials.Certificate(str(CREDS_PATH))
    firebase_admin.initialize_app(cred)
    return firestore.client()

def importer_collection(db, nom_collection, fichier_json):
    with open(fichier_json, "r", encoding="utf-8") as f:
        donnees = json.load(f)

    batch = db.batch()
    for item in donnees:
        ref = db.collection(nom_collection).document(item["id"])
        batch.set(ref, item)

    batch.commit()
    print(f"[OK] {len(donnees)} documents importes dans '{nom_collection}'")

if __name__ == "__main__":
    print("Connexion a Firebase (eae-flow)...")
    db = init_app()

    importer_collection(db, "techniciens", DATA_DIR / "techniciens.json")
    importer_collection(db, "charges_affaires", DATA_DIR / "charges_affaires.json")

    print("Initialisation terminee.")
