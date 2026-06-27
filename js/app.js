document.addEventListener('DOMContentLoaded', () => {
    // 1. View Switching Tabs
    const navMap = document.getElementById('nav-map');
    const navPlan = document.getElementById('nav-plan');
    const navBus = document.getElementById('nav-bus');
    const viewMap = document.getElementById('view-map');
    const viewPlan = document.getElementById('view-plan');
    const viewBus = document.getElementById('view-bus');
    
    function deactivateAllTabs() {
        navMap.classList.remove('active');
        navPlan.classList.remove('active');
        navBus.classList.remove('active');
        viewMap.classList.remove('active');
        viewPlan.classList.remove('active');
        viewBus.classList.remove('active');
    }
    
    navMap.addEventListener('click', () => {
        deactivateAllTabs();
        navMap.classList.add('active');
        viewMap.classList.add('active');
        stopBusTracking();
    });
    
    navPlan.addEventListener('click', () => {
        deactivateAllTabs();
        navPlan.classList.add('active');
        viewPlan.classList.add('active');
        stopBusTracking();
        // Redraw autocomplete dropdown content on focus
        setupAutocomplete(originInput, originDropdown);
        setupAutocomplete(destInput, destDropdown);
    });
    
    navBus.addEventListener('click', () => {
        deactivateAllTabs();
        navBus.classList.add('active');
        viewBus.classList.add('active');
        startBusTracking();
    });

    // 2. Settings Modal Control
    const navSettings = document.getElementById('nav-settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    
    navSettings.addEventListener('click', () => {
        settingsModal.classList.add('active');
    });
    
    closeSettings.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('active');
        }
    });

    // 3. Autocomplete Setup for Station Selection
    const originInput = document.getElementById('origin-input');
    const originDropdown = document.getElementById('origin-dropdown');
    const destInput = document.getElementById('dest-input');
    const destDropdown = document.getElementById('dest-dropdown');
    
    function setupAutocomplete(input, dropdown) {
        const stationNames = Object.keys(transitData.stations).sort();
        const clearBtn = input.parentElement.querySelector('.input-clear-btn');
        
        function updateClearBtn() {
            if (clearBtn) {
                clearBtn.style.display = input.value ? 'flex' : 'none';
            }
        }
        
        if (clearBtn && !clearBtn.dataset.hasListener) {
            clearBtn.dataset.hasListener = "true";
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                input.value = '';
                updateClearBtn();
                input.focus();
                renderOptions('');
                dropdown.classList.add('active');
            });
        }
        
        function renderOptions(filterText = '') {
            dropdown.innerHTML = '';
            const filtered = stationNames.filter(name => 
                name.toLowerCase().includes(filterText.toLowerCase())
            );
            
            if (filtered.length === 0) {
                dropdown.innerHTML = '<div class="select-option" style="color:var(--text-secondary);cursor:default;">No stations found</div>';
                return;
            }
            
            filtered.forEach(name => {
                const station = transitData.stations[name];
                const option = document.createElement('div');
                option.className = 'select-option';
                
                let badgeHtml = '';
                station.codes.forEach(code => {
                    const linePrefix = code.replace(/[0-9./]/g, '').trim();
                    const lineId = linePrefix === "SB" ? "BRT" : linePrefix;
                    const lineObj = transitData.lines[lineId] || { color: '#00422b' };
                    badgeHtml += `<span class="station-code-badge" style="--badge-bg: ${lineObj.color}">${code}</span>`;
                });
                
                option.innerHTML = `
                    <span>${name}</span>
                    <div class="station-badges">${badgeHtml}</div>
                `;
                
                option.addEventListener('mousedown', (e) => {
                    input.value = name;
                    dropdown.classList.remove('active');
                    updateClearBtn();
                });
                dropdown.appendChild(option);
            });
        }
        
        input.addEventListener('focus', () => {
            renderOptions(input.value);
            dropdown.classList.add('active');
            updateClearBtn();
        });
        
        input.addEventListener('blur', () => {
            setTimeout(() => {
                dropdown.classList.remove('active');
            }, 250);
        });
        
        input.addEventListener('input', () => {
            renderOptions(input.value);
            dropdown.classList.add('active');
            updateClearBtn();
        });

        // Initialize state
        updateClearBtn();
    }

    // 3.1 Swap Origin and Destination Stations
    const btnSwapStations = document.getElementById('btn-swap-stations');
    if (btnSwapStations) {
        btnSwapStations.addEventListener('click', () => {
            const originVal = originInput.value;
            originInput.value = destInput.value;
            destInput.value = originVal;
            
            // Trigger clear buttons visibility updates
            const originClear = originInput.parentElement.querySelector('.input-clear-btn');
            const destClear = destInput.parentElement.querySelector('.input-clear-btn');
            if (originClear) originClear.style.display = originInput.value ? 'flex' : 'none';
            if (destClear) destClear.style.display = destInput.value ? 'flex' : 'none';
        });
    }

    // 4. Line Exclude Checklist Setup
    const excludeChecklist = document.getElementById('exclude-lines-checklist');
    function setupExcludeChecklist() {
        excludeChecklist.innerHTML = '';
        
        const getLineType = (name) => {
            if (name.includes("MRT")) return "MRT";
            if (name.includes("LRT")) return "LRT";
            if (name.includes("Monorail")) return "Monorail";
            if (name.includes("BRT")) return "BRT";
            return "Other";
        };

        const typeOrder = { "MRT": 1, "LRT": 2, "Monorail": 3, "BRT": 4, "Other": 5 };

        const sortedLines = Object.values(transitData.lines).sort((a, b) => {
            const typeA = getLineType(a.name);
            const typeB = getLineType(b.name);
            
            if (typeOrder[typeA] !== typeOrder[typeB]) {
                return typeOrder[typeA] - typeOrder[typeB];
            }
            return a.name.localeCompare(b.name);
        });

        sortedLines.forEach(line => {
            const item = document.createElement('div');
            item.className = 'exclude-item';
            item.innerHTML = `
                <div class="exclude-label-wrapper">
                    <div class="exclude-line-badge" style="--line-color: ${line.color}">${line.id}</div>
                    <span>${line.name}</span>
                </div>
                <input type="checkbox" value="${line.id}" class="exclude-checkbox" checked>
            `;
            
            item.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT') {
                    const cb = item.querySelector('.exclude-checkbox');
                    cb.checked = !cb.checked;
                }
            });
            excludeChecklist.appendChild(item);
        });
    }
    setupExcludeChecklist();

    // 5. Map Viewer Image Control
    let currentMapUrl = 'maps/Klang Valley Rail Map.jpg';
    const mapImage = document.getElementById('map-image');
    const btnToggleMap = document.getElementById('btn-toggle-map');
    
    if (btnToggleMap) {
        btnToggleMap.addEventListener('click', () => {
            if (currentMapUrl === 'maps/Klang Valley Rail Map.jpg') {
                currentMapUrl = 'maps/Circle Line.jpg';
                btnToggleMap.innerHTML = 'Standard Map 🗺️';
            } else {
                currentMapUrl = 'maps/Klang Valley Rail Map.jpg';
                btnToggleMap.innerHTML = 'Upcoming Map 🗺️';
            }
            if (mapImage) {
                mapImage.src = currentMapUrl;
                mapImage.alt = currentMapUrl === 'maps/Klang Valley Rail Map.jpg' ? 'Klang Valley Rail Map' : 'Circle Line';
            }
        });
    }

    // 6. Pathfinder UI Event Linkage
    const resultsPlaceholder = document.getElementById('results-placeholder');
    const resultsContainer = document.getElementById('results-container');
    const resFare = document.getElementById('res-fare');
    const resDist = document.getElementById('res-dist');
    const resTransfers = document.getElementById('res-transfers');
    const timelineContainer = document.getElementById('route-timeline-container');
    const btnSubmitPlan = document.getElementById('btn-submit-plan');

    btnSubmitPlan.addEventListener('click', (e) => {
        e.preventDefault();
        const origin = originInput.value.trim();
        const dest = destInput.value.trim();
        
        if (!origin || !dest) {
            alert('Please select both Origin and Destination stations.');
            return;
        }
        
        const excluded = [];
        const checkboxes = excludeChecklist.querySelectorAll('.exclude-checkbox:not(:checked)');
        checkboxes.forEach(cb => excluded.push(cb.value));
        
        const route = transitData.findRoute(origin, dest, excluded);
        
        if (!route) {
            alert('No route found between these stations under your exclusions. Try enabling more lines.');
            return;
        }
        
        resultsPlaceholder.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        
        resFare.innerText = `RM ${route.totalFare.toFixed(2)}`;
        resDist.innerText = `${route.totalDistance.toFixed(2)} km`;
        resTransfers.innerText = route.transfers;
        
        renderTimeline(route);

        // Switch layout to show directions results on mobile
        document.querySelector('.planner-layout').classList.add('showing-results');
    });

    // Handle mobile "Search Again" reset and layout switch back to input form
    const btnSearchAgain = document.getElementById('btn-search-again');
    btnSearchAgain.addEventListener('click', () => {
        document.querySelector('.planner-layout').classList.remove('showing-results');
        
        // Reset station inputs for clean new search
        originInput.value = '';
        destInput.value = '';
        
        // Reset results containers back to placeholder state
        resultsContainer.classList.add('hidden');
        resultsPlaceholder.classList.remove('hidden');
        
        // Scroll sidebar back to top
        document.querySelector('.planner-sidebar').scrollTop = 0;
    });

    // 7. Timeline Formatter
    function renderTimeline(route) {
        timelineContainer.innerHTML = '';
        
        const steps = [];
        let currentLine = null;
        let lineSegments = [];
        
        // Group edges by continuous line segment
        route.edges.forEach((edge) => {
            if (edge.line !== currentLine) {
                if (currentLine) {
                    steps.push({
                        line: currentLine,
                        stations: lineSegments
                    });
                }
                currentLine = edge.line;
                lineSegments = [];
            }
            lineSegments.push(edge.to);
        });
        if (currentLine && lineSegments.length > 0) {
            steps.push({
                line: currentLine,
                stations: lineSegments
            });
        }
        
        // Render initial departure step
        const originNode = transitData.stations[route.path[0]];
        const firstLine = steps[0] ? steps[0].line : "WALKWAY";
        const firstLineColor = getLineColor(firstLine);
        
        let html = `
            <div class="timeline-item">
                <div class="timeline-dot" style="--node-color: #6b7280"></div>
                <div class="timeline-connector" style="--connector-color: ${firstLineColor}"></div>
                <div class="timeline-title">
                    <span>${route.path[0]}</span>
                    <div class="station-badge-list">${getStationBadgesHtml(originNode)}</div>
                </div>
                <div class="timeline-desc">Departing station</div>
            </div>
        `;
        
        // Render segments
        steps.forEach((step, index) => {
            const lineColor = getLineColor(step.line);
            const isLast = index === steps.length - 1;
            const nextConnectorColor = isLast ? "#10b981" : getLineColor(steps[index + 1].line);
            
            const lastStationName = step.stations[step.stations.length - 1];
            const lastStationNode = transitData.stations[lastStationName];
            const intermediateStops = step.stations.slice(0, -1);
            
            let stopsHtml = '';
            if (intermediateStops.length > 0) {
                const label = `${step.stations.length} stop${step.stations.length > 1 ? 's' : ''}`;
                stopsHtml = `
                    <div class="stops-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">
                        Ride ${label} <span class="arrow">▼</span>
                    </div>
                    <div class="stops-expanded-list hidden">
                        ${intermediateStops.map(stopName => {
                            const stopNode = transitData.stations[stopName];
                            return `
                                <div class="expanded-stop-item">
                                    <span class="stop-dot" style="background-color: ${lineColor}"></span>
                                    <span>${stopName}</span>
                                    <div class="station-badge-list" style="margin-left:auto;">${getStationBadgesHtml(stopNode)}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else {
                stopsHtml = `<div class="single-stop-label">Ride 1 stop</div>`;
            }
            
            // Render board instruction
            html += `
                <div class="timeline-item ride-segment" style="--node-color: ${lineColor}">
                    <div class="timeline-dot" style="--node-color: ${lineColor}"></div>
                    <div class="timeline-connector" style="--connector-color: ${lineColor}"></div>
                    <div class="timeline-title" style="color: ${lineColor}">
                        Board ${getLineName(step.line)}
                    </div>
                    <div class="timeline-desc">
                        ${stopsHtml}
                    </div>
                </div>
            `;
            
            // Render arrival/interchange stop
            const nodeColor = isLast ? '#10b981' : lineColor;
            html += `
                <div class="timeline-item" style="--node-color: ${nodeColor}">
                    <div class="timeline-dot" style="--node-color: ${nodeColor}"></div>
                    <div class="timeline-connector" style="--connector-color: ${nextConnectorColor}"></div>
                    <div class="timeline-title">
                        <span>${lastStationName}</span>
                        <div class="station-badge-list">${getStationBadgesHtml(lastStationNode)}</div>
                    </div>
                    <div class="timeline-desc">
                        ${isLast ? 'Arrive at destination' : `Transfer to ${getLineName(steps[index + 1].line)}`}
                    </div>
                </div>
            `;
        });
        
        timelineContainer.innerHTML = html;
    }

    // Helper functions for formatting
    function getLineColor(lineId) {
        if (lineId === "WALKWAY") return "#9ca3af";
        const line = transitData.lines[lineId];
        return line ? line.color : "#6b7280";
    }

    function getLineName(lineId) {
        if (lineId === "WALKWAY") return "Pedestrian Walkway";
        const line = transitData.lines[lineId];
        return line ? line.name : "Transit Line";
    }

    function getStationBadgesHtml(stationNode) {
        if (!stationNode) return '';
        return stationNode.codes.map(code => {
            const linePrefix = code.replace(/[0-9./]/g, '').trim();
            const lineId = linePrefix === "SB" ? "BRT" : linePrefix;
            const lineObj = transitData.lines[lineId] || { color: '#00422b' };
            return `<span class="timeline-station-badge" style="--badge-bg: ${lineObj.color}">${code}</span>`;
        }).join('');
    }

    // Make the expander accessible in HTML event scopes
    window.toggleStops = function(element) {
        const list = element.nextElementSibling;
        list.classList.toggle('hidden');
    };

    // Theme Control Logic
    const themeSelect = document.getElementById('theme-select');
    
    function applyTheme(theme) {
        document.body.classList.remove('light-theme');
        if (theme === 'light') {
            document.body.classList.add('light-theme');
        } else if (theme === 'system') {
            const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (!systemIsDark) {
                document.body.classList.add('light-theme');
            }
        }
    }
    
    themeSelect.addEventListener('change', () => {
        const selectedTheme = themeSelect.value;
        localStorage.setItem('theme_preference', selectedTheme);
        applyTheme(selectedTheme);
    });
    
    // Listen for system theme preferences changes dynamically
    const systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemMediaQuery.addEventListener('change', () => {
        if (localStorage.getItem('theme_preference') === 'system') {
            applyTheme('system');
        }
    });

    const gmapsKeyInput = document.getElementById('gmaps-key-input');

    function loadSavedConfig() {
        // Load theme configuration
        const savedTheme = localStorage.getItem('theme_preference') || 'system';
        themeSelect.value = savedTheme;
        applyTheme(savedTheme);

        // Load Google Maps API Key
        const savedKey = (typeof CONFIG !== 'undefined' && CONFIG.GMAPS_API_KEY) || localStorage.getItem('gmaps_api_key') || '';
        if (gmapsKeyInput) {
            gmapsKeyInput.value = savedKey;
        }
    }

    if (gmapsKeyInput) {
        gmapsKeyInput.addEventListener('change', () => {
            const oldKey = localStorage.getItem('gmaps_api_key') || '';
            const newKey = gmapsKeyInput.value.trim();
            localStorage.setItem('gmaps_api_key', newKey);

            if (oldKey !== newKey && navBus.classList.contains('active')) {
                window.location.reload();
            }
        });
    }
    
    // Initialize Autocomplete fields
    setupAutocomplete(originInput, originDropdown);
    setupAutocomplete(destInput, destDropdown);
    
    // Load config on boot
    loadSavedConfig();

    // --- Live myBAS Tracking Module ---
    let busMap = null;
    let busMarkers = {}; // key: vehicleId, value: { marker, startPos, targetPos, startTime, targetTime, routeId, ... }
    let busPollInterval = null;
    let busAnimFrame = null;
    let busRoutesMap = {}; // key: routeId, value: { name, activeCount }
    let activeBuses = []; // list of decoded vehicles
    let selectedRouteIds = new Set();
    let mapsLoading = false;
    let mapsLoaded = false;
    let selectedRouteColors = {}; // Cache colors for routes to make them look harmonized
    
    // Region configuration for Johor and Melaka
    let activeRegion = 'johor';
    const regionConfigs = {
        johor: {
            url: "https://api.data.gov.my/gtfs-realtime/vehicle-position/mybas-johor/",
            center: { lat: 1.4927, lng: 103.7414 },
            zoom: 11
        },
        melaka: {
            url: "https://api.data.gov.my/gtfs-realtime/vehicle-position/mybas-melaka/",
            center: { lat: 2.1896, lng: 102.2501 },
            zoom: 12
        }
    };

    // Minimal GTFS-RT Protobuf JSON definition
    const gtfsRtProtoJson = {
      nested: {
        transit_realtime: {
          nested: {
            FeedMessage: {
              fields: {
                header: { rule: "required", type: "FeedHeader", id: 1 },
                entity: { rule: "repeated", type: "FeedEntity", id: 2 }
              }
            },
            FeedHeader: {
              fields: {
                gtfs_realtime_version: { rule: "required", type: "string", id: 1 },
                incrementality: { type: "int32", id: 2 },
                timestamp: { type: "uint64", id: 3 }
              }
            },
            FeedEntity: {
              fields: {
                id: { rule: "required", type: "string", id: 1 },
                is_deleted: { type: "bool", id: 2 },
                trip_update: { type: "TripUpdate", id: 3 },
                vehicle: { type: "VehiclePosition", id: 4 },
                alert: { type: "Alert", id: 5 }
              }
            },
            TripUpdate: {
              fields: {
                trip: { rule: "required", type: "TripDescriptor", id: 1 }
              }
            },
            VehiclePosition: {
              fields: {
                trip: { type: "TripDescriptor", id: 1 },
                position: { type: "Position", id: 2 },
                current_stop_sequence: { type: "uint32", id: 3 },
                current_status: { type: "int32", id: 4 },
                timestamp: { type: "uint64", id: 5 },
                congestion_level: { type: "int32", id: 6 },
                stop_id: { type: "string", id: 7 },
                vehicle: { type: "VehicleDescriptor", id: 8 }
              }
            },
            Alert: {
              fields: {
                active_period: { rule: "repeated", type: "TimeRange", id: 1 }
              }
            },
            TimeRange: {
              fields: {
                start: { type: "uint64", id: 1 },
                end: { type: "uint64", id: 2 }
              }
            },
            TripDescriptor: {
              fields: {
                trip_id: { type: "string", id: 1 },
                route_id: { type: "string", id: 5 },
                direction_id: { type: "uint32", id: 6 }
              }
            },
            Position: {
              fields: {
                latitude: { rule: "required", type: "float", id: 1 },
                longitude: { rule: "required", type: "float", id: 2 },
                bearing: { type: "float", id: 3 },
                odometer: { type: "double", id: 4 },
                speed: { type: "float", id: 5 }
              }
            },
            VehicleDescriptor: {
              fields: {
                id: { type: "string", id: 1 },
                label: { type: "string", id: 2 },
                license_plate: { type: "string", id: 3 }
              }
            }
          }
        }
      }
    };

    let FeedMessageType = null;
    try {
        const root = protobuf.Root.fromJSON(gtfsRtProtoJson);
        FeedMessageType = root.lookupType("transit_realtime.FeedMessage");
    } catch (e) {
        console.error("Failed to build protobuf FeedMessage type:", e);
    }

    function getRouteColor(routeId) {
        if (selectedRouteColors[routeId]) return selectedRouteColors[routeId];
        let hash = 0;
        for (let i = 0; i < routeId.length; i++) {
            hash = routeId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash % 360);
        const color = `hsl(${h}, 85%, 45%)`;
        selectedRouteColors[routeId] = color;
        return color;
    }

    function formatRouteId(routeId) {
        return routeId.replace(/CWLMYJB|MYJB|JB/g, '').trim();
    }

    function startBusTracking() {
        const apiKey = (typeof CONFIG !== 'undefined' && CONFIG.GMAPS_API_KEY) || localStorage.getItem('gmaps_api_key') || '';
        loadGoogleMaps(apiKey, () => {
            initMap();
            fetchBusData();
            
            clearInterval(busPollInterval);
            busPollInterval = setInterval(fetchBusData, 15000);
            
            cancelAnimationFrame(busAnimFrame);
            busAnimFrame = requestAnimationFrame(animateMarkers);
        });
    }

    function stopBusTracking() {
        clearInterval(busPollInterval);
        cancelAnimationFrame(busAnimFrame);
        for (const vehicleId in busMarkers) {
            if (busMarkers[vehicleId].marker) {
                busMarkers[vehicleId].marker.setMap(null);
            }
        }
        busMarkers = {};
    }

    function loadGoogleMaps(apiKey, callback) {
        if (mapsLoaded || (window.google && window.google.maps)) {
            callback();
            return;
        }
        if (mapsLoading) {
            setTimeout(() => loadGoogleMaps(apiKey, callback), 100);
            return;
        }
        mapsLoading = true;
        
        window.googleMapsCallback = () => {
            mapsLoaded = true;
            mapsLoading = false;
            callback();
        };
        
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=googleMapsCallback`;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
            mapsLoading = false;
            document.getElementById('bus-status-text').innerText = "Failed to load Google Maps. Please verify your API Key.";
        };
        document.head.appendChild(script);
    }

    function initMap() {
        if (busMap) return;
        const container = document.getElementById('bus-map');
        if (!container) return;
        
        const center = regionConfigs[activeRegion].center;
        const zoom = regionConfigs[activeRegion].zoom;
        
        const darkMapStyle = [
            { elementType: "geometry", stylers: [{ color: "#212121" }] },
            { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
            { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
            { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
            { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
            { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
            { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
            { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
            { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
            { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
            { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
            { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
            { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
            { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
            { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
            { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
            { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
            { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] }
        ];

        const lightMapStyle = [];
        const isDark = !document.body.classList.contains('light-theme');

        busMap = new google.maps.Map(container, {
            center: center,
            zoom: zoom,
            styles: isDark ? darkMapStyle : lightMapStyle,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true
        });

        const observer = new MutationObserver(() => {
            const activeDark = !document.body.classList.contains('light-theme');
            busMap.setOptions({ styles: activeDark ? darkMapStyle : lightMapStyle });
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    let isFetchingBus = false;
    function fetchBusData() {
        if (isFetchingBus) return;
        isFetchingBus = true;
        
        const statusText = document.getElementById('bus-status-text');
        statusText.innerHTML = `Refreshing live locations... <span class="loading-spinner">⏳</span>`;
        
        fetch(regionConfigs[activeRegion].url)
            .then(res => {
                if (!res.ok) throw new Error("Status code " + res.status);
                return res.arrayBuffer();
            })
            .then(buffer => {
                if (!FeedMessageType) throw new Error("Protobuf decoder not configured.");
                const message = FeedMessageType.decode(new Uint8Array(buffer));
                
                activeBuses = [];
                const foundRoutes = {};
                
                if (message.entity && message.entity.length > 0) {
                    message.entity.forEach(ent => {
                        if (ent.vehicle && ent.vehicle.position && ent.vehicle.trip) {
                            const routeId = ent.vehicle.trip.route_id || "Unknown";
                            const vehicleId = ent.vehicle.vehicle ? (ent.vehicle.vehicle.id || ent.vehicle.vehicle.license_plate) : ent.id;
                            const licensePlate = ent.vehicle.vehicle ? ent.vehicle.vehicle.license_plate : "N/A";
                            const lat = ent.vehicle.position.latitude;
                            const lng = ent.vehicle.position.longitude;
                            const speed = ent.vehicle.position.speed ? (ent.vehicle.position.speed * 3.6).toFixed(1) : "0.0";
                            const timestamp = ent.vehicle.timestamp ? Number(ent.vehicle.timestamp) * 1000 : Date.now();
                            
                            activeBuses.push({
                                vehicleId,
                                routeId,
                                licensePlate,
                                lat,
                                lng,
                                speed,
                                timestamp
                            });
                            
                            if (!foundRoutes[routeId]) {
                                foundRoutes[routeId] = 0;
                            }
                            foundRoutes[routeId]++;
                        }
                    });
                }
                
                busRoutesMap = {};
                for (const routeId in foundRoutes) {
                    busRoutesMap[routeId] = {
                        name: formatRouteId(routeId),
                        activeCount: foundRoutes[routeId]
                    };
                }
                
                updateRouteChecklist();
                updateMarkersOnMap();
                
                statusText.innerText = `Found ${activeBuses.length} active buses across ${Object.keys(busRoutesMap).length} routes.`;
                isFetchingBus = false;
            })
            .catch(err => {
                console.error("Error loading bus data:", err);
                statusText.innerText = "Error refreshing bus feed. Retrying shortly...";
                isFetchingBus = false;
            });
    }

    function updateRouteChecklist() {
        const container = document.getElementById('bus-list-container');
        if (!container) return;
        
        const checkedList = Array.from(selectedRouteIds);
        const sortedRouteIds = Object.keys(busRoutesMap).sort((a, b) => {
            return busRoutesMap[a].name.localeCompare(busRoutesMap[b].name, undefined, { numeric: true });
        });
        
        const selectAllByDefault = selectedRouteIds.size === 0 && checkedList.length === 0;
        container.innerHTML = '';
        
        if (sortedRouteIds.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-secondary);font-size:0.85rem;">No active buses found at this hour.</div>`;
            return;
        }
        
        sortedRouteIds.forEach(routeId => {
            const rData = busRoutesMap[routeId];
            const isChecked = selectAllByDefault || selectedRouteIds.has(routeId);
            
            if (selectAllByDefault) {
                selectedRouteIds.add(routeId);
            }
            
            const item = document.createElement('div');
            item.className = `bus-route-item ${isChecked ? 'selected' : ''}`;
            const routeColor = getRouteColor(routeId);
            
            item.innerHTML = `
                <div class="bus-route-left">
                    <input type="checkbox" value="${routeId}" ${isChecked ? 'checked' : ''}>
                    <span class="route-badge" style="background-color: ${routeColor}">${rData.name}</span>
                    <span class="route-desc">Route ${rData.name}</span>
                </div>
                <span class="bus-count-badge">${rData.activeCount} live</span>
            `;
            
            item.addEventListener('click', (e) => {
                const cb = item.querySelector('input[type="checkbox"]');
                if (e.target !== cb) {
                    cb.checked = !cb.checked;
                }
                
                if (cb.checked) {
                    selectedRouteIds.add(routeId);
                    item.classList.add('selected');
                } else {
                    selectedRouteIds.delete(routeId);
                    item.classList.remove('selected');
                }
                
                updateMarkersOnMap();
            });
            
            container.appendChild(item);
        });
    }

    function updateMarkersOnMap() {
        if (!busMap) return;
        
        const now = Date.now();
        const seenVehicles = new Set();
        
        activeBuses.forEach(bus => {
            if (!selectedRouteIds.has(bus.routeId)) {
                if (busMarkers[bus.vehicleId]) {
                    busMarkers[bus.vehicleId].marker.setMap(null);
                    delete busMarkers[bus.vehicleId];
                }
                return;
            }
            
            seenVehicles.add(bus.vehicleId);
            const routeColor = getRouteColor(bus.routeId);
            const cleanName = formatRouteId(bus.routeId);
            
            if (busMarkers[bus.vehicleId]) {
                const data = busMarkers[bus.vehicleId];
                
                data.startPos = {
                    lat: data.marker.getPosition().lat(),
                    lng: data.marker.getPosition().lng()
                };
                data.targetPos = { lat: bus.lat, lng: bus.lng };
                data.startTime = now;
                data.targetTime = now + 15000;
                
                data.speed = bus.speed;
                data.timestamp = bus.timestamp;
                data.licensePlate = bus.licensePlate;
            } else {
                const markerIcon = {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: routeColor,
                    fillOpacity: 0.9,
                    strokeColor: "#ffffff",
                    strokeWeight: 2.5,
                    scale: 14
                };
                
                const marker = new google.maps.Marker({
                    position: new google.maps.LatLng(bus.lat, bus.lng),
                    map: busMap,
                    icon: markerIcon,
                    title: `Route ${cleanName} (${bus.licensePlate})`,
                    label: {
                        text: cleanName,
                        color: "#ffffff",
                        fontSize: "9px",
                        fontWeight: "800"
                    }
                });
                
                const infoWindow = new google.maps.InfoWindow();
                marker.addListener('click', () => {
                    const data = busMarkers[bus.vehicleId];
                    const localTime = new Date(data.timestamp).toLocaleTimeString();
                    const content = `
                        <div class="bus-info-window">
                            <h3>myBAS Route ${cleanName}</h3>
                            <p><strong>Plate:</strong> ${data.licensePlate}</p>
                            <p><strong>Speed:</strong> ${data.speed} km/h</p>
                            <p><strong>Last Updated:</strong> ${localTime}</p>
                            <p><strong>Coordinates:</strong> ${data.marker.getPosition().lat().toFixed(5)}, ${data.marker.getPosition().lng().toFixed(5)}</p>
                        </div>
                    `;
                    infoWindow.setContent(content);
                    infoWindow.open(busMap, marker);
                });
                
                busMarkers[bus.vehicleId] = {
                    marker,
                    startPos: { lat: bus.lat, lng: bus.lng },
                    targetPos: { lat: bus.lat, lng: bus.lng },
                    startTime: now,
                    targetTime: now,
                    routeId: bus.routeId,
                    speed: bus.speed,
                    licensePlate: bus.licensePlate,
                    timestamp: bus.timestamp
                };
            }
        });
        
        for (const vehicleId in busMarkers) {
            if (!seenVehicles.has(vehicleId)) {
                busMarkers[vehicleId].marker.setMap(null);
                delete busMarkers[vehicleId];
            }
        }
    }

    function animateMarkers() {
        const now = Date.now();
        for (const vehicleId in busMarkers) {
            const data = busMarkers[vehicleId];
            if (data.startTime && data.targetTime && data.targetTime > data.startTime) {
                const duration = data.targetTime - data.startTime;
                const elapsed = now - data.startTime;
                let t = elapsed / duration;
                t = Math.max(0, Math.min(1, t));
                
                const lat = data.startPos.lat + (data.targetPos.lat - data.startPos.lat) * t;
                const lng = data.startPos.lng + (data.targetPos.lng - data.startPos.lng) * t;
                
                data.marker.setPosition(new google.maps.LatLng(lat, lng));
            }
        }
        busAnimFrame = requestAnimationFrame(animateMarkers);
    }

    const btnRegionJohor = document.getElementById('btn-region-johor');
    const btnRegionMelaka = document.getElementById('btn-region-melaka');

    function switchRegion(region) {
        if (activeRegion === region) return;
        activeRegion = region;
        
        // Update active class on selector tabs
        if (btnRegionJohor) btnRegionJohor.classList.toggle('active', region === 'johor');
        if (btnRegionMelaka) btnRegionMelaka.classList.toggle('active', region === 'melaka');
        
        // Clear all markers from map
        for (const vehicleId in busMarkers) {
            if (busMarkers[vehicleId].marker) {
                busMarkers[vehicleId].marker.setMap(null);
            }
        }
        busMarkers = {};
        
        // Clear routes state
        selectedRouteIds.clear();
        busRoutesMap = {};
        
        // Update map camera
        if (busMap) {
            const config = regionConfigs[activeRegion];
            busMap.setCenter(config.center);
            busMap.setZoom(config.zoom);
        }
        
        // Fetch new data
        fetchBusData();
    }

    if (btnRegionJohor) {
        btnRegionJohor.addEventListener('click', () => switchRegion('johor'));
    }
    if (btnRegionMelaka) {
        btnRegionMelaka.addEventListener('click', () => switchRegion('melaka'));
    }

    const btnRefresh = document.getElementById('btn-refresh-bus');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            fetchBusData();
        });
    }

    const btnSelectAll = document.getElementById('btn-select-all-bus');
    if (btnSelectAll) {
        btnSelectAll.addEventListener('click', () => {
            for (const routeId in busRoutesMap) {
                selectedRouteIds.add(routeId);
            }
            updateRouteChecklist();
            updateMarkersOnMap();
        });
    }

    const btnDeselectAll = document.getElementById('btn-deselect-all-bus');
    if (btnDeselectAll) {
        btnDeselectAll.addEventListener('click', () => {
            selectedRouteIds.clear();
            updateRouteChecklist();
            updateMarkersOnMap();
        });
    }
});
