# 📋 Changelog — Cocktail Privé Widgets

Tous les changements notables sont documentés dans ce fichier.

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
ce projet suit [Semantic Versioning](https://semver.org/lang/fr/).

---

## [2.1.0] — 2026-04-17

### ✨ Ajouté
- 🗓️ **BarPlanning Pro v2 — Phase C** : Planning matrice mensuelle avec assignation équipe
- ☁️ **Firebase sync** pour BarPlanning Pro — synchronisation temps réel, auth Google, migration localStorage
- 📤 **Export BarPlanning → BarManFinance** — génération automatique de factures (`F-YYYY-NNN`) avec détection doublons
- 🔗 **Redirection GitHub Pages** pour BarPlanning Pro (`p5zk8msdjv3xn1yqhw6tce09r/`)

### 🔄 Modifié
- `shared/firebase-sync.js` — désormais utilisé par les 3 widgets (collection `barplanning` ajoutée)

---

## [2.0.0] — 2026-04-15

### ✨ Ajouté
- 🗓️ **BarPlanning Pro v2 — Phase A** : refonte complète du widget planning
- 👥 **BarPlanning Pro v2 — Phase B** : gestion du personnel (CSV + manuel), indisponibilités, assignation équipe
- 💰 Suivi du statut de paiement (⏳ En attente / ✅ Payé / ❌ Impayé) — BarMan Finance
- 📄 Génération de devis PDF — BarMan Finance
- 📊 Projection de fin d'année sur le dashboard — BarMan Finance

---

## [1.1.0] — 2026-04-10

### ✨ Ajouté
- 🏛️ **Loi Évin** — module de conformité publicité alcool — BarComm Pro
- 🎨 **Brand Designer (Tier 3)** — outil identité visuelle — BarComm Pro
- 📣 **Competitive Ads Extractor (Tier 2)** — analyse concurrentielle — BarComm Pro
- ⚡ **Content Engine + Veo 3.1 Video Prompter (Tier 1)** — génération contenu multi-réseaux — BarComm Pro
- 📈 Graphiques de croissance, objectifs, historique hebdomadaire — BarComm Pro

### 🐛 Corrigé
- Compatibilité modules ES6 (`window.*` exposition des fonctions)
- Filtres année, suppression revenus/dépenses, boutons Opportunités — BarMan Finance
- Synchronisation Firebase Finance

---

## [1.0.0] — 2026-04-04

### ✨ Ajouté
- Structure GitHub complète et organisée
- Organisation modulaire du code (HTML / CSS / JS séparés)
- Documentation complète (README, SETUP, CONTRIBUTING, API)
- URLs lisibles : `barcomm-pro/` et `barman-finance/`
- Page d'accueil centrale (`index.html`)
- GitHub Actions pour validation automatique
- Fichier `.gitignore` complet
- Licence MIT
- Fichier `package.json` minimaliste

### 🔄 Modifié
- Refactorisation du code en modules séparés
- Amélioration de la lisibilité des URLs GitHub Pages

### 📚 Documentation
- `docs/README.md` — Présentation du projet
- `docs/SETUP.md` — Guide d'installation
- `docs/CONTRIBUTING.md` — Guide de contribution
- `docs/API.md` — Documentation des fonctions

---

## [0.9.0] — 2026-03-01

### ✨ Ajouté
- 🎨 Dashboard **BarComm Pro** — suivi commercial et réseaux sociaux
- 💰 Dashboard **BarMan Finance Pro** — gestion financière complète

### 🛠️ Technique
- Déploiement initial sur GitHub Pages
- Stockage des données via `localStorage`
- Interface en thème sombre luxe (noir & or)

---

## Format des Entrées

Chaque entrée utilise ces catégories :

| Émoji | Catégorie | Description |
|-------|-----------|-------------|
| ✨ | **Ajouté** | Nouvelles fonctionnalités |
| 🔄 | **Modifié** | Changements dans les fonctionnalités existantes |
| 🗑️ | **Supprimé** | Fonctionnalités retirées |
| 🐛 | **Corrigé** | Corrections de bugs |
| 🔒 | **Sécurité** | Corrections de vulnérabilités |
| 📚 | **Documentation** | Ajouts ou mises à jour de docs |
