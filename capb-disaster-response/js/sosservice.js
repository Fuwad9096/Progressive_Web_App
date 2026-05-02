/**
 * SOS Service
 * Handles SOS activation, geolocation, and emergency procedures
 */

class SOSService {
  constructor() {
    this.currentSOSId = null;
    this.geoWatchId = null;
    this.websocket = null;
    this.listeners = [];
    this.sosDatabase = sosDatabase;
  }

  /**
   * Initialize SOS Service
   */
  async init() {
    try {
      await this.sosDatabase.init();
      console.log('[SOS Service] Database initialized');
      this.setupWebSocket();
      return true;
    } catch (error) {
      console.error('[SOS Service] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Get User Location with Geolocation API
   */
  async getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.warn('[SOS Service] Geolocation not available, using default');
        resolve({
          lat: 23.8103,
          lng: 90.4125,
          accuracy: null,
        });
        return;
      }

      const timeout = setTimeout(() => {
        console.warn('[SOS Service] Geolocation timeout, using default');
        resolve({
          lat: 23.8103,
          lng: 90.4125,
          accuracy: null,
        });
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeout);
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          clearTimeout(timeout);
          console.warn('[SOS Service] Geolocation error:', error);
          resolve({
            lat: 23.8103,
            lng: 90.4125,
            accuracy: null,
          });
        }
      );
    });
  }

  /**
   * Activate SOS - Main entry point
   */
  async activateSOS(sosData = {}) {
    try {
      console.log('[SOS Service] Activating SOS with data:', sosData);

      let userData = null;

      // Try to get user data from localStorage
      try {
        const stored = localStorage.getItem('capb_user');
        if (stored) {
          userData = JSON.parse(stored);
          console.log('[SOS Service] Found user data:', userData.name);
        }
      } catch (e) {
        console.warn('[SOS Service] Could not retrieve user data');
      }

      // Get geolocation
      let geoLocation = null;
      try {
        geoLocation = await this.getUserLocation();
        console.log('[SOS Service] Location acquired:', geoLocation);
      } catch (error) {
        console.warn('[SOS Service] Could not get location:', error);
        geoLocation = { lat: 23.8103, lng: 90.4125, accuracy: null };
      }

      // Create SOS object
      const sos = {
        userId: userData?.id || null,
        name: sosData.name || userData?.name || 'Emergency',
        age: sosData.age || userData?.age || null,
        severity: sosData.severity || 9,
        condition: sosData.condition || 'SOS Emergency',
        injuries: sosData.injuries || [],
        lat: geoLocation?.lat || 23.8103,
        lng: geoLocation?.lng || 90.4125,
        accuracy: geoLocation?.accuracy,
        phone: sosData.phone || userData?.phone || null,
        email: sosData.email || userData?.email || null,
        bloodType: sosData.bloodType || userData?.bloodType || null,
        allergies: sosData.allergies || userData?.allergies || [],
        medications: sosData.medications || userData?.medications || [],
        conditions: sosData.conditions || userData?.conditions || [],
        notes: sosData.notes || '',
      };

      console.log('[SOS Service] SOS Object created:', sos);

      // Save to database
      const record = await this.sosDatabase.createSOSRecord(sos);
      this.currentSOSId = record.id;

      console.log('[SOS Service] SOS record saved to database:', record.id);

      // Start continuous location tracking
      this.startLocationTracking(record.id);

      // Notify listeners IMMEDIATELY with complete record
      console.log('[SOS Service] Notifying listeners of sos_activated event');
      this.notifyListeners({
        type: 'sos_activated',
        sosId: record.id,
        data: record,
      });

      console.log('[SOS Service] SOS activation complete');
      return record;

    } catch (error) {
      console.error('[SOS Service] SOS activation failed:', error);
      this.notifyListeners({
        type: 'sos_error',
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Start Location Tracking for SOS
   */
  startLocationTracking(sosId) {
    if (!navigator.geolocation) {
      console.warn('[SOS Service] Geolocation not available for tracking');
      return;
    }

    this.geoWatchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        console.log('[SOS Service] Location update:', { lat, lng, accuracy });

        // Save location history
        try {
          await this.sosDatabase.saveLocationHistory(sosId, lat, lng, accuracy);
          await this.sosDatabase.updateSOSRecord(sosId, {
            location: { lat, lng, accuracy },
          });
        } catch (error) {
          console.error('[SOS Service] Failed to save location:', error);
        }

        this.notifyListeners({
          type: 'location_updated',
          sosId: sosId,
          lat: lat,
          lng: lng,
          accuracy: accuracy,
        });
      },
      (error) => {
        console.warn('[SOS Service] Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }

  /**
   * Stop Location Tracking
   */
  stopLocationTracking() {
    if (this.geoWatchId !== null) {
      navigator.geolocation.clearWatch(this.geoWatchId);
      this.geoWatchId = null;
      console.log('[SOS Service] Location tracking stopped');
    }
  }

  /**
   * Resolve SOS
   */
  async resolveSOSRecord(sosId) {
    try {
      this.stopLocationTracking();
      await this.sosDatabase.closeSOSRecord(sosId, 'resolved');
      this.currentSOSId = null;

      this.notifyListeners({
        type: 'sos_resolved',
        sosId: sosId,
      });

      console.log('[SOS Service] SOS resolved:', sosId);
      return true;
    } catch (error) {
      console.error('[SOS Service] Could not resolve SOS:', error);
      return false;
    }
  }

  /**
   * Subscribe to SOS Service Events
   */
  subscribe(callback) {
    this.listeners.push(callback);
    console.log('[SOS Service] New listener subscribed, total:', this.listeners.length);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify All Listeners
   */
  notifyListeners(event) {
    console.log(`[SOS Service] Notifying ${this.listeners.length} listeners of event: ${event.type}`);
    this.listeners.forEach((callback, index) => {
      try {
        console.log(`[SOS Service] Calling listener ${index + 1}`);
        callback(event);
      } catch (error) {
        console.error(`[SOS Service] Listener ${index + 1} error:`, error);
      }
    });
  }

  /**
   * Setup WebSocket Connection
   */
  setupWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('[SOS Service] WebSocket connected');
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SOS Service] WebSocket message received:', data);
        } catch (e) {
          console.warn('[SOS Service] Could not parse WebSocket message');
        }
      };

      this.websocket.onerror = (error) => {
        console.warn('[SOS Service] WebSocket error (non-critical):', error);
      };

      this.websocket.onclose = () => {
        console.log('[SOS Service] WebSocket disconnected');
      };
    } catch (error) {
      console.warn('[SOS Service] WebSocket setup failed (non-critical):', error);
    }
  }
}

const sosService = new SOSService();