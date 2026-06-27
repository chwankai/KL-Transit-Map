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

    function loadSavedConfig() {
        // Load theme configuration
        const savedTheme = localStorage.getItem('theme_preference') || 'system';
        themeSelect.value = savedTheme;
        applyTheme(savedTheme);
    }
    
    // Initialize Autocomplete fields
    setupAutocomplete(originInput, originDropdown);
    setupAutocomplete(destInput, destDropdown);
    
    // Load config on boot
    loadSavedConfig();
});
