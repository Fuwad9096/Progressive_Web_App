/**
 * CAPB Data Store
 * Centralized state management with localStorage persistence
 */

class DataStore {
  constructor() {
    this.data = {
      auth: this.getAuth(),
      patients: this.getPatients(),
      responders: this.getResponders(),
      assignments: this.getAssignments(),
      broadcasts: this.getBroadcasts(),
    };
    this.listeners = [];
  }

  // Auth Methods
  getAuth() {
    try {
      return JSON.parse(localStorage.getItem('auth')) || null;
    } catch (e) {
      return null;
    }
  }

  setAuth(auth) {
    this.data.auth = auth;
    localStorage.setItem('auth', JSON.stringify(auth));
    this.notify();
  }

  logout() {
    this.data.auth = null;
    localStorage.removeItem('auth');
    this.notify();
  }

  // Patients
  getPatients() {
    try {
      const patients = JSON.parse(localStorage.getItem('patients')) || [];
      return new Map(patients.map(p => [p.id, p]));
    } catch (e) {
      return new Map();
    }
  }

  addPatient(patient) {
    this.data.patients.set(patient.id, patient);
    this.persistPatients();
    this.notify();
  }

  updatePatient(id, updates) {
    const patient = this.data.patients.get(id);
    if (patient) {
      Object.assign(patient, updates);
      this.persistPatients();
      this.notify();
    }
  }

  persistPatients() {
    const patients = Array.from(this.data.patients.values());
    localStorage.setItem('patients', JSON.stringify(patients));
  }

  getAllPatients() {
    return Array.from(this.data.patients.values());
  }

  // Responders
  getResponders() {
    try {
      const responders = JSON.parse(localStorage.getItem('responders')) || [];
      return new Map(responders.map(r => [r.id, r]));
    } catch (e) {
      return new Map();
    }
  }

  addResponder(responder) {
    this.data.responders.set(responder.id, responder);
    this.persistResponders();
    this.notify();
  }

  updateResponder(id, updates) {
    const responder = this.data.responders.get(id);
    if (responder) {
      Object.assign(responder, updates);
      this.persistResponders();
      this.notify();
    }
  }

  persistResponders() {
    const responders = Array.from(this.data.responders.values());
    localStorage.setItem('responders', JSON.stringify(responders));
  }

  getAllResponders() {
    return Array.from(this.data.responders.values());
  }

  // Assignments
  getAssignments() {
    try {
      const assignments = JSON.parse(localStorage.getItem('assignments')) || [];
      return new Map(assignments.map(a => [a.id, a]));
    } catch (e) {
      return new Map();
    }
  }

  createAssignment(patientId, responderId) {
    const assignment = {
      id: `assign_${Date.now()}`,
      patientId,
      responderId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.data.assignments.set(assignment.id, assignment);
    this.persistAssignments();
    this.notify();
    return assignment;
  }

  persistAssignments() {
    const assignments = Array.from(this.data.assignments.values());
    localStorage.setItem('assignments', JSON.stringify(assignments));
  }

  // Broadcasts
  getBroadcasts() {
    try {
      return JSON.parse(localStorage.getItem('broadcasts')) || [];
    } catch (e) {
      return [];
    }
  }

  addBroadcast(message) {
    this.data.broadcasts.unshift(message);
    localStorage.setItem('broadcasts', JSON.stringify(this.data.broadcasts.slice(0, 50)));
    this.notify();
  }

  // Observable
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.data));
  }
}

// Global store instance
const store = new DataStore();