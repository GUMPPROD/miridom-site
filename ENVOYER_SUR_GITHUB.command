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
SORTIE=$(git push -u origin main --force 2>&1); CODE=$?
echo "$SORTIE" | grep -v "$TOKEN"

# Retirer la clé de la configuration (sécurité)
git remote set-url origin "https://${REPO}"

echo ""
if [ $CODE -eq 0 ]; then
  echo "  ✅ ENVOYÉ ! Render va redéployer tout seul (2 à 5 min)."
  echo "     Vérifie sur github.com/GUMPPROD/miridom-site"
elif echo "$SORTIE" | grep -q "403\|denied\|Permission"; then
  echo "  ❌ REFUSÉ PAR GITHUB (erreur 403) — rien n'a été envoyé."
  echo ""
  echo "     La clé est bien reconnue, mais elle n'a pas le droit d'écrire."
  echo "     → Si c'est un jeton CLASSIC : il faut cocher la case  repo"
  echo "     → Si c'est un jeton FINE-GRAINED : il faut choisir le dépôt"
  echo "       miridom-site et mettre  Contents : Read and write"
  echo ""
  echo "     Refais une clé, puis relance ce fichier."
elif echo "$SORTIE" | grep -q "could not read\|Authentication\|401"; then
  echo "  ❌ CLÉ REFUSÉE — rien n'a été envoyé."
  echo "     La clé est invalide ou expirée. Génère-en une nouvelle."
else
  echo "  ❌ L'ENVOI A ÉCHOUÉ — rien n'a été envoyé."
  echo "     Le message d'erreur exact est affiché juste au-dessus."
fi
echo ""
read -p "  Entrée pour fermer..."
