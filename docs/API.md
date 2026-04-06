# 📖 Documentation API — API.md

Documentation des fonctions JavaScript principales des widgets Cocktail Privé.

---

## 🗃️ Gestion des Données (Storage)

### `getData()`

Récupère toutes les données sauvegardées dans le navigateur (localStorage).

```javascript
const data = getData();
console.log(data);
// Retourne : { ig: 5000, tt: 3000, li: 800, ... }
```

**Retourne :** `Object` — Les données de l'application, ou `{}` si aucune donnée.

---

### `setData(data)`

Sauvegarde les données dans le navigateur (localStorage).

```javascript
const nouvellesDonnees = {
  ig: 5200,
  tt: 3100,
  li: 850
};
setData(nouvellesDonnees);
```

**Paramètres :**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `data` | `Object` | L'objet de données à sauvegarder |

---

### `exportData()`

Télécharge toutes les données actuelles dans un fichier JSON.

```javascript
exportData();
// Télécharge automatiquement : "cocktail-data-2026-04-04.json"
```

> 💡 **Usage courant** : Faire une sauvegarde avant de changer de navigateur ou d'ordinateur.

---

### `importData(file)`

Importe des données depuis un fichier JSON précédemment exporté.

```javascript
// Cette fonction est déclenchée via l'interface du widget
// (bouton "Importer")
// Exemple d'utilisation programmatique :
const fichier = document.getElementById('input-file').files[0];
importData(fichier);
```

**Paramètres :**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `file` | `File` | Fichier JSON sélectionné par l'utilisateur |

---

## 📊 Fonctions Dashboard (BarComm Pro)

### `loadSituation()`

Charge et affiche les métriques de la situation commerciale actuelle.

```javascript
loadSituation();
// Met à jour les compteurs Instagram, TikTok, LinkedIn
// Met à jour les graphiques de performance
```

---

### `updateMetrics(section, valeurs)`

Met à jour une section spécifique des métriques.

```javascript
updateMetrics('reseaux', {
  ig: 5500,
  tt: 3200
});
```

**Paramètres :**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `section` | `String` | Section à mettre à jour (`'reseaux'`, `'devis'`, `'contrats'`) |
| `valeurs` | `Object` | Nouvelles valeurs pour cette section |

---

## 💰 Fonctions Dashboard (BarMan Finance)

### `loadFinances()`

Charge et affiche toutes les données financières.

```javascript
loadFinances();
// Met à jour revenus, dépenses, bénéfice net
// Redessine les graphiques
```

---

### `addTransaction(type, montant, description)`

Ajoute une nouvelle transaction (revenu ou dépense).

```javascript
// Ajouter un revenu
addTransaction('revenu', 1500, 'Prestation bar mariage');

// Ajouter une dépense
addTransaction('depense', 200, 'Achat alcools');
```

**Paramètres :**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `type` | `String` | `'revenu'` ou `'depense'` |
| `montant` | `Number` | Montant en euros |
| `description` | `String` | Description de la transaction |

---

## 📡 Événements JavaScript

Les widgets émettent des événements personnalisés que vous pouvez écouter :

### `dataUpdated`

Déclenché chaque fois que les données sont modifiées.

```javascript
document.addEventListener('dataUpdated', (event) => {
  console.log('Données mises à jour :', event.detail);
  // event.detail contient les nouvelles données
});
```

### `exportComplete`

Déclenché quand un export JSON est terminé.

```javascript
document.addEventListener('exportComplete', () => {
  console.log('Export terminé avec succès !');
});
```

---

## 🔑 Clés localStorage

Les widgets utilisent ces clés pour stocker les données :

| Widget | Clé localStorage |
|--------|-----------------|
| BarComm Pro | `barcomm_data` |
| BarMan Finance | `barmanfinance_data` |

> ⚠️ **Attention** : Effacer les données de navigation dans votre navigateur supprime également ces données.

---

## 📦 Variables CSS Globales

Les deux widgets partagent ces variables de style :

```css
:root {
  --noir:      #080808;   /* Fond principal */
  --noir2:     #111111;   /* Fond secondaire */
  --or:        #c8a96e;   /* Couleur accent principale */
  --or-light:  #e2c98a;   /* Accent clair */
  --or-dark:   #a07840;   /* Accent foncé */
  --creme:     #f5f0e8;   /* Texte principal */
  --vert:      #4ade80;   /* Indicateur positif */
  --rouge:     #f87171;   /* Indicateur négatif */
  --bleu:      #60a5fa;   /* Indicateur neutre */
}
```
