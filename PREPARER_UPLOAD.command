#!/bin/bash
# Crée une copie "propre" du site (sans node_modules ni fichiers locaux)
# prête à être déposée sur GitHub.

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/Desktop/miridom-upload"

echo ""
echo "  Préparation du dossier à uploader..."
rm -rf "$DEST"
mkdir -p "$DEST"

rsync -a \
  --exclude 'node_modules' \
  --exclude '_upload' \
  --exclude 'miridom-upload' \
  --exclude '.DS_Store' \
  --exclude '.server.log' \
  --exclude '.tunnel.log' \
  --exclude '.cloudflared' \
  --exclude 'cf.tgz' \
  --exclude '*.command' \
  "$SRC/" "$DEST/"

echo "  ✅ Dossier propre prêt : $DEST"
echo "  (Il va s'ouvrir dans le Finder)"
open "$DEST"
sleep 1
