# 📖 Documentation API — API.md

Documentation des fonctions JavaScript principales des widgets Cocktail Privé.

---

## 🔑 Clés localStorage

Les widgets utilisent ces clés pour stocker leurs données :

| Widget | Clé localStorage |
|--------|-----------------|
| BarComm Pro | `barcomm_pro_v3` |
| BarMan Finance | `barmanfinance_data` |
| BarPlanning Pro | `barplanning_pro_v2` |

> ⚠️ **Attention** : Effacer les données de navigation dans votre navigateur supprime également ces données.

---

## ☁️ Firebase Sync (module partagé)

Le module `src/shared/firebase-sync.js` gère l'authentification Google et la synchronisation Firestore pour les 3 widgets.

### Collections Firestore

| Widget | Collection |
|--------|-----------|
| BarComm Pro | `barcomm` |
| BarMan Finance | `barmanfinance` |
| BarPlanning Pro | `barplanning` |

### Fonctions exportées

#### `loginWithGoogle()`
Ouvre une popup d'authentification Google.

#### `logout()`
Déconnecte l'utilisateur et arrête la synchronisation temps réel.

#### `initAuth(localStorageKey, onData, collectionName)`
Initialise l'écoute de l'état de connexion. À la connexion :
- migre les données localStorage vers Firestore (première connexion uniquement)
- démarre la synchronisation temps réel via `onSnapshot`

| Paramètre | Type | Description |
|-----------|------|-------------|
| `localStorageKey` | `String` | Clé localStorage du widget |
| `onData` | `Function` | Callback appelé quand les données Firestore arrivent |
| `collectionName` | `String` | Nom de la collection Firestore |

#### `saveToCloud(data, collectionName)`
Sauvegarde les données dans Firestore (silencieux si non connecté).

| Paramètre | Type | Description |
|-----------|------|-------------|
| `data` | `Object` | Données à sauvegarder |
| `collectionName` | `String` | Nom de la collection Firestore |

---

## 🗃️ Gestion des Données

### BarComm Pro — `getData()` / `setData(data)`

```javascript
const data = getData();
// Retourne : { ig, tt, li, posts, devis, contrats, snapshots, ... }

setData({ ...data, ig: 5200 });
// Sauvegarde localStorage + sync Firebase
```

### BarMan Finance — `loadFromStorage()` / `saveToStorage()`

L'état est géré via l'objet global `state` :
```javascript
state = {
  revenus:     [],   // { id, date, facture, client, montant, paiement, ... }
  depenses:    [],   // { id, date, categorie, montant, notes }
  equipements: [],   // { id, nom, valeur, dateAchat, dureeAmort }
  achats:      []    // { id, nom, prix, quantite, categorie }
}
```

### BarPlanning Pro — `loadState()` / `saveState()`

```javascript
state = {
  prestations:      [],  // { id, date, client, lieu, montant, statut, equipe, exportedToBF }
  personnel:        [],  // { id, prenom, nom, role, tel, indispos }
  indisponibilites: []   // { id, persoId, dateDebut, dateFin, motif }
}
```

---

## 📊 Fonctions principales — BarComm Pro

### `loadSituation()`
Charge les métriques depuis localStorage et met à jour le dashboard.

### `saveSituation()`
Lit les champs du formulaire et sauvegarde via `setData()`.

### `renderSnapshotList(snapshots)`
Affiche l'historique des snapshots hebdomadaires.

### `renderGrowthChart(snapshots, metric)`
Dessine le graphique de croissance pour `'ig'`, `'tt'` ou `'li'`.

---

## 💰 Fonctions principales — BarMan Finance

### `saveRevenu()`
Valide et enregistre un nouveau revenu dans `state.revenus`.

### `saveDepense()`
Valide et enregistre une nouvelle dépense dans `state.depenses`.

### `renderDashboard()`
Recalcule et affiche CA, dépenses, bénéfice net, taux URSSAF, progression plafonds.

**Constantes métier :**
```javascript
const PLAFOND_MICROBIC = 77700;   // Plafond micro-entrepreneur
const PLAFOND_TVA      = 37500;   // Seuil de franchise TVA
const URSSAF_RATE      = 0.211;   // Taux cotisations sociales (21,1%)
```

### `exportData()` / `importData()`
Export et import JSON de l'ensemble des données financières.

---

## 🗓️ Fonctions principales — BarPlanning Pro

### `savePrestation()`
Crée ou met à jour une prestation dans `state.prestations`.

### `exportToBarmanFinance()`
Exporte la prestation en cours d'édition vers BarMan Finance :
- génère un numéro de facture `F-YYYY-NNN`
- détecte les doublons (même date + même client)
- marque la prestation `exportedToBF: true`

### `renderCalendar()`
Affiche le calendrier mensuel avec les prestations et événements BarMan Finance.

### `renderPlanning()`
Affiche la matrice planning (personnel × jours du mois) avec assignations.

### `savePersonnel()`
Crée ou met à jour un membre du personnel.

### `addIndispo(persoId, dateDebut, dateFin, motif)`
Ajoute une indisponibilité pour un membre du personnel.

---

## 📦 Variables CSS

### BarMan Finance & BarPlanning Pro

```css
:root {
  --black:    #020B13;  /* Fond principal */
  --black2:   #060F19;  /* Fond secondaire */
  --black3:   #0A1520;  /* Fond tertiaire */
  --gold:     #DAAB2D;  /* Accent principal */
  --gold2:    #B8901F;  /* Accent foncé */
  --gold3:    #F0C84A;  /* Accent clair */
  --alabaster: #F4F1EB; /* Texte principal */
  --green:    #4CAF82;  /* Indicateur positif */
  --red:      #E05A5A;  /* Indicateur négatif */
  --blue:     #4A9EC4;  /* Indicateur neutre */
}
```

### BarComm Pro

```css
:root {
  --noir:     #080808;  /* Fond principal */
  --noir2:    #111111;  /* Fond secondaire */
  --or:       #c8a96e;  /* Accent principal */
  --or-light: #e2c98a;  /* Accent clair */
  --or-dark:  #a07840;  /* Accent foncé */
  --creme:    #f5f0e8;  /* Texte principal */
  --vert:     #4ade80;  /* Indicateur positif */
  --rouge:    #f87171;  /* Indicateur négatif */
  --bleu:     #60a5fa;  /* Indicateur neutre */
}
```
