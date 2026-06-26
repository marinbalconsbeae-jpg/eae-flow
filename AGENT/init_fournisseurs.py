"""
init_fournisseurs.py
====================
Crée les documents fournisseurs placeholder dans Firestore.
Lancer une seule fois : python AGENT/init_fournisseurs.py

Renseigner les vrais emails avant de lancer en production.
Les techniciens doivent avoir un champ 'fournisseur' correspondant
exactement au champ 'nom' du fournisseur (ex: "Iléo", "CUA").
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from firebase_client import _get_db

FOURNISSEURS = [
    {
        "id": "ileao",
        "nom": "Iléo",
        "contact": "Service Comptage Iléo",
        "email": "comptage@ileao.fr",  # TODO: remplacer par le vrai email
    },
    {
        "id": "cua",
        "nom": "CUA",
        "contact": "Service Technique CUA",
        "email": "technique@cua.fr",  # TODO: remplacer par le vrai email
    },
]


def main():
    db = _get_db()
    for four in FOURNISSEURS:
        doc_id = four.pop("id")
        db.collection("fournisseurs").document(doc_id).set(four)
        print(f"OK Fournisseur '{four['nom']}' cree/mis a jour (ID: {doc_id})")
    print("Termine.")


if __name__ == "__main__":
    main()
