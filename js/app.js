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

    // --- MyRapid Journey Planner API Integration ---
    async function geocodeStation(stationName) {
        const url = `https://jp-web.myrapid.com.my/endpoint/geoservice/geocode?scope=WMcentral&agency=rapidkl&input=${encodeURIComponent(stationName)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Geocoding failed for ${stationName}`);
        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            throw new Error(`No coordinates found for ${stationName}`);
        }
        // Prioritize matching rail transit stations
        const railCategories = ['KJ', 'KG', 'PY', 'AG', 'SP', 'MR', 'BRT', 'SA', 'MRT', 'LRT', 'Monorail', 'PYL', 'KGL', 'KJL', 'AGL', 'SPL', 'MRL', 'SAL'];
        const railResult = data.results.find(r => railCategories.includes(r.category) || railCategories.includes(r.type));
        return railResult || data.results[0];
    }

    function mapApiLineId(apiLineId) {
        const mapping = {
            "KJL": "KJ",
            "AGL": "AG",
            "SPL": "SP",
            "KGL": "KG",
            "PYL": "PY",
            "MRL": "MR",
            "SAL": "SA",
            "BRT": "BRT"
        };
        return mapping[apiLineId] || apiLineId;
    }

    function findStationByCodeOrName(code, name) {
        const cleanCode = code ? code.trim().toUpperCase() : '';
        if (cleanCode) {
            for (const [stationName, stationObj] of Object.entries(transitData.stations)) {
                if (stationObj.codes.some(c => c.toUpperCase() === cleanCode)) {
                    return stationName;
                }
            }
        }
        
        let cleanName = name ? name.replace(/\s*-\s*.+$/, '').trim().toUpperCase() : '';
        for (const stationName of Object.keys(transitData.stations)) {
            if (stationName.toUpperCase() === cleanName) {
                return stationName;
            }
        }
        return null;
    }

    function convertApiRoute(apiRoute) {
        const edges = [];
        const path = [];
        let transfers = 0;
        const legs = apiRoute.legs || [];
        
        for (let i = 0; i < legs.length; i++) {
            const leg = legs[i];
            if (leg.type === "transit" && leg.steps && leg.steps.length > 0) {
                const apiLine = leg.route_details ? leg.route_details.route_short_name : "";
                const lineId = mapApiLineId(apiLine);
                
                for (let j = 0; j < leg.steps.length; j++) {
                    const step = leg.steps[j];
                    const stationName = findStationByCodeOrName(step.stop_id, step.stop_name);
                    
                    if (!stationName) {
                        throw new Error(`Route contains non-rail station: ${step.stop_name}`);
                    }
                    
                    if (path.length === 0 || path[path.length - 1] !== stationName) {
                        path.push(stationName);
                    }
                    
                    if (j > 0) {
                        const prevStep = leg.steps[j - 1];
                        const prevStation = findStationByCodeOrName(prevStep.stop_id, prevStep.stop_name);
                        if (!prevStation) {
                            throw new Error(`Route contains non-rail station: ${prevStep.stop_name}`);
                        }
                        edges.push({
                            from: prevStation,
                            to: stationName,
                            line: lineId,
                            distance: (leg.distance / (leg.steps.length - 1)) / 1000
                        });
                    }
                }
            } else if (leg.type === "pedestrain" || leg.type === "pedestrian") {
                transfers++;
                let fromStation = null;
                let toStation = null;
                
                if (i > 0 && legs[i-1].steps && legs[i-1].steps.length > 0) {
                    const prevSteps = legs[i-1].steps;
                    const lastStep = prevSteps[prevSteps.length - 1];
                    fromStation = findStationByCodeOrName(lastStep.stop_id, lastStep.stop_name);
                }
                if (i < legs.length - 1 && legs[i+1].steps && legs[i+1].steps.length > 0) {
                    const nextSteps = legs[i+1].steps;
                    const firstStep = nextSteps[0];
                    toStation = findStationByCodeOrName(firstStep.stop_id, firstStep.stop_name);
                }
                
                if (fromStation && toStation) {
                    if (path.length === 0 || path[path.length - 1] !== fromStation) {
                        path.push(fromStation);
                    }
                    path.push(toStation);
                    edges.push({
                        from: fromStation,
                        to: toStation,
                        line: "WALKWAY",
                        distance: (leg.distance || 0) / 1000
                    });
                }
            }
        }
        
        let transitLines = [];
        legs.forEach(leg => {
            if (leg.type === "transit" && leg.route_details) {
                transitLines.push(leg.route_details.route_short_name);
            }
        });
        transfers = Math.max(0, transitLines.length - 1);
        
        const cashlessFare = apiRoute.alt_fare_price && apiRoute.alt_fare_price.cashless ? parseFloat(apiRoute.alt_fare_price.cashless) : null;
        const cashFare = apiRoute.alt_fare_price && apiRoute.alt_fare_price.cash ? parseFloat(apiRoute.alt_fare_price.cash) : null;
        const concessionFare = apiRoute.alt_fare_price && apiRoute.alt_fare_price.consession ? parseFloat(apiRoute.alt_fare_price.consession) : null;
        
        return {
            path: path,
            edges: edges,
            totalDistance: (apiRoute.total_distance || 0) / 1000,
            totalFare: cashlessFare,
            cashFare: cashFare,
            concessionFare: concessionFare,
            transfers: transfers
        };
    }

    async function fetchMyRapidRoute(origin, dest) {
        const originGeo = await geocodeStation(origin);
        const destGeo = await geocodeStation(dest);
        
        const flng = originGeo.geometry.coordinates[0];
        const flat = originGeo.geometry.coordinates[1];
        const tlng = destGeo.geometry.coordinates[0];
        const tlat = destGeo.geometry.coordinates[1];
        
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const departureTime = `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;
        
        const url = `https://jp-web.myrapid.com.my/endpoint/geoservice/journeyPlanner?agency=rapidkl&flng=${flng}&flat=${flat}&tlng=${tlng}&tlat=${tlat}&mode=rail&type=fastest&departure_datetime=${encodeURIComponent(departureTime)}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Journey Planner API failed");
        const data = await response.json();
        
        if (data.status !== "OK" || !data.routes || data.routes.length === 0) {
            throw new Error(data.message || "No routes returned by MyRapid API");
        }
        
        return convertApiRoute(data.routes[0]);
    }

    function renderRouteResults(route) {
        resultsPlaceholder.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        
        const cashlessVal = route.totalFare !== null && route.totalFare !== undefined ? `RM ${route.totalFare.toFixed(2)}` : '--';
        resFare.innerText = cashlessVal;
        
        const resFareCash = document.getElementById('res-fare-cash');
        if (resFareCash) {
            const cashVal = route.cashFare !== null && route.cashFare !== undefined ? `RM ${route.cashFare.toFixed(2)}` : '-';
            resFareCash.innerText = cashVal;
        }
        
        const resFareConcession = document.getElementById('res-fare-concession');
        if (resFareConcession) {
            const concessionVal = route.concessionFare !== null && route.concessionFare !== undefined ? `RM ${route.concessionFare.toFixed(2)}` : '--';
            resFareConcession.innerText = concessionVal;
        }
        
        resDist.innerText = `${route.totalDistance.toFixed(2)} km`;
        resTransfers.innerText = route.transfers;
        
        renderTimeline(route);
        
        const savedFarePref = localStorage.getItem('fare_display_preference') || 'all';
        applyFareDisplayPreference(savedFarePref);
    }

    btnSubmitPlan.addEventListener('click', async (e) => {
        e.preventDefault();
        const origin = originInput.value.trim();
        const dest = destInput.value.trim();
        
        if (!origin || !dest) {
            alert('Please select both Origin and Destination stations.');
            return;
        }
        
        if (origin === dest) {
            const sameStationRoute = {
                path: [origin],
                edges: [],
                totalDistance: 0,
                totalFare: 0.80,
                cashFare: null,
                concessionFare: 0.40,
                transfers: 0,
                isSameStation: true
            };
            renderRouteResults(sameStationRoute);
            document.querySelector('.planner-layout').classList.add('showing-results');
            return;
        }
        
        const originalText = btnSubmitPlan.innerHTML;
        btnSubmitPlan.disabled = true;
        btnSubmitPlan.innerHTML = 'Calculating Route... ⏳';
        
        try {
            const route = await fetchMyRapidRoute(origin, dest);
            renderRouteResults(route);
        } catch (err) {
            console.warn("MyRapid API failed, falling back to local Dijkstra planner:", err);
            
            const excluded = [];
            const checkboxes = excludeChecklist.querySelectorAll('.exclude-checkbox:not(:checked)');
            checkboxes.forEach(cb => excluded.push(cb.value));
            
            const route = transitData.findRoute(origin, dest, excluded);
            if (!route) {
                alert('No route found between these stations. Try enabling more lines.');
                btnSubmitPlan.disabled = false;
                btnSubmitPlan.innerHTML = originalText;
                return;
            }
            renderRouteResults(route);
        } finally {
            btnSubmitPlan.disabled = false;
            btnSubmitPlan.innerHTML = originalText;
        }
        
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
        
        if (route.isSameStation || route.path.length === 0) {
            const stationName = route.path[0] || originInput.value.trim();
            const stationNode = transitData.stations[stationName];
            timelineContainer.innerHTML = `
                <div class="timeline-item">
                    <div class="timeline-dot" style="--node-color: #10b981"></div>
                    <div class="timeline-title">
                        <span>${stationName}</span>
                        ${stationNode ? `<div class="station-badge-list">${getStationBadgesHtml(stationNode)}</div>` : ''}
                    </div>
                    <div class="timeline-desc">Same origin and destination. You are already at your destination.</div>
                </div>
            `;
            return;
        }
        
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
    const themePrefContainer = document.getElementById('theme-pref-container');
    const themePrefButtons = themePrefContainer ? themePrefContainer.querySelectorAll('.fare-pref-btn') : [];
    
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
    
    if (themePrefButtons.length > 0) {
        themePrefButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                themePrefButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const selectedTheme = btn.getAttribute('data-theme');
                localStorage.setItem('theme_preference', selectedTheme);
                applyTheme(selectedTheme);
            });
        });
    }
    
    // Listen for system theme preferences changes dynamically
    const systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemMediaQuery.addEventListener('change', () => {
        if (localStorage.getItem('theme_preference') === 'system') {
            applyTheme('system');
        }
    });

    // Fare Display Preference handling
    const farePrefContainer = document.getElementById('fare-pref-container');
    const farePrefButtons = farePrefContainer ? farePrefContainer.querySelectorAll('.fare-pref-btn') : [];

    function applyFareDisplayPreference(preference) {
        const fareItemCashless = document.getElementById('fare-item-cashless');
        const fareItemCash = document.getElementById('fare-item-cash');
        const fareItemConcession = document.getElementById('fare-item-concession');
        const resultsHeader = document.querySelector('.results-header');

        if (!fareItemCashless || !fareItemCash || !fareItemConcession) return;

        fareItemCashless.classList.add('hidden');
        fareItemCash.classList.add('hidden');
        fareItemConcession.classList.add('hidden');

        if (resultsHeader) {
            resultsHeader.classList.remove('single-fare-layout');
        }

        if (preference === 'all') {
            fareItemCashless.classList.remove('hidden');
            fareItemCash.classList.remove('hidden');
            fareItemConcession.classList.remove('hidden');
        } else {
            if (resultsHeader) {
                resultsHeader.classList.add('single-fare-layout');
            }
            if (preference === 'cashless') {
                fareItemCashless.classList.remove('hidden');
            } else if (preference === 'cash') {
                fareItemCash.classList.remove('hidden');
            } else if (preference === 'concession') {
                fareItemConcession.classList.remove('hidden');
            }
        }
    }

    if (farePrefButtons.length > 0) {
        farePrefButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                farePrefButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const selectedPref = btn.getAttribute('data-pref');
                localStorage.setItem('fare_display_preference', selectedPref);
                applyFareDisplayPreference(selectedPref);
            });
        });
    }

    const gmapsKeyInput = document.getElementById('gmaps-key-input');

    function loadSavedConfig() {
        // Load theme configuration
        const savedTheme = localStorage.getItem('theme_preference') || 'system';
        if (themePrefContainer) {
            themePrefButtons.forEach(btn => {
                if (btn.getAttribute('data-theme') === savedTheme) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        applyTheme(savedTheme);

        // Load Google Maps API Key
        const savedKey = (typeof CONFIG !== 'undefined' && CONFIG.GMAPS_API_KEY) || localStorage.getItem('gmaps_api_key') || '';
        if (gmapsKeyInput) {
            gmapsKeyInput.value = savedKey;
        }

        // Load Fare Display Preference
        const savedFarePref = localStorage.getItem('fare_display_preference') || 'all';
        if (farePrefContainer) {
            farePrefButtons.forEach(btn => {
                if (btn.getAttribute('data-pref') === savedFarePref) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        applyFareDisplayPreference(savedFarePref);
    }

    if (gmapsKeyInput) {
        gmapsKeyInput.addEventListener('change', () => {
            const newKey = gmapsKeyInput.value.trim();
            localStorage.setItem('gmaps_api_key', newKey);
        });
    }
    
    // Initialize Autocomplete fields
    setupAutocomplete(originInput, originDropdown);
    setupAutocomplete(destInput, destDropdown);
    
    // Load config on boot
    loadSavedConfig();
});
