document.addEventListener('DOMContentLoaded', () => {
    // 1. View Switching Tabs
    const navMap = document.getElementById('nav-map');
    const navPlan = document.getElementById('nav-plan');
    const viewMap = document.getElementById('view-map');
    const viewPlan = document.getElementById('view-plan');
    
    navMap.addEventListener('click', () => {
        navMap.classList.add('active');
        navPlan.classList.remove('active');
        viewMap.classList.add('active');
        viewPlan.classList.remove('active');
    });
    
    navPlan.addEventListener('click', () => {
        navPlan.classList.add('active');
        navMap.classList.remove('active');
        viewPlan.classList.add('active');
        viewMap.classList.remove('active');
        // Redraw autocomplete dropdown content on focus
        setupAutocomplete(originInput, originDropdown);
        setupAutocomplete(destInput, destDropdown);
    });

    // 2. Settings Modal Control
    const navSettings = document.getElementById('nav-settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const dataSourceSelect = document.getElementById('data-source-select');
    const fbConfigSection = document.getElementById('firebase-config-section');
    const saveFbConfig = document.getElementById('save-firebase-config');
    const btnPopulate = document.getElementById('btn-populate');
    const fbStatus = document.getElementById('firebase-status');
    
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

    dataSourceSelect.addEventListener('change', () => {
        if (dataSourceSelect.value === 'firebase') {
            fbConfigSection.classList.remove('hidden');
        } else {
            fbConfigSection.classList.add('hidden');
            disconnectFirebase();
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
        for (const key in transitData.lines) {
            const line = transitData.lines[key];
            const item = document.createElement('div');
            item.className = 'exclude-item';
            item.innerHTML = `
                <div class="exclude-label-wrapper">
                    <div class="exclude-line-badge" style="--line-color: ${line.color}">${line.id}</div>
                    <span>${line.name}</span>
                </div>
                <input type="checkbox" value="${line.id}" class="exclude-checkbox">
            `;
            
            item.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT') {
                    const cb = item.querySelector('.exclude-checkbox');
                    cb.checked = !cb.checked;
                }
            });
            excludeChecklist.appendChild(item);
        }
    }
    setupExcludeChecklist();

    // 5. PDF Map Viewer Rendering
    let currentMapUrl = 'Klang Valley Rail Map.pdf';
    const { pdfjsLib } = window;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    
    const pdfContainer = document.getElementById('pdf-container');
    const btnToggleMap = document.getElementById('btn-toggle-map');
    let pdfDoc = null;
    
    function renderPdf() {
        pdfContainer.innerHTML = '';
        pdfjsLib.getDocument(currentMapUrl).promise.then((pdfDoc_) => {
            pdfDoc = pdfDoc_;
            for (let i = 1; i <= pdfDoc.numPages; i++) {
                pdfDoc.getPage(i).then((page) => {
                    const scale = 2.5;
                    const viewport = page.getViewport({ scale });
                    const canvas = document.createElement('canvas');
                    canvas.className = 'pdf-page-canvas';
                    const ctx = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    pdfContainer.appendChild(canvas);
                    page.render({ canvasContext: ctx, viewport: viewport });
                });
            }
        }).catch(err => {
            console.error('Error loading PDF: ', err);
            pdfContainer.innerHTML = `<div class="error-msg">Error loading map PDF. Please try again.</div>`;
        });
    }

    if (btnToggleMap) {
        btnToggleMap.addEventListener('click', () => {
            if (currentMapUrl === 'Klang Valley Rail Map.pdf') {
                currentMapUrl = 'Circle Line.pdf';
                btnToggleMap.innerHTML = 'Standard Map 🗺️';
            } else {
                currentMapUrl = 'Klang Valley Rail Map.pdf';
                btnToggleMap.innerHTML = 'Upcoming Map 🗺️';
            }
            renderPdf();
        });
    }

    renderPdf();

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
        const checkboxes = excludeChecklist.querySelectorAll('.exclude-checkbox:checked');
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
                        ${isLast ? 'Arrive at destination' : `Transfer point to ${getLineName(steps[index + 1].line)}`}
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

    // 8. Firebase Connection and Syncer Logic
    let db = null;

    function disconnectFirebase() {
        db = null;
        fbStatus.className = 'db-status-badge offline';
        fbStatus.innerText = 'Status: Offline (Local Mode)';
        btnPopulate.disabled = true;
        
        // Revert to local memory graph
        // (Just recreate local graph by default cache)
        loadLocalStations();
    }

    function loadLocalStations() {
        console.log("Using offline database graph cache.");
    }

    async function tryConnectFirebase(config) {
        fbStatus.className = 'db-status-badge offline';
        fbStatus.innerText = 'Connecting to Firestore... 🔄';
        btnPopulate.disabled = true;
        
        try {
            if (firebase.apps.length === 0) {
                firebase.initializeApp(config);
            }
            db = firebase.firestore();
            
            // Ping database by fetching a document or collection
            await db.collection("stations").limit(1).get();
            
            fbStatus.className = 'db-status-badge online';
            fbStatus.innerText = 'Status: Connected to Firestore! ✅';
            btnPopulate.disabled = false;
            
            // Load live station data
            const success = await loadStationsFromFirebase();
            if (success) {
                console.log("Firestore sync completed successfully.");
            } else {
                console.log("Firestore empty or unreachable. Using local cache fallback.");
            }
            
        } catch (e) {
            console.error("Firebase connection error: ", e);
            fbStatus.className = 'db-status-badge offline';
            fbStatus.innerText = `Error: Connection Failed (${e.code || 'Check console'})`;
            btnPopulate.disabled = true;
        }
    }

    async function loadStationsFromFirebase() {
        if (!db) return false;
        try {
            const snapshot = await db.collection("stations").get();
            if (snapshot.empty) return false;
            
            const stations = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                stations[data.name] = data;
            });
            
            // Load into transitData runtime structure
            transitData.stations = stations;
            
            // Re-populate autocomplete datasets
            setupAutocomplete(originInput, originDropdown);
            setupAutocomplete(destInput, destDropdown);
            return true;
        } catch (e) {
            console.error("Error loading stations: ", e);
            return false;
        }
    }

    // 9. Firestore Database Populator
    btnPopulate.addEventListener('click', async () => {
        if (!db) return alert("Firebase not connected!");
        
        btnPopulate.disabled = true;
        btnPopulate.innerHTML = 'Populating Firestore... ⏳';
        
        try {
            // Delete all existing station documents to prevent duplicate or renamed duplicates (like Dang W)
            const snapshot = await db.collection("stations").get();
            if (!snapshot.empty) {
                const deleteBatch = db.batch();
                snapshot.forEach(doc => {
                    deleteBatch.delete(doc.ref);
                });
                await deleteBatch.commit();
            }

            // Write new batch to Firestore
            const batch = db.batch();
            const stations = transitData.stations;
            
            for (const name in stations) {
                const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const docRef = db.collection("stations").doc(key);
                batch.set(docRef, stations[name]);
            }
            
            await batch.commit();
            btnPopulate.innerHTML = 'Populated Successfully! ✅';
            alert(`Firestore Populated! Uploaded ${Object.keys(stations).length} stations and connections.`);
        } catch (e) {
            console.error("Database populate error: ", e);
            alert(`Failed to populate database: ${e.message}`);
            btnPopulate.disabled = false;
            btnPopulate.innerHTML = 'Populate Firestore Database ⚙️';
        }
    });

    // Save and Persist Settings Config
    saveFbConfig.addEventListener('click', () => {
        const apiKey = document.getElementById('fb-apikey').value.trim();
        const projectId = document.getElementById('fb-projectid').value.trim();
        const authDomain = `${projectId}.firebaseapp.com`;
        
        if (!apiKey || !projectId) {
            alert('Please specify both your Firebase API Key and Project ID.');
            return;
        }
        
        localStorage.setItem('transit_db_mode', 'firebase');
        localStorage.setItem('transit_fb_apikey', apiKey);
        localStorage.setItem('transit_fb_projectid', projectId);
        localStorage.setItem('transit_fb_authdomain', authDomain);
        
        tryConnectFirebase({ apiKey, projectId, authDomain });
    });

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

    function loadSavedConfig() {
        // Load theme configuration
        const savedTheme = localStorage.getItem('theme_preference') || 'system';
        themeSelect.value = savedTheme;
        applyTheme(savedTheme);

        // Load database configuration
        const mode = localStorage.getItem('transit_db_mode') || 'local';
        dataSourceSelect.value = mode;
        
        const apiKey = localStorage.getItem('transit_fb_apikey') || '';
        const projectId = localStorage.getItem('transit_fb_projectid') || '';
        const authDomain = localStorage.getItem('transit_fb_authdomain') || '';
        
        document.getElementById('fb-apikey').value = apiKey;
        document.getElementById('fb-projectid').value = projectId;
        
        if (mode === 'firebase') {
            fbConfigSection.classList.remove('hidden');
            if (apiKey && projectId) {
                tryConnectFirebase({ apiKey, projectId, authDomain });
            }
        }
    }
    
    // Initialize Autocomplete fields
    setupAutocomplete(originInput, originDropdown);
    setupAutocomplete(destInput, destDropdown);
    
    // Load config on boot
    loadSavedConfig();
});
