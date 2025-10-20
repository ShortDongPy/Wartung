// server.js - Backend Server für Feiler Wartungssoftware
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = 3001;

// Pfade
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DATA_FILE = path.join(DATA_DIR, 'maintenance-data.json');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(PUBLIC_DIR)); // dient /public-Inhalte (inkl. index.html), wenn vorhanden

// Initialisierung
async function initializeDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.mkdir(PUBLIC_DIR, { recursive: true });

    // Prüfe Frontend
    try {
      await fs.access(path.join(PUBLIC_DIR, 'index.html'));
    } catch {
      console.warn('⚠️  Hinweis: Es wurde keine public/index.html gefunden. ' +
                   'Die API läuft, aber die Startseite zeigt nur einen Hinweis.');
    }

    // Datendatei initial anlegen, falls fehlt
    try {
      await fs.access(DATA_FILE);
    } catch {
      const initialData = {
        machines: [],
        parts: [],
        maintenanceHistory: [],
        notifications: [],
        users: [
          {
            id: 'id-' + Date.now() + '-1',
            username: 'admin',
            password: 'admin',
            name: 'Administrator',
            email: 'admin@feiler.com',
            role: 'admin',
            created: new Date()
          },
          {
            id: 'id-' + Date.now() + '-2',
            username: 'tech',
            password: 'tech',
            name: 'Techniker',
            email: 'tech@feiler.com',
            role: 'technician',
            created: new Date()
          },
          {
            id: 'id-' + Date.now() + '-3',
            username: 'viewer',
            password: 'viewer',
            name: 'Betrachter',
            email: 'viewer@feiler.com',
            role: 'viewer',
            created: new Date()
          }
        ],
        machineTypes: [
          { id: 'id-mt-1', code: 'P2', name: 'Greiferwebmaschine P2', description: 'Modernste Generation der Greiferwebmaschinen' },
          { id: 'id-mt-2', code: 'P1', name: 'Greiferwebmaschine P1', description: 'Bewährte Greiferwebmaschine' },
          { id: 'id-mt-3', code: 'A1', name: 'Luftwebmaschine A1', description: 'Mit ServoControl® Technologie' },
          { id: 'id-mt-4', code: 'LWV', name: 'Luftwebmaschine LWV', description: 'Für spezielle Anwendungen' }
        ],
        maintenanceTemplates: [],
        floorPlans: [],
        lastModified: new Date()
      };
      await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
      console.log('📁 Initiale Datendatei erstellt');
    }
  } catch (error) {
    console.error('❌ Fehler beim Initialisieren:', error);
  }
}

// Hilfsfunktionen für Daten
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Fehler beim Lesen der Daten:', error);
    return null;
  }
}

async function writeData(data) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(DATA_DIR, `backup-${timestamp}.json`);

    try {
      const currentData = await fs.readFile(DATA_FILE, 'utf8');
      await fs.writeFile(backupFile, currentData);

      // nur die letzten 10 Backups behalten
      const files = await fs.readdir(DATA_DIR);
      const backups = files.filter(f => f.startsWith('backup-')).sort();
      if (backups.length > 10) {
        for (let i = 0; i < backups.length - 10; i++) {
          await fs.unlink(path.join(DATA_DIR, backups[i]));
        }
      }
    } catch {
      // erstes Schreiben — kein Backup vorhanden
    }

    data.lastModified = new Date();
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Schreiben der Daten:', error);
    return false;
  }
}

// Multer für Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) cb(null, true);
    else cb(new Error('Nur Bildateien sind erlaubt!'));
  }
});

// ========== API ENDPOINTS ==========

// Health/Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    timestamp: new Date()
  });
});

// Gesamtdaten lesen/schreiben
app.get('/api/data', async (req, res) => {
  const data = await readData();
  if (data) res.json(data);
  else res.status(500).json({ error: 'Fehler beim Laden der Daten' });
});

app.post('/api/data', async (req, res) => {
  const success = await writeData(req.body);
  if (success) res.json({ success: true, message: 'Daten gespeichert' });
  else res.status(500).json({ error: 'Fehler beim Speichern der Daten' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const data = await readData();

  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  const user = data.users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// Hallenplan-Upload
app.post('/api/floor-plan/upload', upload.single('floorPlan'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });

  try {
    const data = await readData();
    const floorPlanId = 'fp-' + Date.now();

    const newFloorPlan = {
      id: floorPlanId,
      name: req.body.name || 'Neuer Hallenplan',
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: `/uploads/${req.file.filename}`,
      machinePositions: {},
      uploadedAt: new Date()
    };

    if (!data.floorPlans) data.floorPlans = [];
    data.floorPlans.push(newFloorPlan);

    await writeData(data);
    res.json({ success: true, floorPlan: newFloorPlan });
  } catch (error) {
    console.error('Upload-Fehler:', error);
    res.status(500).json({ error: 'Fehler beim Hochladen' });
  }
});

// Statische Auslieferung der Uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// Maschinen CRUD
app.post('/api/machines', async (req, res) => {
  const data = await readData();
  const machine = { ...req.body, id: 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11) };
  data.machines.push(machine);
  await writeData(data);
  res.json({ success: true, machine });
});

app.put('/api/machines/:id', async (req, res) => {
  const data = await readData();
  const index = data.machines.findIndex(m => m.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Maschine nicht gefunden' });

  data.machines[index] = { ...data.machines[index], ...req.body };
  await writeData(data);
  res.json({ success: true, machine: data.machines[index] });
});

app.delete('/api/machines/:id', async (req, res) => {
  const data = await readData();
  data.machines = data.machines.filter(m => m.id !== req.params.id);
  await writeData(data);
  res.json({ success: true });
});

// Vorlagen & Teile & Historie
app.post('/api/maintenance-templates', async (req, res) => {
  const data = await readData();
  const template = { ...req.body, id: 'tpl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11) };
  data.maintenanceTemplates.push(template);
  await writeData(data);
  res.json({ success: true, template });
});

app.post('/api/parts', async (req, res) => {
  const data = await readData();
  const part = { ...req.body, id: 'part-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11) };
  data.parts.push(part);
  await writeData(data);
  res.json({ success: true, part });
});

app.post('/api/maintenance-history', async (req, res) => {
  const data = await readData();
  const record = {
    ...req.body,
    id: 'mh-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11),
    timestamp: new Date()
  };
  data.maintenanceHistory.push(record);
  await writeData(data);
  res.json({ success: true, record });
});

// ---------- Root-Route & Fallback ----------

// Root: versuche public/index.html zu liefern, sonst Hinweis anzeigen
app.get('/', (req, res) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      res
        .status(200)
        .send(
          `<h1>Feiler Wartungssoftware API</h1>
           <p>Frontend nicht gefunden. Lege eine <code>public/index.html</code> ab oder rufe z. B. <code>/api/status</code> auf.</p>`
        );
    }
  });
});

// SPA-Fallback (optional): alle nicht-API-Routen auf index.html mappen
app.get(/^\/(?!api\/).*/, (req, res, next) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) next(); // wenn keine index.html existiert, weiter zu 404
  });
});

// 404-Handler für nicht gefundene API-Routen
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint nicht gefunden' });
});

// Start Server
async function startServer() {
  await initializeDirectories();
  app.listen(PORT, () => {
    console.log(`🚀 Server läuft auf  http://localhost:${PORT}`);
    console.log(`📁 Datenspeicher:     ${DATA_FILE}`);
    console.log(`🖼️ Upload-Verzeichnis: ${UPLOADS_DIR}`);
    console.log(`🌐 Public-Verzeichnis: ${PUBLIC_DIR}`);
  });
}

startServer();
