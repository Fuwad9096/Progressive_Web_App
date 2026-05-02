/**
 * Map Service
 * Handles Mapbox integration with military-grade styling
 */

class MapService {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.markers = new Map();
        this.routes = new Map();
        this.initialized = false;
        this._tacticalOverlay = null;
        this._gridVisible = true;
        this._nightVision = false;
    }

    /**
     * Initialize Map
     */
    init(center, zoom, style = 'satellite', markerStyle = 'professional') {
        try {
            mapboxgl.accessToken = 'pk.eyJ1IjoiZnV3YWQiLCJhIjoiY21uOTdpZXV6MDZpZTJxc2lkeXZucWJ5NSJ9.TV56mcnHcbZqBOlCB7BE-g';

            // Use satellite-streets: adds road/label overlays on real satellite imagery
            const mapStyle = style === 'satellite'
                ? 'mapbox://styles/mapbox/satellite-streets-v12'
                : 'mapbox://styles/mapbox/dark-v11';

            this.map = new mapboxgl.Map({
                container: this.containerId,
                style: mapStyle,
                center: center,
                zoom: zoom,
                pitch: 0,
                bearing: 0,
                attributionControl: false,
                logoPosition: 'bottom-right'
            });

            this.markerStyle = markerStyle;

            this.map.on('load', () => {
                this.initialized = true;
                this._applyTacticalStyle();
                this._injectTacticalHUD();
                this._injectTacticalCSS();
                console.log('Map initialized:', this.containerId);
            });

            // Live coordinate tracker
            this.map.on('mousemove', (e) => {
                const coordEl = document.getElementById(`${this.containerId}-coords`);
                if (coordEl) {
                    const lng = e.lngLat.lng.toFixed(5);
                    const lat = e.lngLat.lat.toFixed(5);
                    coordEl.textContent = `${lat}°N  ${lng}°E`;
                }
            });

            return this.map;
        } catch (error) {
            console.error('Map initialization error:', error);
            return null;
        }
    }

    /**
     * Apply tactical post-processing to Mapbox layers.
     *
     * Label legibility strategy (NATO / Palantir Gotham spec):
     *   - ALL labels → uppercase, wide letter-spacing
     *   - Halo: 3px pitch-black, 0 blur  ← the key difference vs default Mapbox
     *   - Size: scaled up 1.25× from Mapbox defaults so readable at tactical zoom
     *   - Colour-coded by feature class:
     *       Settlements → white / bold
     *       Roads       → cool blue
     *       Water       → cyan-blue
     *       POI         → amber (minimal; shields suppressed)
     */
    _applyTacticalStyle() {
        const allLayers = this.map.getStyle().layers;

        if (this.markerStyle === 'diamond') {
        // Small map — just a subtle desaturate, no heavy filtering
        canvas.style.filter = 'saturate(0.7) brightness(0.85)';
        return;
    }

        allLayers.forEach(layer => {
            const id   = layer.id;
            const type = layer.type;

            // ── SYMBOL (label) LAYERS ─────────────────────────────────────────
            if (type === 'symbol') {
                const isPlace  = /place|settlement|city|town|village|neighborhood|suburb|state|country/.test(id);
                const isRoad   = /road-label|street-label|motorway-label/.test(id);
                const isWater  = /water-label|waterway-label/.test(id);
                const isPoi    = /poi|landmark|transit/.test(id);
                const isShield = /shield|number/.test(id);

                // Shields clutter tactical view — hide them
                if (isShield) {
                    this.map.setLayoutProperty(id, 'visibility', 'none');
                    return;
                }

                let textColor     = '#e8f4ff';   // default: light blue-white
                let textSize      = 12;
                let letterSpacing = 0.12;

                if (isPlace) {
                    textColor     = '#ffffff';
                    textSize      = 13;
                    letterSpacing = 0.18;
                } else if (isRoad) {
                    textColor     = '#b8d4f0';
                    textSize      = 11;
                    letterSpacing = 0.08;
                } else if (isWater) {
                    textColor     = '#7ec8e3';
                    textSize      = 11;
                    letterSpacing = 0.14;
                } else if (isPoi) {
                    textColor     = '#ffd580';
                    textSize      = 10;
                    letterSpacing = 0.06;
                }

                // Paint — thick black halo is the core NATO legibility trick
                this.map.setPaintProperty(id, 'text-color',       textColor);
                this.map.setPaintProperty(id, 'text-opacity',      1.0);
                this.map.setPaintProperty(id, 'text-halo-color',  'rgba(0,0,0,0.95)');
                this.map.setPaintProperty(id, 'text-halo-width',   3);
                this.map.setPaintProperty(id, 'text-halo-blur',    0);

                // Layout — uppercase transform + wider spacing
                this.map.setLayoutProperty(id, 'text-letter-spacing', letterSpacing);
                this.map.setLayoutProperty(id, 'text-transform',      'uppercase');

                // Scale size up from whatever Mapbox set (preserves zoom expressions)
                try {
                    const existing = this.map.getLayoutProperty(id, 'text-size');
                    if (typeof existing === 'number') {
                        this.map.setLayoutProperty(id, 'text-size', existing * 1.25);
                    } else {
                        this.map.setLayoutProperty(id, 'text-size', textSize);
                    }
                } catch (_) {
                    this.map.setLayoutProperty(id, 'text-size', textSize);
                }
            }

            // ── ROAD LINE LAYERS ──────────────────────────────────────────────
            if (type === 'line' && /road|motorway|trunk|primary|secondary|street|highway/.test(id)) {
                const isMajor = /motorway|trunk|primary/.test(id);
                this.map.setPaintProperty(id, 'line-color',   isMajor ? '#c0daf5' : '#7aaedc');
                this.map.setPaintProperty(id, 'line-opacity',  isMajor ? 0.75     : 0.5);
            }

            // ── WATER FILL ────────────────────────────────────────────────────
            if (type === 'fill' && /water/.test(id)) {
                this.map.setPaintProperty(id, 'fill-color',   '#0d2a45');
                this.map.setPaintProperty(id, 'fill-opacity',  0.8);
            }

            // ── BUILDING FILLS — tactical dark tone ───────────────────────────
            if (type === 'fill' && /building/.test(id)) {
                this.map.setPaintProperty(id, 'fill-color',   '#1a2030');
                this.map.setPaintProperty(id, 'fill-opacity',  0.6);
            }
        });

        // FLIR-desaturated canvas filter
        const canvas = this.map.getCanvas();
        canvas.style.filter = 'saturate(0.5) contrast(1.2) brightness(0.88)';
    }

    /**
     * Injects the tactical HUD overlay: scanlines, grid, vignette,
     * compass, MGRS-style coordinates, classification banner
     */
    _injectTacticalHUD() {
        const container = document.getElementById(this.containerId);
        if (!container || document.getElementById(`${this.containerId}-hud`)) return;

        if (this.markerStyle === 'diamond') return;

        // Ensure container is positioned
        container.style.position = 'relative';
        container.style.overflow = 'hidden';

        const hud = document.createElement('div');
        hud.id = `${this.containerId}-hud`;
        hud.className = 'tac-hud';
        hud.innerHTML = `
            <!-- Vignette + scanlines (pointer-events: none so map stays interactive) -->
            <div class="tac-vignette"></div>
            <div class="tac-scanlines"></div>
            <div class="tac-grid" id="${this.containerId}-grid"></div>

            <!-- Classification banner -->
            <div class="tac-banner tac-banner--top">
                <span class="tac-classification">UNCLASSIFIED // FOR OFFICIAL USE ONLY</span>
                <span class="tac-timestamp" id="${this.containerId}-ts"></span>
            </div>

            <!-- Bottom bar: coordinates + scale -->
            <div class="tac-banner tac-banner--bottom">
                <span class="tac-label">CURSOR</span>
                <span class="tac-coords" id="${this.containerId}-coords">—</span>
                <span class="tac-label" style="margin-left:auto">DATUM WGS-84</span>
            </div>

            <!-- Compass rose (top-right) -->
            <div class="tac-compass" id="${this.containerId}-compass">
                <svg viewBox="0 0 64 64" width="64" height="64">
                    <!-- Outer ring -->
                    <circle cx="32" cy="32" r="30" fill="none" stroke="#4af" stroke-width="0.8" opacity="0.5"/>
                    <circle cx="32" cy="32" r="24" fill="none" stroke="#4af" stroke-width="0.4" opacity="0.3"/>
                    <!-- Cardinal tick marks -->
                    <line x1="32" y1="2"  x2="32" y2="10" stroke="#4af" stroke-width="1.2"/>
                    <line x1="32" y1="54" x2="32" y2="62" stroke="#4af" stroke-width="1.2"/>
                    <line x1="2"  y1="32" x2="10" y2="32" stroke="#4af" stroke-width="1.2"/>
                    <line x1="54" y1="32" x2="62" y2="32" stroke="#4af" stroke-width="1.2"/>
                    <!-- Intercardinal ticks -->
                    <line x1="11" y1="11" x2="16" y2="16" stroke="#4af" stroke-width="0.6" opacity="0.5"/>
                    <line x1="53" y1="11" x2="48" y2="16" stroke="#4af" stroke-width="0.6" opacity="0.5"/>
                    <line x1="11" y1="53" x2="16" y2="48" stroke="#4af" stroke-width="0.6" opacity="0.5"/>
                    <line x1="53" y1="53" x2="48" y2="48" stroke="#4af" stroke-width="0.6" opacity="0.5"/>
                    <!-- North arrow (solid) -->
                    <polygon points="32,6 36,30 32,27 28,30" fill="#4af"/>
                    <!-- South arrow (outline) -->
                    <polygon points="32,58 36,34 32,37 28,34" fill="none" stroke="#4af" stroke-width="1"/>
                    <!-- Center dot -->
                    <circle cx="32" cy="32" r="2.5" fill="#4af"/>
                    <!-- N label -->
                    <text x="32" y="22" text-anchor="middle" font-size="7" font-family="'Courier New',monospace"
                          font-weight="700" fill="#4af" letter-spacing="1">N</text>
                </svg>
            </div>

            <!-- Grid toggle + NV toggle (top-left controls) -->
            <div class="tac-controls">
                <button class="tac-btn" id="${this.containerId}-grid-btn" title="Toggle grid">GRID</button>
                <button class="tac-btn" id="${this.containerId}-nv-btn" title="Night vision mode">NV</button>
            </div>
        `;

        container.appendChild(hud);

        // Live timestamp
        const updateTS = () => {
            const ts = document.getElementById(`${this.containerId}-ts`);
            if (ts) {
                const now = new Date();
                ts.textContent = now.toISOString().replace('T', 'Z ').slice(0, 19) + 'Z';
            }
        };
        updateTS();
        setInterval(updateTS, 1000);

        // Grid toggle
        document.getElementById(`${this.containerId}-grid-btn`)?.addEventListener('click', () => {
            this._gridVisible = !this._gridVisible;
            const gridEl = document.getElementById(`${this.containerId}-grid`);
            if (gridEl) gridEl.style.opacity = this._gridVisible ? '1' : '0';
            const btn = document.getElementById(`${this.containerId}-grid-btn`);
            if (btn) btn.classList.toggle('tac-btn--active', this._gridVisible);
        });

        // Night vision toggle
        document.getElementById(`${this.containerId}-nv-btn`)?.addEventListener('click', () => {
            this._nightVision = !this._nightVision;
            const canvas = this.map.getCanvas();
            canvas.style.filter = this._nightVision
                ? 'saturate(0) contrast(1.4) brightness(0.7) sepia(1) hue-rotate(80deg) saturate(3)'
                : 'saturate(0.55) contrast(1.15) brightness(0.9)';
            const btn = document.getElementById(`${this.containerId}-nv-btn`);
            if (btn) btn.classList.toggle('tac-btn--active', this._nightVision);
            // Flip scanline color for NV
            const hud = document.getElementById(`${this.containerId}-hud`);
            if (hud) hud.classList.toggle('tac-hud--nv', this._nightVision);
        });

        // Rotate compass needle with map bearing
        this.map.on('rotate', () => {
            const bearing = this.map.getBearing();
            const compassSvg = document.querySelector(`#${this.containerId}-compass svg`);
            if (compassSvg) {
                compassSvg.style.transform = `rotate(${-bearing}deg)`;
            }
        });
    }

    /**
     * Inject tactical CSS into document head (once)
     */
    _injectTacticalCSS() {
        const styleId = 'tac-hud-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .tac-hud {
                position: absolute;
                inset: 0;
                pointer-events: none;
                z-index: 10;
                font-family: 'Courier New', 'Lucida Console', monospace;
            }

            /* Vignette */
            .tac-vignette {
                position: absolute;
                inset: 0;
                background: radial-gradient(ellipse at center,
                    transparent 55%,
                    rgba(0,0,0,0.55) 100%);
            }

            /* Scanlines — subtle CRT effect */
            .tac-scanlines {
                position: absolute;
                inset: 0;
                background: repeating-linear-gradient(
                    to bottom,
                    transparent 0px,
                    transparent 3px,
                    rgba(0,0,0,0.08) 3px,
                    rgba(0,0,0,0.08) 4px
                );
            }

            /* Tactical grid overlay */
            .tac-grid {
                position: absolute;
                inset: 0;
                background-image:
                    linear-gradient(rgba(68,170,255,0.07) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(68,170,255,0.07) 1px, transparent 1px),
                    linear-gradient(rgba(68,170,255,0.04) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(68,170,255,0.04) 1px, transparent 1px);
                background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
                transition: opacity 0.3s;
            }

            /* Night vision mode — green phosphor tint on overlays */
            .tac-hud--nv .tac-grid {
                background-image:
                    linear-gradient(rgba(0,255,80,0.08) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,255,80,0.08) 1px, transparent 1px),
                    linear-gradient(rgba(0,255,80,0.04) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,255,80,0.04) 1px, transparent 1px);
                background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
            }
            .tac-hud--nv .tac-banner,
            .tac-hud--nv .tac-coords,
            .tac-hud--nv .tac-label,
            .tac-hud--nv .tac-classification,
            .tac-hud--nv .tac-timestamp {
                color: #00ff50 !important;
                border-color: rgba(0,255,80,0.3) !important;
                background: rgba(0,10,0,0.75) !important;
            }
            .tac-hud--nv .tac-compass circle,
            .tac-hud--nv .tac-compass line,
            .tac-hud--nv .tac-compass polygon,
            .tac-hud--nv .tac-compass text {
                stroke: #00ff50 !important;
                fill: #00ff50 !important;
            }

            /* Classification banners */
            .tac-banner {
                position: absolute;
                left: 0; right: 0;
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 4px 12px;
                background: rgba(0,5,15,0.78);
                border-color: rgba(68,170,255,0.25);
                pointer-events: none;
                font-size: 10px;
                letter-spacing: 0.08em;
                line-height: 1;
            }
            .tac-banner--top {
                top: 0;
                border-bottom: 1px solid rgba(68,170,255,0.25);
                justify-content: space-between;
            }
            .tac-banner--bottom {
                bottom: 0;
                border-top: 1px solid rgba(68,170,255,0.25);
            }

            .tac-classification {
                color: #4af;
                font-weight: 700;
                letter-spacing: 0.12em;
            }
            .tac-timestamp {
                color: rgba(68,170,255,0.65);
                font-size: 9px;
            }
            .tac-label {
                color: rgba(68,170,255,0.5);
                font-size: 9px;
                letter-spacing: 0.15em;
                text-transform: uppercase;
            }
            .tac-coords {
                color: #4af;
                font-size: 11px;
                letter-spacing: 0.06em;
                min-width: 200px;
            }

            /* Compass */
            .tac-compass {
                position: absolute;
                top: 36px;
                right: 12px;
                pointer-events: none;
                opacity: 0.85;
                transition: transform 0.1s linear;
            }
            .tac-compass svg {
                transition: transform 0.15s linear;
                display: block;
            }

            /* HUD controls (interactive — pointer-events: auto) */
            .tac-controls {
                position: absolute;
                top: 36px;
                left: 12px;
                display: flex;
                flex-direction: column;
                gap: 4px;
                pointer-events: auto;
            }
            .tac-btn {
                background: rgba(0,5,15,0.78);
                border: 1px solid rgba(68,170,255,0.35);
                color: rgba(68,170,255,0.7);
                font-family: 'Courier New', monospace;
                font-size: 9px;
                letter-spacing: 0.15em;
                padding: 4px 8px;
                cursor: pointer;
                transition: all 0.15s;
            }
            .tac-btn:hover {
                background: rgba(68,170,255,0.12);
                color: #4af;
                border-color: #4af;
            }
            .tac-btn--active {
                background: rgba(68,170,255,0.18);
                color: #4af;
                border-color: #4af;
            }

            /* Marker label tooltips */
            .tac-marker-label {
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                margin-top: 4px;
                white-space: nowrap;
                font-family: 'Courier New', monospace;
                font-size: 9px;
                letter-spacing: 0.12em;
                color: #c8e6ff;
                text-shadow: 0 0 6px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.9);
                pointer-events: none;
            }

            /*
             * Small map (inset / overview) sizing.
             *
             * Real tactical displays (ATAK, JOC) use a ~25-30% width inset
             * sitting bottom-left as a picture-in-picture — roughly 3:1 to 4:1
             * ratio against the main map. Apply .tac-inset to the small map's
             * container element to get this layout automatically.
             *
             * The inset has its own thin border + corner bracket decorations
             * matching the HUD aesthetic.
             */
            .tac-inset-wrapper {
                position: absolute;
                bottom: 30px;          /* above the bottom banner */
                left: 12px;
                width: 28%;            /* ~3.6:1 ratio vs full-width main map */
                aspect-ratio: 4 / 3;   /* standard tactical inset proportion */
                z-index: 20;
                pointer-events: auto;
                border: 1px solid rgba(68,170,255,0.45);
                box-shadow:
                    0 0 0 1px rgba(0,0,0,0.8),
                    inset 0 0 0 1px rgba(0,0,0,0.5),
                    0 4px 24px rgba(0,0,0,0.7);
                overflow: hidden;
                background: #000;
            }

            /* Corner bracket decorations (pure CSS, no extra DOM) */
            .tac-inset-wrapper::before,
            .tac-inset-wrapper::after {
                content: '';
                position: absolute;
                width: 10px;
                height: 10px;
                z-index: 2;
                pointer-events: none;
            }
            .tac-inset-wrapper::before {
                top: -1px; left: -1px;
                border-top: 2px solid #4af;
                border-left: 2px solid #4af;
            }
            .tac-inset-wrapper::after {
                bottom: -1px; right: -1px;
                border-bottom: 2px solid #4af;
                border-right: 2px solid #4af;
            }

            /* Label bar at the top of the inset */
            .tac-inset-label {
                position: absolute;
                top: 0; left: 0; right: 0;
                z-index: 5;
                background: rgba(0,5,15,0.82);
                border-bottom: 1px solid rgba(68,170,255,0.3);
                padding: 3px 8px;
                font-family: 'Courier New', monospace;
                font-size: 8px;
                letter-spacing: 0.18em;
                color: rgba(68,170,255,0.7);
                pointer-events: none;
            }

            /* The inset map canvas itself must fill its wrapper */
            .tac-inset-wrapper > .mapboxgl-map {
                width: 100% !important;
                height: 100% !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Add Marker
     */
    addMarker(id, coordinates, options = {}) {
        if (!this.map || !this.map.isStyleLoaded()) return;

        const { type = 'default', severity = 'normal', title = '', description = '' } = options;

        let element;
        if (this.markerStyle === 'diamond') {
            element = this.createDiamondMarker(type, severity);
        } else {
            element = this.createProfessionalMarker(type, severity, title);
        }

        // Anchor marker center to coordinate point
        const marker = new mapboxgl.Marker({
            element,
            anchor: 'center'
        })
            .setLngLat(coordinates)
            .addTo(this.map);

        if (title || description) {
            const popup = new mapboxgl.Popup({
                offset: 28,
                closeButton: false,
                className: 'tac-popup'
            }).setHTML(`
                <div style="
                    background: rgba(0,5,15,0.92);
                    border: 1px solid rgba(68,170,255,0.4);
                    color: #c8e6ff;
                    font-family: 'Courier New', monospace;
                    font-size: 11px;
                    padding: 8px 10px;
                    min-width: 140px;
                    letter-spacing: 0.05em;
                ">
                    <div style="font-weight:700;color:#4af;letter-spacing:0.1em;margin-bottom:4px;font-size:10px">${title.toUpperCase()}</div>
                    <div style="color:rgba(200,230,255,0.7);font-size:10px">${description}</div>
                </div>
            `);
            marker.setPopup(popup);
        }

        this.markers.set(id, { marker, element });
    }

    /**
     * Create Diamond Marker (for small map / overview)
     */
    createDiamondMarker(type, severity) {
        const div = document.createElement('div');
        div.style.cursor = 'pointer';

        const colors = {
            fire:      '#ef4444',
            ambulance: '#4aaeff',
            rescue:    '#f59e0b',
            command:   '#a78bfa',
            patient:   severity === 'critical' ? '#ef4444' :
                       severity === 'moderate' ? '#f59e0b' : '#22c55e'
        };
        const color = colors[type] || '#4aaeff';

        div.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24">
                <polygon points="12,2 22,12 12,22 2,12"
                    fill="${color}" stroke="rgba(255,255,255,0.6)" stroke-width="1"/>
            </svg>`;
        return div;
    }

    /**
     * Create Professional Marker — real tactical map symbology
     *
     * Standards used:
     *  Patient   — ICS triage circle (red/amber/green) + Geneva cross
     *  Ambulance — NATO STANAG medical: white square, red cross, black border
     *  Fire      — Maltese / fire-service cross (4 chevrons + center disc)
     *  Rescue    — International SAR: blue pentagon + "R"
     *  Command   — NATO APP-6C: filled rectangle with diagonal X
     */
    createProfessionalMarker(type, severity, label = '') {
        const div = document.createElement('div');
        div.style.cursor = 'pointer';
        div.style.position = 'relative';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';

        let svgHTML = '';

        // ── PATIENT ───────────────────────────────────────────────────────────
        if (type === 'patient') {
            const fill   = severity === 'critical' ? '#ef4444' :
                           severity === 'moderate' ? '#f59e0b' : '#22c55e';
            const border = severity === 'critical' ? '#7f1d1d' :
                           severity === 'moderate' ? '#78350f' : '#14532d';
            svgHTML = `
                <svg width="36" height="36" viewBox="-18 -18 36 36" xmlns="http://www.w3.org/2000/svg">
                    <!-- Drop shadow ring -->
                    <circle cx="0" cy="0" r="17" fill="rgba(0,0,0,0.5)"/>
                    <!-- Main disc -->
                    <circle cx="0" cy="0" r="15" fill="${fill}" stroke="${border}" stroke-width="1.5"/>
                    <!-- Outer ring accent -->
                    <circle cx="0" cy="0" r="15" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="0.5"/>
                    <!-- Geneva cross -->
                    <rect x="-5.5" y="-2" width="11" height="4" fill="white"/>
                    <rect x="-2" y="-5.5" width="4" height="11" fill="white"/>
                </svg>`;

        // ── AMBULANCE / EMS ───────────────────────────────────────────────────
        } else if (type === 'ambulance') {
            svgHTML = `
                <svg width="38" height="38" viewBox="-19 -19 38 38" xmlns="http://www.w3.org/2000/svg">
                    <!-- Shadow -->
                    <rect x="-16" y="-16" width="33" height="33" rx="3" fill="rgba(0,0,0,0.45)"/>
                    <!-- White body — NATO medical standard -->
                    <rect x="-15" y="-15" width="30" height="30" rx="2" fill="white" stroke="#111" stroke-width="2"/>
                    <!-- Red border accent line (ambulance livery) -->
                    <rect x="-15" y="-15" width="30" height="5" rx="2" fill="#ef4444"/>
                    <rect x="-15" y="-15" width="30" height="30" rx="2" fill="none" stroke="#ef4444" stroke-width="0.5" opacity="0.3"/>
                    <!-- Geneva cross -->
                    <rect x="-8"  y="-3"  width="16" height="6" fill="#ef4444"/>
                    <rect x="-3"  y="-8"  width="6"  height="16" fill="#ef4444"/>
                    <!-- Cross highlight -->
                    <rect x="-8"  y="-3"  width="16" height="1" fill="rgba(255,255,255,0.3)"/>
                    <rect x="-3"  y="-8"  width="1"  height="16" fill="rgba(255,255,255,0.3)"/>
                </svg>`;

        // ── FIRE ──────────────────────────────────────────────────────────────
        } else if (type === 'fire') {
            svgHTML = `
                <svg width="40" height="40" viewBox="-20 -20 40 40" xmlns="http://www.w3.org/2000/svg">
                    <!-- Shadow disc -->
                    <circle cx="0" cy="0" r="19" fill="rgba(0,0,0,0.4)"/>
                    <!-- Background disc for contrast -->
                    <circle cx="0" cy="0" r="17" fill="#1a0000"/>
                    <!-- Maltese cross — 4 chevron arms -->
                    <polygon points="0,-17 5.5,-7 -5.5,-7"  fill="#ef4444" stroke="#7f1d1d" stroke-width="0.5"/>
                    <polygon points="0,17  5.5,7  -5.5,7"   fill="#ef4444" stroke="#7f1d1d" stroke-width="0.5"/>
                    <polygon points="-17,0 -7,5.5 -7,-5.5"  fill="#ef4444" stroke="#7f1d1d" stroke-width="0.5"/>
                    <polygon points="17,0  7,5.5  7,-5.5"   fill="#ef4444" stroke="#7f1d1d" stroke-width="0.5"/>
                    <!-- Center disc -->
                    <circle cx="0" cy="0" r="7.5" fill="#ef4444" stroke="#7f1d1d" stroke-width="0.5"/>
                    <!-- Center highlight -->
                    <circle cx="-1.5" cy="-1.5" r="2.5" fill="rgba(255,200,180,0.3)"/>
                    <!-- Outer ring -->
                    <circle cx="0" cy="0" r="17" fill="none" stroke="#ef4444" stroke-width="0.5" opacity="0.4"/>
                </svg>`;

        // ── RESCUE (SAR) ──────────────────────────────────────────────────────
        } else if (type === 'rescue') {
            svgHTML = `
                <svg width="40" height="40" viewBox="-20 -20 40 40" xmlns="http://www.w3.org/2000/svg">
                    <!-- Shadow -->
                    <polygon points="0,-19 18,-6 11,16 -11,16 -18,-6" fill="rgba(0,0,0,0.45)"/>
                    <!-- Blue pentagon — international SAR standard -->
                    <polygon points="0,-18 17,-6 10,15 -10,15 -17,-6"
                        fill="#1d4ed8" stroke="#1e3a8a" stroke-width="2"/>
                    <!-- Inner lighter ring -->
                    <polygon points="0,-18 17,-6 10,15 -10,15 -17,-6"
                        fill="none" stroke="rgba(147,197,253,0.35)" stroke-width="1"/>
                    <!-- "R" identifier -->
                    <text x="0" y="6" text-anchor="middle"
                        font-size="14" font-weight="700" fill="white"
                        font-family="'Courier New', Arial, sans-serif">R</text>
                </svg>`;

        // ── COMMAND POST ──────────────────────────────────────────────────────
        } else if (type === 'command') {
            svgHTML = `
                <svg width="48" height="34" viewBox="-24 -17 48 34" xmlns="http://www.w3.org/2000/svg">
                    <!-- Shadow -->
                    <rect x="-23" y="-15" width="47" height="31" rx="2" fill="rgba(0,0,0,0.5)"/>
                    <!-- NATO APP-6C command post: filled rectangle -->
                    <rect x="-22" y="-14" width="44" height="28" rx="2"
                        fill="#4c1d95" stroke="#6d28d9" stroke-width="1.5"/>
                    <!-- Diagonal X (the APP-6 "hostile" indicator repurposed for CP) -->
                    <line x1="-14" y1="-8" x2="14" y2="8" stroke="#c4b5fd" stroke-width="2.5" stroke-linecap="round"/>
                    <line x1="14"  y1="-8" x2="-14" y2="8" stroke="#c4b5fd" stroke-width="2.5" stroke-linecap="round"/>
                    <!-- Outer border accent -->
                    <rect x="-22" y="-14" width="44" height="28" rx="2"
                        fill="none" stroke="rgba(196,181,253,0.3)" stroke-width="0.5"/>
                </svg>`;
        }

        if (svgHTML) {
            div.innerHTML = svgHTML;
        }

        // Optional call-sign / unit label beneath symbol
        if (label) {
            const lbl = document.createElement('div');
            lbl.className = 'tac-marker-label';
            lbl.textContent = label.toUpperCase();
            div.appendChild(lbl);
        }

        return div;
    }

    /**
     * Add Route with Distance
     */
    addRoute(id, coordinates, color = '#4aaeff') {
        if (!this.map || !this.map.isStyleLoaded()) return;

        const sourceId = `route-source-${id}`;
        const layerId  = `route-layer-${id}`;
        const glowId   = `route-glow-${id}`;

        [glowId, layerId].forEach(l => { if (this.map.getLayer(l)) this.map.removeLayer(l); });
        if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);

        this.map.addSource(sourceId, {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates } }
        });

        // Glow pass (wide, low opacity)
        this.map.addLayer({
            id: glowId,
            type: 'line',
            source: sourceId,
            paint: {
                'line-color': color,
                'line-width': 8,
                'line-opacity': 0.15,
                'line-blur': 4
            }
        });

        // Dashed tactical route line
        this.map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
                'line-color': color,
                'line-width': 2,
                'line-dasharray': [6, 4],
                'line-opacity': 0.85
            }
        });

        this.routes.set(id, { sourceId, layerId, glowId });
    }

    /**
     * Calculate Distance
     */
    calculateDistance(coord1, coord2) {
        const R = 6371;
        const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
        const dLng = (coord2[0] - coord1[0]) * Math.PI / 180;
        const a = Math.sin(dLat/2) ** 2 +
                  Math.cos(coord1[1] * Math.PI / 180) *
                  Math.cos(coord2[1] * Math.PI / 180) *
                  Math.sin(dLng/2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /**
     * Clear Markers
     */
    clearMarkers() {
        this.markers.forEach(({ marker }) => marker.remove());
        this.markers.clear();
    }

    /**
     * Clear Routes
     */
    clearRoutes() {
        this.routes.forEach(({ sourceId, layerId, glowId }) => {
            if (glowId && this.map.getLayer(glowId))   this.map.removeLayer(glowId);
            if (this.map.getLayer(layerId))             this.map.removeLayer(layerId);
            if (this.map.getSource(sourceId))           this.map.removeSource(sourceId);
        });
        this.routes.clear();
    }

    /**
     * Wrap the small map container in the tactical inset PiP frame.
     *
     * Usage (call once after both maps are created):
     *   smallMapService.wrapAsInset(mainMapContainerId, 'AREA OVERVIEW');
     *
     * This moves the small map's DOM container inside a .tac-inset-wrapper
     * that is absolutely positioned over the main map — the standard
     * picture-in-picture layout used on ATAK / JOC displays.
     *
     * @param {string} mainContainerId  — the large map's container element id
     * @param {string} label            — inset label text (default 'OVERVIEW')
     */
    wrapAsInset(mainContainerId, label = 'OVERVIEW') {
        const mainContainer  = document.getElementById(mainContainerId);
        const smallContainer = document.getElementById(this.containerId);
        if (!mainContainer || !smallContainer) return;

        this._injectTacticalCSS(); // ensure styles are present

        // Build wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'tac-inset-wrapper';

        // Label bar
        const lbl = document.createElement('div');
        lbl.className = 'tac-inset-label';
        lbl.textContent = label.toUpperCase();
        wrapper.appendChild(lbl);

        // Reparent the small map into the wrapper, wrapper into main
        smallContainer.parentNode.removeChild(smallContainer);
        wrapper.appendChild(smallContainer);
        mainContainer.appendChild(wrapper);

        // Resize the Mapbox map to fill new dimensions
        if (this.map) {
            requestAnimationFrame(() => this.map.resize());
        }
    }

    /**
     * Is Initialized
     */
    isInitialized() {
        return this.initialized && this.map && this.map.isStyleLoaded();
    }
}