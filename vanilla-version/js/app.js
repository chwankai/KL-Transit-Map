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

    // 4. Time Mode Controls (Now / Depart at / Arrive by)
    const timeModeContainer = document.getElementById('time-mode-container');
    const timePickerRow = document.getElementById('time-picker-row');
    const timeDateInput = document.getElementById('time-date-input');
    const timeTimeInput = document.getElementById('time-time-input');
    const btnTimeNow = document.getElementById('btn-time-now');
    let timeMode = 'now'; // 'now' | 'depart' | 'arrive'

    function setTimeToNow() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        timeDateInput.value = `${yyyy}-${mm}-${dd}`;
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        timeTimeInput.value = `${hh}:${min}`;
    }
    setTimeToNow();

    function getCurrentDateTime() {
        // Returns "YYYY-MM-DD HH:MM:00" for right now
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;
    }

    function subtractSecondsFromDatetime(dtStr, seconds) {
        // Subtract 'seconds' from "YYYY-MM-DD HH:MM:00" and return new string
        const [datePart, timePart] = dtStr.split(' ');
        const [h, m] = timePart.split(':').map(Number);
        const totalMinutes = h * 60 + m - Math.ceil(seconds / 60);
        const [y, mo, d] = datePart.split('-').map(Number);
        const base = new Date(y, mo - 1, d, 0, totalMinutes, 0);
        const rh = String(base.getHours()).padStart(2, '0');
        const rm = String(base.getMinutes()).padStart(2, '0');
        const rd = String(base.getDate()).padStart(2, '0');
        const rmo = String(base.getMonth() + 1).padStart(2, '0');
        return `${base.getFullYear()}-${rmo}-${rd} ${rh}:${rm}:00`;
    }

    if (timeModeContainer) {
        const timeModeButtons = timeModeContainer.querySelectorAll('.fare-pref-btn');
        timeModeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                timeModeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const newMode = btn.getAttribute('data-mode');
                timeMode = newMode;
                if (newMode === 'now') {
                    timePickerRow.classList.add('hidden');
                    setTimeToNow();
                } else {
                    // Depart at or Arrive by: show picker
                    timePickerRow.classList.remove('hidden');
                    // Pre-fill if empty
                    if (!timeDateInput.value || !timeTimeInput.value) {
                        setTimeToNow();
                    }
                }
            });
        });
    }

    if (btnTimeNow) {
        btnTimeNow.addEventListener('click', () => {
            setTimeToNow();
        });
    }

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

    function convertApiRoute(apiRoute, excluded) {
        const edges = [];
        const path = [];
        let transfers = 0;
        const legs = apiRoute.legs || [];
        
        for (let i = 0; i < legs.length; i++) {
            const leg = legs[i];
            if (leg.type === "transit" && leg.steps && leg.steps.length > 0) {
                const apiLine = leg.route_details ? leg.route_details.route_short_name : "";
                const lineId = mapApiLineId(apiLine);
                
                if (excluded && excluded.includes(lineId)) {
                    throw new Error(`Route uses excluded line: ${lineId}`);
                }
                
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
                
                if (fromStation && toStation && fromStation !== toStation) {
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
        
        // Compute duration: use API total_duration if available, otherwise sum leg distances
        // The API field name varies; try several known keys
        const totalDurSec = apiRoute.total_duration
            || apiRoute.totalDuration
            || apiRoute.duration
            || apiRoute.total_time
            || null;

        // If API didn't give us a duration, compute it from ETAs
        let computedDur = totalDurSec;
        if (!computedDur && apiRoute._etaDepart && apiRoute._etaArrive) {
            // Parse HH:MM strings
            const [dh, dm] = apiRoute._etaDepart.split(':').map(Number);
            const [ah, am] = apiRoute._etaArrive.split(':').map(Number);
            const diffMin = (ah * 60 + am) - (dh * 60 + dm);
            if (diffMin > 0) computedDur = diffMin * 60;
        }

        return {
            path: path,
            edges: edges,
            totalDistance: (apiRoute.total_distance || 0) / 1000,
            totalFare: cashlessFare,
            cashFare: cashFare,
            concessionFare: concessionFare,
            transfers: transfers,
            // ETA from API
            etaDepart: apiRoute._etaDepart || null,
            etaArrive: apiRoute._etaArrive || null,
            totalDurationSec: computedDur,
            // Per-step direction and timing stored on steps
            legMeta: apiRoute._legMeta || []
        };
    }

    // Helper: extract train direction from headsign string e.g. "From Ampang to Sentul Timur" -> "Sentul Timur"
    function extractDirection(headsign) {
        if (!headsign) return null;
        const match = headsign.match(/to (.+)$/i);
        return match ? match[1].trim() : null;
    }

    // Helper: format a datetime string like "2026-07-07 17:12:15" -> "17:12"
    function formatApiTime(dtStr) {
        if (!dtStr) return null;
        const timePart = dtStr.split(' ')[1];
        if (!timePart) return null;
        return timePart.substring(0, 5);
    }

    // Helper: format seconds to "X min" or "Xh Ymin"
    function formatDuration(seconds) {
        if (!seconds) return '';
        const h = Math.floor(seconds / 3600);
        const m = Math.round((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}min`;
        return `${m} min`;
    }

    async function fetchSingleRoute(flng, flat, tlng, tlat, type, departureTime) {
        const url = `https://jp-web.myrapid.com.my/endpoint/geoservice/journeyPlanner?agency=rapidkl&flng=${flng}&flat=${flat}&tlng=${tlng}&tlat=${tlat}&mode=rail&type=${type}&departure_datetime=${encodeURIComponent(departureTime)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API failed for type=${type}`);
        const data = await response.json();
        if (data.status !== "OK" || !data.routes || data.routes.length === 0) {
            throw new Error(`No routes from API type=${type}`);
        }
        
        const validRoutes = [];
        for (const raw of data.routes) {
            try {
                // Enrich raw route with ETA and per-leg direction metadata before conversion
                const legs = raw.legs || [];
                const legMeta = [];
                let firstDepartTime = null;
                let lastArriveTime = null;

                for (let i = 0; i < legs.length; i++) {
                    const leg = legs[i];
                    if (leg.type === 'transit') {
                        const deptStr = formatApiTime(leg.estimated_departure_time);
                        const arrStr = formatApiTime(leg.estimated_end_arrival_time);
                        const direction = extractDirection(leg.route_details ? leg.route_details.headsign : '');
                        legMeta.push({ type: 'transit', departTime: deptStr, arriveTime: arrStr, direction });
                        if (!firstDepartTime && deptStr) firstDepartTime = deptStr;
                        if (arrStr) lastArriveTime = arrStr;
                    } else {
                        legMeta.push({ type: leg.type });
                    }
                }

                raw._etaDepart = firstDepartTime;
                raw._etaArrive = lastArriveTime;
                raw._legMeta = legMeta;

                const converted = convertApiRoute(raw);
                validRoutes.push(converted);
            } catch (err) {
                console.warn(`Skipping invalid sub-route:`, err.message);
            }
        }

        if (validRoutes.length === 0) throw new Error(`No valid rail routes from API type=${type}`);
        return validRoutes;
    }

    async function fetchMyRapidRoute(origin, dest, departureTime) {
        const originGeo = await geocodeStation(origin);
        const destGeo = await geocodeStation(dest);

        const flng = originGeo.geometry.coordinates[0];
        const flat = originGeo.geometry.coordinates[1];
        const tlng = destGeo.geometry.coordinates[0];
        const tlat = destGeo.geometry.coordinates[1];

        // Fetch all three route types in parallel
        const routeTypes = [
            { type: 'fastest',     label: '⚡ Fastest' },
            { type: 'leastchange', label: '🔄 Fewest Stops' },
            { type: 'leastwalk',   label: '🚶 Least Walk' },
        ];

        const results = await Promise.allSettled(
            routeTypes.map(rt => fetchSingleRoute(flng, flat, tlng, tlat, rt.type, departureTime))
        );

        const routes = [];
        results.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
                result.value.forEach((route, subIdx) => {
                    const label = subIdx === 0 
                        ? routeTypes[idx].label 
                        : `${routeTypes[idx].label} (Option ${subIdx + 1})`;
                    route._routeLabel = label;
                    route._routeType = routeTypes[idx].type;
                    routes.push(route);
                });
            }
        });

        // Deduplicate distinct routes by comparing path sequence
        const seen = new Set();
        const unique = [];
        for (const r of routes) {
            const pathKey = r.path.join('->');
            if (seen.has(pathKey)) continue;
            seen.add(pathKey);
            unique.push(r);
        }

        if (unique.length === 0) throw new Error('No valid routes from API');
        return unique.slice(0, 3);
    }

    // State for multiple routes
    let currentRoutes = [];
    let selectedRouteIndex = 0;

    function renderRouteCards(routes) {
        const grid = document.getElementById('route-cards-grid');
        const section = document.getElementById('route-cards-section');
        if (!grid || !routes || routes.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }
        // Always show section so user sees what route was chosen
        if (section) section.style.display = '';

        // Adjust grid cols based on count
        grid.style.gridTemplateColumns = routes.length === 1
            ? '1fr'
            : routes.length === 2
                ? 'repeat(2, 1fr)'
                : 'repeat(3, 1fr)';

        grid.innerHTML = '';
        routes.forEach((route, idx) => {
            const lines = [...new Set(route.edges.filter(e => e.line !== 'WALKWAY').map(e => e.line))];
            const fareStr = route.totalFare != null ? `RM ${route.totalFare.toFixed(2)}` : '--';
            const durStr = route.totalDurationSec ? formatDuration(route.totalDurationSec) : `${route.totalDistance.toFixed(1)} km`;
            const xferStr = route.transfers === 0 ? 'Direct' : `${route.transfers} transfer${route.transfers > 1 ? 's' : ''}`;

            const badgesHtml = lines.map((lineId, i) => {
                const lineObj = transitData.lines[lineId] || { color: '#6b7280' };
                return `${i > 0 ? '<span class="route-card-arrow">→</span>' : ''}<span class="route-card-line-badge" style="background:${lineObj.color}">${lineId}</span>`;
            }).join('');

            const card = document.createElement('button');
            card.className = `route-card${idx === 0 ? ' active' : ''}`;
            card.setAttribute('aria-label', `Route option ${idx + 1}`);
            card.innerHTML = `
                <div class="route-card-label">${route._routeLabel || `Route ${idx + 1}`}</div>
                <div class="route-card-lines">${badgesHtml}</div>
                <div class="route-card-meta">${durStr} · ${xferStr}</div>
                <div class="route-card-fare">${fareStr} cashless</div>
                ${idx === 0 ? '<span class="route-card-fastest-badge">Fastest</span>' : ''}
            `;
            card.addEventListener('click', () => {
                document.querySelectorAll('.route-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                selectedRouteIndex = idx;
                renderRouteResults(routes[idx]);
            });
            grid.appendChild(card);
        });
    }

    function renderRouteResults(route) {
        resultsPlaceholder.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        
        // ETA bar
        const etaDepart = document.getElementById('eta-depart');
        const etaArrive = document.getElementById('eta-arrive');
        const etaDuration = document.getElementById('eta-duration');
        const etaDist = document.getElementById('eta-dist');
        const etaTransfers = document.getElementById('eta-transfers');

        if (etaDepart) etaDepart.innerText = route.etaDepart || '--:--';
        if (etaArrive) etaArrive.innerText = route.etaArrive || '--:--';
        if (etaDuration) etaDuration.innerText = route.totalDurationSec ? formatDuration(route.totalDurationSec) : `${route.totalDistance.toFixed(2)} km`;
        if (etaDist) etaDist.innerText = `${route.totalDistance.toFixed(2)} km`;
        if (etaTransfers) etaTransfers.innerText = route.transfers === 0 ? 'No transfers' : `${route.transfers} transfer${route.transfers > 1 ? 's' : ''}`;

        // Fares
        const cashlessVal = route.totalFare !== null && route.totalFare !== undefined ? `RM ${route.totalFare.toFixed(2)}` : '-';
        resFare.innerText = cashlessVal;
        
        const resFareCash = document.getElementById('res-fare-cash');
        if (resFareCash) {
            let cashVal = '-';
            if (route.cashFare !== null && route.cashFare !== undefined) {
                cashVal = `RM ${route.cashFare.toFixed(2)}`;
            } else if (route.totalFare !== null && route.totalFare !== undefined) {
                const estCash = Math.ceil((route.totalFare * 1.15) * 10) / 10;
                cashVal = `RM ${estCash.toFixed(2)}`;
            }
            resFareCash.innerText = cashVal;
        }
        
        const resFareConcession = document.getElementById('res-fare-concession');
        if (resFareConcession) {
            let concessionVal = '--';
            if (route.concessionFare !== null && route.concessionFare !== undefined) {
                concessionVal = `RM ${route.concessionFare.toFixed(2)}`;
            } else if (route.totalFare !== null && route.totalFare !== undefined) {
                const estConcession = route.totalFare * 0.5;
                concessionVal = `RM ${estConcession.toFixed(2)}`;
            }
            resFareConcession.innerText = concessionVal;
        }
        
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
                isSameStation: true,
                etaDepart: null,
                etaArrive: null,
                totalDurationSec: 0,
                legMeta: []
            };
            currentRoutes = [sameStationRoute];
            const section = document.getElementById('route-cards-section');
            if (section) section.style.display = 'none';
            renderRouteResults(sameStationRoute);
            document.querySelector('.planner-layout').classList.add('showing-results');
            return;
        }
        
        const originalText = btnSubmitPlan.innerHTML;
        btnSubmitPlan.disabled = true;
        btnSubmitPlan.innerHTML = 'Calculating Route... ⏳';

        // Build target time from inputs
        const dateVal = timeDateInput ? timeDateInput.value : '';
        const timeVal = timeTimeInput ? timeTimeInput.value : '';
        let targetTime;
        if (timeMode !== 'now' && dateVal && timeVal) {
            targetTime = `${dateVal} ${timeVal}:00`;
        } else {
            targetTime = getCurrentDateTime();
        }

        try {
            let departureTime = targetTime;

            if (timeMode === 'arrive') {
                // Arrive by: first get fastest route duration, then subtract to find departure time
                btnSubmitPlan.innerHTML = 'Estimating arrival... ⏳';
                try {
                    const originGeo = await geocodeStation(origin);
                    const destGeo = await geocodeStation(dest);
                    const flng = originGeo.geometry.coordinates[0];
                    const flat = originGeo.geometry.coordinates[1];
                    const tlng = destGeo.geometry.coordinates[0];
                    const tlat = destGeo.geometry.coordinates[1];
                    // Fetch fastest using target time as departure (approximate)
                    const probeRoutes = await fetchSingleRoute(flng, flat, tlng, tlat, 'fastest', targetTime);
                    if (probeRoutes && probeRoutes.length > 0 && probeRoutes[0].totalDurationSec) {
                        // Subtract duration from target arrival to get departure
                        departureTime = subtractSecondsFromDatetime(targetTime, probeRoutes[0].totalDurationSec);
                    }
                } catch (e) {
                    console.warn('Arrive-by probe failed, using target time as departure:', e);
                }
                btnSubmitPlan.innerHTML = 'Calculating Route... ⏳';
            }

            const routes = await fetchMyRapidRoute(origin, dest, departureTime);
            currentRoutes = routes;
            selectedRouteIndex = 0;
            renderRouteCards(routes);
            renderRouteResults(routes[0]);
        } catch (err) {
            console.warn("MyRapid API failed, falling back to local Dijkstra planner:", err);
            
            const route = transitData.findRoute(origin, dest, []);
            if (!route) {
                alert('No route found between these stations.');
                btnSubmitPlan.disabled = false;
                btnSubmitPlan.innerHTML = originalText;
                return;
            }
            // Add ETA estimate for local route: ~2 min per stop
            const stopCount = route.path.length;
            route.totalDurationSec = stopCount * 120;
            route.etaDepart = null;
            route.etaArrive = null;
            route.legMeta = [];
            route._routeLabel = '🗺 Local Route';
            currentRoutes = [route];
            renderRouteCards([route]);
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

        // Build a mapping from step index -> legMeta entry for transit legs
        const legMeta = route.legMeta || [];
        let transitLegIdx = 0;
        const stepMeta = [];
        for (const step of steps) {
            if (step.line === 'WALKWAY') {
                stepMeta.push(null);
            } else {
                // Find the next transit legMeta entry
                while (transitLegIdx < legMeta.length && legMeta[transitLegIdx].type !== 'transit') {
                    transitLegIdx++;
                }
                stepMeta.push(transitLegIdx < legMeta.length ? legMeta[transitLegIdx] : null);
                transitLegIdx++;
            }
        }
        
        // Render initial departure step
        const originNode = transitData.stations[route.path[0]];
        const firstLine = steps[0] ? steps[0].line : "WALKWAY";
        const firstLineColor = getLineColor(firstLine);
        // Show depart time from first transit leg if available
        const firstMeta = stepMeta[0];
        const departTimeStr = firstMeta && firstMeta.departTime ? `<span style="font-size:0.75rem;color:var(--text-secondary);font-weight:600;margin-left:auto;">${firstMeta.departTime}</span>` : '';
        
        let html = `
            <div class="timeline-item">
                <div class="timeline-dot" style="--node-color: #6b7280"></div>
                <div class="timeline-connector" style="--connector-color: ${firstLineColor}"></div>
                <div class="timeline-title" style="justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                        <span>${route.path[0]}</span>
                        <div class="station-badge-list">${getStationBadgesHtml(originNode)}</div>
                    </div>
                    ${departTimeStr}
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
            const meta = stepMeta[index];

            // Direction hint text
            const directionHtml = meta && meta.direction
                ? `<span class="direction-hint">toward ${meta.direction}</span>`
                : '';

            // Arrival time at this segment's destination
            const arriveTimeStr = meta && meta.arriveTime
                ? `<span style="font-size:0.75rem;color:var(--text-secondary);font-weight:600;margin-left:auto;">${meta.arriveTime}</span>`
                : '';
            
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
                        Board ${getLineName(step.line)}${directionHtml}
                    </div>
                    <div class="timeline-desc">
                        ${stopsHtml}
                    </div>
                </div>
            `;
            
            // Render arrival/interchange stop
            const nodeColor = isLast ? '#10b981' : lineColor;
            // Show departure time of NEXT leg for interchange stations
            const nextMeta = !isLast ? stepMeta[index + 1] : null;
            const nextDepartStr = nextMeta && nextMeta.departTime
                ? `<span style="font-size:0.75rem;color:var(--text-secondary);font-weight:600;margin-left:auto;">${nextMeta.departTime}</span>`
                : arriveTimeStr;
            html += `
                <div class="timeline-item" style="--node-color: ${nodeColor}">
                    <div class="timeline-dot" style="--node-color: ${nodeColor}"></div>
                    <div class="timeline-connector" style="--connector-color: ${nextConnectorColor}"></div>
                    <div class="timeline-title" style="justify-content:space-between;">
                        <div style="display:flex;align-items:center;gap:0.5rem;">
                            <span>${lastStationName}</span>
                            <div class="station-badge-list">${getStationBadgesHtml(lastStationNode)}</div>
                        </div>
                        ${nextDepartStr}
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

        if (!fareItemCashless || !fareItemCash || !fareItemConcession) return;

        fareItemCashless.classList.add('hidden');
        fareItemCash.classList.add('hidden');
        fareItemConcession.classList.add('hidden');

        if (preference === 'all') {
            fareItemCashless.classList.remove('hidden');
            fareItemCash.classList.remove('hidden');
            fareItemConcession.classList.remove('hidden');
        } else {
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
        const savedKey = localStorage.getItem('gmaps_api_key') !== null
            ? localStorage.getItem('gmaps_api_key')
            : ((typeof CONFIG !== 'undefined' && CONFIG.GMAPS_API_KEY) || '');
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

    // --- Live myBAS Tracking Module ---
    let busMap = null;
    let busMarkers = {}; // key: vehicleId, value: { marker, startPos, targetPos, startTime, targetTime, routeId, ... }
    let busPollInterval = null;
    let busAnimFrame = null;
    let busRoutesMap = {}; // key: routeId, value: { name, activeCount }
    let activeBuses = []; // list of decoded vehicles
    let selectedRouteIds = new Set();
    let hasInitializedSelection = false;
    let mapsLoading = false;
    let mapsLoaded = false;
    let selectedRouteColors = {}; // Cache colors for routes to make them look harmonized
    let activeInfoWindow = null;
    let activeInfoWindowVehicleId = null;
    
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
            center: { lat: 2.2418614, lng: 102.2387632 },
            zoom: 12
        }
    };

    // Static database of all myBAS routes for J- and M- lines
    const staticRoutes = {
        johor: [
            { id: "J10", name: "J10", desc: "JB Sentral - Kota Tinggi" },
            { id: "J11", name: "J11", desc: "JB Sentral - AEON Dato' Onn" },
            { id: "J13", name: "J13", desc: "JB Sentral - Larkin Sentral" },
            { id: "J15", name: "J15", desc: "JB Sentral - Mid Valley Southkey" },
            { id: "J16", name: "J16", desc: "Angsana - Toppen Tebrau" },
            { id: "J20", name: "J20", desc: "JB Sentral - Masai" },
            { id: "J21", name: "J21", desc: "JB Sentral - Permas Jaya" },
            { id: "J22", name: "J22", desc: "JB Sentral - Scientex" },
            { id: "J30", name: "J30", desc: "JB Sentral - Kulai" },
            { id: "J31", name: "J31", desc: "JB Sentral - Pulai Mutiara" },
            { id: "J32", name: "J32", desc: "JB Sentral - Selesa Jaya" },
            { id: "J33", name: "J33", desc: "JB Sentral - Sri Yaacob" },
            { id: "J34", name: "J34", desc: "JB Sentral - Sutera Mall" },
            { id: "J40", name: "J40", desc: "Larkin Sentral - Gelang Patah" },
            { id: "J42", name: "J42", desc: "Gelang Patah - Pendas" },
            { id: "J44", name: "J44", desc: "Larkin Sentral - Puteri Harbour" },
            { id: "J50", name: "J50", desc: "Larkin Sentral - Pontian" },
            { id: "J100", name: "J100", desc: "JB Sentral - KSL City Mall" },
            { id: "J200", name: "J200", desc: "Terminal Masai - PPR Seri Alam" },
            { id: "J205", name: "J205", desc: "Terminal Masai - Lotus Kota Masai" },
            { id: "J300", name: "J300", desc: "Terminal Kulai - Putri Kulai" }
        ],
        melaka: [
            { id: "M10A", name: "M10A", desc: "Melaka Sentral - MITC & UTeM" },
            { id: "M10B", name: "M10B", desc: "Melaka Sentral - MITC" },
            { id: "M11", name: "M11", desc: "Melaka Sentral - Bukit Katil" },
            { id: "M12", name: "M12", desc: "Melaka Sentral - Airport Batu Berendam" },
            { id: "M13", name: "M13", desc: "Melaka Sentral - Taman Inang Sari" },
            { id: "M14", name: "M14", desc: "Melaka Sentral - Bertam Ulu" },
            { id: "M15", name: "M15", desc: "Melaka Sentral - Pulau Gadong" },
            { id: "M16", name: "M16", desc: "Melaka Sentral - Paya Luboh" },
            { id: "M17", name: "M17", desc: "Melaka Sentral - Tangga Batu" },
            { id: "M20", name: "M20", desc: "Melaka Sentral - Tampin" },
            { id: "M20X", name: "M20X", desc: "Melaka Sentral - Alor Gajah" },
            { id: "M21", name: "M21", desc: "Melaka Sentral - Tampin via Durian Tunggal" },
            { id: "M21X", name: "M21X", desc: "Melaka Sentral - Alor Gajah via Durian Tunggal" },
            { id: "M22", name: "M22", desc: "Melaka Sentral - Bandar Vendor" },
            { id: "M23", name: "M23", desc: "Melaka Sentral - Masjid Tanah" },
            { id: "M23X", name: "M23X", desc: "Melaka Sentral - Masjid Tanah" },
            { id: "M30", name: "M30", desc: "Melaka Sentral - Batang Melaka via Selandar" },
            { id: "M31", name: "M31", desc: "Melaka Sentral - Batang Melaka via Tebong" },
            { id: "M32", name: "M32", desc: "Melaka Sentral - Jasin" },
            { id: "M33", name: "M33", desc: "Jasin - Taman Seri Asahan" },
            { id: "M100", name: "M100", desc: "Bandaraya Melaka Feeder" },
            { id: "M101", name: "M101", desc: "Pasar Melaka Feeder" }
        ]
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

    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in km
    }

    function formatRouteId(routeId) {
        return routeId.replace(/CWLMYJB|MYJB|JB|CWLMYMK|MYMK|MK/g, '').trim();
    }

    function startBusTracking() {
        const apiKey = localStorage.getItem('gmaps_api_key') !== null
            ? localStorage.getItem('gmaps_api_key')
            : ((typeof CONFIG !== 'undefined' && CONFIG.GMAPS_API_KEY) || '');
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
                
                // Initialize with all static routes for the active region
                busRoutesMap = {};
                const regionStatic = staticRoutes[activeRegion] || [];
                regionStatic.forEach(route => {
                    busRoutesMap[route.id] = {
                        name: route.name,
                        desc: route.desc,
                        activeCount: 0
                    };
                });
                
                // Merge counts from live feed and dynamically discover new routes
                for (const rawRouteId in foundRoutes) {
                    const cleanRouteId = formatRouteId(rawRouteId);
                    if (busRoutesMap[cleanRouteId]) {
                        busRoutesMap[cleanRouteId].activeCount = foundRoutes[rawRouteId];
                    } else {
                        busRoutesMap[cleanRouteId] = {
                            name: cleanRouteId,
                            desc: `Route ${cleanRouteId}`,
                            activeCount: foundRoutes[rawRouteId]
                        };
                    }
                }
                
                if (!hasInitializedSelection) {
                    for (const routeId in busRoutesMap) {
                        selectedRouteIds.add(routeId);
                    }
                    hasInitializedSelection = true;
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
        
        const hideInactive = document.getElementById('chk-hide-inactive')?.checked || false;
        
        let sortedRouteIds = Object.keys(busRoutesMap);
        if (hideInactive) {
            sortedRouteIds = sortedRouteIds.filter(routeId => busRoutesMap[routeId].activeCount > 0);
        }
        
        sortedRouteIds.sort((a, b) => {
            return busRoutesMap[a].name.localeCompare(busRoutesMap[b].name, undefined, { numeric: true });
        });
        
        container.innerHTML = '';
        
        if (sortedRouteIds.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-secondary);font-size:0.85rem;">No active routes found matching filter.</div>`;
            return;
        }
        
        sortedRouteIds.forEach(routeId => {
            const rData = busRoutesMap[routeId];
            const isChecked = selectedRouteIds.has(routeId);
            
            const item = document.createElement('div');
            item.className = `bus-route-item ${isChecked ? 'selected' : ''} ${rData.activeCount === 0 ? 'inactive-route' : ''}`;
            const routeColor = getRouteColor(routeId);
            
            item.innerHTML = `
                <div class="bus-route-left">
                    <input type="checkbox" value="${routeId}" ${isChecked ? 'checked' : ''}>
                    <span class="route-badge" style="background-color: ${routeColor}">${rData.name}</span>
                    <span class="route-desc">${rData.desc || 'Route ' + rData.name}</span>
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

    function updateInfoWindowContent(vehicleId) {
        if (!activeInfoWindow || activeInfoWindowVehicleId !== vehicleId) return;
        const data = busMarkers[vehicleId];
        if (!data) return;
        
        const cleanName = formatRouteId(data.routeId);
        const localTime = new Date(data.timestamp).toLocaleTimeString();
        const currentLat = data.marker.getPosition().lat().toFixed(5);
        const currentLng = data.marker.getPosition().lng().toFixed(5);
        
        const content = `
            <div class="bus-info-window">
                <h3>myBAS Route ${cleanName}</h3>
                <p><strong>Plate:</strong> ${data.licensePlate}</p>
                <p><strong>Speed:</strong> ${data.speed} km/h</p>
                <p><strong>Last Updated:</strong> ${localTime}</p>
                <p><strong>Coordinates:</strong> ${currentLat}, ${currentLng}</p>
            </div>
        `;
        activeInfoWindow.setContent(content);
    }

    function updateMarkersOnMap() {
        if (!busMap) return;
        
        const now = Date.now();
        const seenVehicles = new Set();
        
        activeBuses.forEach(bus => {
            const cleanRouteId = formatRouteId(bus.routeId);
            if (!selectedRouteIds.has(cleanRouteId)) {
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
                
                // Calculate speed from coordinate shift if the API speed is unavailable/0
                let calculatedSpeed = Number(bus.speed);
                if (calculatedSpeed <= 0.05 && bus.timestamp > data.timestamp) {
                    const distKm = getDistance(data.targetPos.lat, data.targetPos.lng, bus.lat, bus.lng);
                    const hours = (bus.timestamp - data.timestamp) / 3600000;
                    if (hours > 0) {
                        const rawSpeed = distKm / hours;
                        if (rawSpeed >= 0 && rawSpeed < 130) {
                            calculatedSpeed = rawSpeed;
                        }
                    }
                }
                
                data.startPos = {
                    lat: data.marker.getPosition().lat(),
                    lng: data.marker.getPosition().lng()
                };
                data.targetPos = { lat: bus.lat, lng: bus.lng };
                data.startTime = now;
                data.targetTime = now + 15000;
                
                data.speed = calculatedSpeed.toFixed(1);
                data.timestamp = bus.timestamp;
                data.licensePlate = bus.licensePlate;
                
                updateInfoWindowContent(bus.vehicleId);
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
                
                marker.addListener('click', () => {
                    if (!activeInfoWindow) {
                        activeInfoWindow = new google.maps.InfoWindow();
                        activeInfoWindow.addListener('closeclick', () => {
                            activeInfoWindowVehicleId = null;
                        });
                    }
                    activeInfoWindowVehicleId = bus.vehicleId;
                    updateInfoWindowContent(bus.vehicleId);
                    activeInfoWindow.open(busMap, marker);
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
                
                // Real-time update open InfoWindow coordinate values
                if (activeInfoWindowVehicleId === vehicleId) {
                    updateInfoWindowContent(vehicleId);
                }
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
        
        // Reset InfoWindow state
        activeInfoWindowVehicleId = null;
        if (activeInfoWindow) activeInfoWindow.close();
        
        // Clear routes state
        selectedRouteIds.clear();
        hasInitializedSelection = false;
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

    const chkHideInactive = document.getElementById('chk-hide-inactive');
    if (chkHideInactive) {
        chkHideInactive.addEventListener('change', () => {
            updateRouteChecklist();
        });
    }

    // Toggle Tracker Sidebar Visibility
    const btnHideBusSidebar = document.getElementById('btn-hide-bus-sidebar');
    const btnShowBusSidebar = document.getElementById('btn-show-bus-sidebar');
    const busLayout = document.querySelector('.bus-layout');

    if (btnHideBusSidebar && btnShowBusSidebar && busLayout) {
        btnHideBusSidebar.addEventListener('click', () => {
            busLayout.classList.add('sidebar-hidden');
            btnShowBusSidebar.classList.remove('hidden');
            if (busMap) {
                google.maps.event.trigger(busMap, 'resize');
            }
        });

        btnShowBusSidebar.addEventListener('click', () => {
            busLayout.classList.remove('sidebar-hidden');
            btnShowBusSidebar.classList.add('hidden');
            if (busMap) {
                google.maps.event.trigger(busMap, 'resize');
            }
        });
    }
});
