/**
 * SOS Database Service
 * Handles IndexedDB for SOS records, patients, and emergency data
 */

class SOSDatabase {
  constructor() {
    this.dbName = 'CAPB_SOS_DB';
    this.version = 1;
    this.db = null;
    this.stores = {
      sos_records: 'id',
      emergency_contacts: 'id',
      locations_history: 'id',
      survivors: 'id',
    };
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // SOS Records Store
        if (!db.objectStoreNames.contains('sos_records')) {
          const sosStore = db.createObjectStore('sos_records', { keyPath: 'id' });
          sosStore.createIndex('timestamp', 'timestamp', { unique: false });
          sosStore.createIndex('status', 'status', { unique: false });
          sosStore.createIndex('userId', 'userId', { unique: false });
        }

        // Emergency Contacts Store
        if (!db.objectStoreNames.contains('emergency_contacts')) {
          db.createObjectStore('emergency_contacts', { keyPath: 'id' });
        }

        // Location History Store
        if (!db.objectStoreNames.contains('locations_history')) {
          const locStore = db.createObjectStore('locations_history', { keyPath: 'id' });
          locStore.createIndex('timestamp', 'timestamp', { unique: false });
          locStore.createIndex('sosId', 'sosId', { unique: false });
        }

        // Survivors Store
        if (!db.objectStoreNames.contains('survivors')) {
          const survStore = db.createObjectStore('survivors', { keyPath: 'id' });
          survStore.createIndex('status', 'status', { unique: false });
          survStore.createIndex('severity', 'severity', { unique: false });
        }
      };
    });
  }

  /**
   * Create SOS Record
   */
  async createSOSRecord(sosData) {
    const sosRecord = {
      id: `sos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: sosData.userId || null,
      name: sosData.name || 'Unknown',
      age: sosData.age || null,
      severity: sosData.severity || 5,
      condition: sosData.condition || 'Medical Emergency',
      injuries: sosData.injuries || [],
      location: {
        lat: sosData.lat || null,
        lng: sosData.lng || null,
        accuracy: sosData.accuracy || null,
        address: sosData.address || null,
      },
      contactInfo: {
        phone: sosData.phone || null,
        email: sosData.email || null,
      },
      medicalInfo: {
        bloodType: sosData.bloodType || null,
        allergies: sosData.allergies || [],
        medications: sosData.medications || [],
        conditions: sosData.conditions || [],
      },
      status: 'active',
      priority: sosData.severity >= 8 ? 'critical' : sosData.severity >= 5 ? 'high' : 'normal',
      timestamp: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      responderAssigned: null,
      responderArrivalTime: null,
      notes: sosData.notes || '',
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sos_records'], 'readwrite');
      const store = transaction.objectStore('sos_records');
      const request = store.add(sosRecord);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('SOS record created:', sosRecord.id);
        resolve(sosRecord);
      };
    });
  }

  /**
   * Get SOS Record by ID
   */
  async getSOSRecord(sosId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sos_records'], 'readonly');
      const store = transaction.objectStore('sos_records');
      const request = store.get(sosId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Get All SOS Records
   */
  async getAllSOSRecords() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sos_records'], 'readonly');
      const store = transaction.objectStore('sos_records');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Get Active SOS Records
   */
  async getActiveSOSRecords() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sos_records'], 'readonly');
      const store = transaction.objectStore('sos_records');
      const index = store.index('status');
      const request = index.getAll('active');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Update SOS Record
   */
  async updateSOSRecord(sosId, updates) {
    const record = await this.getSOSRecord(sosId);
    if (!record) throw new Error('SOS record not found');

    const updated = {
      ...record,
      ...updates,
      lastUpdate: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sos_records'], 'readwrite');
      const store = transaction.objectStore('sos_records');
      const request = store.put(updated);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('SOS record updated:', sosId);
        resolve(updated);
      };
    });
  }

  /**
   * Save Location History
   */
  async saveLocationHistory(sosId, lat, lng, accuracy) {
    const location = {
      id: `loc_${sosId}_${Date.now()}`,
      sosId: sosId,
      lat: lat,
      lng: lng,
      accuracy: accuracy,
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['locations_history'], 'readwrite');
      const store = transaction.objectStore('locations_history');
      const request = store.add(location);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(location);
    });
  }

  /**
   * Get Location History for SOS
   */
  async getLocationHistory(sosId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['locations_history'], 'readonly');
      const store = transaction.objectStore('locations_history');
      const index = store.index('sosId');
      const request = index.getAll(sosId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Close SOS Record
   */
  async closeSOSRecord(sosId, status = 'resolved') {
    return this.updateSOSRecord(sosId, {
      status: status,
      lastUpdate: new Date().toISOString(),
    });
  }

  /**
   * Clear old records (older than 30 days)
   */
  async clearOldRecords(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const allRecords = await this.getAllSOSRecords();
    const oldRecords = allRecords.filter(r => new Date(r.timestamp) < cutoffDate);

    for (const record of oldRecords) {
      await this.deleteSOSRecord(record.id);
    }

    console.log(`Cleared ${oldRecords.length} old SOS records`);
    return oldRecords.length;
  }

  /**
   * Delete SOS Record
   */
  async deleteSOSRecord(sosId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sos_records'], 'readwrite');
      const store = transaction.objectStore('sos_records');
      const request = store.delete(sosId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('SOS record deleted:', sosId);
        resolve(true);
      };
    });
  }

  /**
   * Export SOS Data
   */
  async exportSOSData(sosId) {
    const record = await this.getSOSRecord(sosId);
    const locations = await this.getLocationHistory(sosId);

    return {
      sos: record,
      locationHistory: locations,
      exportedAt: new Date().toISOString(),
    };
  }
}

const sosDatabase = new SOSDatabase();