/**
 * Global Persistent State
 * Shares data across all dashboards using localStorage and real-time updates
 */

class GlobalState {
  constructor() {
    this.key = 'capb_global_state';
    this.state = this.loadState();
    this.listeners = [];
    this.syncInterval = null;
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.key);
      if (saved) {
        const state = JSON.parse(saved);
        return state;
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }

    // Return initial state
    return {
      patients: {
        'pat_001': {
          id: 'pat_001',
          name: 'John Doe',
          age: 45,
          severity: 9,
          condition: 'Critical - Head trauma',
          injuries: ['Head laceration', 'Possible fracture'],
          location: { lat: 23.8103, lng: 90.4125 },
          status: 'waiting',
          assignedUnitId: null,
          createdAt: new Date().toISOString(),
        },
        'pat_002': {
          id: 'pat_002',
          name: 'Jane Smith',
          age: 28,
          severity: 6,
          condition: 'Moderate - Chest pain',
          injuries: ['Rib fracture', 'Chest contusion'],
          location: { lat: 23.8140, lng: 90.4140 },
          status: 'waiting',
          assignedUnitId: null,
          createdAt: new Date().toISOString(),
        },
        'pat_003': {
          id: 'pat_003',
          name: 'Robert Johnson',
          age: 67,
          severity: 4,
          condition: 'Stable - Minor injuries',
          injuries: ['Laceration on arm'],
          location: { lat: 23.8080, lng: 90.4180 },
          status: 'waiting',
          assignedUnitId: null,
          createdAt: new Date().toISOString(),
        },
      },
      responders: {
        'resp_001': {
          id: 'resp_001',
          name: 'Ambulance 1',
          badge: 'AMB-001',
          type: 'ambulance',
          status: 'available',
          crew: 2,
          location: { lat: 23.8100, lng: 90.4100 },
          baseLocation: { lat: 23.8100, lng: 90.4100 },
          assignedPatientId: null,
          eta: null,
          path: null,
          pathIndex: 0,
          createdAt: new Date().toISOString(),
        },
        'resp_002': {
          id: 'resp_002',
          name: 'Fire Unit 1',
          badge: 'FIRE-001',
          type: 'fire',
          status: 'available',
          crew: 4,
          location: { lat: 23.8120, lng: 90.4150 },
          baseLocation: { lat: 23.8120, lng: 90.4150 },
          assignedPatientId: null,
          eta: null,
          path: null,
          pathIndex: 0,
          createdAt: new Date().toISOString(),
        },
        'resp_003': {
          id: 'resp_003',
          name: 'Rescue Team',
          badge: 'RES-001',
          type: 'rescue',
          status: 'available',
          crew: 3,
          location: { lat: 23.8050, lng: 90.4050 },
          baseLocation: { lat: 23.8050, lng: 90.4050 },
          assignedPatientId: null,
          eta: null,
          path: null,
          pathIndex: 0,
          createdAt: new Date().toISOString(),
        },
        'resp_004': {
          id: 'resp_004',
          name: 'Ambulance 2',
          badge: 'AMB-002',
          type: 'ambulance',
          status: 'available',
          crew: 2,
          location: { lat: 23.8110, lng: 90.4130 },
          baseLocation: { lat: 23.8110, lng: 90.4130 },
          assignedPatientId: null,
          eta: null,
          path: null,
          pathIndex: 0,
          createdAt: new Date().toISOString(),
        },
      },
      broadcasts: [],
      lastUpdate: new Date().toISOString(),
    };
  }

  saveState() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.state));
      this.state.lastUpdate = new Date().toISOString();
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }

  generatePath(startLat, startLng, endLat, endLng, steps = 15) {
    const path = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      path.push({
        lat: startLat + (endLat - startLat) * t,
        lng: startLng + (endLng - startLng) * t,
      });
    }
    return path;
  }

  updatePositions() {
    // Move responders along their paths
    Object.values(this.state.responders).forEach((responder) => {
      if (responder.assignedPatientId && responder.path) {
        const patient = this.state.patients[responder.assignedPatientId];
        
        if (patient && responder.pathIndex < responder.path.length - 1) {
          responder.pathIndex++;
          const nextPoint = responder.path[responder.pathIndex];
          responder.location.lat = nextPoint.lat;
          responder.location.lng = nextPoint.lng;

          const remaining = responder.path.length - responder.pathIndex;
          responder.eta = Math.max(1, Math.ceil((remaining / responder.path.length) * 5));

          if (responder.pathIndex >= responder.path.length - 1) {
            responder.location.lat = patient.location.lat;
            responder.location.lng = patient.location.lng;
            responder.status = 'on-scene';
            responder.eta = 0;
            patient.status = 'in-treatment';
          } else {
            responder.status = 'en-route';
          }
        }
      }
    });

    this.saveState();
    this.notifyListeners();
  }

  startSimulation() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      this.updatePositions();
    }, 1000);
  }

  stopSimulation() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Patient Methods
  getPatient(id) {
    return this.state.patients[id];
  }

  getPatients() {
    return Object.values(this.state.patients);
  }

  updatePatient(id, updates) {
    if (this.state.patients[id]) {
      this.state.patients[id] = { ...this.state.patients[id], ...updates };
      this.saveState();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  // Responder Methods
  getResponder(id) {
    return this.state.responders[id];
  }

  getResponders() {
    return Object.values(this.state.responders);
  }

  updateResponder(id, updates) {
    if (this.state.responders[id]) {
      this.state.responders[id] = { ...this.state.responders[id], ...updates };
      this.saveState();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  // Assignment Methods
  assignUnit(responderId, patientId) {
    const responder = this.state.responders[responderId];
    const patient = this.state.patients[patientId];

    if (!responder || !patient) return false;

    // Unassign previous patient
    if (responder.assignedPatientId) {
      const prevPatient = this.state.patients[responder.assignedPatientId];
      if (prevPatient) prevPatient.assignedUnitId = null;
    }

    // Create path
    const path = this.generatePath(
      responder.location.lat,
      responder.location.lng,
      patient.location.lat,
      patient.location.lng,
      15
    );

    // Update responder
    responder.assignedPatientId = patientId;
    responder.status = 'en-route';
    responder.eta = 5;
    responder.path = path;
    responder.pathIndex = 0;

    // Update patient
    patient.assignedUnitId = responderId;
    patient.status = 'in-transit';

    this.saveState();
    this.notifyListeners();
    return true;
  }

  unassignUnit(responderId) {
    const responder = this.state.responders[responderId];
    if (!responder) return false;

    if (responder.assignedPatientId) {
      const patient = this.state.patients[responder.assignedPatientId];
      if (patient) patient.assignedUnitId = null;
    }

    responder.assignedPatientId = null;
    responder.status = 'available';
    responder.location = { ...responder.baseLocation };
    responder.eta = null;
    responder.path = null;
    responder.pathIndex = 0;

    this.saveState();
    this.notifyListeners();
    return true;
  }

  completeAssignment(patientId) {
    const patient = this.state.patients[patientId];
    if (!patient || !patient.assignedUnitId) return false;

    const responder = this.state.responders[patient.assignedUnitId];
    if (responder) {
      responder.assignedPatientId = null;
      responder.status = 'available';
      responder.location = { ...responder.baseLocation };
      responder.eta = null;
      responder.path = null;
      responder.pathIndex = 0;
    }

    patient.assignedUnitId = null;
    patient.status = 'discharged';

    this.saveState();
    this.notifyListeners();
    return true;
  }

  // Subscription
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => {
      listener({
        patients: this.getPatients(),
        responders: this.getResponders(),
      });
    });
  }

  broadcast(message, priority) {
    this.state.broadcasts.unshift({
      id: `bc_${Date.now()}`,
      message,
      priority,
      createdAt: new Date().toISOString(),
    });
    if (this.state.broadcasts.length > 50) this.state.broadcasts.pop();
    this.saveState();
  }

  getBroadcasts() {
    return this.state.broadcasts;
  }

  clear() {
    localStorage.removeItem(this.key);
    this.state = this.loadState();
    this.saveState();
  }
}

// Global instance
const globalState = new GlobalState();