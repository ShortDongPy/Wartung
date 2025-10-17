// Feiler Wartungssoftware
// Main JavaScript Application

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

// Set theme on load
setTheme(currentTheme);

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
}

// Data Manager Class
class DataManager {
    constructor() {
        this.storageKey = 'dornierMaintenanceDataEnhanced';
        this.loadData();
        this.setupOfflineDetection();
    }

    loadData() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            this.data = JSON.parse(stored);
            
            // Ensure all data structures exist
            if (!this.data.maintenanceTemplates) this.data.maintenanceTemplates = [];
            if (!this.data.users || this.data.users.length === 0) this.initializeDefaultUsers();
            if (!this.data.machineTypes || this.data.machineTypes.length === 0) this.initializeDefaultMachineTypes();
            if (!this.data.floorPlans) this.data.floorPlans = [];
            
            // Migrate old machines to new structure
            if (this.data.machines) {
                this.data.machines.forEach(machine => {
                    if (!machine.componentStates) {
                        machine.componentStates = {};
                    }
                    if (!machine.maintenanceTemplateId) {
                        machine.maintenanceTemplateId = null;
                    }
                });
            }
        } else {
            this.data = {
                machines: [],
                parts: [],
                maintenanceHistory: [],
                notifications: [],
                pendingSync: [],
                users: [],
                machineTypes: [],
                maintenanceTemplates: [],
                floorPlans: []
            };
            this.initializeSampleData();
        }
        this.saveData();
    }

    initializeDefaultUsers() {
        this.data.users = [
            { id: this.generateId(), username: 'admin', password: 'admin', name: 'Administrator', email: 'admin@dornier.com', role: 'admin', created: new Date() },
            { id: this.generateId(), username: 'tech', password: 'tech', name: 'Techniker', email: 'tech@dornier.com', role: 'technician', created: new Date() },
            { id: this.generateId(), username: 'viewer', password: 'viewer', name: 'Betrachter', email: 'viewer@dornier.com', role: 'viewer', created: new Date() }
        ];
    }

    initializeDefaultMachineTypes() {
        this.data.machineTypes = [
            { id: this.generateId(), code: 'P2', name: 'Greiferwebmaschine P2', description: 'Modernste Generation der Greiferwebmaschinen' },
            { id: this.generateId(), code: 'P1', name: 'Greiferwebmaschine P1', description: 'Bewährte Greiferwebmaschine' },
            { id: this.generateId(), code: 'A1', name: 'Luftwebmaschine A1', description: 'Mit ServoControl® Technologie' },
            { id: this.generateId(), code: 'LWV', name: 'Luftwebmaschine LWV', description: 'Für spezielle Anwendungen' }
        ];
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

        // Initialize machines with component states
        const p2Template = this.data.maintenanceTemplates[0];
        const a1Template = this.data.maintenanceTemplates[1];

        this.data.machines = [
            {
                id: this.generateId(),
                name: 'Webmaschine Hall 1-A',
                type: 'P2',
                serial: 'DOR-P2-2021-001',
                location: 'Produktionshalle 1',
                year: 2021,
                status: 'ok',
                operatingHours: 3200,
                maintenanceTemplateId: p2Template.id,
                componentStates: this.initializeComponentStates(p2Template, 3200),
                lastMaintenance: new Date('2025-09-15'),
                nextMaintenance: new Date('2025-11-15')
            },
            {
                id: this.generateId(),
                name: 'Webmaschine Hall 1-B',
                type: 'A1',
                serial: 'DOR-A1-2022-007',
                location: 'Produktionshalle 1',
                year: 2022,
                status: 'maintenance',
                operatingHours: 1850,
                maintenanceTemplateId: a1Template.id,
                componentStates: this.initializeComponentStates(a1Template, 1850),
                lastMaintenance: new Date('2025-08-01'),
                nextMaintenance: new Date('2025-10-01')
            },
            {
                id: this.generateId(),
                name: 'Webmaschine Hall 2-A',
                type: 'P1',
                serial: 'DOR-P1-2020-015',
                location: 'Produktionshalle 2',
                year: 2020,
                status: 'not-ok',
                operatingHours: 8200,
                maintenanceTemplateId: null,
                componentStates: {},
                lastMaintenance: new Date('2025-07-10'),
                nextMaintenance: new Date('2025-09-10')
            },
            {
                id: this.generateId(),
                name: 'Webmaschine Hall 2-B',
                type: 'A1',
                serial: 'DOR-A1-2023-003',
                location: 'Produktionshalle 2',
                year: 2023,
                status: 'serviced',
                operatingHours: 1200,
                maintenanceTemplateId: a1Template.id,
                componentStates: this.initializeComponentStates(a1Template, 1200),
                lastMaintenance: new Date('2025-10-05'),
                nextMaintenance: new Date('2025-12-05')
            }
        ];

        this.data.parts = [
            { id: this.generateId(), name: 'Greifer-Set', partNumber: 'GR-001', stock: 12, minStock: 5, machineTypes: ['P2', 'P1'] },
            { id: this.generateId(), name: 'Luftdüse', partNumber: 'LD-042', stock: 3, minStock: 8, machineTypes: ['A1', 'LWV'] },
            { id: this.generateId(), name: 'Antriebsriemen', partNumber: 'AR-125', stock: 25, minStock: 10, machineTypes: ['P2', 'P1', 'A1', 'LWV'] },
            { id: this.generateId(), name: 'Webblatt', partNumber: 'WB-200', stock: 8, minStock: 4, machineTypes: ['P2', 'P1', 'A1'] },
            { id: this.generateId(), name: 'Schussfadenklemme', partNumber: 'SK-078', stock: 15, minStock: 6, machineTypes: ['A1', 'LWV'] }
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

    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    generateId() {
        return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
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

    authenticateUser(username, password) {
        return this.data.users.find(u => u.username === username && u.password === password);
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
            this.syncPendingData();
        });

        window.addEventListener('offline', () => {
            document.getElementById('offlineIndicator').classList.add('show');
        });

        if (!navigator.onLine) {
            document.getElementById('offlineIndicator').classList.add('show');
        }
    }

    syncPendingData() {
        console.log('Syncing pending data...', this.data.pendingSync);
        this.data.pendingSync = [];
        this.saveData();
    }

    // Floor Plan Methods
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
        return this.data.floorPlans.find(fp => fp.id === floorPlanId);
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
        document.getElementById('uploadFloorPlan').addEventListener('change', (e) => {
            if (currentUser.role === 'viewer' || currentUser.role === 'technician') {
                alert('⛔ Sie haben keine Berechtigung, Hallenpläne hochzuladen.');
                e.target.value = '';
                return;
            }
            this.handleFileUpload(e);
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
                    <button class="btn btn-danger btn-small" id="deleteFloorPlanBtn" >
                        Löschen Hallenplan löschen
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

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const name = prompt('Bitte geben Sie einen Namen für diesen Hallenplan ein:', 'Neuer Hallenplan');
        if (!name) {
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            const newId = 'fp-' + Date.now();
            dataManager.saveFloorPlanImage(newId, imageData, name);
            this.currentFloorPlanId = newId;
            this.renderFloorPlanSelector();
            event.target.value = '';
            alert('✅ Hallenplan erfolgreich hochgeladen!');
        };
        reader.readAsDataURL(file);
    }

    deleteCurrentFloorPlan() {
        if (!this.currentFloorPlanId) return;
        
        const floorPlan = dataManager.getFloorPlan(this.currentFloorPlanId);
        if (!floorPlan) return;

        if (confirm(`Möchten Sie den Hallenplan "${floorPlan.name}" wirklich löschen?`)) {
            dataManager.deleteFloorPlan(this.currentFloorPlanId);
            this.currentFloorPlanId = null;
            this.renderFloorPlanSelector();
            alert('Löschen Hallenplan gelöscht!');
        }
    }

    loadFloorPlan(floorPlanId) {
        const floorPlan = dataManager.getFloorPlan(floorPlanId);
        
        if (floorPlan && floorPlan.image) {
            const img = new Image();
            img.onload = () => {
                this.canvas.style.backgroundImage = `url(${floorPlan.image})`;
                this.canvas.style.width = img.width + 'px';
                this.canvas.style.height = img.height + 'px';
                this.canvas.innerHTML = '';
                this.renderMachineMarkers(floorPlan.machinePositions || {});
            };
            img.src = floorPlan.image;
        } else {
            this.canvas.style.backgroundImage = 'none';
            this.canvas.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: var(--gray-600);">
                    <p style="font-size: 18px; margin-bottom: 12px;"> Noch kein Hallenplan hochgeladen</p>
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
            alert('Löschen Alle Positionen entfernt!');
        }
    }
}

let floorPlanManager;

// Authentication
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Check if users exist, if not initialize
    if (!dataManager.data.users || dataManager.data.users.length === 0) {
        console.log('No users found, initializing default users...');
        dataManager.initializeDefaultUsers();
        dataManager.saveData();
    }

    const user = dataManager.authenticateUser(username, password);
    
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
        alert('❌ Ungültige Anmeldedaten!\n\nDemo-Zugänge:\n• admin / admin\n• tech / tech\n• viewer / viewer\n\nFalls das Problem weiterhin besteht, klicken Sie auf "Datenbank zurücksetzen" unten.');
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
                }
            });
        }

        const maintenanceProgress = nextMaintenanceHours === Infinity ? 0 : 
            Math.min(100, ((machine.operatingHours % 500) / 500) * 100);

        return `
            <div class="machine-card" id="machine-card-${machine.id}">
                <div class="machine-header">
                    <div>
                        <div class="machine-name">${machine.name}</div>
                        <div class="machine-id">${machine.serial}</div>
                    </div>
                    <span class="status-badge status-${machine.status}">
                        ${getStatusLabel(machine.status)}
                    </span>
                </div>
                <div class="machine-info">
                    <div><span>Typ:</span> <strong>${machine.type}</strong></div>
                    <div><span>Standort:</span> <strong>${machine.location}</strong></div>
                    <div><span>Betriebsstunden:</span> <strong>${machine.operatingHours}h</strong></div>
                    ${nextMaintenanceHours !== Infinity ? 
                        `<div><span>Nächste Wartung:</span> <strong>${nextMaintenanceHours}h</strong></div>` :
                        `<div><span>Nächste Wartung:</span> <strong>Nicht definiert</strong></div>`
                    }
                </div>
                ${template ? `
                    <div style="font-size: 12px; color: var(--gray-600); margin: 8px 0; padding: 8px; background: var(--gray-100); border-radius: 6px;">
                         ${template.name}
                    </div>
                ` : ''}
                <div style="background: var(--gray-200); height: 6px; border-radius: 3px; overflow: hidden; margin: 12px 0;">
                    <div style="background: ${maintenanceProgress > 90 ? 'var(--danger-color)' : maintenanceProgress > 70 ? 'var(--warning-color)' : 'var(--success-color)'}; height: 100%; width: ${maintenanceProgress}%; transition: width 0.3s;"></div>
                </div>
                <div class="machine-actions">
                    <button class="btn btn-primary btn-small" onclick="viewMachineDetails('${machine.id}')">Details</button>
                    <button class="btn btn-warning btn-small" onclick="startMaintenance('${machine.id}')">Wartung</button>
                    <button class="btn btn-secondary btn-small" onclick="showQRCode('${machine.id}')">QR-Code</button>
                </div>
            </div>
        `;
    }).join('');
}

function navigateToMachine(machineId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="machines"]').classList.add('active');
    document.getElementById('machines').classList.add('active');
    
    document.getElementById('searchMachines').value = '';
    document.getElementById('filterStatus').value = 'all';
    document.getElementById('filterType').value = 'all';
    document.getElementById('filterLocation').value = 'all';
    
    renderMachines();
    
    setTimeout(() => {
        const machineCard = document.getElementById(`machine-card-${machineId}`);
        if (machineCard) {
            machineCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            machineCard.style.transition = 'all 0.3s ease';
            machineCard.style.boxShadow = '0 0 0 4px var(--primary-color)';
            machineCard.style.transform = 'scale(1.02)';
            
            setTimeout(() => {
                machineCard.style.boxShadow = '';
                machineCard.style.transform = '';
            }, 2000);
        }
    }, 100);
}

document.getElementById('searchMachines').addEventListener('input', renderMachines);
document.getElementById('filterStatus').addEventListener('change', renderMachines);
document.getElementById('filterType').addEventListener('change', renderMachines);
document.getElementById('filterLocation').addEventListener('change', renderMachines);

function updateLocationFilter() {
    const locations = [...new Set(dataManager.data.machines.map(m => m.location))];
    const select = document.getElementById('filterLocation');
    select.innerHTML = '<option value="all">Alle Standorte</option>' +
        locations.map(loc => `<option value="${loc}">${loc}</option>`).join('');
}

function getStatusLabel(status) {
    const labels = {
        'maintenance': 'Wartungsbedürftig',
        'ok': 'In Ordnung',
        'not-ok': 'Nicht in Ordnung',
        'serviced': 'Gewartet'
    };
    return labels[status] || status;
}

// Add Machine
document.getElementById('addMachineBtn').addEventListener('click', () => {
    if (currentUser.role === 'viewer') {
        alert('Sie haben keine Berechtigung, Maschinen hinzuzufügen.');
        return;
    }
    updateMachineTypeSelects();
    updateTemplateSelect('machineTemplateSelect');
    document.getElementById('addMachineModal').classList.add('active');
});

document.getElementById('addMachineForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const machine = {
        name: document.getElementById('machineName').value,
        type: document.getElementById('machineType').value,
        serial: document.getElementById('machineSerial').value,
        location: document.getElementById('machineLocation').value,
        year: parseInt(document.getElementById('machineYear').value),
        status: 'ok',
        operatingHours: 0,
        maintenanceTemplateId: document.getElementById('machineTemplateSelect').value || null,
        lastMaintenance: new Date(),
        nextMaintenance: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    };

    dataManager.addMachine(machine);
    closeModal('addMachineModal');
    document.getElementById('addMachineForm').reset();
    renderMachines();
    renderDashboard();
    updateLocationFilter();
    if (floorPlanManager) {
        floorPlanManager.renderAvailableMachines();
    }
    alert('✅ Maschine erfolgreich hinzugefügt!');
});

// Machine Details
function viewMachineDetails(machineId) {
    const machine = dataManager.getMachine(machineId);
    if (!machine) return;

    const maintenanceHistory = dataManager.data.maintenanceHistory
        .filter(h => h.machineId === machineId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const template = machine.maintenanceTemplateId ? dataManager.getMaintenanceTemplate(machine.maintenanceTemplateId) : null;

    let componentsHtml = '';
    if (template && template.components) {
        componentsHtml = `
            <div style="background: var(--gray-100); padding: 16px; border-radius: 8px; margin-top: 16px;">
                <h4 style="margin-bottom: 12px;">🔧 Wartungskomponenten Status</h4>
                ${template.components.map(component => {
                    const state = machine.componentStates[component.id];
                    if (!state) return '';
                    
                    const progress = (state.currentHours / component.intervalHours) * 100;
                    const progressClass = progress > 90 ? 'progress-danger' : progress > 70 ? 'progress-warning' : 'progress-ok';
                    const remaining = component.intervalHours - state.currentHours;
                    
                    return `
                        <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <strong>${component.name}</strong>
                                <span class="badge badge-${progress > 90 ? 'danger' : progress > 70 ? 'warning' : 'success'}">
                                    ${remaining}h verbleibend
                                </span>
                            </div>
                            <div style="font-size: 12px; color: var(--gray-600); margin-bottom: 8px;">
                                Intervall: ${component.intervalHours}h | Kategorie: ${component.category}
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill ${progressClass}" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    document.getElementById('machineDetailsTitle').textContent = machine.name;
    document.getElementById('machineDetailsContent').innerHTML = `
        <div style="display: grid; gap: 16px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                    <div style="color: var(--gray-600); font-size: 13px;">Seriennummer</div>
                    <div style="font-weight: 600; margin-top: 4px;">${machine.serial}</div>
                </div>
                <div>
                    <div style="color: var(--gray-600); font-size: 13px;">Maschinentyp</div>
                    <div style="font-weight: 600; margin-top: 4px;">${machine.type}</div>
                </div>
                <div>
                    <div style="color: var(--gray-600); font-size: 13px;">Baujahr</div>
                    <div style="font-weight: 600; margin-top: 4px;">${machine.year}</div>
                </div>
                <div>
                    <div style="color: var(--gray-600); font-size: 13px;">Standort</div>
                    <div style="font-weight: 600; margin-top: 4px;">${machine.location}</div>
                </div>
                <div>
                    <div style="color: var(--gray-600); font-size: 13px;">Status</div>
                    <div style="font-weight: 600; margin-top: 4px;">${getStatusLabel(machine.status)}</div>
                </div>
                <div>
                    <div style="color: var(--gray-600); font-size: 13px;">Betriebsstunden</div>
                    <div style="font-weight: 600; margin-top: 4px;">${machine.operatingHours}h</div>
                </div>
            </div>

            <div style="background: var(--gray-100); padding: 16px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4>Zugewiesener Wartungsplan</h4>
                    ${currentUser.role !== 'viewer' ? `
                        <button class="btn btn-info btn-small" onclick="openAssignTemplate('${machine.id}')">
                            Wartungsplan ändern
                        </button>
                    ` : ''}
                </div>
                ${template ? `
                    <div style="padding: 12px; background: white; border-radius: 6px;">
                        <strong>${template.name}</strong><br>
                        <span style="font-size: 13px; color: var(--gray-600);">${template.description || 'Keine Beschreibung'}</span>
                    </div>
                ` : '<div style="color: var(--gray-600);">Kein Wartungsplan zugewiesen</div>'}
            </div>

            ${componentsHtml}

            <div>
                <h4 style="margin-bottom: 12px;"> Wartungshistorie</h4>
                ${maintenanceHistory.length > 0 ? `
                    <div style="display: grid; gap: 12px; max-height: 400px; overflow-y: auto;">
                        ${maintenanceHistory.map(h => `
                            <div style="background: var(--gray-100); padding: 16px; border-radius: 8px; border-left: 4px solid var(--primary-color);">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                    <div>
                                        <div style="font-weight: 600; font-size: 15px;">${formatDate(h.timestamp)}</div>
                                        <div style="font-size: 13px; color: var(--gray-600); margin-top: 2px;">
                                            Durchgeführt von: ${h.technician}
                                        </div>
                                    </div>
                                </div>
                                ${h.notes ? `
                                    <div style="background: white; padding: 10px; border-radius: 6px; margin-top: 8px; font-size: 13px;">
                                        <strong>Notizen:</strong> ${h.notes}
                                    </div>
                                ` : ''}
                                <div style="margin-top: 8px; font-size: 12px; color: var(--gray-600);">
                                    Betriebsstunden: ${h.operatingHours}h
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p style="color: var(--gray-600); text-align: center; padding: 20px;">Keine Wartungshistorie vorhanden</p>'}
            </div>

            <div style="display: flex; gap: 12px; margin-top: 16px;">
                <button class="btn btn-warning" onclick="startMaintenance('${machine.id}'); closeModal('machineDetailsModal');" style="flex: 1;">Wartung starten</button>
                <button class="btn btn-secondary" onclick="closeModal('machineDetailsModal')" style="flex: 1;">Schließen</button>
            </div>
        </div>
    `;

    document.getElementById('machineDetailsModal').classList.add('active');
}

// Maintenance
function startMaintenance(machineId) {
    if (currentUser.role === 'viewer') {
        alert('Sie haben keine Berechtigung, Wartungen durchzuführen.');
        return;
    }

    const machine = dataManager.getMachine(machineId);
    if (!machine) return;

    const template = machine.maintenanceTemplateId ? dataManager.getMaintenanceTemplate(machine.maintenanceTemplateId) : null;
    const availableParts = dataManager.data.parts.filter(p => p.stock > 0 && p.machineTypes.includes(machine.type));

    let componentsHtml = '';
    if (template && template.components) {
        componentsHtml = `
            <div style="background: var(--gray-100); padding: 20px; border-radius: 12px; margin: 20px 0;">
                <h4 style="margin-bottom: 16px;">🔧 Wartungskomponenten</h4>
                ${template.components.map((component, idx) => {
                    const state = machine.componentStates[component.id];
                    const progress = state ? (state.currentHours / component.intervalHours) * 100 : 0;
                    const needsMaintenance = progress > 80;
                    
                    return `
                        <div class="component-item" style="position: relative; ${needsMaintenance ? 'border-color: var(--warning-color);' : ''}">
                            <div class="component-header">
                                <div>
                                    <input type="checkbox" id="component-${idx}" data-component="${component.id}" style="width: 20px; height: 20px; margin-right: 12px;">
                                    <label for="component-${idx}" style="font-weight: 600; font-size: 15px;">
                                        ${component.name}
                                        ${needsMaintenance ? '<span style="color: var(--warning-color); margin-left: 8px;">⚠️ Wartung empfohlen</span>' : ''}
                                    </label>
                                </div>
                                <span class="badge badge-${progress > 90 ? 'danger' : progress > 70 ? 'warning' : 'success'}">
                                    ${state ? Math.max(0, component.intervalHours - state.currentHours) : component.intervalHours}h verbleibend
                                </span>
                            </div>
                            <div style="font-size: 13px; color: var(--gray-600); margin: 8px 0 8px 32px;">
                                Kategorie: ${component.category} | Intervall: ${component.intervalHours}h
                            </div>
                            ${component.tasks && component.tasks.length > 0 ? `
                                <div style="margin-left: 32px; font-size: 12px; color: var(--gray-600);">
                                    Aufgaben: ${component.tasks.join(', ')}
                                </div>
                            ` : ''}
                            <div class="progress-bar" style="margin-left: 32px; margin-top: 8px;">
                                <div class="progress-fill ${progress > 90 ? 'progress-danger' : progress > 70 ? 'progress-warning' : 'progress-ok'}" 
                                     style="width: ${progress}%"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    document.getElementById('maintenanceContent').innerHTML = `
        <div>
            <h4 style="margin-bottom: 8px;">${machine.name}</h4>
            <p style="color: var(--gray-600); margin-bottom: 24px;">
                Seriennummer: ${machine.serial} | Typ: ${machine.type} | Betriebsstunden: ${machine.operatingHours}h
            </p>

            ${template ? componentsHtml : '<p style="color: var(--warning-color); padding: 16px; background: rgba(245, 158, 11, 0.1); border-radius: 8px;">⚠️ Kein Wartungsplan zugewiesen. Bitte weisen Sie einen Wartungsplan zu, um komponentenbasierte Wartung durchzuführen.</p>'}

            <div style="margin-top: 24px; padding: 16px; background: var(--gray-100); border-radius: 8px;">
                <h4 style="margin-bottom: 12px;">Verwendete Ersatzteile</h4>
                <div id="partsUsageContainer">
                    ${availableParts.length > 0 ? `
                        ${availableParts.map(part => `
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 12px; background: white; border-radius: 6px;">
                                <input type="checkbox" id="part-${part.id}" data-part-id="${part.id}" style="width: 18px; height: 18px;">
                                <label for="part-${part.id}" style="flex: 1; cursor: pointer;">
                                    <strong>${part.name}</strong> (${part.partNumber})
                                    <br>
                                    <span style="font-size: 12px; color: var(--gray-600);">
                                        Verfügbar: ${part.stock} Stück
                                    </span>
                                </label>
                                <input type="number" id="qty-${part.id}" min="1" max="${part.stock}" value="1" 
                                       style="width: 70px; padding: 6px; border: 1px solid var(--gray-300); border-radius: 4px;" 
                                       disabled>
                            </div>
                        `).join('')}
                    ` : '<p style="color: var(--gray-600); text-align: center;">Keine Ersatzteile auf Lager</p>'}
                </div>
            </div>

            <div class="form-group" style="margin-top: 24px;">
                <label>Notizen zur Wartung</label>
                <textarea id="maintenanceNotes" rows="4" placeholder="Besondere Vorkommnisse, Beobachtungen, etc."></textarea>
            </div>

            <div class="form-group">
                <label>Neue Betriebsstunden</label>
                <input type="number" id="newOperatingHours" value="${machine.operatingHours}" min="${machine.operatingHours}">
            </div>

            <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button class="btn btn-success" onclick="completeMaintenance('${machineId}')" style="flex: 1;">
                    Wartung abschließen
                </button>
                <button class="btn btn-secondary" onclick="closeModal('maintenanceModal')" style="flex: 1;">
                    Abbrechen
                </button>
            </div>
        </div>
    `;

    document.getElementById('maintenanceModal').classList.add('active');
    
    // Enable/disable part quantity inputs
    availableParts.forEach(part => {
        const checkbox = document.getElementById(`part-${part.id}`);
        const qtyInput = document.getElementById(`qty-${part.id}`);
        if (checkbox && qtyInput) {
            checkbox.addEventListener('change', (e) => {
                qtyInput.disabled = !e.target.checked;
            });
        }
    });
}

function completeMaintenance(machineId) {
    const machine = dataManager.getMachine(machineId);
    const template = machine.maintenanceTemplateId ? dataManager.getMaintenanceTemplate(machine.maintenanceTemplateId) : null;
    
    const componentCheckboxes = document.querySelectorAll('input[type="checkbox"][data-component]');
    const completedComponents = [];
    
    componentCheckboxes.forEach(cb => {
        if (cb.checked) {
            completedComponents.push(cb.dataset.component);
        }
    });

    if (completedComponents.length === 0 && template) {
        alert('Bitte markieren Sie mindestens eine gewartete Komponente.');
        return;
    }

    const notes = document.getElementById('maintenanceNotes').value;
    const newHours = parseInt(document.getElementById('newOperatingHours').value);

    // Handle parts usage
    const partsUsed = [];
    const partCheckboxes = document.querySelectorAll('input[type="checkbox"][data-part-id]');
    
    for (let checkbox of partCheckboxes) {
        if (checkbox.checked) {
            const partId = checkbox.dataset.partId;
            const qtyInput = document.getElementById(`qty-${partId}`);
            const quantity = qtyInput ? parseInt(qtyInput.value) : 1;
            
            if (quantity > 0) {
                const success = dataManager.usePart(partId, quantity);
                if (success) {
                    partsUsed.push({ partId, quantity });
                } else {
                    const part = dataManager.data.parts.find(p => p.id === partId);
                    alert(`Nicht genügend Bestand für ${part ? part.name : 'Ersatzteil'}!`);
                    return;
                }
            }
        }
    }

    // Update component states
    completedComponents.forEach(componentId => {
        dataManager.updateComponentState(machineId, componentId, newHours);
    });

    // Update machine
    dataManager.updateMachine(machineId, {
        status: 'serviced',
        operatingHours: newHours,
        lastMaintenance: new Date(),
        nextMaintenance: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    });

    // Add maintenance record
    dataManager.addMaintenanceRecord({
        machineId,
        technician: currentUser.name,
        tasksCompleted: completedComponents.length,
        componentsServiced: completedComponents,
        notes,
        operatingHours: newHours,
        partsUsed: partsUsed.length > 0 ? partsUsed : null
    });

    closeModal('maintenanceModal');
    renderMachines();
    renderDashboard();
    renderParts();
    alert(`✅ Wartung erfolgreich abgeschlossen!\n${completedComponents.length} Komponente(n) gewartet${partsUsed.length > 0 ? `\n${partsUsed.length} Ersatzteil(e) verwendet` : ''}`);
}

// Maintenance Templates
function renderMaintenanceTemplates() {
    const container = document.getElementById('templatesGrid');
    const templates = dataManager.data.maintenanceTemplates;

    if (templates.length === 0) {
        container.innerHTML = '<p style="color: var(--gray-600); text-align: center; padding: 40px;">Noch keine Wartungspläne erstellt</p>';
        return;
    }

    container.innerHTML = templates.map(template => {
        const machinesUsing = dataManager.data.machines.filter(m => m.maintenanceTemplateId === template.id);
        const sameTypeMachines = machinesUsing.filter(m => m.type === template.machineType);
        const differentTypeMachines = machinesUsing.filter(m => m.type !== template.machineType);
        
        return `
            <div class="template-card">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div style="flex: 1;">
                        <div style="font-size: 18px; font-weight: 600; color: var(--gray-800); margin-bottom: 4px;">
                            ${template.name}
                        </div>
                        ${template.description ? `
                            <div style="font-size: 13px; color: var(--gray-600); margin-bottom: 8px;">
                                ${template.description}
                            </div>
                        ` : ''}
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
                            <span class="badge badge-primary">Erstellt für: ${template.machineType}</span>
                            <span class="badge badge-success">${template.components.length} Komponenten</span>
                            <span class="badge badge-info">${machinesUsing.length} Maschine(n)</span>
                            ${differentTypeMachines.length > 0 ? `
                                <span class="badge badge-warning" title="Verwendet auch von anderen Maschinentypen">
                                    ⚠️ ${differentTypeMachines.length} andere Typen
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    ${currentUser.role !== 'viewer' ? `
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-info btn-small" onclick="editTemplate('${template.id}')">
                                  Bearbeiten
                            </button>
                            <button class="btn btn-warning btn-small" onclick="openAssignTemplateMultiple('${template.id}')">
                                  Zuweisen
                            </button>
                            <button class="btn btn-danger btn-small" onclick="deleteTemplate('${template.id}')">
                                Löschen
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                <div style="background: white; padding: 16px; border-radius: 8px;">
                    <h5 style="margin-bottom: 12px; font-size: 14px; font-weight: 600;">Wartungskomponenten:</h5>
                    ${template.components.map(comp => `
                        <div style="padding: 10px; background: var(--gray-100); border-radius: 6px; margin-bottom: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="font-size: 14px;">${comp.name}</strong>
                                <span class="badge badge-warning">${comp.intervalHours}h</span>
                            </div>
                            <div style="font-size: 12px; color: var(--gray-600); margin-top: 4px;">
                                ${comp.category}${comp.tasks ? ' • ' + comp.tasks.join(', ') : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                ${machinesUsing.length > 0 ? `
                    <div style="margin-top: 12px;">
                        ${sameTypeMachines.length > 0 ? `
                            <div style="padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 6px; margin-bottom: 8px;">
                                <div style="font-size: 13px; font-weight: 600; color: var(--success-color); margin-bottom: 6px;">
                                     Zugewiesen an ${template.machineType} Maschinen:
                                </div>
                                <div style="font-size: 12px; color: var(--gray-700);">
                                    ${sameTypeMachines.map(m => m.name).join(', ')}
                                </div>
                            </div>
                        ` : ''}
                        ${differentTypeMachines.length > 0 ? `
                            <div style="padding: 12px; background: rgba(245, 158, 11, 0.1); border-radius: 6px;">
                                <div style="font-size: 13px; font-weight: 600; color: var(--warning-color); margin-bottom: 6px;">
                                    ⚠️ Auch zugewiesen an andere Typen:
                                </div>
                                <div style="font-size: 12px; color: var(--gray-700);">
                                    ${differentTypeMachines.map(m => `${m.name} (${m.type})`).join(', ')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Add Template
document.getElementById('addTemplateBtn').addEventListener('click', () => {
    if (currentUser.role === 'viewer') {
        alert('Sie haben keine Berechtigung, Wartungspläne zu erstellen.');
        return;
    }
    
    updateMachineTypeSelects();
    const container = document.getElementById('componentsContainer');
    container.innerHTML = '';
    addComponentField();
    
    document.getElementById('addTemplateModal').classList.add('active');
});

document.getElementById('addComponentBtn').addEventListener('click', addComponentField);

function addComponentField(component = null) {
    const container = document.getElementById('componentsContainer');
    const index = container.children.length;
    
    const componentDiv = document.createElement('div');
    componentDiv.className = 'component-item';
    componentDiv.style.position = 'relative';
    componentDiv.innerHTML = `
        <button type="button" onclick="this.parentElement.remove()" style="position: absolute; top: 12px; right: 12px; background: var(--danger-color); color: white; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 12px;">
            ✕ Entfernen
        </button>
        <div class="form-group">
            <label>Komponenten-/Bauteilname</label>
            <input type="text" class="component-name" value="${component ? component.name : ''}" required placeholder="z.B. Greifer-Mechanismus">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
                <label>Wartungsintervall (Betriebsstunden)</label>
                <input type="number" class="component-interval" value="${component ? component.intervalHours : 500}" min="1" required>
            </div>
            <div class="form-group">
                <label>Kategorie</label>
                <select class="component-category">
                    <option value="Mechanisch" ${component && component.category === 'Mechanisch' ? 'selected' : ''}>Mechanisch</option>
                    <option value="Elektrisch" ${component && component.category === 'Elektrisch' ? 'selected' : ''}>Elektrisch</option>
                    <option value="Pneumatik" ${component && component.category === 'Pneumatik' ? 'selected' : ''}>Pneumatik</option>
                    <option value="Hydraulik" ${component && component.category === 'Hydraulik' ? 'selected' : ''}>Hydraulik</option>
                    <option value="Schmierung" ${component && component.category === 'Schmierung' ? 'selected' : ''}>Schmierung</option>
                    <option value="Reinigung" ${component && component.category === 'Reinigung' ? 'selected' : ''}>Reinigung</option>
                    <option value="Einstellung" ${component && component.category === 'Einstellung' ? 'selected' : ''}>Einstellung</option>
                    <option value="Sonstiges" ${component && component.category === 'Sonstiges' ? 'selected' : ''}>Sonstiges</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Wartungsaufgaben (kommagetrennt, optional)</label>
            <input type="text" class="component-tasks" value="${component && component.tasks ? component.tasks.join(', ') : ''}" placeholder="z.B. Prüfen, Schmieren, Einstellen">
        </div>
    `;
    
    container.appendChild(componentDiv);
}

document.getElementById('addTemplateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const components = [];
    const componentItems = document.querySelectorAll('#componentsContainer .component-item');
    
    if (componentItems.length === 0) {
        alert('Bitte fügen Sie mindestens eine Komponente hinzu.');
        return;
    }
    
    componentItems.forEach(item => {
        const name = item.querySelector('.component-name').value;
        const intervalHours = parseInt(item.querySelector('.component-interval').value);
        const category = item.querySelector('.component-category').value;
        const tasksInput = item.querySelector('.component-tasks').value;
        const tasks = tasksInput ? tasksInput.split(',').map(t => t.trim()).filter(t => t) : [];
        
        components.push({
            name,
            intervalHours,
            category,
            tasks
        });
    });
    
    const template = {
        name: document.getElementById('templateName').value,
        description: document.getElementById('templateDescription').value,
        machineType: document.getElementById('templateMachineType').value,
        components
    };
    
    dataManager.addMaintenanceTemplate(template);
    closeModal('addTemplateModal');
    document.getElementById('addTemplateForm').reset();
    renderMaintenanceTemplates();
    alert('✅ Wartungsplan erfolgreich erstellt!');
});

// Edit Template
function editTemplate(templateId) {
    const template = dataManager.getMaintenanceTemplate(templateId);
    if (!template) return;
    
    document.getElementById('editTemplateId').value = template.id;
    document.getElementById('editTemplateName').value = template.name;
    document.getElementById('editTemplateDescription').value = template.description || '';
    
    updateMachineTypeSelects();
    document.getElementById('editTemplateMachineType').value = template.machineType;
    
    const container = document.getElementById('editComponentsContainer');
    container.innerHTML = '';
    
    template.components.forEach(component => {
        addEditComponentField(component);
    });
    
    document.getElementById('editTemplateModal').classList.add('active');
}

document.getElementById('editAddComponentBtn').addEventListener('click', () => addEditComponentField());

function addEditComponentField(component = null) {
    const container = document.getElementById('editComponentsContainer');
    
    const componentDiv = document.createElement('div');
    componentDiv.className = 'component-item';
    componentDiv.style.position = 'relative';
    componentDiv.innerHTML = `
        <button type="button" onclick="this.parentElement.remove()" style="position: absolute; top: 12px; right: 12px; background: var(--danger-color); color: white; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 12px;">
            ✕ Entfernen
        </button>
        <div class="form-group">
            <label>Komponenten-/Bauteilname</label>
            <input type="text" class="component-name" value="${component ? component.name : ''}" required>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
                <label>Wartungsintervall (Betriebsstunden)</label>
                <input type="number" class="component-interval" value="${component ? component.intervalHours : 500}" min="1" required>
            </div>
            <div class="form-group">
                <label>Kategorie</label>
                <select class="component-category">
                    <option value="Mechanisch" ${component && component.category === 'Mechanisch' ? 'selected' : ''}>Mechanisch</option>
                    <option value="Elektrisch" ${component && component.category === 'Elektrisch' ? 'selected' : ''}>Elektrisch</option>
                    <option value="Pneumatik" ${component && component.category === 'Pneumatik' ? 'selected' : ''}>Pneumatik</option>
                    <option value="Hydraulik" ${component && component.category === 'Hydraulik' ? 'selected' : ''}>Hydraulik</option>
                    <option value="Schmierung" ${component && component.category === 'Schmierung' ? 'selected' : ''}>Schmierung</option>
                    <option value="Reinigung" ${component && component.category === 'Reinigung' ? 'selected' : ''}>Reinigung</option>
                    <option value="Einstellung" ${component && component.category === 'Einstellung' ? 'selected' : ''}>Einstellung</option>
                    <option value="Sonstiges" ${component && component.category === 'Sonstiges' ? 'selected' : ''}>Sonstiges</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Wartungsaufgaben (kommagetrennt)</label>
            <input type="text" class="component-tasks" value="${component && component.tasks ? component.tasks.join(', ') : ''}">
        </div>
    `;
    
    container.appendChild(componentDiv);
}

document.getElementById('editTemplateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const templateId = document.getElementById('editTemplateId').value;
    
    const components = [];
    const componentItems = document.querySelectorAll('#editComponentsContainer .component-item');
    
    componentItems.forEach(item => {
        const name = item.querySelector('.component-name').value;
        const intervalHours = parseInt(item.querySelector('.component-interval').value);
        const category = item.querySelector('.component-category').value;
        const tasksInput = item.querySelector('.component-tasks').value;
        const tasks = tasksInput ? tasksInput.split(',').map(t => t.trim()).filter(t => t) : [];
        
        components.push({
            name,
            intervalHours,
            category,
            tasks
        });
    });
    
    const updates = {
        name: document.getElementById('editTemplateName').value,
        description: document.getElementById('editTemplateDescription').value,
        machineType: document.getElementById('editTemplateMachineType').value,
        components
    };
    
    dataManager.updateMaintenanceTemplate(templateId, updates);
    closeModal('editTemplateModal');
    renderMaintenanceTemplates();
    alert('✅ Wartungsplan erfolgreich aktualisiert!');
});

function deleteTemplate(templateId) {
    if (confirm('Möchten Sie diesen Wartungsplan wirklich löschen?')) {
        const result = dataManager.deleteMaintenanceTemplate(templateId);
        if (result.error) {
            alert(result.error);
        } else {
            renderMaintenanceTemplates();
            alert('Löschen Wartungsplan gelöscht!');
        }
    }
}

// Assign Template
function openAssignTemplate(machineId) {
    const machine = dataManager.getMachine(machineId);
    if (!machine) return;
    
    // Get ALL templates, not just compatible ones
    const allTemplates = dataManager.data.maintenanceTemplates;
    
    // Separate into compatible and other templates
    const compatibleTemplates = allTemplates.filter(t => t.machineType === machine.type);
    const otherTemplates = allTemplates.filter(t => t.machineType !== machine.type);
    
    document.getElementById('assignTemplateContent').innerHTML = `
        <div>
            <p style="margin-bottom: 20px;">
                <strong>Maschine:</strong> ${machine.name} (${machine.type})<br>
                <strong>Aktueller Plan:</strong> ${machine.maintenanceTemplateId ? 
                    dataManager.getMaintenanceTemplate(machine.maintenanceTemplateId).name : 
                    'Kein Wartungsplan zugewiesen'}
            </p>
            
            ${allTemplates.length > 0 ? `
                <div class="form-group">
                    <label>Wartungsplan auswählen</label>
                    <select id="assignTemplateSelect" style="width: 100%; padding: 12px;">
                        <option value="">Keinen Wartungsplan zuweisen</option>
                        ${compatibleTemplates.length > 0 ? `
                            <optgroup label=" Empfohlen für ${machine.type}">
                                ${compatibleTemplates.map(t => `
                                    <option value="${t.id}" ${t.id === machine.maintenanceTemplateId ? 'selected' : ''}>
                                        ${t.name} (${t.components.length} Komponenten)
                                    </option>
                                `).join('')}
                            </optgroup>
                        ` : ''}
                        ${otherTemplates.length > 0 ? `
                            <optgroup label=" Andere Wartungspläne">
                                ${otherTemplates.map(t => `
                                    <option value="${t.id}" ${t.id === machine.maintenanceTemplateId ? 'selected' : ''}>
                                        ${t.name} (${t.machineType}) - ${t.components.length} Komponenten
                                    </option>
                                `).join('')}
                            </optgroup>
                        ` : ''}
                    </select>
                </div>
                
                <div style="background: var(--gray-100); padding: 16px; border-radius: 8px; margin-top: 16px;">
                    <p style="font-size: 13px; color: var(--gray-600);">
                        ℹ️ <strong>Hinweis:</strong> Sie können jeden Wartungsplan einer beliebigen Maschine zuweisen, 
                        unabhängig vom Maschinentyp. Die Wartungsintervalle werden basierend auf den aktuellen 
                        Betriebsstunden der Maschine initialisiert.
                    </p>
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button class="btn btn-success" onclick="assignTemplateToMachine('${machineId}')" style="flex: 1;">
                        Zuweisen
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal('assignTemplateModal')" style="flex: 1;">
                        Abbrechen
                    </button>
                </div>
            ` : `
                <div style="padding: 20px; background: rgba(245, 158, 11, 0.1); border-radius: 8px; text-align: center;">
                    <p style="color: var(--warning-color); margin-bottom: 12px;">
                        ⚠️ Noch keine Wartungspläne vorhanden.
                    </p>
                    <button class="btn btn-primary" onclick="closeModal('assignTemplateModal'); setTimeout(() => { document.querySelector('[data-tab=\'maintenance-templates\']').click(); document.getElementById('addTemplateBtn').click(); }, 300);">
                        Wartungsplan erstellen
                    </button>
                </div>
            `}
        </div>
    `;
    
    document.getElementById('assignTemplateModal').classList.add('active');
}

function assignTemplateToMachine(machineId) {
    const templateId = document.getElementById('assignTemplateSelect').value;
    
    if (templateId) {
        dataManager.assignTemplateToMachine(machineId, templateId);
        alert('✅ Wartungsplan erfolgreich zugewiesen!');
    } else {
        const machine = dataManager.getMachine(machineId);
        machine.maintenanceTemplateId = null;
        machine.componentStates = {};
        dataManager.saveData();
        alert('Wartungsplan entfernt.');
    }
    
    closeModal('assignTemplateModal');
    renderMachines();
}

function openAssignTemplateMultiple(templateId) {
    const template = dataManager.getMaintenanceTemplate(templateId);
    if (!template) return;
    
    // Get ALL machines, not just compatible ones
    const allMachines = dataManager.data.machines;
    
    // Separate into same type and different type
    const sameTypeMachines = allMachines.filter(m => m.type === template.machineType);
    const differentTypeMachines = allMachines.filter(m => m.type !== template.machineType);
    
    document.getElementById('assignTemplateContent').innerHTML = `
        <div>
            <p style="margin-bottom: 20px;">
                <strong>Wartungsplan:</strong> ${template.name}<br>
                <strong>Erstellt für Maschinentyp:</strong> ${template.machineType}
            </p>
            
            ${allMachines.length > 0 ? `
                <div style="background: var(--gray-100); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                    <label style="font-weight: 600; margin-bottom: 12px; display: block;">
                        Wählen Sie die Maschinen aus, denen Sie diesen Wartungsplan zuweisen möchten:
                    </label>
                    
                    ${sameTypeMachines.length > 0 ? `
                        <div style="margin-bottom: 16px;">
                            <h5 style="font-size: 13px; font-weight: 600; color: var(--success-color); margin-bottom: 8px;">
                                 Empfohlen: ${template.machineType} Maschinen
                            </h5>
                            ${sameTypeMachines.map(machine => `
                                <div style="padding: 12px; background: white; border-radius: 6px; margin-bottom: 8px; border: 2px solid ${machine.maintenanceTemplateId === templateId ? 'var(--success-color)' : 'transparent'};">
                                    <label style="display: flex; align-items: center; cursor: pointer;">
                                        <input type="checkbox" class="assign-machine-checkbox" value="${machine.id}" 
                                               ${machine.maintenanceTemplateId === templateId ? 'checked' : ''}
                                               style="width: 20px; height: 20px; margin-right: 12px;">
                                        <div style="flex: 1;">
                                            <strong>${machine.name}</strong> <span style="color: var(--success-color);">(${machine.type})</span><br>
                                            <span style="font-size: 12px; color: var(--gray-600);">
                                                ${machine.serial} | ${machine.location}
                                                ${machine.maintenanceTemplateId === templateId ? 
                                                    ' • <span style="color: var(--success-color);">✓ Bereits zugewiesen</span>' : ''}
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${differentTypeMachines.length > 0 ? `
                        <div>
                            <h5 style="font-size: 13px; font-weight: 600; color: var(--gray-600); margin-bottom: 8px;">
                                 Andere Maschinentypen
                            </h5>
                            ${differentTypeMachines.map(machine => `
                                <div style="padding: 12px; background: white; border-radius: 6px; margin-bottom: 8px; border: 2px solid ${machine.maintenanceTemplateId === templateId ? 'var(--warning-color)' : 'transparent'};">
                                    <label style="display: flex; align-items: center; cursor: pointer;">
                                        <input type="checkbox" class="assign-machine-checkbox" value="${machine.id}" 
                                               ${machine.maintenanceTemplateId === templateId ? 'checked' : ''}
                                               style="width: 20px; height: 20px; margin-right: 12px;">
                                        <div style="flex: 1;">
                                            <strong>${machine.name}</strong> <span style="color: var(--warning-color);">(${machine.type})</span><br>
                                            <span style="font-size: 12px; color: var(--gray-600);">
                                                ${machine.serial} | ${machine.location}
                                                ${machine.maintenanceTemplateId === templateId ? 
                                                    ' • <span style="color: var(--warning-color);">✓ Bereits zugewiesen</span>' : ''}
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div style="background: rgba(59, 130, 246, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <p style="font-size: 12px; color: var(--gray-700);">
                        💡 <strong>Tipp:</strong> Sie können diesen Wartungsplan beliebigen Maschinen zuweisen, 
                        unabhängig vom Maschinentyp. Die Komponenten werden automatisch für jede Maschine initialisiert.
                    </p>
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <button class="btn btn-success" onclick="assignTemplateToMultipleMachines('${templateId}')" style="flex: 1;">
                        Ausgewählten Maschinen zuweisen
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal('assignTemplateModal')" style="flex: 1;">
                        Abbrechen
                    </button>
                </div>
            ` : `
                <div style="padding: 20px; background: rgba(245, 158, 11, 0.1); border-radius: 8px; text-align: center;">
                    <p style="color: var(--warning-color);">
                        ⚠️ Keine Maschinen vorhanden.
                    </p>
                </div>
            `}
        </div>
    `;
    
    document.getElementById('assignTemplateModal').classList.add('active');
}

function assignTemplateToMultipleMachines(templateId) {
    const checkboxes = document.querySelectorAll('.assign-machine-checkbox:checked');
    const machineIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (machineIds.length === 0) {
        alert('Bitte wählen Sie mindestens eine Maschine aus.');
        return;
    }
    
    dataManager.assignTemplateToMultipleMachines(templateId, machineIds);
    closeModal('assignTemplateModal');
    renderMachines();
    alert(`✅ Wartungsplan erfolgreich ${machineIds.length} Maschine(n) zugewiesen!`);
}

function updateTemplateSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const machineTypeSelect = document.getElementById('machineType');
    const selectedType = machineTypeSelect ? machineTypeSelect.value : '';
    
    const allTemplates = dataManager.data.maintenanceTemplates;
    
    if (selectedType && allTemplates.length > 0) {
        // Separate templates by compatibility
        const compatibleTemplates = allTemplates.filter(t => t.machineType === selectedType);
        const otherTemplates = allTemplates.filter(t => t.machineType !== selectedType);
        
        let optionsHtml = '<option value="">Kein Wartungsplan / Standard-Wartungsplan</option>';
        
        if (compatibleTemplates.length > 0) {
            optionsHtml += '<optgroup label=" Empfohlen für ' + selectedType + '">';
            compatibleTemplates.forEach(t => {
                optionsHtml += `<option value="${t.id}">${t.name} (${t.components.length} Komponenten)</option>`;
            });
            optionsHtml += '</optgroup>';
        }
        
        if (otherTemplates.length > 0) {
            optionsHtml += '<optgroup label=" Andere Wartungspläne">';
            otherTemplates.forEach(t => {
                optionsHtml += `<option value="${t.id}">${t.name} (${t.machineType}) - ${t.components.length} Komponenten</option>`;
            });
            optionsHtml += '</optgroup>';
        }
        
        select.innerHTML = optionsHtml;
    } else {
        select.innerHTML = '<option value="">Kein Wartungsplan / Standard-Wartungsplan</option>' +
            allTemplates.map(t => `<option value="${t.id}">${t.name} (${t.machineType}) - ${t.components.length} Komponenten</option>`).join('');
    }
}

// QR Code
function showQRCode(machineId) {
    const machine = dataManager.getMachine(machineId);
    if (!machine) return;

    const qrData = dataManager.generateQRCodeData(machine);
    
    document.getElementById('machineDetailsTitle').textContent = 'QR-Code: ' + machine.name;
    document.getElementById('machineDetailsContent').innerHTML = `
        <div style="text-align: center;" id="qrPrintArea">
            <div style="padding: 30px; background: white; border-radius: 8px; display: inline-block;">
                <h2 style="color: var(--gray-800); margin-bottom: 8px; font-size: 24px;">${machine.name}</h2>
                <div style="color: var(--gray-600); margin-bottom: 4px; font-size: 14px;">
                    <strong>Typ:</strong> ${machine.type} | <strong>S/N:</strong> ${machine.serial}
                </div>
                <div style="color: var(--gray-600); margin-bottom: 20px; font-size: 13px;">
                    <strong>Standort:</strong> ${machine.location}
                </div>
                <div id="qrcode" style="display: inline-block; margin-bottom: 16px;"></div>
                <div style="color: var(--gray-600); font-size: 12px; margin-top: 12px;">
                    DORNIER Wartungssystem
                </div>
            </div>
        </div>
        <div style="text-align: center; margin-top: 24px;">
            <p style="color: var(--gray-600); margin-bottom: 16px;">
                Scannen Sie diesen QR-Code, um schnell auf diese Maschine zuzugreifen.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="printQRCode()">
                    🖨️ QR-Code drucken
                </button>
                <button class="btn btn-success" onclick="downloadQRCode('${machine.name}')">
                    💾 Als Bild speichern
                </button>
                <button class="btn btn-secondary" onclick="closeModal('machineDetailsModal')">
                    Schließen
                </button>
            </div>
        </div>
    `;

    document.getElementById('machineDetailsModal').classList.add('active');

    setTimeout(() => {
        new QRCode(document.getElementById('qrcode'), {
            text: qrData,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    }, 100);
}

function printQRCode() {
    const printContent = document.getElementById('qrPrintArea').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
        <html>
        <head>
            <title>QR-Code Druck</title>
            <style>
                @media print {
                    body { margin: 0; padding: 20px; }
                    @page { margin: 1cm; }
                }
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }
            </style>
        </head>
        <body>${printContent}</body>
        </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    location.reload();
}

function downloadQRCode(machineName) {
    const qrCodeImg = document.querySelector('#qrcode img');
    if (qrCodeImg) {
        const link = document.createElement('a');
        link.download = `QR_${machineName.replace(/\s+/g, '_')}.png`;
        link.href = qrCodeImg.src;
        link.click();
    }
}

// QR Scanner
document.getElementById('startScanBtn').addEventListener('click', () => {
    document.getElementById('startScanBtn').classList.add('hidden');
    document.getElementById('stopScanBtn').classList.remove('hidden');

    qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            try {
                const data = JSON.parse(decodedText);
                if (data.id) {
                    qrScanner.stop();
                    document.getElementById('startScanBtn').classList.remove('hidden');
                    document.getElementById('stopScanBtn').classList.add('hidden');
                    viewMachineDetails(data.id);
                }
            } catch (e) {
                console.error('Invalid QR code');
            }
        }
    ).catch(err => {
        console.error('Scanner error:', err);
        alert('Kamera konnte nicht gestartet werden.');
    });
});

document.getElementById('stopScanBtn').addEventListener('click', () => {
    if (qrScanner) {
        qrScanner.stop();
        document.getElementById('startScanBtn').classList.remove('hidden');
        document.getElementById('stopScanBtn').classList.add('hidden');
    }
});

// Manual Search
function performManualSearch() {
    const searchTerm = document.getElementById('manualSearchInput').value.trim().toLowerCase();
    const resultsContainer = document.getElementById('manualSearchResults');
    
    if (!searchTerm) {
        resultsContainer.innerHTML = `
            <div style="padding: 16px; background: var(--gray-200); border-radius: 8px; text-align: center; color: var(--gray-600);">
                ℹ️ Bitte geben Sie einen Suchbegriff ein
            </div>
        `;
        return;
    }

    const machines = dataManager.data.machines.filter(m => 
        m.name.toLowerCase().includes(searchTerm) ||
        m.serial.toLowerCase().includes(searchTerm) ||
        m.location.toLowerCase().includes(searchTerm) ||
        m.type.toLowerCase().includes(searchTerm)
    );

    if (machines.length === 0) {
        resultsContainer.innerHTML = `
            <div style="padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; text-align: center; color: var(--danger-color); border: 2px solid var(--danger-color);">
                ❌ Keine Maschine gefunden
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 16px; border: 2px solid var(--success-color);">
            <div style="font-weight: 600; color: var(--success-color); margin-bottom: 12px;">
                ✅ ${machines.length} Maschine${machines.length > 1 ? 'n' : ''} gefunden:
            </div>
            ${machines.map(machine => `
                <div style="padding: 16px; background: var(--gray-100); border-radius: 8px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <div style="flex: 1;">
                            <div style="font-size: 16px; font-weight: 600;">${machine.name}</div>
                            <div style="font-size: 13px; color: var(--gray-600);">
                                S/N: ${machine.serial} • Typ: ${machine.type} • ${machine.location}
                            </div>
                        </div>
                        <span class="status-badge status-${machine.status}">
                            ${getStatusLabel(machine.status)}
                        </span>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 12px;">
                        <button class="btn btn-primary btn-small" onclick="viewMachineDetails('${machine.id}')" style="flex: 1;">
                            Details
                        </button>
                        <button class="btn btn-warning btn-small" onclick="startMaintenance('${machine.id}')" style="flex: 1;">
                            Wartung
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

document.getElementById('manualSearchBtn').addEventListener('click', performManualSearch);
document.getElementById('manualSearchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performManualSearch();
});
document.getElementById('manualSearchInput').addEventListener('input', (e) => {
    if (!e.target.value.trim()) {
        document.getElementById('manualSearchResults').innerHTML = '';
    }
});

// Parts
function renderParts() {
    const container = document.getElementById('partsGrid');
    const parts = dataManager.data.parts;

    container.innerHTML = parts.map(part => {
        const isLowStock = part.stock < part.minStock;
        return `
            <div class="part-card" style="position: relative;">
                ${currentUser.role === 'admin' ? `
                    <div style="position: absolute; top: 12px; right: 12px; display: flex; gap: 6px;">
                        <button onclick="editPart('${part.id}')" class="btn btn-secondary btn-small">
                             
                        </button>
                        <button onclick="deletePart('${part.id}')" class="btn btn-danger btn-small">
                            Löschen
                        </button>
                    </div>
                ` : ''}
                <div class="part-name">${part.name}</div>
                <div style="font-size: 12px; color: var(--gray-600); margin-bottom: 8px;">
                    Art.-Nr.: ${part.partNumber}
                </div>
                <div class="part-stock ${isLowStock ? 'low' : ''}">
                    ${isLowStock ? '⚠️ ' : ''}Bestand: ${part.stock} ${isLowStock ? `(Min: ${part.minStock})` : ''}
                </div>
                <div style="font-size: 12px; color: var(--gray-600); margin-top: 8px;">
                    Für: ${part.machineTypes.join(', ')}
                </div>
            </div>
        `;
    }).join('');
}

document.getElementById('addPartBtn').addEventListener('click', () => {
    if (currentUser.role === 'viewer') {
        alert('Sie haben keine Berechtigung, Ersatzteile hinzuzufügen.');
        return;
    }
    
    const container = document.getElementById('partMachineTypesCheckboxes');
    container.innerHTML = dataManager.data.machineTypes.map(type => `
        <div style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="machineType_${type.code}" value="${type.code}" 
                   style="width: 18px; height: 18px; cursor: pointer;">
            <label for="machineType_${type.code}" style="cursor: pointer; flex: 1;">
                <strong>${type.code}</strong> - ${type.name}
            </label>
        </div>
    `).join('');
    
    document.getElementById('addPartModal').classList.add('active');
});

document.getElementById('addPartForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const selectedTypes = [];
    dataManager.data.machineTypes.forEach(type => {
        const checkbox = document.getElementById(`machineType_${type.code}`);
        if (checkbox && checkbox.checked) {
            selectedTypes.push(type.code);
        }
    });

    if (selectedTypes.length === 0) {
        alert('Bitte wählen Sie mindestens einen Maschinentyp aus.');
        return;
    }
    
    const part = {
        name: document.getElementById('partName').value,
        partNumber: document.getElementById('partNumber').value,
        stock: parseInt(document.getElementById('partStock').value),
        minStock: parseInt(document.getElementById('partMinStock').value),
        machineTypes: selectedTypes
    };

    dataManager.addPart(part);
    closeModal('addPartModal');
    document.getElementById('addPartForm').reset();
    renderParts();
    alert('✅ Ersatzteil erfolgreich hinzugefügt!');
});

function editPart(partId) {
    const part = dataManager.getPart(partId);
    if (!part) return;

    document.getElementById('editPartId').value = part.id;
    document.getElementById('editPartName').value = part.name;
    document.getElementById('editPartNumber').value = part.partNumber;
    document.getElementById('editPartStock').value = part.stock;
    document.getElementById('editPartMinStock').value = part.minStock;

    const container = document.getElementById('editPartMachineTypesCheckboxes');
    container.innerHTML = dataManager.data.machineTypes.map(type => `
        <div style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="editMachineType_${type.code}" value="${type.code}" 
                   ${part.machineTypes.includes(type.code) ? 'checked' : ''}
                   style="width: 18px; height: 18px; cursor: pointer;">
            <label for="editMachineType_${type.code}" style="cursor: pointer; flex: 1;">
                <strong>${type.code}</strong> - ${type.name}
            </label>
        </div>
    `).join('');

    document.getElementById('editPartModal').classList.add('active');
}

document.getElementById('editPartForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const selectedTypes = [];
    dataManager.data.machineTypes.forEach(type => {
        const checkbox = document.getElementById(`editMachineType_${type.code}`);
        if (checkbox && checkbox.checked) {
            selectedTypes.push(type.code);
        }
    });

    if (selectedTypes.length === 0) {
        alert('Bitte wählen Sie mindestens einen Maschinentyp aus.');
        return;
    }

    const partId = document.getElementById('editPartId').value;
    const updates = {
        name: document.getElementById('editPartName').value,
        partNumber: document.getElementById('editPartNumber').value,
        stock: parseInt(document.getElementById('editPartStock').value),
        minStock: parseInt(document.getElementById('editPartMinStock').value),
        machineTypes: selectedTypes
    };

    dataManager.updatePart(partId, updates);
    closeModal('editPartModal');
    renderParts();
    alert('✅ Ersatzteil aktualisiert!');
});

function deletePart(partId) {
    if (confirm('Möchten Sie dieses Ersatzteil wirklich löschen?')) {
        dataManager.deletePart(partId);
        renderParts();
        alert('Löschen Ersatzteil gelöscht!');
    }
}

// Reports
document.getElementById('exportPdfBtn').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(162, 127, 65);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('DORNIER', 15, 18);
    doc.setFontSize(16);
    doc.text('Wartungsbericht', 15, 28);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 15, 35);
    doc.text(`Erstellt von: ${currentUser.name}`, 120, 35);
    
    doc.setTextColor(0, 0, 0);
    
    let yPos = 50;
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Übersicht', 15, yPos);
    yPos += 10;
    
    const machines = dataManager.data.machines;
    const stats = {
        total: machines.length,
        maintenance: machines.filter(m => m.status === 'maintenance').length,
        ok: machines.filter(m => m.status === 'ok').length,
        notOk: machines.filter(m => m.status === 'not-ok').length,
        serviced: machines.filter(m => m.status === 'serviced').length
    };
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(15, yPos, 180, 35, 3, 3, 'F');
    
    yPos += 8;
    doc.text(`Gesamt Maschinen: ${stats.total}`, 20, yPos);
    yPos += 7;
    doc.text(`In Ordnung: ${stats.ok}`, 20, yPos);
    doc.text(`Wartungsbedürftig: ${stats.maintenance}`, 110, yPos);
    yPos += 7;
    doc.text(`Nicht in Ordnung: ${stats.notOk}`, 20, yPos);
    doc.text(`Gewartet: ${stats.serviced}`, 110, yPos);
    
    yPos += 15;
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Maschinendetails', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    machines.forEach((machine, index) => {
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }
        
        let bgColor;
        switch(machine.status) {
            case 'ok': bgColor = [220, 252, 231]; break;
            case 'maintenance': bgColor = [254, 243, 199]; break;
            case 'not-ok': bgColor = [254, 226, 226]; break;
            case 'serviced': bgColor = [237, 233, 254]; break;
            default: bgColor = [243, 244, 246];
        }
        
        doc.setFillColor(...bgColor);
        doc.roundedRect(15, yPos, 180, 28, 2, 2, 'F');
        
        yPos += 6;
        doc.setFont(undefined, 'bold');
        doc.text(`${index + 1}. ${machine.name}`, 20, yPos);
        
        yPos += 5;
        doc.setFont(undefined, 'normal');
        doc.text(`Typ: ${machine.type} | S/N: ${machine.serial}`, 20, yPos);
        
        yPos += 5;
        doc.text(`Standort: ${machine.location} | Status: ${getStatusLabel(machine.status)}`, 20, yPos);
        
        yPos += 5;
        doc.text(`Betriebsstunden: ${machine.operatingHours}h`, 20, yPos);
        
        yPos += 10;
    });
    
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Seite ${i} von ${pageCount}`, 105, 290, { align: 'center' });
        doc.text('DORNIER Wartungsmanagementsystem Enhanced', 15, 290);
    }
    
    doc.save(`DORNIER_Wartungsbericht_${new Date().toISOString().split('T')[0]}.pdf`);
});

document.getElementById('exportExcelBtn').addEventListener('click', () => {
    const machines = dataManager.data.machines.map(m => ({
        'Name': m.name,
        'Typ': m.type,
        'Seriennummer': m.serial,
        'Standort': m.location,
        'Status': getStatusLabel(m.status),
        'Betriebsstunden': m.operatingHours,
        'Wartungsplan': m.maintenanceTemplateId ? 
            dataManager.getMaintenanceTemplate(m.maintenanceTemplateId).name : 'Kein Plan'
    }));
    
    const ws = XLSX.utils.json_to_sheet(machines);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Maschinen');
    
    XLSX.writeFile(wb, 'dornier-maschinen-export.xlsx');
});

document.getElementById('exportMaintenanceHistoryBtn').addEventListener('click', () => {
    const history = dataManager.data.maintenanceHistory.map(h => {
        const machine = dataManager.getMachine(h.machineId);
        return {
            'Datum': formatDate(h.timestamp),
            'Maschine': machine ? machine.name : 'Unbekannt',
            'Seriennummer': machine ? machine.serial : '-',
            'Techniker': h.technician,
            'Betriebsstunden': h.operatingHours,
            'Notizen': h.notes || '-'
        };
    });
    
    const ws = XLSX.utils.json_to_sheet(history);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Wartungshistorie');
    
    XLSX.writeFile(wb, 'dornier-wartungshistorie.xlsx');
});

setInterval(() => {
    const machines = dataManager.data.machines;
    const totalHours = machines.reduce((sum, m) => sum + m.operatingHours, 0);
    const avgHours = machines.length > 0 ? totalHours / machines.length : 0;
    const maintenanceRecords = dataManager.data.maintenanceHistory.length;
    
    document.getElementById('reportStats').innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div>
                <div style="color: var(--gray-600); font-size: 13px;">Gesamte Maschinen</div>
                <div style="font-size: 24px; font-weight: 700; margin-top: 4px;">${machines.length}</div>
            </div>
            <div>
                <div style="color: var(--gray-600); font-size: 13px;">Gesamte Betriebsstunden</div>
                <div style="font-size: 24px; font-weight: 700; margin-top: 4px;">${totalHours.toLocaleString()}h</div>
            </div>
            <div>
                <div style="color: var(--gray-600); font-size: 13px;">Durchschn. Betriebsstunden</div>
                <div style="font-size: 24px; font-weight: 700; margin-top: 4px;">${Math.round(avgHours).toLocaleString()}h</div>
            </div>
            <div>
                <div style="color: var(--gray-600); font-size: 13px;">Wartungsvorgänge</div>
                <div style="font-size: 24px; font-weight: 700; margin-top: 4px;">${maintenanceRecords}</div>
            </div>
        </div>
    `;
}, 1000);

// Users
function renderUsers() {
    const container = document.getElementById('usersGrid');
    const users = dataManager.data.users;

    container.innerHTML = users.map(user => `
        <div style="background: var(--gray-100); padding: 20px; border-radius: 12px; border-left: 4px solid var(--primary-color);">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div style="flex: 1;">
                    <div style="font-size: 18px; font-weight: 600; color: var(--gray-800); margin-bottom: 4px;">
                        ${user.name}
                    </div>
                    <div style="font-size: 13px; color: var(--gray-600);">
                        @${user.username} • ${user.email}
                    </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span class="badge badge-primary">
                        ${getRoleLabel(user.role)}
                    </span>
                    ${user.username !== 'admin' ? `
                        <button class="btn btn-danger btn-small" onclick="deleteUser('${user.id}')">
                            Löschen
                        </button>
                    ` : ''}
                </div>
            </div>
            <div style="font-size: 12px; color: var(--gray-600);">
                Erstellt: ${formatDate(user.created)}
            </div>
        </div>
    `).join('');
}

document.getElementById('addUserBtn').addEventListener('click', () => {
    document.getElementById('addUserModal').classList.add('active');
});

document.getElementById('addUserForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('newUsername').value;
    
    if (dataManager.data.users.find(u => u.username === username)) {
        alert('Benutzername bereits vergeben!');
        return;
    }
    
    const user = {
        username: username,
        name: document.getElementById('newUserFullName').value,
        email: document.getElementById('newUserEmail').value,
        password: document.getElementById('newUserPassword').value,
        role: document.getElementById('newUserRole').value
    };

    dataManager.addUser(user);
    closeModal('addUserModal');
    document.getElementById('addUserForm').reset();
    renderUsers();
    alert('✅ Benutzer erstellt!');
});

function deleteUser(userId) {
    if (confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
        dataManager.deleteUser(userId);
        renderUsers();
        alert('Löschen Benutzer gelöscht!');
    }
}

// Machine Types
function renderMachineTypes() {
    const container = document.getElementById('machineTypesGrid');
    const types = dataManager.data.machineTypes;

    container.innerHTML = types.map(type => `
        <div style="background: var(--gray-100); padding: 20px; border-radius: 12px; border-left: 4px solid var(--primary-color);">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div style="flex: 1;">
                    <div style="font-size: 18px; font-weight: 600; color: var(--gray-800); margin-bottom: 4px;">
                        ${type.code} - ${type.name}
                    </div>
                    ${type.description ? `
                        <div style="font-size: 13px; color: var(--gray-600); margin-top: 8px;">
                            ${type.description}
                        </div>
                    ` : ''}
                </div>
                <button class="btn btn-danger btn-small" onclick="deleteMachineType('${type.id}')">
                    Löschen
                </button>
            </div>
            <div style="font-size: 12px; color: var(--gray-600); margin-top: 12px;">
                Verwendet von: ${dataManager.data.machines.filter(m => m.type === type.code).length} Maschine(n)
            </div>
        </div>
    `).join('');
}

document.getElementById('addMachineTypeBtn').addEventListener('click', () => {
    document.getElementById('addMachineTypeModal').classList.add('active');
});

document.getElementById('addMachineTypeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const code = document.getElementById('machineTypeCode').value.toUpperCase();
    
    if (dataManager.data.machineTypes.find(t => t.code === code)) {
        alert('Dieser Typ-Code existiert bereits!');
        return;
    }
    
    const machineType = {
        code: code,
        name: document.getElementById('machineTypeName').value,
        description: document.getElementById('machineTypeDescription').value
    };

    dataManager.addMachineType(machineType);
    closeModal('addMachineTypeModal');
    document.getElementById('addMachineTypeForm').reset();
    renderMachineTypes();
    updateMachineTypeSelects();
    alert('✅ Maschinentyp hinzugefügt!');
});

function deleteMachineType(typeId) {
    const result = dataManager.deleteMachineType(typeId);
    if (result.error) {
        alert(result.error);
    } else {
        renderMachineTypes();
        updateMachineTypeSelects();
        alert('Löschen Maschinentyp gelöscht!');
    }
}

function updateMachineTypeSelects() {
    const selects = ['machineType', 'filterType', 'templateMachineType', 'editTemplateMachineType'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            const types = dataManager.data.machineTypes;
            
            if (selectId === 'filterType') {
                select.innerHTML = '<option value="all">Alle Typen</option>' +
                    types.map(t => `<option value="${t.code}">${t.code}</option>`).join('');
            } else {
                select.innerHTML = '<option value="">Bitte wählen...</option>' +
                    types.map(t => `<option value="${t.code}">${t.code} - ${t.name}</option>`).join('');
            }
            
            if (currentValue) select.value = currentValue;
        }
    });
    
    // Update template select when machine type changes
    const machineTypeSelect = document.getElementById('machineType');
    if (machineTypeSelect) {
        machineTypeSelect.addEventListener('change', () => {
            updateTemplateSelect('machineTemplateSelect');
        });
    }
}

// Helper Functions
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Auto-update
setInterval(() => {
    if (currentUser) {
        renderDashboard();
        renderMachines();
        renderParts();
    }
}, 30000);
