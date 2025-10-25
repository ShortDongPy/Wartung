// server.js - Backend Server für Feiler Wartungssoftware
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// Pfade
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DATA_FILE = path.join(DATA_DIR, 'maintenance-data.json');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));

// Initialisierung
async function initializeDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.mkdir(PUBLIC_DIR, { recursive: true });

    // Datendatei initial anlegen, falls fehlt
    try {
      await fs.access(DATA_FILE);
      console.log('✅ Datendatei gefunden');
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
    // Backup erstellen
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
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
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
    version: '2.0.0',
    timestamp: new Date()
  });
});

// ===== VOLLSTÄNDIGE DATEN =====
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

// ===== LOGIN =====
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

// ===== MASCHINEN =====
app.get('/api/machines', async (req, res) => {
  const data = await readData();
  if (data) res.json(data.machines);
  else res.status(500).json({ error: 'Fehler beim Laden' });
});

app.post('/api/machines', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  const machine = { 
    ...req.body, 
    id: 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11) 
  };
  data.machines.push(machine);
  await writeData(data);
  res.json({ success: true, machine });
});

app.put('/api/machines/:id', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  const index = data.machines.findIndex(m => m.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Maschine nicht gefunden' });

  data.machines[index] = { ...data.machines[index], ...req.body };
  await writeData(data);
  res.json({ success: true, machine: data.machines[index] });
});

app.delete('/api/machines/:id', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  data.machines = data.machines.filter(m => m.id !== req.params.id);
  await writeData(data);
  res.json({ success: true });
});

// ===== ERSATZTEILE =====
app.get('/api/parts', async (req, res) => {
  const data = await readData();
  if (data) res.json(data.parts);
  else res.status(500).json({ error: 'Fehler beim Laden' });
});

app.post('/api/parts', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  const part = { 
    ...req.body, 
    id: 'part-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11) 
  };
  data.parts.push(part);
  await writeData(data);
  res.json({ success: true, part });
});

app.put('/api/parts/:id', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  const index = data.parts.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Teil nicht gefunden' });

  data.parts[index] = { ...data.parts[index], ...req.body };
  await writeData(data);
  res.json({ success: true, part: data.parts[index] });
});

app.delete('/api/parts/:id', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  data.parts = data.parts.filter(p => p.id !== req.params.id);
  await writeData(data);
  res.json({ success: true });
});

// ===== WARTUNGSVORLAGEN =====
app.get('/api/maintenance-templates', async (req, res) => {
  const data = await readData();
  if (data) res.json(data.maintenanceTemplates || []);
  else res.status(500).json({ error: 'Fehler beim Laden' });
});

app.post('/api/maintenance-templates', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  if (!data.maintenanceTemplates) data.maintenanceTemplates = [];
  const template = { 
    ...req.body, 
    id: 'tpl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11) 
  };
  data.maintenanceTemplates.push(template);
  await writeData(data);
  res.json({ success: true, template });
});

app.put('/api/maintenance-templates/:id', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  const index = data.maintenanceTemplates.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

  data.maintenanceTemplates[index] = { ...data.maintenanceTemplates[index], ...req.body };
  await writeData(data);
  res.json({ success: true, template: data.maintenanceTemplates[index] });
});

app.delete('/api/maintenance-templates/:id', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  data.maintenanceTemplates = data.maintenanceTemplates.filter(t => t.id !== req.params.id);
  await writeData(data);
  res.json({ success: true });
});

// ===== WARTUNGSHISTORIE =====
app.post('/api/maintenance-history', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  const record = {
    ...req.body,
    id: 'mh-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11),
    timestamp: new Date()
  };
  data.maintenanceHistory.push(record);
  await writeData(data);
  res.json({ success: true, record });
});

// ===== BENUTZER =====
app.get('/api/users', async (req, res) => {
  const data = await readData();
  if (data) res.json(data.users);
  else res.status(500).json({ error: 'Fehler beim Laden' });
});

app.post('/api/users', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  const user = { 
    ...req.body, 
    id: 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11),
    created: new Date()
  };
  data.users.push(user);
  await writeData(data);
  res.json({ success: true, user });
});

app.delete('/api/users/:id', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  data.users = data.users.filter(u => u.id !== req.params.id);
  await writeData(data);
  res.json({ success: true });
});

// ===== MASCHINENTYPEN =====
app.get('/api/machine-types', async (req, res) => {
  const data = await readData();
  if (data) res.json(data.machineTypes);
  else res.status(500).json({ error: 'Fehler beim Laden' });
});

app.post('/api/machine-types', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  const machineType = { 
    ...req.body, 
    id: 'mt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11) 
  };
  data.machineTypes.push(machineType);
  await writeData(data);
  res.json({ success: true, machineType });
});

app.delete('/api/machine-types/:id', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  data.machineTypes = data.machineTypes.filter(t => t.id !== req.params.id);
  await writeData(data);
  res.json({ success: true });
});

// ===== HALLENPLÄNE =====
app.get('/api/floor-plans', async (req, res) => {
  const data = await readData();
  if (data) res.json(data.floorPlans || []);
  else res.status(500).json({ error: 'Fehler beim Laden' });
});

app.post('/api/floor-plans', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  if (!data.floorPlans) data.floorPlans = [];
  const floorPlan = { 
    ...req.body, 
    id: 'fp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11) 
  };
  data.floorPlans.push(floorPlan);
  await writeData(data);
  res.json({ success: true, floorPlan });
});

app.put('/api/floor-plans/:id', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  if (!data.floorPlans) data.floorPlans = [];
  const index = data.floorPlans.findIndex(fp => fp.id === req.params.id);
  
  if (index === -1) {
    // Neu erstellen, falls nicht vorhanden
    const floorPlan = { ...req.body, id: req.params.id };
    data.floorPlans.push(floorPlan);
  } else {
    data.floorPlans[index] = { ...data.floorPlans[index], ...req.body };
  }
  
  await writeData(data);
  res.json({ success: true, floorPlan: data.floorPlans[index >= 0 ? index : data.floorPlans.length - 1] });
});

app.delete('/api/floor-plans/:id', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  if (data.floorPlans) {
    data.floorPlans = data.floorPlans.filter(fp => fp.id !== req.params.id);
  }
  await writeData(data);
  res.json({ success: true });
});

// Hallenplan-Upload
app.post('/api/floor-plan/upload', upload.single('floorPlan'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });

  try {
    const data = await readData();
    if (!data.floorPlans) data.floorPlans = [];
    
    const floorPlanId = 'fp-' + Date.now();
    const newFloorPlan = {
      id: floorPlanId,
      name: req.body.name || 'Neuer Hallenplan',
      filename: req.file.filename,
      originalName: req.file.originalname,
      image: `/uploads/${req.file.filename}`,
      machinePositions: {},
      uploadedAt: new Date()
    };

    data.floorPlans.push(newFloorPlan);
    await writeData(data);
    res.json({ success: true, floorPlan: newFloorPlan });
  } catch (error) {
    console.error('Upload-Fehler:', error);
    res.status(500).json({ error: 'Fehler beim Hochladen' });
  }
});

// ===== BENACHRICHTIGUNGEN =====
app.post('/api/notifications', async (req, res) => {
  const data = await readData();
  if (!data) return res.status(500).json({ error: 'Serverfehler' });
  
  const notification = {
    ...req.body,
    id: 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11),
    timestamp: new Date(),
    read: false
  };
  data.notifications.push(notification);
  await writeData(data);
  res.json({ success: true, notification });
});

// Root & Fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'), err => {
    if (err) {
      res.status(200).send('<h1>Feiler Wartungssoftware API v2.0</h1><p>Server läuft. Frontend unter /index.html</p>');
    }
  });
});

app.get(/^\/(?!api\/).*/, (req, res, next) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'), err => {
    if (err) next();
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint nicht gefunden' });
});

// Start Server
async function startServer() {
  await initializeDirectories();
  app.listen(PORT, () => {
    console.log(`\n🚀 =======================================`);
    console.log(`   Feiler Wartungssoftware Server v2.0`);
    console.log(`=======================================`);
    console.log(`🌐 Server:           http://localhost:${PORT}`);
    console.log(`📁 Datenspeicher:    ${DATA_FILE}`);
    console.log(`🖼️  Upload-Ordner:    ${UPLOADS_DIR}`);
    console.log(`📂 Public-Ordner:    ${PUBLIC_DIR}`);
    console.log(`=======================================\n`);
  });
}

startServer();
