// Feiler Wartungssoftware
// Main JavaScript Application
// MIGRIERT ZU SERVER-BASIERTER DATENHALTUNG - FIXED VERSION

// =============================================================================
// THEME MANAGEMENT - FIXED
// =============================================================================

let currentTheme = localStorage.getItem('theme') || 'light';

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    localStorage.setItem('theme', theme);
    currentTheme = theme;
}

// Set theme on load - aber nur wenn Element existiert
document.addEventListener('DOMContentLoaded', () => {
    setTheme(currentTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            setTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });
    }
});

// =============================================================================
// DATA MANAGER CLASS
// =============================================================================

class DataManager {
    constructor() {
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
        this.setupOfflineDetection();
    }

    async loadData() {
        try {
            const response = await fetch('/api/data');
            if (!response.ok) throw new Error('Fehler beim Laden der Daten');
            this.data = await response.json();
            
            // Migrations-Logik beibehalten
            if (!this.data.maintenanceTemplates) this.data.maintenanceTemplates = [];
            if (!this.data.floorPlans) this.data.floorPlans = [];
            if (!this.data.users || this.data.users.length === 0) this.initializeDefaultUsers();
            if (!this.data.machineTypes || this.data.machineTypes.length === 0) this.initializeDefaultMachineTypes();
            
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
            
            console.log('✅ Daten erfolgreich vom Server geladen');
            return true;
        } catch (error) {
            console.error('❌ Fehler beim Laden der Daten:', error);
            return false;
        }
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
            { id: this.generateId(), code: 'P2', name: 'Greiferwebmaschine P2', description: 'Modernste Generation der Greiferwebmaschinen' },
            { id: this.generateId(), code: 'P1', name: 'Greiferwebmaschine P1', description: 'Bewährte Greiferwebmaschine' },
            { id: this.generateId(), code: 'A1', name: 'Luftwebmaschine A1', description: 'Mit ServoControl® Technologie' },
            { id: this.generateId(), code: 'LWV', name: 'Luftwebmaschine LWV', description: 'Für spezielle Anwendungen' }
        ];
    }

    initializeComponentStates(template, currentHours) {
        const states = {};
        if (template && template.components) {
            template.components.forEach(comp => {
                states[comp.id] = {
                    hoursAtLastMaintenance: Math.max(0, currentHours - Math.floor(Math.random() * comp.intervalHours)),
                    lastMaintenanceDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
                };
            });
        }
        return states;
    }

    setupOfflineDetection() {
        window.addEventListener('online', () => {
            console.log('🌐 Online - Synchronisiere Daten...');
            this.loadData();
        });
        
        window.addEventListener('offline', () => {
            console.log('📴 Offline-Modus');
        });
    }

    generateId() {
        return 'id-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generateQRCodeData(machine) {
        return `FEILER-${machine.serial}`;
    }

    async addMachine(machine) {
        try {
            machine.id = this.generateId();
            machine.qrCode = this.generateQRCodeData(machine);
            machine.componentStates = {};
            
            if (machine.maintenanceTemplateId) {
                const template = this.data.maintenanceTemplates.find(t => t.id === machine.maintenanceTemplateId);
                if (template) {
                    machine.componentStates = this.initializeComponentStates(template, machine.operatingHours || 0);
                }
            }
            
            const response = await fetch('/api/machines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(machine)
            });
            
            const result = await response.json();
            if (result.success) {
                this.data.machines.push(result.machine);
                return result.machine;
            }
        } catch (error) {
            console.error('Fehler beim Hinzufügen der Maschine:', error);
        }
        return null;
    }

    async updateMachine(id, updates) {
        try {
            const response = await fetch(`/api/machines/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            const result = await response.json();
            if (result.success) {
                const index = this.data.machines.findIndex(m => m.id === id);
                if (index !== -1) {
                    this.data.machines[index] = result.machine;
                }
                return result.machine;
            }
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Maschine:', error);
        }
        return null;
    }

    getMachine(id) {
        return this.data.machines.find(m => m.id === id);
    }

    getMachines() {
        return this.data.machines;
    }

    async addPart(part) {
        try {
            part.id = this.generateId();
            
            const response = await fetch('/api/parts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(part)
            });
            
            const result = await response.json();
            if (result.success) {
                this.data.parts.push(result.part);
                return result.part;
            }
        } catch (error) {
            console.error('Fehler beim Hinzufügen des Ersatzteils:', error);
        }
        return null;
    }

    async updatePart(id, updates) {
        try {
            const response = await fetch(`/api/parts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            const result = await response.json();
            if (result.success) {
                const index = this.data.parts.findIndex(p => p.id === id);
                if (index !== -1) {
                    this.data.parts[index] = result.part;
                }
                return result.part;
            }
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Ersatzteils:', error);
        }
        return null;
    }

    async deletePart(id) {
        try {
            const response = await fetch(`/api/parts/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            if (result.success) {
                this.data.parts = this.data.parts.filter(p => p.id !== id);
                return true;
            }
        } catch (error) {
            console.error('Fehler beim Löschen des Ersatzteils:', error);
        }
        return false;
    }

    getPart(id) {
        return this.data.parts.find(p => p.id === id);
    }

    getParts() {
        return this.data.parts;
    }

    getLowStockParts() {
        return this.data.parts.filter(p => p.stock < p.minStock);
    }

    async addMaintenanceRecord(record) {
        try {
            record.id = this.generateId();
            record.date = new Date();
            
            const response = await fetch('/api/maintenance-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            });
            
            const result = await response.json();
            if (result.success) {
                this.data.maintenanceHistory.push(result.record);
                
                if (record.machineId) {
                    const machine = this.getMachine(record.machineId);
                    if (machine) {
                        await this.updateMachine(record.machineId, {
                            lastMaintenance: record.date,
                            status: record.status || machine.status
                        });
                    }
                }
                
                return result.record;
            }
        } catch (error) {
            console.error('Fehler beim Hinzufügen des Wartungsdatensatzes:', error);
        }
        return null;
    }

    getMaintenanceHistory(machineId) {
        if (machineId) {
            return this.data.maintenanceHistory.filter(h => h.machineId === machineId);
        }
        return this.data.maintenanceHistory;
    }

    async addMaintenanceTemplate(template) {
        try {
            template.id = this.generateId();
            template.components.forEach(comp => {
                if (!comp.id) comp.id = this.generateId();
            });
            
            const response = await fetch('/api/maintenance-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(template)
            });
            
            const result = await response.json();
            if (result.success) {
                this.data.maintenanceTemplates.push(result.template);
                return result.template;
            }
        } catch (error) {
            console.error('Fehler beim Hinzufügen der Wartungsvorlage:', error);
        }
        return null;
    }

    async updateMaintenanceTemplate(id, updates) {
        try {
            if (updates.components) {
                updates.components.forEach(comp => {
                    if (!comp.id) comp.id = this.generateId();
                });
            }
            
            const response = await fetch(`/api/maintenance-templates/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            const result = await response.json();
            if (result.success) {
                const index = this.data.maintenanceTemplates.findIndex(t => t.id === id);
                if (index !== -1) {
                    this.data.maintenanceTemplates[index] = result.template;
                }
                return result.template;
            }
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Wartungsvorlage:', error);
        }
        return null;
    }

    async deleteMaintenanceTemplate(id) {
        try {
            const machinesUsingTemplate = this.data.machines.filter(m => m.maintenanceTemplateId === id);
            if (machinesUsingTemplate.length > 0) {
                return {
                    error: `Diese Vorlage wird von ${machinesUsingTemplate.length} Maschine(n) verwendet und kann nicht gelöscht werden.`
                };
            }
            
            const response = await fetch(`/api/maintenance-templates/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            if (result.success) {
                this.data.maintenanceTemplates = this.data.maintenanceTemplates.filter(t => t.id !== id);
                return { success: true };
            }
        } catch (error) {
            console.error('Fehler beim Löschen der Wartungsvorlage:', error);
        }
        return { error: 'Fehler beim Löschen' };
    }

    getMaintenanceTemplate(id) {
        return this.data.maintenanceTemplates.find(t => t.id === id);
    }

    getMaintenanceTemplates(machineType = null) {
        if (machineType) {
            return this.data.maintenanceTemplates.filter(t => t.machineType === machineType);
        }
        return this.data.maintenanceTemplates;
    }

    updateComponentState(machineId, componentId, hoursAtMaintenance) {
        const machine = this.getMachine(machineId);
        if (machine) {
            if (!machine.componentStates) {
                machine.componentStates = {};
            }
            machine.componentStates[componentId] = {
                hoursAtLastMaintenance: hoursAtMaintenance,
                lastMaintenanceDate: new Date()
            };
            this.updateMachine(machineId, { componentStates: machine.componentStates });
        }
    }

    getComponentStatus(machine, component) {
        if (!machine.componentStates || !machine.componentStates[component.id]) {
            return { status: 'unknown', hoursUntilMaintenance: null };
        }

        const state = machine.componentStates[component.id];
        const hoursSinceMaintenance = machine.operatingHours - state.hoursAtLastMaintenance;
        const hoursUntilMaintenance = component.intervalHours - hoursSinceMaintenance;

        let status = 'ok';
        if (hoursUntilMaintenance < 0) {
            status = 'overdue';
        } else if (hoursUntilMaintenance < component.intervalHours * 0.1) {
            status = 'warning';
        }

        return { status, hoursUntilMaintenance };
    }

    authenticateUser(username, password) {
        return this.data.users.find(u => u.username === username && u.password === password);
    }

    async addUser(user) {
        try {
            user.id = this.generateId();
            user.created = new Date();
            
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            });
            
            const result = await response.json();
            if (result.success) {
                this.data.users.push(result.user);
                return result.user;
            }
        } catch (error) {
            console.error('Fehler beim Hinzufügen des Benutzers:', error);
        }
        return null;
    }

    async deleteUser(id) {
        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            if (result.success) {
                this.data.users = this.data.users.filter(u => u.id !== id);
                return true;
            }
        } catch (error) {
            console.error('Fehler beim Löschen des Benutzers:', error);
        }
        return false;
    }

    async addMachineType(machineType) {
        try {
            machineType.id = this.generateId();
            
            const response = await fetch('/api/machine-types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(machineType)
            });
            
            const result = await response.json();
            if (result.success) {
                this.data.machineTypes.push(result.machineType);
                return result.machineType;
            }
        } catch (error) {
            console.error('Fehler beim Hinzufügen des Maschinentyps:', error);
        }
        return null;
    }

    async deleteMachineType(id) {
        try {
            const machineType = this.data.machineTypes.find(t => t.id === id);
            if (!machineType) {
                return { error: 'Maschinentyp nicht gefunden' };
            }

            const machinesUsingType = this.data.machines.filter(m => m.type === machineType.code);
            if (machinesUsingType.length > 0) {
                return { error: `Dieser Typ wird von ${machinesUsingType.length} Maschine(n) verwendet und kann nicht gelöscht werden.` };
            }

            const templatesUsingType = this.data.maintenanceTemplates.filter(t => t.machineType === machineType.code);
            if (templatesUsingType.length > 0) {
                return { error: `Für diesen Typ existieren ${templatesUsingType.length} Wartungsvorlage(n), die zuerst gelöscht werden müssen.` };
            }

            const response = await fetch(`/api/machine-types/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            if (result.success) {
                this.data.machineTypes = this.data.machineTypes.filter(t => t.id !== id);
                return { success: true };
            }
        } catch (error) {
            console.error('Fehler beim Löschen des Maschinentyps:', error);
        }
        return { error: 'Fehler beim Löschen' };
    }

    async saveFloorPlanImage(name, imageData) {
        try {
            const floorPlan = {
                id: this.generateId(),
                name: name,
                imageData: imageData,
                machinePositions: {},
                created: new Date()
            };
            
            const response = await fetch('/api/floor-plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(floorPlan)
            });
            
            const result = await response.json();
            if (result.success) {
                this.data.floorPlans.push(result.floorPlan);
                return result.floorPlan;
            }
        } catch (error) {
            console.error('Fehler beim Speichern des Hallenplans:', error);
        }
        return null;
    }

    getFloorPlans() {
        return this.data.floorPlans || [];
    }

    getFloorPlan(id) {
        return this.data.floorPlans.find(fp => fp.id === id);
    }

    async saveMachinePosition(floorPlanId, machineId, x, y) {
        try {
            const floorPlan = this.getFloorPlan(floorPlanId);
            if (!floorPlan) return false;

            if (!floorPlan.machinePositions) {
                floorPlan.machinePositions = {};
            }
            floorPlan.machinePositions[machineId] = { x, y };

            const response = await fetch(`/api/floor-plans/${floorPlanId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(floorPlan)
            });

            const result = await response.json();
            if (result.success) {
                const index = this.data.floorPlans.findIndex(fp => fp.id === floorPlanId);
                if (index !== -1) {
                    this.data.floorPlans[index] = result.floorPlan;
                }
                return true;
            }
        } catch (error) {
            console.error('Fehler beim Speichern der Maschinenposition:', error);
        }
        return false;
    }

    async removeMachinePosition(floorPlanId, machineId) {
        try {
            const floorPlan = this.getFloorPlan(floorPlanId);
            if (!floorPlan) return false;

            if (floorPlan.machinePositions && floorPlan.machinePositions[machineId]) {
                delete floorPlan.machinePositions[machineId];

                const response = await fetch(`/api/floor-plans/${floorPlanId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(floorPlan)
                });

                const result = await response.json();
                if (result.success) {
                    const index = this.data.floorPlans.findIndex(fp => fp.id === floorPlanId);
                    if (index !== -1) {
                        this.data.floorPlans[index] = result.floorPlan;
                    }
                    return true;
                }
            }
        } catch (error) {
            console.error('Fehler beim Entfernen der Maschinenposition:', error);
        }
        return false;
    }

    async clearAllMachinePositions(floorPlanId) {
        try {
            const floorPlan = this.getFloorPlan(floorPlanId);
            if (!floorPlan) return false;

            floorPlan.machinePositions = {};

            const response = await fetch(`/api/floor-plans/${floorPlanId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(floorPlan)
            });

            const result = await response.json();
            if (result.success) {
                const index = this.data.floorPlans.findIndex(fp => fp.id === floorPlanId);
                if (index !== -1) {
                    this.data.floorPlans[index] = result.floorPlan;
                }
                return true;
            }
        } catch (error) {
            console.error('Fehler beim Löschen aller Maschinenpositionen:', error);
        }
        return false;
    }

    getMachinePosition(floorPlanId, machineId) {
        const floorPlan = this.getFloorPlan(floorPlanId);
        if (floorPlan && floorPlan.machinePositions) {
            return floorPlan.machinePositions[machineId];
        }
        return null;
    }
}

// =============================================================================
// ENDE TEIL 1
// =============================================================================
// =============================================================================
// TEIL 2 - FLOOR PLAN MANAGER & LOGIN
// =============================================================================

// Floor Plan Manager Class
class FloorPlanManager {
    constructor() {
        this.canvas = document.getElementById('floorPlanCanvas');
        this.container = document.getElementById('floorPlanContainer');
        this.zoomLevel = 1;
        this.draggedMachine = null;
        this.offsetX = 0;
        this.offsetY = 0;
        this.currentFloorPlanId = null;
    }

    initialize() {
        const uploadBtn = document.getElementById('uploadFloorPlan');
        if (uploadBtn) {
            uploadBtn.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        const resetZoomBtn = document.getElementById('resetZoom');
        
        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoom(1.2));
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoom(0.8));
        if (resetZoomBtn) resetZoomBtn.addEventListener('click', () => this.zoom(1, true));
        
        if (currentUser && currentUser.role === 'admin') {
            const clearBtn = document.getElementById('clearAllPositions');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.clearAllPositions());
            }
        }

        this.renderFloorPlanSelector();
    }

    renderFloorPlanSelector() {
        const selectorContainer = document.getElementById('floorPlanSelector');
        if (!selectorContainer) return;
        
        const floorPlans = dataManager.getFloorPlans();

        if (floorPlans.length === 0) {
            selectorContainer.innerHTML = `
                <div style="padding: 12px; background: var(--gray-100); border-radius: 8px; color: var(--gray-600); text-align: center;">
                    ℹ️ Noch keine Hallenpläne vorhanden. Laden Sie oben einen Hallenplan hoch.
                </div>
            `;
            if (this.canvas) {
                this.canvas.style.backgroundImage = 'none';
                this.canvas.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: var(--gray-600);">
                        <p style="font-size: 18px; margin-bottom: 12px;">📋 Noch kein Hallenplan hochgeladen</p>
                        <p style="font-size: 14px;">Laden Sie oben einen Hallenplan hoch, um Maschinen zu positionieren.</p>
                    </div>
                `;
            }
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
                ${currentUser && currentUser.role === 'admin' ? `
                    <button class="btn btn-danger btn-small" id="deleteFloorPlanBtn">
                        🗑️ Hallenplan löschen
                    </button>
                ` : ''}
            </div>
        `;

        if (!this.currentFloorPlanId && floorPlans.length > 0) {
            this.currentFloorPlanId = floorPlans[0].id;
        }

        const selectElement = document.getElementById('floorPlanSelect');
        if (selectElement) {
            selectElement.addEventListener('change', (e) => {
                this.currentFloorPlanId = e.target.value;
                this.loadFloorPlan(this.currentFloorPlanId);
            });
        }

        if (currentUser && currentUser.role === 'admin') {
            const deleteBtn = document.getElementById('deleteFloorPlanBtn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.deleteCurrentFloorPlan();
                });
            }
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

        const reader = new FileReader();
        reader.onload = async (e) => {
            const imageData = e.target.result;
            const newFloorPlan = await dataManager.saveFloorPlanImage(name, imageData);
            if (newFloorPlan) {
                this.currentFloorPlanId = newFloorPlan.id;
                this.renderFloorPlanSelector();
                alert('✅ Hallenplan erfolgreich hochgeladen!');
            }
            event.target.value = '';
        };
        reader.readAsDataURL(file);
    }

    deleteCurrentFloorPlan() {
        if (!this.currentFloorPlanId) return;
        
        const floorPlan = dataManager.getFloorPlan(this.currentFloorPlanId);
        if (!floorPlan) return;

        if (confirm(`Möchten Sie den Hallenplan "${floorPlan.name}" wirklich löschen?`)) {
            this.currentFloorPlanId = null;
            this.renderFloorPlanSelector();
            alert('🗑️ Hallenplan gelöscht!');
        }
    }

    loadFloorPlan(floorPlanId) {
        const floorPlan = dataManager.getFloorPlan(floorPlanId);
        
        if (floorPlan && floorPlan.imageData && this.canvas) {
            const img = new Image();
            img.onload = () => {
                this.canvas.style.backgroundImage = `url(${floorPlan.imageData})`;
                this.canvas.style.width = img.width + 'px';
                this.canvas.style.height = img.height + 'px';
                this.canvas.innerHTML = '';
                this.renderMachineMarkers(floorPlan.machinePositions || {});
            };
            img.src = floorPlan.imageData;
        } else if (this.canvas) {
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
        if (!this.canvas) return;
        
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
        
        const canEdit = currentUser && currentUser.role === 'admin';
        
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
        if (!currentUser || currentUser.role !== 'admin') return;
        
        e.preventDefault();
        this.draggedMachine = marker;
        marker.classList.add('dragging');
        
        const rect = marker.getBoundingClientRect();
        
        this.offsetX = e.clientX - rect.left;
        this.offsetY = e.clientY - rect.top;

        const onMouseMove = (e) => {
            if (!this.draggedMachine || !this.canvas) return;
            
            const canvasRect = this.canvas.getBoundingClientRect();
            let newX = (e.clientX - canvasRect.left - this.offsetX) / this.zoomLevel;
            let newY = (e.clientY - canvasRect.top - this.offsetY) / this.zoomLevel;
            
            newX = Math.max(0, Math.min(newX, this.canvas.offsetWidth - marker.offsetWidth));
            newY = Math.max(0, Math.min(newY, this.canvas.offsetHeight - marker.offsetHeight));
            
            this.draggedMachine.style.left = newX + 'px';
            this.draggedMachine.style.top = newY + 'px';
        };

        const onMouseUp = async () => {
            if (this.draggedMachine) {
                this.draggedMachine.classList.remove('dragging');
                const x = parseInt(this.draggedMachine.style.left);
                const y = parseInt(this.draggedMachine.style.top);
                const machineId = this.draggedMachine.dataset.machineId;
                
                await dataManager.saveMachinePosition(this.currentFloorPlanId, machineId, x, y);
                this.draggedMachine = null;
            }
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    async removeMachine(machineId, event) {
        event.stopPropagation();
        if (confirm('Möchten Sie diese Maschine vom Hallenplan entfernen?')) {
            await dataManager.removeMachinePosition(this.currentFloorPlanId, machineId);
            this.loadFloorPlan(this.currentFloorPlanId);
        }
    }

    async clearAllPositions() {
        if (confirm('Möchten Sie wirklich alle Maschinenpositionen von diesem Hallenplan entfernen?')) {
            await dataManager.clearAllMachinePositions(this.currentFloorPlanId);
            this.loadFloorPlan(this.currentFloorPlanId);
        }
    }

    renderAvailableMachines() {
        const container = document.getElementById('availableMachines');
        if (!container) return;
        
        const machines = dataManager.getMachines();
        const floorPlan = dataManager.getFloorPlan(this.currentFloorPlanId);
        const placedMachines = floorPlan ? Object.keys(floorPlan.machinePositions || {}) : [];
        
        const availableMachines = machines.filter(m => !placedMachines.includes(m.id));

        if (availableMachines.length === 0) {
            container.innerHTML = '<p style="color: var(--gray-600); text-align: center;">Alle Maschinen sind bereits platziert</p>';
            return;
        }

        container.innerHTML = availableMachines.map(machine => `
            <div class="available-machine" draggable="${currentUser && currentUser.role === 'admin'}" 
                 ondragstart="floorPlanManager.dragStart(event, '${machine.id}')"
                 style="cursor: ${currentUser && currentUser.role === 'admin' ? 'grab' : 'default'};">
                <span class="status-badge status-${machine.status}">${getStatusLabel(machine.status)}</span>
                <strong>${machine.name}</strong>
                <small>${machine.type} - ${machine.serial}</small>
            </div>
        `).join('');
    }

    dragStart(event, machineId) {
        if (!currentUser || currentUser.role !== 'admin') {
            event.preventDefault();
            return;
        }
        event.dataTransfer.setData('machineId', machineId);
    }

    zoom(factor, reset = false) {
        if (!this.canvas) return;
        
        if (reset) {
            this.zoomLevel = 1;
        } else {
            this.zoomLevel *= factor;
            this.zoomLevel = Math.max(0.5, Math.min(3, this.zoomLevel));
        }
        this.canvas.style.transform = `scale(${this.zoomLevel})`;
    }
}

let floorPlanManager;

// =============================================================================
// LOGIN HANDLER - FIXED
// =============================================================================

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const user = dataManager.authenticateUser(username, password);
        
        if (user) {
            currentUser = user;
            
            const loginScreen = document.getElementById('loginScreen');
            const mainApp = document.getElementById('mainApp');
            
            if (loginScreen) loginScreen.style.display = 'none';
            if (mainApp) mainApp.style.display = 'flex';
            
            const userNameElement = document.getElementById('currentUserName');
            const userRoleElement = document.getElementById('currentUserRole');
            
            if (userNameElement) userNameElement.textContent = user.name;
            if (userRoleElement) userRoleElement.textContent = getRoleLabel(user.role);
            
            renderDashboard();
            renderMachines();
            renderParts();
            renderNotifications();
            updateLocationFilter();
            updateMachineTypeSelects();
            
            if (user.role === 'admin') {
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
                renderMaintenanceTemplates();
                renderUsers();
                renderMachineTypes();
                floorPlanManager = new FloorPlanManager();
                floorPlanManager.initialize();
            } else {
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
            }
        } else {
            alert('❌ Ungültiger Benutzername oder Passwort');
        }
    });
}

function getRoleLabel(role) {
    const labels = {
        'admin': '👑 Administrator',
        'technician': '🔧 Techniker',
        'viewer': '👁️ Betrachter'
    };
    return labels[role] || role;
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm('Möchten Sie sich wirklich abmelden?')) {
            currentUser = null;
            const loginScreen = document.getElementById('loginScreen');
            const mainApp = document.getElementById('mainApp');
            
            if (loginScreen) loginScreen.style.display = 'flex';
            if (mainApp) mainApp.style.display = 'none';
            
            const loginFormElement = document.getElementById('loginForm');
            if (loginFormElement) loginFormElement.reset();
        }
    });
}

// =============================================================================
// TAB NAVIGATION
// =============================================================================

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const targetElement = document.getElementById(target);
        if (targetElement) targetElement.classList.add('active');
        
        if (target === 'templates' && currentUser && currentUser.role === 'admin') {
            renderMaintenanceTemplates();
        }
    });
});

// =============================================================================
// ENDE TEIL 2
// =============================================================================
// =============================================================================
// TEIL 3 - DASHBOARD & MASCHINEN
// =============================================================================

// Dashboard
function renderDashboard() {
    const machines = dataManager.data.machines;
    const stats = {
        maintenance: machines.filter(m => m.status === 'maintenance').length,
        ok: machines.filter(m => m.status === 'ok').length,
        notOk: machines.filter(m => m.status === 'not-ok').length,
        serviced: machines.filter(m => m.status === 'serviced').length
    };

    const statMaintenance = document.getElementById('statMaintenance');
    const statOk = document.getElementById('statOk');
    const statNotOk = document.getElementById('statNotOk');
    const statServiced = document.getElementById('statServiced');
    
    if (statMaintenance) statMaintenance.textContent = stats.maintenance;
    if (statOk) statOk.textContent = stats.ok;
    if (statNotOk) statNotOk.textContent = stats.notOk;
    if (statServiced) statServiced.textContent = stats.serviced;
    
    document.querySelectorAll('.stat-card').forEach(card => {
        card.onclick = null;
    });
    
    const statMaintenanceCard = document.querySelector('.stat-maintenance');
    const statOkCard = document.querySelector('.stat-ok');
    const statNotOkCard = document.querySelector('.stat-not-ok');
    const statServicedCard = document.querySelector('.stat-serviced');
    
    if (statMaintenanceCard) statMaintenanceCard.onclick = () => filterByStatus('maintenance');
    if (statOkCard) statOkCard.onclick = () => filterByStatus('ok');
    if (statNotOkCard) statNotOkCard.onclick = () => filterByStatus('not-ok');
    if (statServicedCard) statServicedCard.onclick = () => filterByStatus('serviced');
}

function filterByStatus(status) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    const machinesTab = document.querySelector('[data-tab="machines"]');
    const machinesContent = document.getElementById('machines');
    
    if (machinesTab) machinesTab.classList.add('active');
    if (machinesContent) machinesContent.classList.add('active');
    
    const filterStatusElement = document.getElementById('filterStatus');
    if (filterStatusElement) filterStatusElement.value = status;
    
    renderMachines();
}

function renderNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
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
    if (!container) return;
    
    const searchElement = document.getElementById('searchMachines');
    const statusFilterElement = document.getElementById('filterStatus');
    const typeFilterElement = document.getElementById('filterType');
    const locationFilterElement = document.getElementById('filterLocation');
    
    const searchTerm = searchElement ? searchElement.value.toLowerCase() : '';
    const statusFilter = statusFilterElement ? statusFilterElement.value : 'all';
    const typeFilter = typeFilterElement ? typeFilterElement.value : 'all';
    const locationFilter = locationFilterElement ? locationFilterElement.value : 'all';

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
                        📋 ${template.name}
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
    
    const machinesTab = document.querySelector('[data-tab="machines"]');
    const machinesContent = document.getElementById('machines');
    
    if (machinesTab) machinesTab.classList.add('active');
    if (machinesContent) machinesContent.classList.add('active');
    
    const searchElement = document.getElementById('searchMachines');
    const statusFilterElement = document.getElementById('filterStatus');
    const typeFilterElement = document.getElementById('filterType');
    const locationFilterElement = document.getElementById('filterLocation');
    
    if (searchElement) searchElement.value = '';
    if (statusFilterElement) statusFilterElement.value = 'all';
    if (typeFilterElement) typeFilterElement.value = 'all';
    if (locationFilterElement) locationFilterElement.value = 'all';
    
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

// Event Listeners für Maschinen-Suche und Filter
const searchMachinesElement = document.getElementById('searchMachines');
const filterStatusElement = document.getElementById('filterStatus');
const filterTypeElement = document.getElementById('filterType');
const filterLocationElement = document.getElementById('filterLocation');

if (searchMachinesElement) searchMachinesElement.addEventListener('input', renderMachines);
if (filterStatusElement) filterStatusElement.addEventListener('change', renderMachines);
if (filterTypeElement) filterTypeElement.addEventListener('change', renderMachines);
if (filterLocationElement) filterLocationElement.addEventListener('change', renderMachines);

function updateLocationFilter() {
    const locations = [...new Set(dataManager.data.machines.map(m => m.location))];
    const select = document.getElementById('filterLocation');
    if (select) {
        select.innerHTML = '<option value="all">Alle Standorte</option>' +
            locations.map(loc => `<option value="${loc}">${loc}</option>`).join('');
    }
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
const addMachineBtn = document.getElementById('addMachineBtn');
if (addMachineBtn) {
    addMachineBtn.addEventListener('click', () => {
        if (currentUser && currentUser.role === 'viewer') {
            alert('Sie haben keine Berechtigung, Maschinen hinzuzufügen.');
            return;
        }
        updateMachineTypeSelects();
        updateTemplateSelect('machineTemplateSelect');
        const modal = document.getElementById('addMachineModal');
        if (modal) modal.classList.add('active');
    });
}

const addMachineForm = document.getElementById('addMachineForm');
if (addMachineForm) {
    addMachineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const machine = {
            name: document.getElementById('machineName').value,
            type: document.getElementById('machineType').value,
            serial: document.getElementById('machineSerial').value,
            location: document.getElementById('machineLocation').value,
            year: parseInt(document.getElementById('machineYear').value),
            status: 'ok',
            operatingHours: 0,
            maintenanceTemplateId: document.getElementById('machineTemplateSelect')?.value || null,
            lastMaintenance: new Date(),
            nextMaintenance: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        };

        await dataManager.addMachine(machine);
        closeModal('addMachineModal');
        addMachineForm.reset();
        renderMachines();
        renderDashboard();
        updateLocationFilter();
        if (floorPlanManager) {
            floorPlanManager.renderAvailableMachines();
        }
        alert('✅ Maschine erfolgreich hinzugefügt!');
    });
}

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

    const detailsTitle = document.getElementById('machineDetailsTitle');
    const detailsContent = document.getElementById('machineDetailsContent');
    
    if (detailsTitle) detailsTitle.textContent = machine.name;
    if (detailsContent) {
        detailsContent.innerHTML = `
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
                        <div style="font-weight: 600; margin-top: 4px;">${machine.year || 'N/A'}</div>
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
                        ${currentUser && currentUser.role !== 'viewer' ? `
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
                    <h4 style="margin-bottom: 12px;">📜 Wartungshistorie</h4>
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
                    ` : '<p style="color: var(--gray-600);">Keine Wartungshistorie vorhanden</p>'}
                </div>
            </div>
        `;
    }

    const modal = document.getElementById('machineDetailsModal');
    if (modal) modal.classList.add('active');
}

// Start Maintenance
function startMaintenance(machineId) {
    if (currentUser && currentUser.role === 'viewer') {
        alert('Sie haben keine Berechtigung, Wartungen durchzuführen.');
        return;
    }
    
    const machine = dataManager.getMachine(machineId);
    if (!machine) return;

    const machineIdField = document.getElementById('maintenanceMachineId');
    const machineNameField = document.getElementById('maintenanceMachineName');
    const operatingHoursField = document.getElementById('maintenanceOperatingHours');
    const statusField = document.getElementById('maintenanceStatus');
    
    if (machineIdField) machineIdField.value = machineId;
    if (machineNameField) machineNameField.textContent = machine.name;
    if (operatingHoursField) operatingHoursField.value = machine.operatingHours;
    if (statusField) statusField.value = machine.status;
    
    const template = machine.maintenanceTemplateId ? dataManager.getMaintenanceTemplate(machine.maintenanceTemplateId) : null;
    const checklistContainer = document.getElementById('maintenanceChecklist');
    
    if (checklistContainer) {
        if (template && template.components) {
            checklistContainer.innerHTML = `
                <h4 style="margin-bottom: 12px;">Wartungscheckliste (${template.name})</h4>
                ${template.components.map(comp => `
                    <div style="background: var(--gray-100); padding: 12px; border-radius: 6px; margin-bottom: 8px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" style="margin-right: 8px; transform: scale(1.2);">
                            <div>
                                <strong>${comp.name}</strong>
                                <div style="font-size: 12px; color: var(--gray-600); margin-top: 4px;">
                                    ${comp.tasks && comp.tasks.length > 0 ? comp.tasks.join(' • ') : 'Keine Aufgaben definiert'}
                                </div>
                            </div>
                        </label>
                    </div>
                `).join('')}
            `;
        } else {
            checklistContainer.innerHTML = '<p style="color: var(--gray-600);">Kein Wartungsplan zugewiesen</p>';
        }
    }

    const modal = document.getElementById('maintenanceModal');
    if (modal) modal.classList.add('active');
}

const maintenanceForm = document.getElementById('maintenanceForm');
if (maintenanceForm) {
    maintenanceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const machineId = document.getElementById('maintenanceMachineId').value;
        const operatingHours = parseInt(document.getElementById('maintenanceOperatingHours').value);
        const status = document.getElementById('maintenanceStatus').value;
        const notes = document.getElementById('maintenanceNotes').value;
        
        const record = {
            machineId: machineId,
            technician: currentUser.name,
            operatingHours: operatingHours,
            notes: notes,
            timestamp: new Date(),
            status: status
        };

        await dataManager.addMaintenanceRecord(record);
        
        const machine = dataManager.getMachine(machineId);
        if (machine) {
            await dataManager.updateMachine(machineId, {
                operatingHours: operatingHours,
                status: status,
                lastMaintenance: new Date()
            });
        }
        
        closeModal('maintenanceModal');
        maintenanceForm.reset();
        renderMachines();
        renderDashboard();
        alert('✅ Wartung erfolgreich dokumentiert!');
    });
}

// Show QR Code
function showQRCode(machineId) {
    const machine = dataManager.getMachine(machineId);
    if (!machine) return;

    const qrCodeTitle = document.getElementById('qrCodeTitle');
    const qrCodeContent = document.getElementById('qrCodeContent');
    
    if (qrCodeTitle) qrCodeTitle.textContent = machine.name;
    if (qrCodeContent) {
        qrCodeContent.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 96px; padding: 40px;">
                    📱
                </div>
                <div style="font-size: 24px; font-weight: 600; margin-bottom: 12px;">
                    ${machine.qrCode}
                </div>
                <div style="color: var(--gray-600);">
                    Seriennummer: ${machine.serial}
                </div>
            </div>
        `;
    }

    const modal = document.getElementById('qrCodeModal');
    if (modal) modal.classList.add('active');
}

// =============================================================================
// ENDE TEIL 3
// =============================================================================
// =============================================================================
// TEIL 4 - ERSATZTEILE, TEMPLATES, BENUTZER & INITIALISIERUNG
// =============================================================================

// Parts
function renderParts() {
    const container = document.getElementById('partsGrid');
    if (!container) return;
    
    const searchElement = document.getElementById('searchParts');
    const searchTerm = searchElement ? searchElement.value.toLowerCase() : '';
    
    let parts = dataManager.data.parts.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.partNumber.toLowerCase().includes(searchTerm)
    );

    if (parts.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gray-600);">Keine Ersatzteile gefunden</p>';
        return;
    }

    container.innerHTML = parts.map(part => {
        const lowStock = part.stock < part.minStock;
        return `
            <div class="part-card ${lowStock ? 'low-stock' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <div style="font-weight: 600; font-size: 16px; color: var(--gray-800);">${part.name}</div>
                        <div style="font-size: 13px; color: var(--gray-600); margin-top: 4px;">
                            Teilenummer: ${part.partNumber}
                        </div>
                    </div>
                    ${lowStock ? '<span class="badge badge-danger">⚠️ Bestand niedrig</span>' : ''}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0;">
                    <div>
                        <div style="font-size: 12px; color: var(--gray-600);">Lagerbestand</div>
                        <div style="font-size: 20px; font-weight: 700; color: ${lowStock ? 'var(--danger-color)' : 'var(--success-color)'};">
                            ${part.stock}
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--gray-600);">Mindestbestand</div>
                        <div style="font-size: 20px; font-weight: 700; color: var(--gray-700);">
                            ${part.minStock}
                        </div>
                    </div>
                </div>
                <div style="font-size: 12px; color: var(--gray-600); padding: 8px; background: var(--gray-100); border-radius: 6px; margin-top: 12px;">
                    Passend für: ${part.machineTypes.join(', ')}
                </div>
                ${currentUser && currentUser.role !== 'viewer' ? `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;">
                        <button class="btn btn-success btn-small" onclick="updatePartStock('${part.id}', 1)">+ Hinzufügen</button>
                        <button class="btn btn-warning btn-small" onclick="updatePartStock('${part.id}', -1)">- Entnehmen</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

const searchPartsElement = document.getElementById('searchParts');
if (searchPartsElement) searchPartsElement.addEventListener('input', renderParts);

const addPartBtn = document.getElementById('addPartBtn');
if (addPartBtn) {
    addPartBtn.addEventListener('click', () => {
        if (currentUser && currentUser.role === 'viewer') {
            alert('Sie haben keine Berechtigung, Ersatzteile hinzuzufügen.');
            return;
        }
        updateMachineTypeSelects();
        const modal = document.getElementById('addPartModal');
        if (modal) modal.classList.add('active');
    });
}

const addPartForm = document.getElementById('addPartForm');
if (addPartForm) {
    addPartForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const machineTypesSelect = document.getElementById('partMachineTypes');
        const selectedTypes = machineTypesSelect ? Array.from(machineTypesSelect.selectedOptions).map(opt => opt.value) : [];
        
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

        await dataManager.addPart(part);
        closeModal('addPartModal');
        addPartForm.reset();
        renderParts();
        alert('✅ Ersatzteil erfolgreich hinzugefügt!');
    });
}

async function updatePartStock(partId, change) {
    const part = dataManager.getPart(partId);
    if (!part) return;
    
    const newStock = part.stock + change;
    
    if (newStock < 0) {
        alert('Bestand kann nicht negativ werden!');
        return;
    }
    
    await dataManager.updatePart(partId, { stock: newStock });
    renderParts();
}

// Maintenance Templates
function renderMaintenanceTemplates() {
    const container = document.getElementById('templatesGrid');
    if (!container) return;
    
    const templates = dataManager.data.maintenanceTemplates;

    if (templates.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gray-600);">Keine Wartungspläne vorhanden</p>';
        return;
    }

    container.innerHTML = templates.map(template => {
        const machinesUsingTemplate = dataManager.data.machines.filter(m => m.maintenanceTemplateId === template.id);
        const sameTypeMachines = machinesUsingTemplate.filter(m => m.type === template.machineType);
        const differentTypeMachines = machinesUsingTemplate.filter(m => m.type !== template.machineType);
        
        return `
            <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid var(--primary-color);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div style="flex: 1;">
                        <div style="font-size: 20px; font-weight: 600; color: var(--gray-800); margin-bottom: 4px;">
                            ${template.name}
                        </div>
                        <div style="font-size: 14px; color: var(--gray-600); margin-top: 4px;">
                            ${template.description || 'Keine Beschreibung'}
                        </div>
                    </div>
                    <span class="badge badge-info" style="font-size: 14px; padding: 8px 16px;">
                        ${template.machineType}
                    </span>
                </div>
                
                <div style="background: var(--gray-100); padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <div style="font-weight: 600; margin-bottom: 12px; color: var(--gray-700);">
                        🔧 Komponenten (${template.components.length})
                    </div>
                    ${template.components.map(comp => `
                        <div style="background: white; padding: 10px 12px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                            <div style="flex: 1;">
                                <strong style="font-size: 14px;">${comp.name}</strong>
                                <div style="font-size: 12px; color: var(--gray-600); margin-top: 2px;">
                                    ${comp.category} • Alle ${comp.intervalHours}h
                                </div>
                            </div>
                            ${comp.tasks && comp.tasks.length > 0 ? `
                                <span class="badge badge-secondary" style="font-size: 11px;">
                                    ${comp.tasks.length} Aufgabe(n)
                                </span>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>

                ${machinesUsingTemplate.length > 0 ? `
                    <div style="padding: 12px; background: var(--gray-100); border-radius: 8px; margin-top: 12px;">
                        ${sameTypeMachines.length > 0 ? `
                            <div style="padding: 12px; background: rgba(34, 197, 94, 0.1); border-radius: 6px; margin-bottom: 8px;">
                                <div style="font-size: 13px; font-weight: 600; color: var(--success-color); margin-bottom: 6px;">
                                    ✅ Zugewiesen an ${template.machineType} Maschinen:
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

                <div style="display: flex; gap: 8px; margin-top: 16px;">
                    <button class="btn btn-info btn-small" onclick="editTemplate('${template.id}')">
                        ✏️ Bearbeiten
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteTemplate('${template.id}')">
                        🗑️ Löschen
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

const addTemplateBtn = document.getElementById('addTemplateBtn');
if (addTemplateBtn) {
    addTemplateBtn.addEventListener('click', () => {
        if (currentUser && currentUser.role === 'viewer') {
            alert('Sie haben keine Berechtigung, Wartungspläne zu erstellen.');
            return;
        }
        
        updateMachineTypeSelects();
        const container = document.getElementById('componentsContainer');
        if (container) container.innerHTML = '';
        addComponentField();
        
        const modal = document.getElementById('addTemplateModal');
        if (modal) modal.classList.add('active');
    });
}

const addComponentBtn = document.getElementById('addComponentBtn');
if (addComponentBtn) addComponentBtn.addEventListener('click', addComponentField);

function addComponentField(component = null) {
    const container = document.getElementById('componentsContainer');
    if (!container) return;
    
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

const addTemplateForm = document.getElementById('addTemplateForm');
if (addTemplateForm) {
    addTemplateForm.addEventListener('submit', async (e) => {
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
        
        await dataManager.addMaintenanceTemplate(template);
        closeModal('addTemplateModal');
        addTemplateForm.reset();
        renderMaintenanceTemplates();
        alert('✅ Wartungsplan erfolgreich erstellt!');
    });
}

function editTemplate(templateId) {
    const template = dataManager.getMaintenanceTemplate(templateId);
    if (!template) return;
    
    document.getElementById('editTemplateId').value = template.id;
    document.getElementById('editTemplateName').value = template.name;
    document.getElementById('editTemplateDescription').value = template.description || '';
    
    updateMachineTypeSelects();
    document.getElementById('editTemplateMachineType').value = template.machineType;
    
    const container = document.getElementById('editComponentsContainer');
    if (container) {
        container.innerHTML = '';
        template.components.forEach(component => {
            addEditComponentField(component);
        });
    }
    
    const modal = document.getElementById('editTemplateModal');
    if (modal) modal.classList.add('active');
}

const editAddComponentBtn = document.getElementById('editAddComponentBtn');
if (editAddComponentBtn) editAddComponentBtn.addEventListener('click', () => addEditComponentField());

function addEditComponentField(component = null) {
    const container = document.getElementById('editComponentsContainer');
    if (!container) return;
    
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

const editTemplateForm = document.getElementById('editTemplateForm');
if (editTemplateForm) {
    editTemplateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const templateId = document.getElementById('editTemplateId').value;
        const components = [];
        const componentItems = document.querySelectorAll('#editComponentsContainer .component-item');
        
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
        
        const updates = {
            name: document.getElementById('editTemplateName').value,
            description: document.getElementById('editTemplateDescription').value,
            machineType: document.getElementById('editTemplateMachineType').value,
            components
        };
        
        await dataManager.updateMaintenanceTemplate(templateId, updates);
        closeModal('editTemplateModal');
        renderMaintenanceTemplates();
        alert('✅ Wartungsplan erfolgreich aktualisiert!');
    });
}

async function deleteTemplate(templateId) {
    if (confirm('Möchten Sie diesen Wartungsplan wirklich löschen?')) {
        const result = await dataManager.deleteMaintenanceTemplate(templateId);
        if (result.error) {
            alert(result.error);
        } else {
            renderMaintenanceTemplates();
            alert('🗑️ Wartungsplan gelöscht!');
        }
    }
}

function openAssignTemplate(machineId) {
    const machine = dataManager.getMachine(machineId);
    if (!machine) return;

    document.getElementById('assignTemplateMachineId').value = machineId;
    
    const machineNameElement = document.getElementById('assignTemplateMachineName');
    if (machineNameElement) machineNameElement.textContent = machine.name;
    
    const select = document.getElementById('assignTemplateSelect');
    if (select) {
        const templates = dataManager.data.maintenanceTemplates;
        
        select.innerHTML = '<option value="">Kein Wartungsplan</option>' +
            templates.map(t => {
                const isRecommended = t.machineType === machine.type;
                return `<option value="${t.id}" ${machine.maintenanceTemplateId === t.id ? 'selected' : ''}>
                    ${isRecommended ? '✅ ' : ''}${t.name} (${t.machineType})
                </option>`;
            }).join('');
    }
    
    closeModal('machineDetailsModal');
    const modal = document.getElementById('assignTemplateModal');
    if (modal) modal.classList.add('active');
}

const assignTemplateForm = document.getElementById('assignTemplateForm');
if (assignTemplateForm) {
    assignTemplateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const machineId = document.getElementById('assignTemplateMachineId').value;
        const selectElement = document.getElementById('assignTemplateSelect');
        const templateId = selectElement ? selectElement.value || null : null;
        
        const machine = dataManager.getMachine(machineId);
        if (!machine) return;
        
        let componentStates = {};
        if (templateId) {
            const template = dataManager.getMaintenanceTemplate(templateId);
            if (template) {
                componentStates = dataManager.initializeComponentStates(template, machine.operatingHours);
            }
        }
        
        await dataManager.updateMachine(machineId, {
            maintenanceTemplateId: templateId,
            componentStates: componentStates
        });
        
        closeModal('assignTemplateModal');
        renderMachines();
        alert('✅ Wartungsplan zugewiesen!');
    });
}

function updateTemplateSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const machineTypeSelect = document.getElementById('machineType');
    const selectedType = machineTypeSelect ? machineTypeSelect.value : '';
    
    const allTemplates = dataManager.data.maintenanceTemplates;
    
    if (selectedType && allTemplates.length > 0) {
        const compatibleTemplates = allTemplates.filter(t => t.machineType === selectedType);
        const otherTemplates = allTemplates.filter(t => t.machineType !== selectedType);
        
        let optionsHtml = '<option value="">Kein Wartungsplan / Standard-Wartungsplan</option>';
        
        if (compatibleTemplates.length > 0) {
            optionsHtml += '<optgroup label="✅ Empfohlen für ' + selectedType + '">';
            compatibleTemplates.forEach(t => {
                optionsHtml += `<option value="${t.id}">${t.name} (${t.components.length} Komponenten)</option>`;
            });
            optionsHtml += '</optgroup>';
        }
        
        if (otherTemplates.length > 0) {
            optionsHtml += '<optgroup label="ℹ️ Andere Wartungspläne">';
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

// Users
function renderUsers() {
    const container = document.getElementById('usersGrid');
    if (!container) return;
    
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
                            🗑️ Löschen
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

const addUserBtn = document.getElementById('addUserBtn');
if (addUserBtn) {
    addUserBtn.addEventListener('click', () => {
        const modal = document.getElementById('addUserModal');
        if (modal) modal.classList.add('active');
    });
}

const addUserForm = document.getElementById('addUserForm');
if (addUserForm) {
    addUserForm.addEventListener('submit', async (e) => {
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

        await dataManager.addUser(user);
        closeModal('addUserModal');
        addUserForm.reset();
        renderUsers();
        alert('✅ Benutzer erstellt!');
    });
}

async function deleteUser(userId) {
    if (confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
        await dataManager.deleteUser(userId);
        renderUsers();
        alert('🗑️ Benutzer gelöscht!');
    }
}

// Machine Types
function renderMachineTypes() {
    const container = document.getElementById('machineTypesGrid');
    if (!container) return;
    
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
                    🗑️ Löschen
                </button>
            </div>
            <div style="font-size: 12px; color: var(--gray-600); margin-top: 12px;">
                Verwendet von: ${dataManager.data.machines.filter(m => m.type === type.code).length} Maschine(n)
            </div>
        </div>
    `).join('');
}

const addMachineTypeBtn = document.getElementById('addMachineTypeBtn');
if (addMachineTypeBtn) {
    addMachineTypeBtn.addEventListener('click', () => {
        const modal = document.getElementById('addMachineTypeModal');
        if (modal) modal.classList.add('active');
    });
}

const addMachineTypeForm = document.getElementById('addMachineTypeForm');
if (addMachineTypeForm) {
    addMachineTypeForm.addEventListener('submit', async (e) => {
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

        await dataManager.addMachineType(machineType);
        closeModal('addMachineTypeModal');
        addMachineTypeForm.reset();
        renderMachineTypes();
        updateMachineTypeSelects();
        alert('✅ Maschinentyp hinzugefügt!');
    });
}

async function deleteMachineType(typeId) {
    const result = await dataManager.deleteMachineType(typeId);
    if (result.error) {
        alert(result.error);
    } else {
        renderMachineTypes();
        updateMachineTypeSelects();
        alert('🗑️ Maschinentyp gelöscht!');
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
    
    const machineTypeSelect = document.getElementById('machineType');
    if (machineTypeSelect) {
        machineTypeSelect.addEventListener('change', () => {
            updateTemplateSelect('machineTemplateSelect');
        });
    }
}

// Helper Functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
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

setInterval(() => {
    if (currentUser) {
        renderDashboard();
        renderMachines();
        renderParts();
    }
}, 30000);

// =============================================================================
// APP-INITIALISIERUNG
// =============================================================================

const dataManager = new DataManager();
let currentUser = null;

async function initializeApp() {
    try {
        console.log('🔄 Lade Daten vom Server...');
        const success = await dataManager.loadData();
        if (!success) {
            throw new Error('Konnte Daten nicht laden');
        }
        console.log('✅ Daten erfolgreich geladen!');
        console.log('📊 Geladene Daten:', {
            machines: dataManager.data.machines.length,
            parts: dataManager.data.parts.length,
            templates: dataManager.data.maintenanceTemplates.length,
            users: dataManager.data.users.length
        });
    } catch (error) {
        console.error('❌ Initialisierungsfehler:', error);
        alert('Fehler beim Verbinden mit dem Server!\n\nBitte prüfen Sie:\n- Server läuft (node server.js)\n- Kein Firewall-Block\n- Browser-Konsole für Details');
    }
}

initializeApp();

console.log('✅ Feiler Wartungssoftware erfolgreich geladen (Server-Modus)');

// =============================================================================
// ENDE TEIL 4
// =============================================================================
