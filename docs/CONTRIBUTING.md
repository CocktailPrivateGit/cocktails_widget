# 🤝 Guide de Contribution — CONTRIBUTING.md

Merci de l'intérêt que vous portez au projet **Cocktail Privé Widgets** ! Ce guide explique comment proposer des améliorations ou signaler des problèmes.

---

## 🐛 Signaler un Bug

Si vous avez trouvé un problème :

1. Vérifiez d'abord qu'il n'existe pas déjà dans les [Issues ouvertes](https://github.com/cocktailprivategit/widgets/issues)
2. Cliquez sur **"New Issue"**
3. Choisissez le template **"Bug Report"**
4. Remplissez les informations demandées :
   - Description claire du problème
   - Étapes pour reproduire le bug
   - Comportement attendu vs comportement observé
   - Votre navigateur et système d'exploitation

---

## 💡 Proposer une Amélioration

Vous avez une idée pour améliorer un widget ?

1. Ouvrez une [nouvelle Issue](https://github.com/cocktailprivategit/widgets/issues/new)
2. Choisissez le template **"Feature Request"**
3. Décrivez clairement :
   - Quel problème cette fonctionnalité résoudrait
   - Comment vous imaginez son fonctionnement
   - Toute maquette ou exemple que vous avez

---

## 🔧 Proposer du Code (Pull Request)

> 💡 **Pour les débutants** : Une "Pull Request" est une façon de proposer vos modifications au projet principal.

### Étape 1 : Préparer votre environnement

```bash
# Forker le dépôt sur GitHub (bouton Fork)
# Puis cloner votre fork :
git clone https://github.com/VOTRE-USERNAME/widgets.git
cd widgets
```

### Étape 2 : Créer une branche

> 💡 **Qu'est-ce qu'une branche ?** C'est comme une copie de travail isolée. Vos modifications n'affectent pas le code principal tant qu'elles ne sont pas validées.

```bash
# Créer et basculer sur une nouvelle branche
git checkout -b amelioration/nom-de-votre-amelioration

# Exemples de noms :
# git checkout -b fix/bug-calcul-total
# git checkout -b feature/export-pdf
# git checkout -b docs/ameliorer-readme
```

### Étape 3 : Faire vos modifications

Éditez les fichiers nécessaires dans `src/barcomm-pro/` ou `src/barman-finance/`.

### Étape 4 : Commiter vos changements

```bash
# Voir quels fichiers ont été modifiés
git status

# Ajouter les fichiers modifiés
git add .

# Créer un commit avec un message descriptif
git commit -m "✨ feat: description courte de votre changement"
```

**Conventions de messages :**
| Préfixe | Usage |
|---------|-------|
| `✨ feat:` | Nouvelle fonctionnalité |
| `🐛 fix:` | Correction de bug |
| `📚 docs:` | Documentation |
| `💄 style:` | Mise en forme (CSS) |
| `♻️ refactor:` | Réécriture sans nouvelle fonctionnalité |

### Étape 5 : Pousser et ouvrir une Pull Request

```bash
# Pousser votre branche sur GitHub
git push origin amelioration/nom-de-votre-amelioration
```

Puis sur GitHub :
1. Un message apparaîtra : "Compare & pull request" → Cliquez dessus
2. Décrivez vos changements
3. Soumettez la Pull Request

---

## ✅ Standards de Code

Pour maintenir la qualité du projet :

- **HTML** : Code sémantique et bien indenté (2 espaces)
- **CSS** : Utiliser les variables CSS existantes (`--or`, `--noir`, etc.)
- **JavaScript** : Commenter les fonctions importantes avec JSDoc
- **Commits** : Messages courts et descriptifs en français ou anglais
- **Nommage** : Variables et fonctions en camelCase anglais

---

## 📞 Contact

Des questions ? Ouvrez une [Issue](https://github.com/cocktailprivategit/widgets/issues) avec le label **"question"**.

Merci pour votre contribution ! 🍹
