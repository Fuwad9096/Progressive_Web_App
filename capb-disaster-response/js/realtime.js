/**
 * Real-Time Data Service
 * Simulates live updates for patients, responders, and assignments
 */

class RealtimeService {
  constructor(store) {
    this.store = store;
    this.listeners = [];
    this.updateInterval = null;
    this.patients = new Map();
    this.responders = new Map();
    this.assignments = new Map();
    this.broadcasts = [];
    this.initializeMockData();
  }

  initializeMockData() {
    // Initialize patients
    this.patients.set('pat_001', {
      id: 'pat_001',
      name: 'John Doe',
      age: 45,
      severity: 9,
      condition: 'Critical - Head trauma',
      injuries: ['Head laceration', 'Possible fracture'],
      location: { lat: 23.8103, lng: 90.4125 },
      status: 'waiting',
      assignedUnitId: null,
      createdAt: new Date(),
    });

    this.patients.set('pat_002', {
      id: 'pat_002',
      name: 'Jane Smith',
      age: 28,
      severity: 6,
      condition: 'Moderate - Chest pain',
      injuries: ['Rib fracture', 'Chest contusion'],
      location: { lat: 23.8140, lng: 90.4140 },
      status: 'waiting',
      assignedUnitId: null,
      createdAt: new Date(),
    });

    this.patients.set('pat_003', {
      id: 'pat_003',
      name: 'Robert Johnson',
      age: 67,
      severity: 4,
      condition: 'Stable - Minor injuries',
      injuries: ['Laceration on arm'],
      location: { lat: 23.8080, lng: 90.4180 },
      status: 'waiting',
      assignedUnitId: null,
      createdAt: new Date(),
    });

    // Initialize responders with fixed paths
    this.responders.set('resp_001', {
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
      createdAt: new Date(),
    });

    this.responders.set('resp_002', {
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
      createdAt: new Date(),
    });

    this.responders.set('resp_003', {
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
      createdAt: new Date(),
    });

    this.responders.set('resp_004', {
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
      createdAt: new Date(),
    });
  }

  start() {
    // Update data every 1 second
    this.updateInterval = setInterval(() => {
      this.updatePositions();
      this.notifyListeners();
    }, 1000);
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
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
    // Move responders along their assigned paths
    this.responders.forEach((responder) => {
      if (responder.assignedPatientId && responder.path) {
        const patient = this.patients.get(responder.assignedPatientId);
        
        if (patient && responder.pathIndex < responder.path.length - 1) {
          responder.pathIndex++;
          const nextPoint = responder.path[responder.pathIndex];
          responder.location.lat = nextPoint.lat;
          responder.location.lng = nextPoint.lng;

          // Calculate ETA
          const remaining = responder.path.length - responder.pathIndex;
          responder.eta = Math.max(1, Math.ceil((remaining / responder.path.length) * 5));

          // Check if arrived
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
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => {
      listener({
        patients: Array.from(this.patients.values()),
        responders: Array.from(this.responders.values()),
      });
    });
  }

  getPatients() {
    return Array.from(this.patients.values());
  }

  getResponders() {
    return Array.from(this.responders.values());
  }

  getPatient(id) {
    return this.patients.get(id);
  }

  getResponder(id) {
    return this.responders.get(id);
  }

  assignUnit(responderId, patientId) {
    const responder = this.responders.get(responderId);
    const patient = this.patients.get(patientId);

    if (responder && patient) {
      // Unassign any previous patient
      if (responder.assignedPatientId) {
        const prevPatient = this.patients.get(responder.assignedPatientId);
        if (prevPatient) prevPatient.assignedUnitId = null;
      }

      responder.assignedPatientId = patientId;
      responder.status = 'en-route';
      responder.pathIndex = 0;
      
      // Generate path from responder to patient
      responder.path = this.generatePath(
        responder.location.lat,
        responder.location.lng,
        patient.location.lat,
        patient.location.lng,
        15
      );

      patient.assignedUnitId = responderId;
      patient.status = 'in-transit';
      
      responder.eta = 5;
      
      return true;
    }
    return false;
  }

  unassignUnit(responderId) {
    const responder = this.responders.get(responderId);
    if (responder) {
      if (responder.assignedPatientId) {
        const patient = this.patients.get(responder.assignedPatientId);
        if (patient) patient.assignedUnitId = null;
      }
      responder.assignedPatientId = null;
      responder.status = 'available';
      responder.location = { ...responder.baseLocation };
      responder.eta = null;
      responder.path = null;
      responder.pathIndex = 0;
      return true;
    }
    return false;
  }

  completeAssignment(patientId) {
    const patient = this.patients.get(patientId);
    if (patient && patient.assignedUnitId) {
      const responder = this.responders.get(patient.assignedUnitId);
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
      return true;
    }
    return false;
  }

  updatePatientStatus(patientId, status) {
    const patient = this.patients.get(patientId);
    if (patient) {
      patient.status = status;
      return true;
    }
    return false;
  }

  broadcast(message, recipients, priority) {
    this.broadcasts.unshift({
      id: `bc_${Date.now()}`,
      message,
      recipients,
      priority,
      createdAt: new Date(),
    });
    if (this.broadcasts.length > 50) this.broadcasts.pop();
  }

  getBroadcasts() {
    return this.broadcasts;
  }
}

const realtimeService = new RealtimeService(store);