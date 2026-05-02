/**
 * CAPB Global State Management System
 * Vanilla JavaScript state management with subscriptions
 */

class StateManager {
  constructor() {
    this.state = {
      currentUser: null,
      patients: new Map(),
      responders: new Map(),
      assignments: new Map(),
      sosRecords: new Map(),
      broadcasts: [],
      notifications: [],
    };

    this.subscribers = [];
    this.actionHistory = [];
    this.maxHistory = 100;
    this.storageKey = 'capb_state_v1';
    this.simulationInterval = null;
    
    this.loadFromStorage();
  }

  /**
   * Storage Management
   */
  saveToStorage() {
    try {
      const stateToSave = {
        currentUser: this.state.currentUser,
        patients: Array.from(this.state.patients.entries()),
        responders: Array.from(this.state.responders.entries()).map(([id, r]) => [
          id,
          {
            ...r,
            path: r.path,
          }
        ]),
        assignments: Array.from(this.state.assignments.entries()),
        sosRecords: Array.from(this.state.sosRecords.entries()),
        broadcasts: this.state.broadcasts.slice(0, 50),
        notifications: this.state.notifications.slice(0, 50),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        this.state.currentUser = data.currentUser;
        this.state.patients = new Map(data.patients);
        this.state.responders = new Map(data.responders);
        this.state.assignments = new Map(data.assignments);
        this.state.sosRecords = new Map(data.sosRecords || []);
        this.state.broadcasts = data.broadcasts || [];
        this.state.notifications = data.notifications || [];
        return;
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
    
    this.initializeDefaultData();
  }

  initializeDefaultData() {
    // Default patients
    this.state.patients.set('pat_001', {
      id: 'pat_001',
      name: 'John Doe',
      age: 45,
      severity: 9,
      condition: 'Critical - Head trauma',
      injuries: ['Head laceration', 'Possible fracture'],
      location: { lat: 23.8103, lng: 90.4125 },
      status: 'waiting',
      assignedUnitId: null,
      vitals: { heartRate: 92, bloodPressure: '140/90', temperature: 37.5 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.state.patients.set('pat_002', {
      id: 'pat_002',
      name: 'Jane Smith',
      age: 28,
      severity: 6,
      condition: 'Moderate - Chest pain',
      injuries: ['Rib fracture', 'Chest contusion'],
      location: { lat: 23.8140, lng: 90.4140 },
      status: 'waiting',
      assignedUnitId: null,
      vitals: { heartRate: 88, bloodPressure: '128/82', temperature: 36.8 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.state.patients.set('pat_003', {
      id: 'pat_003',
      name: 'Robert Johnson',
      age: 67,
      severity: 4,
      condition: 'Stable - Minor injuries',
      injuries: ['Laceration on arm'],
      location: { lat: 23.8080, lng: 90.4180 },
      status: 'waiting',
      assignedUnitId: null,
      vitals: { heartRate: 72, bloodPressure: '120/78', temperature: 36.9 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Default responders
    this.state.responders.set('resp_001', {
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
      acceptedAssignment: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.state.responders.set('resp_002', {
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
      acceptedAssignment: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.state.responders.set('resp_003', {
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
      acceptedAssignment: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.state.responders.set('resp_004', {
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
      acceptedAssignment: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.saveToStorage();
  }

  /**
   * User Management
   */
  setCurrentUser(user) {
    this.state.currentUser = user;
    this.logAction('SET_USER', { userId: user.id, role: user.role });
    this.saveToStorage();
    this.notify();
    return this.state.currentUser;
  }

  getCurrentUser() {
    return this.state.currentUser;
  }

  clearCurrentUser() {
    this.state.currentUser = null;
    this.logAction('CLEAR_USER');
    this.saveToStorage();
    this.notify();
  }

  /**
   * Patient Management
   */
  addPatient(patientData) {
    const patient = {
      id: patientData.id || `pat_${Date.now()}`,
      ...patientData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.patients.set(patient.id, patient);
    this.logAction('ADD_PATIENT', { patientId: patient.id, severity: patient.severity });
    this.addNotification(`Patient added: ${patient.name}`, 'success');
    this.saveToStorage();
    this.notify();
    return patient;
  }

  getPatient(patientId) {
    return this.state.patients.get(patientId);
  }

  updatePatient(patientId, updates) {
    const patient = this.state.patients.get(patientId);
    if (!patient) return null;

    const updated = {
      ...patient,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.state.patients.set(patientId, updated);
    this.logAction('UPDATE_PATIENT', { patientId, fields: Object.keys(updates) });
    this.saveToStorage();
    this.notify();
    return updated;
  }

  getAllPatients() {
    return Array.from(this.state.patients.values());
  }

  /**
   * SOS Records Management
   */
  addSOSRecord(sosRecord) {
    this.state.sosRecords.set(sosRecord.id, sosRecord);
    this.logAction('ADD_SOS_RECORD', { sosId: sosRecord.id, severity: sosRecord.severity });
    this.addNotification(`SOS Alert: ${sosRecord.name} - Severity ${sosRecord.severity}/10`, 'error');
    this.saveToStorage();
    this.notify();
    return sosRecord;
  }

  getSOSRecord(sosId) {
    return this.state.sosRecords.get(sosId);
  }

  updateSOSRecord(sosId, updates) {
    const sos = this.state.sosRecords.get(sosId);
    if (!sos) return null;

    const updated = {
      ...sos,
      ...updates,
      lastUpdate: new Date().toISOString(),
    };

    this.state.sosRecords.set(sosId, updated);
    this.logAction('UPDATE_SOS_RECORD', { sosId });
    this.saveToStorage();
    this.notify();
    return updated;
  }

  getAllSOSRecords() {
    return Array.from(this.state.sosRecords.values());
  }

  getActiveSOSRecords() {
    return this.getAllSOSRecords().filter(sos => sos.status === 'active');
  }

  closeSOSRecord(sosId) {
    const sos = this.state.sosRecords.get(sosId);
    if (!sos) return null;

    return this.updateSOSRecord(sosId, {
      status: 'resolved',
      lastUpdate: new Date().toISOString(),
    });
  }

  /**
   * Responder Management
   */
  addResponder(responderData) {
    const responder = {
      id: responderData.id || `resp_${Date.now()}`,
      ...responderData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.responders.set(responder.id, responder);
    this.logAction('ADD_RESPONDER', { responderId: responder.id, type: responder.type });
    this.saveToStorage();
    this.notify();
    return responder;
  }

  getResponder(responderId) {
    return this.state.responders.get(responderId);
  }

  updateResponder(responderId, updates) {
    const responder = this.state.responders.get(responderId);
    if (!responder) return null;

    const updated = {
      ...responder,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.state.responders.set(responderId, updated);
    this.logAction('UPDATE_RESPONDER', { responderId, fields: Object.keys(updates) });
    this.saveToStorage();
    this.notify();
    return updated;
  }

  getAllResponders() {
    return Array.from(this.state.responders.values());
  }

  /**
   * Assignment Management
   */
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

  assignResponderToPatient(responderId, patientId) {
    const responder = this.state.responders.get(responderId);
    const patient = this.state.patients.get(patientId);

    if (!responder || !patient) {
      console.error('Responder or patient not found');
      return null;
    }

    // Unassign any previous patient
    if (responder.assignedPatientId) {
      const prevPatient = this.state.patients.get(responder.assignedPatientId);
      if (prevPatient) {
        this.updatePatient(prevPatient.id, { assignedUnitId: null });
      }
    }

    // Generate path
    const path = this.generatePath(
      responder.location.lat,
      responder.location.lng,
      patient.location.lat,
      patient.location.lng,
      15
    );

    // Update responder - IMMEDIATELY start animation
    this.updateResponder(responderId, {
      assignedPatientId: patientId,
      status: 'en-route',
      eta: 5,
      path: path,
      pathIndex: 0,
      acceptedAssignment: false,
    });

    // Update patient
    this.updatePatient(patientId, {
      assignedUnitId: responderId,
      status: 'in-transit',
    });

    const assignment = {
      id: `assign_${Date.now()}`,
      responderId,
      patientId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.state.assignments.set(assignment.id, assignment);
    this.logAction('ASSIGN_RESPONDER', { responderId, patientId });
    this.addNotification(`${responder.name} assigned to ${patient.name} - En route!`, 'success');
    this.saveToStorage();
    this.notify();
    return assignment;
  }

  acceptAssignment(responderId) {
    const responder = this.state.responders.get(responderId);
    if (!responder || !responder.assignedPatientId) return null;

    this.updateResponder(responderId, { acceptedAssignment: true });
    this.logAction('ACCEPT_ASSIGNMENT', { responderId });
    this.addNotification(`${responder.name} accepted assignment`, 'success');
    return true;
  }

  completeAssignment(responderId) {
    const responder = this.state.responders.get(responderId);
    if (!responder) return null;

    if (responder.assignedPatientId) {
      const patient = this.state.patients.get(responder.assignedPatientId);
      if (patient) {
        this.updatePatient(patient.id, { 
          assignedUnitId: null,
          status: 'discharged',
        });
      }
    }

    this.updateResponder(responderId, {
      assignedPatientId: null,
      status: 'available',
      location: { ...responder.baseLocation },
      eta: null,
      path: null,
      pathIndex: 0,
      acceptedAssignment: false,
    });

    this.logAction('COMPLETE_ASSIGNMENT', { responderId });
    this.addNotification(`${responder.name} completed assignment`, 'success');
    return true;
  }

  getAssignment(assignmentId) {
    return this.state.assignments.get(assignmentId);
  }

  getAllAssignments() {
    return Array.from(this.state.assignments.values());
  }

  /**
   * Simulation - Position Updates
   */
  updatePositions() {
    this.state.responders.forEach((responder) => {
      if (responder.assignedPatientId && responder.path) {
        const patient = this.state.patients.get(responder.assignedPatientId);
        
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
          }
        }
      }
    });

    this.saveToStorage();
    this.notify();
  }

  startSimulation() {
    if (this.simulationInterval) clearInterval(this.simulationInterval);
    this.simulationInterval = setInterval(() => this.updatePositions(), 1000);
  }

  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  /**
   * Broadcasting
   */
  broadcast(message, priority = 'normal') {
    const broadcast = {
      id: `bc_${Date.now()}`,
      message,
      priority,
      createdAt: new Date().toISOString(),
    };

    this.state.broadcasts.unshift(broadcast);
    if (this.state.broadcasts.length > 50) this.state.broadcasts.pop();
    
    this.logAction('BROADCAST', { priority, messageLength: message.length });
    this.saveToStorage();
    this.notify();
    return broadcast;
  }

  getBroadcasts() {
    return this.state.broadcasts;
  }

  /**
   * Notifications
   */
  addNotification(message, type = 'info') {
    const notification = {
      id: `notif_${Date.now()}`,
      message,
      type,
      createdAt: new Date().toISOString(),
    };

    this.state.notifications.unshift(notification);
    if (this.state.notifications.length > 50) this.state.notifications.pop();
    
    this.saveToStorage();
    this.notify();
    return notification;
  }

  getNotifications() {
    return this.state.notifications;
  }

  /**
   * Action History & Logging
   */
  logAction(actionType, details = {}) {
    this.actionHistory.push({
      type: actionType,
      details,
      timestamp: new Date().toISOString(),
    });

    if (this.actionHistory.length > this.maxHistory) {
      this.actionHistory.shift();
    }
  }

  getActionHistory(limit = 20) {
    return this.actionHistory.slice(-limit).reverse();
  }

  /**
   * Subscription System
   */
  subscribe(callback) {
    this.subscribers.push(callback);
    callback(this.getStateSnapshot());
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify() {
    const snapshot = this.getStateSnapshot();
    this.subscribers.forEach(callback => {
      try {
        callback(snapshot);
      } catch (e) {
        console.error('Subscriber error:', e);
      }
    });
  }

  getStateSnapshot() {
    return {
      currentUser: this.state.currentUser,
      patients: this.getAllPatients(),
      responders: this.getAllResponders(),
      assignments: this.getAllAssignments(),
      sosRecords: this.getActiveSOSRecords(),
      broadcasts: this.getBroadcasts(),
      notifications: this.getNotifications(),
      stats: this.calculateStats(),
    };
  }

  /**
   * Statistics
   */
  calculateStats() {
    const patients = this.getAllPatients();
    const responders = this.getAllResponders();
    const activeSOS = this.getActiveSOSRecords();

    return {
      totalPatients: patients.length,
      criticalPatients: patients.filter(p => p.severity >= 8).length,
      moderatePatients: patients.filter(p => p.severity >= 5 && p.severity < 8).length,
      totalResponders: responders.length,
      availableResponders: responders.filter(r => r.status === 'available').length,
      deployedResponders: responders.filter(r => r.status !== 'available' && r.status !== 'offline').length,
      onSceneResponders: responders.filter(r => r.status === 'on-scene').length,
      assignedPatients: patients.filter(p => p.assignedUnitId).length,
      enRouteResponders: responders.filter(r => r.status === 'en-route').length,
      activeSOSAlerts: activeSOS.length,
      criticalSOSAlerts: activeSOS.filter(s => s.severity >= 8).length,
    };
  }

  /**
   * Reset & Clear
   */
  clearAll() {
    this.state = {
      currentUser: null,
      patients: new Map(),
      responders: new Map(),
      assignments: new Map(),
      sosRecords: new Map(),
      broadcasts: [],
      notifications: [],
    };
    this.actionHistory = [];
    localStorage.removeItem(this.storageKey);
    this.notify();
  }

  reset() {
    this.clearAll();
    this.initializeDefaultData();
  }
}

// Global instance
const stateManager = new StateManager();