#!/bin/bash
# Envoie le code du site sur GitHub (dépôt GUMPPROD/miridom-site)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║   Envoi du site MiRiDom vers GitHub           ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

# Vérifier git
if ! command -v git &> /dev/null; then
  echo "  Installation des outils Git (une fenêtre Apple va s'ouvrir)..."
  xcode-select --install 2>/dev/null
  echo "  ➜ Accepte l'installation, puis relance ce fichier."
  read -p "  Entrée pour fermer..."
  exit 1
fi

REPO="github.com/GUMPPROD/miridom-site.git"

echo "  Colle ta CLÉ GitHub (token) ci-dessous puis appuie sur Entrée."
echo "  (elle ne s'affichera pas à l'écran, c'est normal)"
printf "  Clé : "
read -rs TOKEN
echo ""

if [ -z "$TOKEN" ]; then
  echo "  ❌ Aucune clé saisie. Relance et colle la clé."
  read -p "  Entrée pour fermer..."
  exit 1
fi

echo ""
echo "  ▶️  Préparation..."
git init -q
git add -A
git -c user.email="marcello.sery@gmail.com" -c user.name="GUMPPROD" commit -q -m "Site MiRiDom" 2>/dev/null
git branch -M main
git remote remove origin 2>/dev/null
git remote add origin "https://GUMPPROD:${TOKEN}@${REPO}"

echo "  ▶️  Envoi vers GitHub..."
if git push -u origin main --force 2>&1 | grep -v "$TOKEN"; then
  :
fi

# Retirer la clé de la configuration (sécurité)
git remote set-url origin "https://${REPO}"

echo ""
echo "  ✅ Terminé ! Va vérifier sur github.com/GUMPPROD/miridom-site"
echo "     Tu devrais y voir tous les fichiers du site."
echo ""
read -p "  Entrée pour fermer..."
