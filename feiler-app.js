// feiler-app.js - Client mit Server-Synchronisation
// Server-Konfiguration
const SERVER_URL = window.location.origin; // Nutzt automatisch die richtige URL
const SYNC_INTERVAL = 3000; // Synchronisation alle 3 Sekunden
const DEBOUNCE_DELAY = 500; // Verzögerung vor dem Speichern

let isOnlineMode = false;
let syncInterval = null;
let retryCount = 0;
let lastDataHash = '';
let isSaving = false;
const MAX_RETRY = 3;

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
let currentTheme = localStorage.getItem('theme') || 'light';

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme', theme);
    currentTheme = theme;
}

setTheme(currentTheme);

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
}

// Helper function to create hash of data for comparison
function createDataHash(data) {
    return JSON.stringify({
        machines: data.machines?.length,
        parts: data.parts?.length,
        maintenanceHistory: data.maintenanceHistory?.length,
        lastModified: data.lastModified
    });
}

// Debounce function to prevent too many saves
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Data Manager Class mit verbesserter Server-Synchronisation
class DataManager {
    constructor() {
        this.storageKey = 'feilerMaintenanceDataLocal';
        this.serverAvailable = false;
        this.pendingChanges = [];
        this.saveDebounced = debounce(() => this.performSave(), DEBOUNCE_DELAY);
        this.loadData();
        this.setupOfflineDetection();
        this.startAutoSync();
    }

    async loadData() {
        // Versuche zuerst vom Server zu laden
        try {
            const response = await fetch(`${SERVER_URL}/api/data`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-cache'
            });
            
            if (response.ok) {
                this.data = await response.json();
                this.serverAvailable = true;
                isOnlineMode = true;
                lastDataHash = createDataHash(this.data);
                
                // Speichere auch lokal als Backup
                localStorage.setItem(this.storageKey, JSON.stringify(this.data));
                console.log('✅ Daten vom Server geladen');
                this.showSyncStatus('Online - Verbunden mit Server', 'success', 3000);
                retryCount = 0;
            } else {
                throw new Error('Server nicht erreichbar');
            }
        } catch (error) {
            console.log('⚠️ Server nicht erreichbar, verwende lokale Daten:', error);
            this.serverAvailable = false;
            isOnlineMode = false;
            
            // Lade lokale Daten als Fallback
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.data = JSON.parse(stored);
                this.showSyncStatus('Offline - Lokaler Modus', 'warning');
            } else {
                // Initialisiere mit Standarddaten
                this.initializeDefaultData();
                this.showSyncStatus('Offline - Neue Installation', 'warning');
            }
        }
        
        // Stelle sicher, dass alle Strukturen existieren
        this.ensureDataStructure();
    }

    initializeDefaultData() {
        this.data = {
            machines: [],
            parts: [],
            maintenanceHistory: [],
            notifications: [],
            pendingSync: [],
            users: [
                { id: this.generateId(), username: 'admin', password: 'admin', name: 'Administrator', email: 'admin@feiler.com', role: 'admin', created: new Date() },
                { id: this.generateId(), username: 'tech', password: 'tech', name: 'Techniker', email: 'tech@feiler.com', role: 'technician', created: new Date() },
                { id: this.generateId(), username: 'viewer', password: 'viewer', name: 'Betrachter', email: 'viewer@feiler.com', role: 'viewer', created: new Date() }
            ],
            machineTypes: [
                { id: this.generateId(), code: 'P2', name: 'Greiferwebmaschine P2', description: 'Modernste Generation' },
                { id: this.generateId(), code: 'P1', name: 'Greiferwebmaschine P1', description: 'Bewährte Greiferwebmaschine' },
                { id: this.generateId(), code: 'A1', name: 'Luftwebmaschine A1', description: 'Mit ServoControl®' },
                { id: this.generateId(), code: 'LWV', name: 'Luftwebmaschine LWV', description: 'Für spezielle Anwendungen' }
            ],
            maintenanceTemplates: [],
            floorPlans: []
        };
        this.initializeSampleData();
    }

    ensureDataStructure() {
        if (!this.data.machines) this.data.machines = [];
        if (!this.data.parts) this.data.parts = [];
        if (!this.data.maintenanceHistory) this.data.maintenanceHistory = [];
        if (!this.data.notifications) this.data.notifications = [];
        if (!this.data.users || this.data.users.length === 0) this.initializeDefaultUsers();
        if (!this.data.machineTypes || this.data.machineTypes.length === 0) this.initializeDefaultMachineTypes();
        if (!this.data.maintenanceTemplates) this.data.maintenanceTemplates = [];
        if (!this.data.floorPlans) this.data.floorPlans = [];
    }

    initializeDefaultUsers() {
        this.data.users = [
            { id: this.generateId(), username: 'admin', password: 'admin', name: 'Administrator', email: 'admin@feiler.com', role: 'admin', created: new Date() },
            { id: this.generateId(), username: 'tech', password: 'tech', name: 'Techniker', email: 'tech@feiler.com', role: 'technician', created: new Date() },
            { id: this.generateId(), username: 'viewer', password: 'viewer', name: 'Betrachter', email: 'viewer@feiler.com', role: 'viewer', created: new Date() }
        ];
    }

    initializeDefaultMachineTypes() {
        this.data.machineTypes = [
            { id: this.generateId(), code: 'P2', name: 'Greiferwebmaschine P2', description: 'Modernste Generation' },
            { id: this.generateId(), code: 'P1', name: 'Greiferwebmaschine P1', description: 'Bewährte Greiferwebmaschine' },
            { id: this.generateId(), code: 'A1', name: 'Luftwebmaschine A1', description: 'Mit ServoControl®' },
            { id: this.generateId(), code: 'LWV', name: 'Luftwebmaschine LWV', description: 'Für spezielle Anwendungen' }
        ];
    }

    // Verbesserte Save-Funktion mit Debouncing
    saveData() {
        // Speichere sofort lokal
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        
        // Trigger debounced save to server
        this.saveDebounced();
    }
    
    async performSave() {
        if (isSaving) return; // Verhindere gleichzeitige Saves
        
        // Versuche mit Server zu synchronisieren
        if (this.serverAvailable) {
            isSaving = true;
            try {
                const response = await fetch(`${SERVER_URL}/api/data`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.data)
                });
                
                if (response.ok) {
                    console.log('✅ Daten mit Server synchronisiert');
                    lastDataHash = createDataHash(this.data);
                    this.showSyncStatus('Gespeichert', 'success', 2000);
                    retryCount = 0;
                } else {
                    throw new Error('Sync failed');
                }
            } catch (error) {
                console.log('⚠️ Synchronisation fehlgeschlagen:', error);
                this.serverAvailable = false;
                this.addToPendingChanges();
                this.showSyncStatus('Offline - Änderungen lokal gespeichert', 'warning', 3000);
            } finally {
                isSaving = false;
            }
        } else {
            this.addToPendingChanges();
            console.log('📝 Änderungen lokal gespeichert (Offline-Modus)');
        }
    }

    addToPendingChanges() {
        if (!this.data.pendingSync) this.data.pendingSync = [];
        this.data.pendingSync.push({
            timestamp: new Date(),
            user: currentUser?.name || 'Unbekannt',
            action: 'data_update'
        });
    }

    async startAutoSync() {
        // Stoppe existierenden Interval
        if (syncInterval) {
            clearInterval(syncInterval);
        }
        
        // Starte neuen Sync-Interval
        syncInterval = setInterval(async () => {
            await this.syncWithServer();
        }, SYNC_INTERVAL);
        
        // Initiale Synchronisation
        await this.syncWithServer();
    }

    async checkServerConnection() {
        try {
            const response = await fetch(`${SERVER_URL}/api/status`, {
                method: 'GET',
                cache: 'no-cache',
                signal: AbortSignal.timeout(5000) // 5 Sekunden Timeout
            });
            
            if (response.ok) {
                if (!this.serverAvailable) {
                    console.log('✅ Serververbindung wiederhergestellt');
                    this.serverAvailable = true;
                    isOnlineMode = true;
                    this.showSyncStatus('Online - Verbindung wiederhergestellt', 'success', 3000);
                    
                    // Sende pending changes
                    if (this.data.pendingSync && this.data.pendingSync.length > 0) {
                        await this.performSave();
                        this.data.pendingSync = [];
                    }
                }
                return true;
            }
        } catch (error) {
            if (this.serverAvailable) {
                this.serverAvailable = false;
                isOnlineMode = false;
                this.showSyncStatus('Offline - Server nicht erreichbar', 'warning');
            }
        }
        return false;
    }

    async syncWithServer() {
        // Prüfe erst ob Server erreichbar ist
        const isConnected = await this.checkServerConnection();
        if (!isConnected) return;
        
        try {
            const response = await fetch(`${SERVER_URL}/api/data`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-cache'
            });
            
            if (response.ok) {
                const serverData = await response.json();
                const serverHash = createDataHash(serverData);
                
                // Prüfe ob sich die Daten geändert haben
                if (serverHash !== lastDataHash) {
                    console.log('📥 Neue Daten vom Server erkannt');
                    
                    // Übernehme Server-Daten
                    this.data = serverData;
                    lastDataHash = serverHash;
                    
                    // Speichere lokal
                    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
                    
                    // Aktualisiere UI wenn Benutzer eingeloggt
                    if (currentUser) {
                        // Speichere aktuelle Tab-Position
                        const activeTab = document.querySelector('.tab.active')?.dataset.tab;
                        
                        // Aktualisiere nur die sichtbaren Bereiche
                        renderDashboard();
                        
                        // Aktualisiere aktiven Tab
                        if (activeTab === 'machines') renderMachines();
                        else if (activeTab === 'parts') renderParts();
                        else if (activeTab === 'maintenance-templates') renderMaintenanceTemplates();
                        else if (activeTab === 'floor-plan' && floorPlanManager) {
                            floorPlanManager.renderAvailableMachines();
                            floorPlanManager.renderFloorPlanSelector();
                        }
                        
                        // Aktualisiere Benachrichtigungen
                        renderNotifications();
                        updateLocationFilter();
                        
                        this.showSyncStatus('Daten aktualisiert', 'info', 1000);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Sync-Fehler:', error);
        }
    }

    showSyncStatus(message, type = 'info', duration = 3000) {
        // Entferne existierende Status-Nachrichten
        const existing = document.querySelector('.sync-status');
        if (existing) existing.remove();
        
        const statusDiv = document.createElement('div');
        statusDiv.className = `sync-status sync-status-${type}`;
        statusDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 300px;
        `;
        
        switch(type) {
            case 'success':
                statusDiv.style.background = 'var(--success-color)';
                statusDiv.innerHTML = '✅ ' + message;
                break;
            case 'warning':
                statusDiv.style.background = 'var(--warning-color)';
                statusDiv.innerHTML = '⚠️ ' + message;
                break;
            case 'error':
                statusDiv.style.background = 'var(--danger-color)';
                statusDiv.innerHTML = '❌ ' + message;
                break;
            case 'info':
                statusDiv.style.background = 'var(--info-color)';
                statusDiv.innerHTML = 'ℹ️ ' + message;
                break;
        }
        
        document.body.appendChild(statusDiv);
        
        if (duration > 0) {
            setTimeout(() => {
                if (statusDiv && statusDiv.parentElement) {
                    statusDiv.style.animation = 'slideOut 0.3s ease-in';
                    setTimeout(() => {
                        if (statusDiv && statusDiv.parentElement) {
                            statusDiv.remove();
                        }
                    }, 300);
                }
            }, duration);
        }
    }

    generateId() {
        return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // Erweiterte Methoden für Server-Kommunikation
    async authenticateUser(username, password) {
        // Versuche zuerst Server-Login
        if (this.serverAvailable) {
            try {
                const response = await fetch(`${SERVER_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    // Aktualisiere lokale Daten nach erfolgreichem Login
                    await this.loadData();
                    return result.user;
                }
            } catch (error) {
                console.log('⚠️ Server-Login fehlgeschlagen, verwende lokale Authentifizierung');
            }
        }
        
        // Fallback auf lokale Authentifizierung
        return this.data.users.find(u => u.username === username && u.password === password);
    }

    // Hallenplan Upload mit Server
    async uploadFloorPlan(file, name) {
        if (!this.serverAvailable) {
            // Offline: Speichere als Base64
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const floorPlanId = 'fp-' + Date.now();
                    const newFloorPlan = {
                        id: floorPlanId,
                        name: name,
                        image: e.target.result,
                        machinePositions: {},
                        offline: true
                    };
                    
                    if (!this.data.floorPlans) this.data.floorPlans = [];
                    this.data.floorPlans.push(newFloorPlan);
                    this.saveData();
                    resolve(newFloorPlan);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        } else {
            // Online: Upload zum Server
            const formData = new FormData();
            formData.append('floorPlan', file);
            formData.append('name', name);
            
            try {
                const response = await fetch(`${SERVER_URL}/api/floor-plan/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    // Aktualisiere lokale Daten
                    await this.loadData();
                    return result.floorPlan;
                } else {
                    throw new Error('Upload fehlgeschlagen');
                }
            } catch (error) {
                console.error('Upload-Fehler:', error);
                // Fallback auf lokale Speicherung
                return this.uploadFloorPlan(file, name);
            }
        }
    }

    initializeSampleData() {
        // Initialize default templates
        this.data.maintenanceTemplates = [
            {
                id: this.generateId(),
                name: 'Standard Wartungsplan P2',
                description: 'Standardwartung für Greiferwebmaschinen P2',
                machineType: 'P2',
                components: [
                    { id: this.generateId(), name: 'Greifer-Mechanismus', intervalHours: 500, category: 'Mechanisch', tasks: ['Prüfen', 'Schmieren', 'Einstellen'] },
                    { id: this.generateId(), name: 'Antriebsriemen', intervalHours: 1000, category: 'Mechanisch', tasks: ['Spannung prüfen', 'Auf Verschleiß kontrollieren'] },
                    { id: this.generateId(), name: 'Webblatt', intervalHours: 750, category: 'Reinigung', tasks: ['Reinigen', 'Auf Beschädigungen prüfen'] },
                    { id: this.generateId(), name: 'Ölstand', intervalHours: 500, category: 'Schmierung', tasks: ['Kontrollieren', 'Nachfüllen'] },
                    { id: this.generateId(), name: 'Elektrische Verbindungen', intervalHours: 2000, category: 'Elektrik', tasks: ['Prüfen', 'Kontakte reinigen'] }
                ]
            },
            {
                id: this.generateId(),
                name: 'Standard Wartungsplan A1',
                description: 'Standardwartung für Luftwebmaschinen A1',
                machineType: 'A1',
                components: [
                    { id: this.generateId(), name: 'Luftdüsen', intervalHours: 250, category: 'Pneumatik', tasks: ['Reinigen', 'Auf Verstopfung prüfen'] },
                    { id: this.generateId(), name: 'Luftfilter', intervalHours: 500, category: 'Pneumatik', tasks: ['Wechseln'] },
                    { id: this.generateId(), name: 'Kompressoranlage', intervalHours: 1000, category: 'Pneumatik', tasks: ['Warten', 'Ölstand prüfen'] },
                    { id: this.generateId(), name: 'Hauptmotor (EFF1)', intervalHours: 2000, category: 'Mechanisch', tasks: ['Wartung durchführen'] }
                ]
            }
        ];

        const p2Template = this.data.maintenanceTemplates[0];
        const a1Template = this.data.maintenanceTemplates[1];

        this.data.machines = [
            {
                id: this.generateId(),
                name: 'Webmaschine Hall 1-A',
                type: 'P2',
                serial: 'FEI-P2-2024-001',
                location: 'Produktionshalle 1',
                year: 2024,
                status: 'ok',
                operatingHours: 3200,
                maintenanceTemplateId: p2Template.id,
                componentStates: this.initializeComponentStates(p2Template, 3200),
                lastMaintenance: new Date('2024-09-15'),
                nextMaintenance: new Date('2024-11-15')
            },
            {
                id: this.generateId(),
                name: 'Webmaschine Hall 1-B',
                type: 'A1',
                serial: 'FEI-A1-2024-007',
                location: 'Produktionshalle 1',
                year: 2024,
                status: 'maintenance',
                operatingHours: 1850,
                maintenanceTemplateId: a1Template.id,
                componentStates: this.initializeComponentStates(a1Template, 1850),
                lastMaintenance: new Date('2024-08-01'),
                nextMaintenance: new Date('2024-10-01')
            }
        ];

        this.data.parts = [
            { id: this.generateId(), name: 'Greifer-Set', partNumber: 'GR-001', stock: 12, minStock: 5, machineTypes: ['P2', 'P1'] },
            { id: this.generateId(), name: 'Luftdüse', partNumber: 'LD-042', stock: 3, minStock: 8, machineTypes: ['A1', 'LWV'] },
            { id: this.generateId(), name: 'Antriebsriemen', partNumber: 'AR-125', stock: 25, minStock: 10, machineTypes: ['P2', 'P1', 'A1', 'LWV'] }
        ];

        this.addNotification('Webmaschine Hall 1-B: Luftdüsen benötigen Wartung in 100 Betriebsstunden', false);
        this.addNotification('Luftdüse (LD-042) unterschreitet Mindestbestand!', true);

        this.saveData();
    }

    initializeComponentStates(template, currentHours) {
        const states = {};
        if (template && template.components) {
            template.components.forEach(component => {
                states[component.id] = {
                    currentHours: currentHours % component.intervalHours,
                    lastMaintenanceHours: currentHours - (currentHours % component.intervalHours)
                };
            });
        }
        return states;
    }

    // Maintenance Template Methods
    addMaintenanceTemplate(template) {
        template.id = this.generateId();
        template.components.forEach(comp => {
            if (!comp.id) comp.id = this.generateId();
        });
        this.data.maintenanceTemplates.push(template);
        this.saveData();
        return template;
    }

    updateMaintenanceTemplate(templateId, updates) {
        const index = this.data.maintenanceTemplates.findIndex(t => t.id === templateId);
        if (index !== -1) {
            updates.components.forEach(comp => {
                if (!comp.id) comp.id = this.generateId();
            });
            this.data.maintenanceTemplates[index] = { ...this.data.maintenanceTemplates[index], ...updates };
            this.saveData();
            return this.data.maintenanceTemplates[index];
        }
        return null;
    }

    deleteMaintenanceTemplate(templateId) {
        const machinesUsingTemplate = this.data.machines.filter(m => m.maintenanceTemplateId === templateId);
        if (machinesUsingTemplate.length > 0) {
            return { error: `Dieser Wartungsplan wird noch von ${machinesUsingTemplate.length} Maschine(n) verwendet.` };
        }
        this.data.maintenanceTemplates = this.data.maintenanceTemplates.filter(t => t.id !== templateId);
        this.saveData();
        return { success: true };
    }

    getMaintenanceTemplate(templateId) {
        return this.data.maintenanceTemplates.find(t => t.id === templateId);
    }

    assignTemplateToMachine(machineId, templateId) {
        const machine = this.getMachine(machineId);
        const template = this.getMaintenanceTemplate(templateId);
        
        if (machine && template) {
            machine.maintenanceTemplateId = templateId;
            machine.componentStates = this.initializeComponentStates(template, machine.operatingHours);
            this.saveData();
            return true;
        }
        return false;
    }

    assignTemplateToMultipleMachines(templateId, machineIds) {
        const template = this.getMaintenanceTemplate(templateId);
        if (!template) return false;

        machineIds.forEach(machineId => {
            this.assignTemplateToMachine(machineId, templateId);
        });
        return true;
    }

    // Machine Methods
    addMachine(machine) {
        machine.id = this.generateId();
        machine.qrCode = this.generateQRCodeData(machine);
        
        if (machine.maintenanceTemplateId) {
            const template = this.getMaintenanceTemplate(machine.maintenanceTemplateId);
            machine.componentStates = this.initializeComponentStates(template, machine.operatingHours || 0);
        } else {
            machine.componentStates = {};
        }
        
        this.data.machines.push(machine);
        this.saveData();
        return machine;
    }

    updateMachine(id, updates) {
        const index = this.data.machines.findIndex(m => m.id === id);
        if (index !== -1) {
            this.data.machines[index] = { ...this.data.machines[index], ...updates };
            
            // Update component states when operating hours change
            if (updates.operatingHours !== undefined) {
                const machine = this.data.machines[index];
                if (machine.maintenanceTemplateId) {
                    const template = this.getMaintenanceTemplate(machine.maintenanceTemplateId);
                    if (template) {
                        Object.keys(machine.componentStates).forEach(componentId => {
                            const component = template.components.find(c => c.id === componentId);
                            if (component) {
                                const state = machine.componentStates[componentId];
                                const hoursSinceLastMaintenance = updates.operatingHours - state.lastMaintenanceHours;
                                state.currentHours = hoursSinceLastMaintenance;
                            }
                        });
                    }
                }
            }
            
            this.saveData();
            return this.data.machines[index];
        }
        return null;
    }

    getMachine(id) {
        return this.data.machines.find(m => m.id === id);
    }

    updateComponentState(machineId, componentId, lastMaintenanceHours) {
        const machine = this.getMachine(machineId);
        if (machine && machine.componentStates[componentId]) {
            machine.componentStates[componentId].lastMaintenanceHours = lastMaintenanceHours;
            machine.componentStates[componentId].currentHours = machine.operatingHours - lastMaintenanceHours;
            this.saveData();
        }
    }

    // Parts Methods
    addPart(part) {
        part.id = this.generateId();
        this.data.parts.push(part);
        this.saveData();
        return part;
    }

    updatePart(partId, updates) {
        const index = this.data.parts.findIndex(p => p.id === partId);
        if (index !== -1) {
            this.data.parts[index] = { ...this.data.parts[index], ...updates };
            this.saveData();
            return this.data.parts[index];
        }
        return null;
    }

    deletePart(partId) {
        this.data.parts = this.data.parts.filter(p => p.id !== partId);
        this.saveData();
    }

    getPart(partId) {
        return this.data.parts.find(p => p.id === partId);
    }

    usePart(partId, quantity) {
        const part = this.data.parts.find(p => p.id === partId);
        if (part && part.stock >= quantity) {
            part.stock -= quantity;
            this.saveData();
            
            if (part.stock < part.minStock) {
                this.addNotification(`⚠️ Ersatzteil "${part.name}" unterschreitet Mindestbestand! Aktuell: ${part.stock}, Minimum: ${part.minStock}`, true);
            }
            return true;
        }
        return false;
    }

    // Maintenance History
    addMaintenanceRecord(record) {
        record.id = this.generateId();
        record.timestamp = new Date();
        this.data.maintenanceHistory.push(record);
        this.saveData();
    }

    // User Methods
    addUser(user) {
        user.id = this.generateId();
        user.created = new Date();
        this.data.users.push(user);
        this.saveData();
        return user;
    }

    deleteUser(userId) {
        this.data.users = this.data.users.filter(u => u.id !== userId);
        this.saveData();
    }

    // Machine Type Methods
    addMachineType(machineType) {
        machineType.id = this.generateId();
        this.data.machineTypes.push(machineType);
        this.saveData();
        return machineType;
    }

    deleteMachineType(typeId) {
        const machinesWithType = this.data.machines.filter(m => m.type === this.data.machineTypes.find(t => t.id === typeId)?.code);
        if (machinesWithType.length > 0) {
            return { error: `Dieser Maschinentyp wird noch von ${machinesWithType.length} Maschine(n) verwendet.` };
        }
        this.data.machineTypes = this.data.machineTypes.filter(t => t.id !== typeId);
        this.saveData();
        return { success: true };
    }

    // Notifications
    addNotification(message, urgent = false) {
        this.data.notifications.push({
            id: this.generateId(),
            message,
            urgent,
            timestamp: new Date(),
            read: false
        });
        this.saveData();
    }

    // QR Code
    generateQRCodeData(machine) {
        return JSON.stringify({
            id: machine.id,
            name: machine.name,
            type: machine.type,
            serial: machine.serial
        });
    }

    // Offline Detection
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            document.getElementById('offlineIndicator').classList.remove('show');
            this.checkServerConnection();
        });

        window.addEventListener('offline', () => {
            document.getElementById('offlineIndicator').classList.add('show');
            this.serverAvailable = false;
            isOnlineMode = false;
        });

        if (!navigator.onLine) {
            document.getElementById('offlineIndicator').classList.add('show');
        }
    }

    // Floor Plan Methods
    getFloorPlans() {
        if (!this.data.floorPlans) {
            this.data.floorPlans = [];
        }
        return this.data.floorPlans;
    }

    getFloorPlan(floorPlanId) {
        if (!this.data.floorPlans) {
            this.data.floorPlans = [];
        }
        const floorPlan = this.data.floorPlans.find(fp => fp.id === floorPlanId);
        
        // Konvertiere Server-Pfad zu vollständiger URL
        if (floorPlan && floorPlan.path && !floorPlan.image) {
            floorPlan.image = `${SERVER_URL}${floorPlan.path}`;
        }
        
        return floorPlan;
    }

    saveFloorPlanImage(floorPlanId, imageData, name) {
        if (!this.data.floorPlans) {
            this.data.floorPlans = [];
        }
        
        const existingIndex = this.data.floorPlans.findIndex(fp => fp.id === floorPlanId);
        if (existingIndex !== -1) {
            this.data.floorPlans[existingIndex].image = imageData;
            this.data.floorPlans[existingIndex].name = name;
        } else {
            this.data.floorPlans.push({
                id: floorPlanId,
                name: name,
                image: imageData,
                machinePositions: {}
            });
        }
        this.saveData();
    }

    deleteFloorPlan(floorPlanId) {
        if (!this.data.floorPlans) return;
        this.data.floorPlans = this.data.floorPlans.filter(fp => fp.id !== floorPlanId);
        this.saveData();
    }

    saveMachinePosition(floorPlanId, machineId, x, y) {
        if (!this.data.floorPlans) {
            this.data.floorPlans = [];
        }
        
        const floorPlan = this.data.floorPlans.find(fp => fp.id === floorPlanId);
        if (floorPlan) {
            if (!floorPlan.machinePositions) {
                floorPlan.machinePositions = {};
            }
            floorPlan.machinePositions[machineId] = { x, y };
            this.saveData();
        }
    }

    removeMachinePosition(floorPlanId, machineId) {
        if (!this.data.floorPlans) return;
        
        const floorPlan = this.data.floorPlans.find(fp => fp.id === floorPlanId);
        if (floorPlan && floorPlan.machinePositions) {
            delete floorPlan.machinePositions[machineId];
            this.saveData();
        }
    }

    clearAllMachinePositions(floorPlanId) {
        if (!this.data.floorPlans) return;
        
        const floorPlan = this.data.floorPlans.find(fp => fp.id === floorPlanId);
        if (floorPlan) {
            floorPlan.machinePositions = {};
            this.saveData();
        }
    }
}

// Initialize Data Manager
const dataManager = new DataManager();
let currentUser = null;
let qrScanner = null;

// Floor Plan Manager
class FloorPlanManager {
    constructor() {
        this.canvas = document.getElementById('floorPlanCanvas');
        this.wrapper = document.getElementById('floorPlanWrapper');
        this.zoomLevel = 1;
        this.minZoom = 0.25;
        this.maxZoom = 3;
        this.draggedMachine = null;
        this.offsetX = 0;
        this.offsetY = 0;
        this.currentFloorPlanId = null;
        
        this.setupEventListeners();
        this.renderFloorPlanSelector();
    }

    setupEventListeners() {
        document.getElementById('uploadFloorPlan').addEventListener('change', async (e) => {
            if (currentUser.role === 'viewer' || currentUser.role === 'technician') {
                alert('⛔ Sie haben keine Berechtigung, Hallenpläne hochzuladen.');
                e.target.value = '';
                return;
            }
            await this.handleFileUpload(e);
        });

        document.getElementById('zoomIn').addEventListener('click', () => this.zoom(0.1));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoom(-0.1));
        document.getElementById('resetZoom').addEventListener('click', () => this.resetZoom());
        document.getElementById('saveFloorPlan').addEventListener('click', () => this.savePositions());
        document.getElementById('clearFloorPlan').addEventListener('click', () => {
            if (currentUser.role === 'viewer' || currentUser.role === 'technician') {
                alert('⛔ Sie haben keine Berechtigung, Maschinenpositionen zu löschen.');
                return;
            }
            this.clearAllPositions();
        });
    }

    renderFloorPlanSelector() {
        const floorPlans = dataManager.getFloorPlans();
        const selectorContainer = document.getElementById('floorPlanSelector');
        
        if (floorPlans.length === 0) {
            selectorContainer.innerHTML = `
                <div style="padding: 12px; background: var(--gray-100); border-radius: 8px; text-align: center; color: var(--gray-600);">
                    Noch keine Hallenpläne vorhanden
                </div>
            `;
            this.loadFloorPlan(null);
            return;
        }

        selectorContainer.innerHTML = `
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <label style="font-weight: 600; color: var(--gray-700);">Hallenplan auswählen:</label>
                <select id="floorPlanSelect" style="padding: 8px 12px; border: 2px solid var(--gray-300); border-radius: 6px; font-size: 14px; width: 100%;">
                    ${floorPlans.map(fp => `
                        <option value="${fp.id}" ${fp.id === this.currentFloorPlanId ? 'selected' : ''}>
                            ${fp.name}
                        </option>
                    `).join('')}
                </select>
                ${currentUser.role === 'admin' ? `
                    <button class="btn btn-danger btn-small" id="deleteFloorPlanBtn">
                        🗑️ Hallenplan löschen
                    </button>
                ` : ''}
            </div>
        `;

        if (!this.currentFloorPlanId && floorPlans.length > 0) {
            this.currentFloorPlanId = floorPlans[0].id;
        }

        document.getElementById('floorPlanSelect').addEventListener('change', (e) => {
            this.currentFloorPlanId = e.target.value;
            this.loadFloorPlan(this.currentFloorPlanId);
        });

        if (currentUser.role === 'admin') {
            document.getElementById('deleteFloorPlanBtn').addEventListener('click', () => {
                this.deleteCurrentFloorPlan();
            });
        }

        this.loadFloorPlan(this.currentFloorPlanId);
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const name = prompt('Bitte geben Sie einen Namen für diesen Hallenplan ein:', 'Neuer Hallenplan');
        if (!name) {
            event.target.value = '';
            return;
        }

        try {
            const floorPlan = await dataManager.uploadFloorPlan(file, name);
            this.currentFloorPlanId = floorPlan.id;
            this.renderFloorPlanSelector();
            event.target.value = '';
            alert('✅ Hallenplan erfolgreich hochgeladen!');
        } catch (error) {
            console.error('Upload-Fehler:', error);
            alert('❌ Fehler beim Hochladen des Hallenplans');
            event.target.value = '';
        }
    }

    deleteCurrentFloorPlan() {
        if (!this.currentFloorPlanId) return;
        
        const floorPlan = dataManager.getFloorPlan(this.currentFloorPlanId);
        if (!floorPlan) return;

        if (confirm(`Möchten Sie den Hallenplan "${floorPlan.name}" wirklich löschen?`)) {
            dataManager.deleteFloorPlan(this.currentFloorPlanId);
            this.currentFloorPlanId = null;
            this.renderFloorPlanSelector();
            alert('🗑️ Hallenplan gelöscht!');
        }
    }

    loadFloorPlan(floorPlanId) {
        const floorPlan = dataManager.getFloorPlan(floorPlanId);
        
        if (floorPlan && (floorPlan.image || floorPlan.path)) {
            const img = new Image();
            img.onload = () => {
                this.canvas.style.backgroundImage = `url(${floorPlan.image || (SERVER_URL + floorPlan.path)})`;
                this.canvas.style.width = img.width + 'px';
                this.canvas.style.height = img.height + 'px';
                this.canvas.innerHTML = '';
                this.renderMachineMarkers(floorPlan.machinePositions || {});
            };
            img.src = floorPlan.image || (SERVER_URL + floorPlan.path);
        } else {
            this.canvas.style.backgroundImage = 'none';
            this.canvas.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: var(--gray-600);">
                    <p style="font-size: 18px; margin-bottom: 12px;">📋 Noch kein Hallenplan hochgeladen</p>
                    <p style="font-size: 14px;">Laden Sie oben einen Hallenplan hoch, um Maschinen zu positionieren.</p>
                </div>
            `;
        }
        this.renderAvailableMachines();
    }

    renderMachineMarkers(positions) {
        Object.keys(positions).forEach(machineId => {
            const machine = dataManager.getMachine(machineId);
            if (machine) {
                this.createMachineMarker(machine, positions[machineId].x, positions[machineId].y);
            }
        });
    }

    createMachineMarker(machine, x, y) {
        const marker = document.createElement('div');
        marker.className = `machine-marker status-${machine.status}`;
        marker.style.left = x + 'px';
        marker.style.top = y + 'px';
        marker.dataset.machineId = machine.id;
        
        const statusIcons = {
            'ok': '✅',
            'maintenance': '⚠️',
            'not-ok': '❌',
            'serviced': '🔧'
        };
        
        const canEdit = currentUser.role === 'admin';
        
        marker.innerHTML = `
            <span class="machine-marker-icon">${statusIcons[machine.status]}</span>
            <span>${machine.name}</span>
            ${canEdit ? `<span class="machine-marker-remove" onclick="floorPlanManager.removeMachine('${machine.id}', event)">✕</span>` : ''}
        `;

        if (canEdit) {
            marker.style.cursor = 'move';
            marker.addEventListener('mousedown', (e) => this.startDrag(e, marker));
        } else {
            marker.style.cursor = 'pointer';
        }
        
        let clickTimer = null;
        marker.addEventListener('click', (e) => {
            if (e.target.classList.contains('machine-marker-remove')) return;
            
            if (clickTimer === null) {
                clickTimer = setTimeout(() => {
                    navigateToMachine(machine.id);
                    clickTimer = null;
                }, 250);
            }
        });
        
        marker.addEventListener('dblclick', (e) => {
            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
            }
            viewMachineDetails(machine.id);
        });

        this.canvas.appendChild(marker);
    }

    startDrag(e, marker) {
        if (e.target.classList.contains('machine-marker-remove')) return;
        if (currentUser.role !== 'admin') return;
        
        e.preventDefault();
        this.draggedMachine = marker;
        marker.classList.add('dragging');
        
        const rect = marker.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        this.offsetX = e.clientX - rect.left;
        this.offsetY = e.clientY - rect.top;

        const onMouseMove = (e) => {
            if (!this.draggedMachine) return;
            
            const canvasRect = this.canvas.getBoundingClientRect();
            let newX = (e.clientX - canvasRect.left - this.offsetX) / this.zoomLevel;
            let newY = (e.clientY - canvasRect.top - this.offsetY) / this.zoomLevel;
            
            newX = Math.max(0, Math.min(newX, this.canvas.offsetWidth - marker.offsetWidth));
            newY = Math.max(0, Math.min(newY, this.canvas.offsetHeight - marker.offsetHeight));
            
            this.draggedMachine.style.left = newX + 'px';
            this.draggedMachine.style.top = newY + 'px';
        };

        const onMouseUp = () => {
            if (this.draggedMachine) {
                this.draggedMachine.classList.remove('dragging');
                
                const machineId = this.draggedMachine.dataset.machineId;
                const x = parseInt(this.draggedMachine.style.left);
                const y = parseInt(this.draggedMachine.style.top);
                dataManager.saveMachinePosition(this.currentFloorPlanId, machineId, x, y);
                
                this.draggedMachine = null;
            }
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    removeMachine(machineId, event) {
        event.stopPropagation();
        
        if (currentUser.role !== 'admin') {
            alert('⛔ Sie haben keine Berechtigung, Maschinen zu entfernen.');
            return;
        }
        
        if (confirm('Möchten Sie diese Maschine vom Hallenplan entfernen?')) {
            dataManager.removeMachinePosition(this.currentFloorPlanId, machineId);
            this.loadFloorPlan(this.currentFloorPlanId);
        }
    }

    placeMachine(machineId) {
        if (currentUser.role !== 'admin') {
            alert('⛔ Sie haben keine Berechtigung, Maschinen zu platzieren.');
            return;
        }

        if (!this.currentFloorPlanId) {
            alert('⚠️ Bitte wählen Sie zuerst einen Hallenplan aus.');
            return;
        }

        const machine = dataManager.getMachine(machineId);
        if (!machine) return;

        const floorPlan = dataManager.getFloorPlan(this.currentFloorPlanId);
        const positions = floorPlan ? floorPlan.machinePositions : {};

        if (positions && positions[machineId]) {
            alert('Diese Maschine ist bereits in diesem Hallenplan platziert!');
            return;
        }

        const scrollLeft = this.wrapper.scrollLeft;
        const scrollTop = this.wrapper.scrollTop;
        const centerX = (scrollLeft + this.wrapper.clientWidth / 2) / this.zoomLevel - 80;
        const centerY = (scrollTop + this.wrapper.clientHeight / 2) / this.zoomLevel - 20;

        dataManager.saveMachinePosition(this.currentFloorPlanId, machineId, centerX, centerY);
        this.createMachineMarker(machine, centerX, centerY);
        this.renderAvailableMachines();
    }

    renderAvailableMachines() {
        const container = document.getElementById('availableMachinesList');
        const machines = dataManager.data.machines;
        
        const floorPlan = dataManager.getFloorPlan(this.currentFloorPlanId);
        const placedMachines = floorPlan && floorPlan.machinePositions ? Object.keys(floorPlan.machinePositions) : [];
        const canEdit = currentUser.role === 'admin';

        container.innerHTML = machines.map(machine => {
            const isPlaced = placedMachines.includes(machine.id);
            const clickHandler = !isPlaced && canEdit ? `floorPlanManager.placeMachine('${machine.id}')` : '';
            return `
                <div class="available-machine-item ${isPlaced ? 'placed' : ''} ${!canEdit ? 'disabled' : ''}" 
                     onclick="${clickHandler}">
                    ${machine.name} (${machine.type})
                    ${isPlaced ? ' ✓' : ''}
                </div>
            `;
        }).join('');
    }

    zoom(delta) {
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + delta));
        if (newZoom !== this.zoomLevel) {
            this.zoomLevel = newZoom;
            this.applyZoom();
        }
    }

    resetZoom() {
        this.zoomLevel = 1;
        this.applyZoom();
    }

    applyZoom() {
        this.canvas.style.transform = `scale(${this.zoomLevel})`;
        this.canvas.style.transformOrigin = 'top left';
        document.getElementById('zoomLevel').textContent = Math.round(this.zoomLevel * 100) + '%';
    }

    savePositions() {
        alert('✅ Positionen werden automatisch gespeichert!');
    }

    clearAllPositions() {
        if (!this.currentFloorPlanId) return;
        
        const floorPlan = dataManager.getFloorPlan(this.currentFloorPlanId);
        if (!floorPlan) return;
        
        if (confirm(`Möchten Sie alle Maschinenpositionen im Hallenplan "${floorPlan.name}" wirklich entfernen?`)) {
            dataManager.clearAllMachinePositions(this.currentFloorPlanId);
            this.loadFloorPlan(this.currentFloorPlanId);
            alert('🗑️ Alle Positionen entfernt!');
        }
    }
}

let floorPlanManager;

// Authentication
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const user = await dataManager.authenticateUser(username, password);
    
    if (user) {
        currentUser = {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            email: user.email
        };
        login();
    } else {
        alert('❌ Ungültige Anmeldedaten!\n\nDemo-Zugänge:\n• admin / admin\n• tech / tech\n• viewer / viewer');
    }
});

function login() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appScreen').classList.remove('hidden');
    document.getElementById('currentUser').textContent = currentUser.name;
    document.getElementById('currentRole').textContent = getRoleLabel(currentUser.role);
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0);
    
    if (currentUser.role !== 'admin') {
        document.getElementById('usersTab').style.display = 'none';
        document.getElementById('machineTypesTab').style.display = 'none';
        const uploadLabel = document.getElementById('uploadLabel');
        if (uploadLabel) {
            uploadLabel.style.display = 'none';
        }
    } else {
        document.getElementById('usersTab').style.display = 'block';
        document.getElementById('machineTypesTab').style.display = 'block';
    }
    
    // Zeige Server-Status
    const statusText = dataManager.serverAvailable ? 'Online (Server)' : 'Offline (Lokal)';
    const statusColor = dataManager.serverAvailable ? 'var(--success-color)' : 'var(--warning-color)';
    const statusBadge = document.createElement('span');
    statusBadge.style.cssText = `
        background: ${statusColor};
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        margin-left: 8px;
    `;
    statusBadge.textContent = statusText;
    document.getElementById('currentRole').appendChild(statusBadge);
    
    updateCurrentDate();
    renderDashboard();
    renderMachines();
    renderParts();
    renderNotifications();
    renderMaintenanceTemplates();
    updateLocationFilter();
    updateMachineTypeSelects();
    if (currentUser.role === 'admin') {
        renderUsers();
        renderMachineTypes();
    }
    
    floorPlanManager = new FloorPlanManager();
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    currentUser = null;
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appScreen').classList.add('hidden');
    document.getElementById('loginForm').reset();
    
    // Stoppe Auto-Sync
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
});

function getRoleLabel(role) {
    const labels = {
        'admin': 'Administrator',
        'technician': 'Techniker',
        'viewer': 'Betrachter'
    };
    return labels[role] || role;
}

// Date Update
function updateCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('de-DE', options);
}

// Tab Navigation
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tabName).classList.add('active');
        
        if (tabName === 'floor-plan' && floorPlanManager) {
            floorPlanManager.renderAvailableMachines();
        }
        if (tabName === 'maintenance-templates') {
            renderMaintenanceTemplates();
        }
    });
});

// Dashboard
function renderDashboard() {
    const machines = dataManager.data.machines;
    const stats = {
        maintenance: machines.filter(m => m.status === 'maintenance').length,
        ok: machines.filter(m => m.status === 'ok').length,
        notOk: machines.filter(m => m.status === 'not-ok').length,
        serviced: machines.filter(m => m.status === 'serviced').length
    };

    document.getElementById('statMaintenance').textContent = stats.maintenance;
    document.getElementById('statOk').textContent = stats.ok;
    document.getElementById('statNotOk').textContent = stats.notOk;
    document.getElementById('statServiced').textContent = stats.serviced;
    
    document.querySelectorAll('.stat-card').forEach(card => {
        card.onclick = null;
    });
    
    document.querySelector('.stat-maintenance').onclick = () => filterByStatus('maintenance');
    document.querySelector('.stat-ok').onclick = () => filterByStatus('ok');
    document.querySelector('.stat-not-ok').onclick = () => filterByStatus('not-ok');
    document.querySelector('.stat-serviced').onclick = () => filterByStatus('serviced');
}

function filterByStatus(status) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="machines"]').classList.add('active');
    document.getElementById('machines').classList.add('active');
    
    document.getElementById('filterStatus').value = status;
    renderMachines();
}

function renderNotifications() {
    const container = document.getElementById('notificationsList');
    const notifications = dataManager.data.notifications.slice(0, 5);

    if (notifications.length === 0) {
        container.innerHTML = '<p style="color: var(--gray-600);">Keine neuen Benachrichtigungen</p>';
        return;
    }

    container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.urgent ? 'urgent' : ''}">
            <div>${notif.urgent ? '🚨' : 'ℹ️'} ${notif.message}</div>
            <div class="notification-time">${formatDate(notif.timestamp)}</div>
        </div>
    `).join('');
}

// Machines
function renderMachines() {
    const container = document.getElementById('machinesGrid');
    const searchTerm = document.getElementById('searchMachines').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;
    const typeFilter = document.getElementById('filterType').value;
    const locationFilter = document.getElementById('filterLocation').value;

    let machines = dataManager.data.machines.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchTerm) ||
                            m.serial.toLowerCase().includes(searchTerm) ||
                            m.location.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
        const matchesType = typeFilter === 'all' || m.type === typeFilter;
        const matchesLocation = locationFilter === 'all' || m.location === locationFilter;
        return matchesSearch && matchesStatus && matchesType && matchesLocation;
    });

    if (machines.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gray-600);">Keine Maschinen gefunden</p>';
        return;
    }

    container.innerHTML = machines.map(machine => {
        const template = machine.maintenanceTemplateId ? dataManager.getMaintenanceTemplate(machine.maintenanceTemplateId) : null;
        let nextMaintenanceHours = Infinity;
        
        if (template && template.components && machine.componentStates) {
            template.components.forEach(component => {
                const state = machine.componentStates[component.id];
                if (state) {
                    const remaining = component.intervalHours - state.currentHours;
                    if (remaining < nextMaintenanceHours) {
                        nextMaintenanceHours = remaining;
                    }