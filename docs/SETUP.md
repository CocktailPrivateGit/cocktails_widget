# 🛠️ Guide d'Installation — SETUP.md

Ce guide vous accompagne pas à pas pour installer et utiliser les widgets Cocktail Privé en local ou sur GitHub Pages.

---

## ✅ Prérequis

Avant de commencer, assurez-vous d'avoir :

| Outil | Usage | Lien |
|-------|-------|------|
| Un navigateur moderne | Ouvrir les widgets | Chrome, Firefox, Safari, Edge |
| Git | Gérer les versions | [git-scm.com](https://git-scm.com/) |
| VS Code (recommandé) | Éditer le code | [code.visualstudio.com](https://code.visualstudio.com/) |
| Un compte GitHub | Héberger le projet | [github.com](https://github.com/) |

> 💡 **Pour les débutants** : Vous n'avez besoin que d'un navigateur pour utiliser les widgets directement en ligne !

---

## 🚀 Option 1 — Utilisation directe (sans installation)

C'est la méthode la plus simple. Cliquez simplement sur les liens :

- **BarComm Pro** → https://cocktailprivategit.github.io/barcomm-pro/
- **BarMan Finance** → https://cocktailprivategit.github.io/barman-finance/

Vos données sont sauvegardées automatiquement dans votre navigateur (localStorage).

---

## 💻 Option 2 — Installation locale

### Étape 1 : Cloner le dépôt

Ouvrez votre Terminal (Mac/Linux) ou Invite de commande (Windows) et tapez :

```bash
git clone https://github.com/cocktailprivategit/widgets.git
```

> 💡 **Qu'est-ce que `git clone` ?** C'est comme télécharger le projet, mais en gardant le lien avec GitHub pour pouvoir recevoir les mises à jour.

### Étape 2 : Naviguer dans le dossier

```bash
cd widgets
```

### Étape 3 : Ouvrir un widget

**Sur Mac :**
```bash
open src/barcomm-pro/index.html
```

**Sur Windows :**
```bash
start src/barcomm-pro/index.html
```

**Sur Linux :**
```bash
xdg-open src/barcomm-pro/index.html
```

Ou tout simplement double-cliquez sur le fichier `index.html` depuis votre explorateur de fichiers.

---

## ☁️ Option 3 — Déployer votre propre version sur GitHub Pages

### Étape 1 : Forker le dépôt

1. Allez sur https://github.com/cocktailprivategit/widgets
2. Cliquez sur le bouton **"Fork"** (en haut à droite)
3. Choisissez votre compte GitHub

> 💡 **Qu'est-ce qu'un "Fork" ?** C'est comme faire une copie du projet dans votre propre compte GitHub.

### Étape 2 : Activer GitHub Pages

1. Dans votre dépôt forké, cliquez sur **Settings** (⚙️)
2. Dans le menu de gauche, cliquez sur **Pages**
3. Sous "Branch", sélectionnez **main** et le dossier **/(root)**
4. Cliquez sur **Save**
5. Attendez ~2 minutes

### Étape 3 : Accéder à votre version

Votre URL sera : `https://VOTRE-USERNAME.github.io/widgets/`

---

## 🔧 Configuration des Widgets

### Personnaliser vos données initiales

Les widgets utilisent `localStorage`. Vos données sont stockées dans votre navigateur et ne quittent jamais votre machine.

Pour exporter vos données :
1. Ouvrez le widget
2. Cherchez le bouton **"Export JSON"**
3. Sauvegardez le fichier téléchargé

Pour importer des données (ex: changer de navigateur) :
1. Cherchez le bouton **"Import JSON"**
2. Sélectionnez votre fichier sauvegardé

---

## 🆘 Problèmes Fréquents

| Problème | Solution |
|----------|----------|
| Le widget ne s'affiche pas | Vérifiez que vous ouvrez bien `index.html` |
| Les données ont disparu | Le localStorage a peut-être été effacé (navigation privée ?) |
| L'URL GitHub Pages ne fonctionne pas | Attendez 2-5 min après activation |
| Les graphiques ne s'affichent pas | Essayez de vider le cache (Ctrl+Shift+R) |

Pour tout autre problème → [Ouvrir une Issue](https://github.com/cocktailprivategit/widgets/issues)

---

## 📚 Ressources pour débutants Git

- 📖 [GitHub Hello World](https://docs.github.com/fr/get-started/quickstart/hello-world) (5 min)
- 🎥 [Git & GitHub en 20 min](https://www.youtube.com/watch?v=RGOj5yH7evk)
- 🖥️ [GitHub Desktop](https://desktop.github.com/) — Interface graphique gratuite (sans terminal)
