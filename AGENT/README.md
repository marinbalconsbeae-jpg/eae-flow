# EAE Flow — Agent automatique

## Installation

```bash
pip install -r requirements.txt
```

## Configuration

Ouvre `config.json` et remplis :
- `smtp_user` : ton adresse Gmail
- `smtp_password` : ton mot de passe d'application Gmail (pas ton vrai mot de passe)
- `patron.email` : l'email du patron

## Lancement

### Mode normal (tourne en continu)
```bash
python agent.py
```

### Mode test (exécute toutes les tâches immédiatement)
```bash
python agent.py test
```

## Ce que fait l'agent

| Heure | Tâche |
|-------|-------|
| 20h00 | Rappel mail aux techniciens sans saisie |
| 20h30 | Récap journalier envoyé à chaque chargé d'affaires |
| 21h00 (vendredi) | Compilation totaux + remplissage Excel + envoi patron |

## Ajouter un technicien

Edite `data/techniciens.json` et ajoute une ligne :
```json
{
  "id": "t17",
  "nom": "NOM",
  "prenom": "Prénom",
  "email": "prenom.nom@sbeae.com",
  "mission": "RT_Compteur_Module",
  "fournisseur": "Iléo",
  "charge_id": "ca1"
}
```

## Missions disponibles
- `RT_Compteur_Module`
- `Releve_CPT`
- `Controle_AC`
- `RT_CPT_Arras`
- `RT_CPT_SEPIG`
- `RT_CPT_Suez`
- `PI_Poteau_Incendie`
- `Controle_ANC`
