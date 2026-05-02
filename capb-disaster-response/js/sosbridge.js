/**
 * SOS Bridge Service
 * Connects SOS Service to State Manager for real-time updates
 */

class SOSBridge {
  constructor(sosService, stateManager) {
    this.sosService = sosService;
    this.stateManager = stateManager;
    this.sosPatientMap = new Map();
    this.initialized = false;
  }

  /**
   * Initialize Bridge
   */
  init() {
    if (this.initialized) {
      console.log('[SOS Bridge] Already initialized');
      return;
    }

    console.log('[SOS Bridge] Initializing SOS Bridge');
    
    this.sosService.subscribe((event) => {
      console.log('[SOS Bridge] Received SOS event:', event.type);

      if (event.type === 'sos_activated') {
        console.log('[SOS Bridge] Handling SOS activation');
        this.handleSOSActivated(event.data);
      } else if (event.type === 'location_updated') {
        console.log('[SOS Bridge] Handling location update');
        this.handleLocationUpdated(event.sosId, event.lat, event.lng, event.accuracy);
      } else if (event.type === 'sos_resolved') {
        console.log('[SOS Bridge] Handling SOS resolution');
        this.handleSOSResolved(event.sosId);
      }
    });

    this.initialized = true;
    console.log('[SOS Bridge] SOS Bridge initialized and listening');
  }

  /**
   * Handle SOS Activation - Convert SOS to Patient
   */
  handleSOSActivated(sosRecord) {
    console.log('[SOS Bridge] Converting SOS to patient:', sosRecord);

    const patientData = {
      id: sosRecord.id,
      name: sosRecord.name,
      age: sosRecord.age || null,
      severity: sosRecord.severity || 9,
      condition: sosRecord.condition || 'Emergency SOS',
      injuries: sosRecord.injuries || [],
      location: {
        lat: sosRecord.location.lat || 23.8103,
        lng: sosRecord.location.lng || 90.4125,
      },
      status: 'waiting',
      assignedUnitId: null,
      vitals: {
        heartRate: null,
        bloodPressure: null,
        temperature: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('[SOS Bridge] Patient data prepared:', patientData);

    try {
      // Add patient to state manager
      const addedPatient = this.stateManager.addPatient(patientData);
      this.sosPatientMap.set(sosRecord.id, sosRecord.id);
      
      console.log('[SOS Bridge] SOS patient added to state manager:', sosRecord.id);
      console.log('[SOS Bridge] All patients now:', this.stateManager.getAllPatients().length);
      
      return addedPatient;
    } catch (error) {
      console.error('[SOS Bridge] Failed to add SOS patient:', error);
      throw error;
    }
  }

  /**
   * Handle Location Update
   */
  handleLocationUpdated(sosId, lat, lng, accuracy) {
    console.log('[SOS Bridge] Location update for SOS:', sosId);

    const patientId = this.sosPatientMap.get(sosId) || sosId;
    const patient = this.stateManager.getPatient(patientId);
    
    if (patient) {
      this.stateManager.updatePatient(patientId, {
        location: {
          lat: lat,
          lng: lng,
        },
      });
      console.log('[SOS Bridge] Patient location updated');
    } else {
      console.warn('[SOS Bridge] Patient not found for location update:', patientId);
    }
  }

  /**
   * Handle SOS Resolved
   */
  handleSOSResolved(sosId) {
    console.log('[SOS Bridge] SOS resolved:', sosId);

    const patientId = this.sosPatientMap.get(sosId) || sosId;
    const patient = this.stateManager.getPatient(patientId);
    
    if (patient) {
      this.stateManager.updatePatient(patientId, {
        status: 'resolved',
      });
      console.log('[SOS Bridge] Patient marked as resolved');
    }

    this.sosPatientMap.delete(sosId);
  }
}

const sosBridge = new SOSBridge(sosService, stateManager);