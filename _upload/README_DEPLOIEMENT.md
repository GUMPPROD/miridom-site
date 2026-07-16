# MiRiDom — Mise en ligne (Render)

Ce dossier contient le site MiRiDom, prêt à être mis en ligne sur **Render**.

## Ce qu'il faut
- Un compte **GitHub** (gratuit) — pour héberger le code.
- Un compte **Render** (gratuit) — pour faire tourner le site.

## Étapes (résumé)

1. **Mettre le code sur GitHub**
   - Créer un dépôt (repository) sur github.com.
   - Y déposer le contenu de ce dossier **SAUF** `node_modules` (Render le réinstalle tout seul).

2. **Créer le service sur Render**
   - Sur dashboard.render.com → *New* → *Web Service* → connecter le dépôt GitHub.
   - Render détecte le fichier `render.yaml` et configure tout automatiquement :
     - Dossier racine : `backend`
     - Build : `npm install`
     - Démarrage : `npm start`
     - Plan : `free`
   - Cliquer *Deploy*. Après quelques minutes, le site est en ligne sur une adresse `…onrender.com`.

3. **Adresse personnalisée (miridom.org)**
   - Dans le service Render → *Settings* → *Custom Domains* → ajouter `miridom.org`.
   - Render affiche un enregistrement DNS (type CNAME/A) à configurer chez le registrar du domaine.
   - Le webmaster (Chad) ajoute cet enregistrement → le site répond sur miridom.org.

## Identifiants de l'administration
- Panneau admin : `/admin.html`
- Compte : `admin@miridom.org` / `miridom2025`
- Compte de secours : `secours@miridom.org` / `MiRiDom#Secours2025!`
- ⚠️ À changer après la première connexion (Paramètres).

## Passer en payant avec données conservées (plus tard)

Sur le plan **gratuit**, le contenu ajouté via l'admin peut être effacé aux mises à jour.
Pour le conserver définitivement :

1. Service Render → *Settings* → changer l'instance `Free` → `Starter` (7 $/mois).
2. Ajouter un disque : *Disks* → *Add Disk* → Mount Path `/data`, taille `1 GB`.
3. Ajouter deux variables d'environnement (*Environment*) :
   - `DATA_DIR` = `/data/data`
   - `UPLOADS_DIR` = `/data/uploads`
4. Redéployer.

À partir de là, toutes les actus/ressources/fichiers ajoutés par l'équipe sont conservés.
Le code est **déjà prêt** pour ça : au premier démarrage sur le disque vierge, il y copie
automatiquement le contenu initial. Aucune autre modification n'est nécessaire.
