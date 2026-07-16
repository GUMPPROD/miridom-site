/**
 * MiRiDom — Backend API v3
 * Structure simplifiée : Actualités + Ressources (avec fichiers) + Pages + Messages
 * Blog et Documents supprimés — tout dans Ressources
 */

const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'miridom-secret-2025-ultra-secure-xk9p3r';

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' })); // pour les uploads base64

app.use(express.static(path.join(__dirname, '..')));

// ── Dossiers data & uploads (configurables pour disque persistant) ──────────
// En local / gratuit : utilise les dossiers fournis avec le code.
// En payant : définir DATA_DIR et UPLOADS_DIR vers le disque monté (ex: /data).
const BUNDLED_DATA = path.join(__dirname, 'data');
const DATA    = process.env.DATA_DIR    || BUNDLED_DATA;
const UPLOADS = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

// Créer les dossiers si absents
if (!fs.existsSync(DATA))    fs.mkdirSync(DATA, { recursive: true });
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
// Sur un disque vierge, copier les données initiales livrées avec le code
if (DATA !== BUNDLED_DATA && fs.existsSync(BUNDLED_DATA)) {
  for (const f of fs.readdirSync(BUNDLED_DATA)) {
    const dest = path.join(DATA, f);
    if (!fs.existsSync(dest)) { try { fs.copyFileSync(path.join(BUNDLED_DATA, f), dest); } catch {} }
  }
}

app.use('/uploads', express.static(UPLOADS));

// ── Helpers data ───────────────────────────────────────────────────────────

function read(file) {
  const p = path.join(DATA, file);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
}

function write(file, data) {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(data, null, 2), 'utf8');
}

function uid() { return crypto.randomUUID(); }

// Sauvegarde un fichier base64, retourne { savedName, size, url }
function saveFile(base64data, originalFilename) {
  if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
  const ext = (originalFilename.split('.').pop() || 'bin').toLowerCase();
  const savedName = uid() + '.' + ext;
  const buffer = Buffer.from(base64data, 'base64');
  fs.writeFileSync(path.join(UPLOADS, savedName), buffer);
  return { savedName, size: buffer.length, url: '/uploads/' + savedName };
}

function deleteFile(filename) {
  if (!filename) return;
  const p = path.join(UPLOADS, filename);
  if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch {}
}

// ── Auth middleware ────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requis' });
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token invalide ou expiré' }); }
}

function optionalAuth(req, res, next) {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) try { req.user = jwt.verify(h.slice(7), JWT_SECRET); } catch {}
  next();
}

// ── Init données au premier démarrage ──────────────────────────────────────
function initData() {
  if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

  // Utilisateurs
  const usersFile = path.join(DATA, 'users.json');
  const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, 'utf8')) : [];
  let changed = false;
  if (!users.find(u => u.email === 'admin@miridom.org')) {
    users.push({ id: uid(), name: 'Admin MiRiDom', email: 'admin@miridom.org', password: bcrypt.hashSync('miridom2025', 10), role: 'admin', createdAt: new Date().toISOString() });
    changed = true;
    console.log('  👤 Admin : admin@miridom.org / miridom2025');
  }
  if (!users.find(u => u.email === 'secours@miridom.org')) {
    users.push({ id: uid(), name: 'Admin Secours', email: 'secours@miridom.org', password: bcrypt.hashSync('MiRiDom#Secours2025!', 10), role: 'admin', createdAt: new Date().toISOString() });
    changed = true;
    console.log('  🔐 Secours : secours@miridom.org / MiRiDom#Secours2025!');
  }
  if (changed) write('users.json', users);

  // Actualités
  if (!fs.existsSync(path.join(DATA, 'articles.json'))) {
    write('articles.json', [{
      id: uid(), title: 'MiRiDom launches its official website',
      excerpt: 'Minority Rights Dominica is proud to announce the launch of its new website.',
      content: '<p>We are glad to welcome you to our new website.</p>',
      status: 'published',
      date: new Date().toISOString().split('T')[0],
      author: 'MiRiDom', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    }]);
  }

  // Ressources (avec support fichier)
  if (!fs.existsSync(path.join(DATA, 'resources.json'))) {
    write('resources.json', [
      { id: uid(), title: 'Guide: Understanding your rights', description: 'A practical guide to fundamental rights in Dominica.', url: '', filename: null, originalFilename: null, type: 'Lien', status: 'active', createdAt: new Date().toISOString() },
      { id: uid(), title: 'Emergency helplines', description: 'Numbers and contacts in case of discrimination or violence.', url: '', filename: null, originalFilename: null, type: 'Lien', status: 'active', createdAt: new Date().toISOString() }
    ]);
  }

  // Messages + Pages
  if (!fs.existsSync(path.join(DATA, 'messages.json'))) write('messages.json', []);
  if (!fs.existsSync(path.join(DATA, 'pages.json'))) {
    write('pages.json', [
      { slug: 'home', heroTitle: 'Defending the rights of everyone in Dominica', heroSubtitle: 'MiRiDom advocates for the fundamental rights of the LGBTQ+ community in Dominica.', missionText: 'Our mission is to promote, protect, and defend the fundamental rights of all people in Dominica.', updatedAt: new Date().toISOString() },
      { slug: 'about', content: 'MiRiDom (Minority Rights Dominica) is a civil society organization.', mission: 'To promote, protect, and defend the fundamental rights of all people in Dominica.', vision: 'A Dominica where every person lives freely, with dignity and in safety.', updatedAt: new Date().toISOString() },
      { slug: 'legal', content: 'MiRiDom is a non-profit organization.', updatedAt: new Date().toISOString() }
    ]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Champs requis' });
  const users = read('users.json');
  const user  = users.find(u => u.email === email.toLowerCase().trim());
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Identifiants incorrects' });
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user));

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Champs requis' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6 car.)' });
  const users = read('users.json');
  const i = users.findIndex(u => u.id === req.user.id);
  if (i === -1) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  if (!(await bcrypt.compare(currentPassword, users[i].password)))
    return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  users[i].password = bcrypt.hashSync(newPassword, 10);
  write('users.json', users);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// ACTUALITÉS
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/articles', optionalAuth, (req, res) => {
  let arts = read('articles.json');
  if (!req.user) arts = arts.filter(a => a.status === 'published');
  arts.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(arts);
});

app.get('/api/articles/:id', optionalAuth, (req, res) => {
  const arts = read('articles.json');
  const art  = arts.find(a => a.id === req.params.id);
  if (!art || (!req.user && art.status !== 'published'))
    return res.status(404).json({ error: 'Article non trouvé' });
  res.json(art);
});

app.post('/api/articles', requireAuth, (req, res) => {
  const arts = read('articles.json');
  const art  = { id: uid(), title: req.body.title || 'Sans titre', excerpt: req.body.excerpt || '', content: req.body.content || '', status: req.body.status || 'draft', date: req.body.date || new Date().toISOString().split('T')[0], author: req.user.name || req.user.email, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  arts.push(art);
  write('articles.json', arts);
  res.status(201).json(art);
});

app.put('/api/articles/:id', requireAuth, (req, res) => {
  const arts = read('articles.json');
  const i = arts.findIndex(a => a.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Article non trouvé' });
  arts[i] = { ...arts[i], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
  write('articles.json', arts);
  res.json(arts[i]);
});

app.delete('/api/articles/:id', requireAuth, (req, res) => {
  let arts = read('articles.json');
  arts = arts.filter(a => a.id !== req.params.id);
  write('articles.json', arts);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// RESSOURCES (liens + fichiers téléchargeables — fusion Documents)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/resources', optionalAuth, (req, res) => {
  let resources = read('resources.json');
  if (!req.user) resources = resources.filter(r => r.status === 'active');
  res.json(resources);
});

app.get('/api/resources/:id', (req, res) => {
  const resources = read('resources.json');
  const r = resources.find(r => r.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Ressource non trouvée' });
  res.json(r);
});

app.post('/api/resources', requireAuth, (req, res) => {
  const resources = read('resources.json');
  const r = {
    id: uid(),
    title:       req.body.title?.trim() || 'Sans titre',
    description: req.body.description?.trim() || '',
    url:         req.body.url?.trim() || '',
    filename:    null,
    originalFilename: null,
    mimetype:    null,
    fileSize:    null,
    type:        req.body.type || 'Lien',
    status:      req.body.status || 'active',
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString()
  };

  // Fichier joint (base64)
  if (req.body.filedata && req.body.filename) {
    const { savedName, size, url } = saveFile(req.body.filedata, req.body.filename);
    r.filename         = savedName;
    r.originalFilename = req.body.filename;
    r.mimetype         = req.body.mimetype || 'application/octet-stream';
    r.fileSize         = size;
    r.url              = url; // file URL overrides any manual URL
  }

  resources.push(r);
  write('resources.json', resources);
  res.status(201).json(r);
});

app.put('/api/resources/:id', requireAuth, (req, res) => {
  const resources = read('resources.json');
  const i = resources.findIndex(r => r.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Ressource non trouvée' });

  if (req.body.title !== undefined)       resources[i].title       = req.body.title.trim();
  if (req.body.description !== undefined) resources[i].description = req.body.description.trim();
  if (req.body.type !== undefined)        resources[i].type        = req.body.type;
  if (req.body.status !== undefined)      resources[i].status      = req.body.status;

  // Nouveau fichier
  if (req.body.filedata && req.body.filename) {
    deleteFile(resources[i].filename);
    const { savedName, size, url } = saveFile(req.body.filedata, req.body.filename);
    resources[i].filename         = savedName;
    resources[i].originalFilename = req.body.filename;
    resources[i].mimetype         = req.body.mimetype || 'application/octet-stream';
    resources[i].fileSize         = size;
    resources[i].url              = url;
  } else if (req.body.url !== undefined && !resources[i].filename) {
    // URL externe (seulement si pas de fichier)
    resources[i].url = req.body.url.trim();
  }

  resources[i].updatedAt = new Date().toISOString();
  write('resources.json', resources);
  res.json(resources[i]);
});

app.delete('/api/resources/:id', requireAuth, (req, res) => {
  let resources = read('resources.json');
  const r = resources.find(r => r.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Ressource non trouvée' });
  deleteFile(r.filename);
  resources = resources.filter(r => r.id !== req.params.id);
  write('resources.json', resources);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGES / CONTACT
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'Champs requis' });
  const messages = read('messages.json');
  messages.push({ id: uid(), name: name.trim(), email: email.trim(), subject: subject?.trim() || '(sans objet)', message: message.trim(), read: false, createdAt: new Date().toISOString() });
  write('messages.json', messages);
  res.status(201).json({ ok: true });
});

app.get('/api/messages', requireAuth, (req, res) => {
  const msgs = read('messages.json');
  msgs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(msgs);
});

app.put('/api/messages/:id', requireAuth, (req, res) => {
  const msgs = read('messages.json');
  const i = msgs.findIndex(m => m.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Message non trouvé' });
  msgs[i] = { ...msgs[i], ...req.body, id: req.params.id };
  write('messages.json', msgs);
  res.json(msgs[i]);
});

app.delete('/api/messages/:id', requireAuth, (req, res) => {
  let msgs = read('messages.json');
  msgs = msgs.filter(m => m.id !== req.params.id);
  write('messages.json', msgs);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// PAGES
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/pages', (req, res) => res.json(read('pages.json')));

app.get('/api/pages/:slug', (req, res) => {
  const pages = read('pages.json');
  const page  = pages.find(p => p.slug === req.params.slug);
  if (!page) return res.status(404).json({ error: 'Page non trouvée' });
  res.json(page);
});

app.put('/api/pages/:slug', requireAuth, (req, res) => {
  const pages = read('pages.json');
  const i     = pages.findIndex(p => p.slug === req.params.slug);
  const data  = { ...req.body, slug: req.params.slug, updatedAt: new Date().toISOString() };
  if (i === -1) pages.push(data); else pages[i] = { ...pages[i], ...data };
  write('pages.json', pages);
  res.json(pages.find(p => p.slug === req.params.slug));
});

// ═══════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/stats', requireAuth, (req, res) => {
  const arts     = read('articles.json');
  const res_     = read('resources.json');
  const msgs     = read('messages.json');
  const files    = res_.filter(r => r.filename);
  res.json({
    articles:         arts.length,
    articlesPublished: arts.filter(a => a.status === 'published').length,
    resources:        res_.length,
    documents:        files.length,
    messages:         msgs.length,
    unreadMessages:   msgs.filter(m => !m.read).length
  });
});

// ── Fallback SPA ──────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/'))
    return res.status(404).json({ error: 'Route non trouvée' });
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── Boot ──────────────────────────────────────────────────────────────────
initData();
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔════════════════════════════════════════╗');
  console.log('  ║     🌿  MiRiDom — Serveur v3           ║');
  console.log('  ╚════════════════════════════════════════╝');
  console.log(`  🌐 Site   →  http://localhost:${PORT}`);
  console.log(`  🔐 Admin  →  http://localhost:${PORT}/admin.html`);
  console.log('  👤 admin@miridom.org / miridom2025');
  console.log('');
});
