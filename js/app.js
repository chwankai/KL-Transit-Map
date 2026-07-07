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
        const raw = data.routes[0];

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

        return convertApiRoute(raw);
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
                result.value._routeLabel = routeTypes[idx].label;
                result.value._routeType = routeTypes[idx].type;
                routes.push(result.value);
            }
        });

        // Keep ALL routes — do NOT deduplicate.
        // Even if fastest/leastchange/leastwalk return the same line path,
        // we show all cards so the user sees which optimization each represents.
        const unique = routes.filter(r => r !== null);

        if (unique.length === 0) throw new Error('No valid routes from API');
        return unique;
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
                    const probeRoute = await fetchSingleRoute(flng, flat, tlng, tlat, 'fastest', targetTime);
                    if (probeRoute.totalDurationSec) {
                        // Subtract duration from target arrival to get departure
                        departureTime = subtractSecondsFromDatetime(targetTime, probeRoute.totalDurationSec);
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
