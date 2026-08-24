# Klang Valley Transit Map — Train ETA Calculation Methodology

This document explains how the application calculates train Estimated Time of Arrival (ETA), scheduled timetables, and live countdowns for rail stations across Klang Valley.

---

## 1. System Overview & Data Architecture

Because official Malaysian public APIs currently do not provide real-time vehicle GPS tracking for rail transit, train ETAs in this application are calculated using a **frequency-based GTFS schedule engine** combined with **stop offset calculations**.

The system consists of three main components:

1. **GTFS Pre-processor (`fetch_gtfs_data.py`)**: Downloads static GTFS feeds from `data.gov.my`, extracts operating frequencies and stop arrival offsets, and outputs `public/gtfs_data.json`.
2. **Frequency Schedule Engine (`src/lib/gtfs-schedule.ts`)**: Calculates upcoming arrival timestamps and full-day timetables dynamically based on current time and day type.
3. **Live UI Ticker & Status Renderer (`src/pages/StationInfoView.tsx`)**: Updates a live countdown timer every second and renders status badges (`Arriving`, `Approaching`).
4. **API Journey Planner ETAs (`src/lib/routing.ts`)**: Retrieves leg-by-leg arrival/departure ETAs for multi-transfer itinerary planning via MyRapid APIs.

---

## 2. Pre-computed Schedule Data (`public/gtfs_data.json`)

The `gtfs_data.json` file contains structured frequency windows and arrival offsets for every station per line and direction.

### Data Structure Schema

```json
{
  "calendar": {
    "FULL_WK": { "weekday": true, "saturday": false, "sunday": false }
  },
  "lines": {
    "KJ": {
      "directions": {
        "From Gombak to Putra Heights": {
          "services": [
            {
              "service_id": "FULL_WK",
              "frequencies": [
                {
                  "start_secs": 21600,
                  "end_secs": 32400,
                  "headway_secs": 180
                }
              ],
              "offsets": {
                "GOMBAK": 0,
                "TAMAN MELATI": 120,
                "KLCC": 2400,
                "PUTRA HEIGHTS": 5405
              }
            }
          ]
        }
      }
    }
  }
}
```

### Key Parameters:
- **`start_secs` & `end_secs`**: Operational window boundaries expressed in **seconds from midnight** (e.g. `21600` = 06:00 AM).
- **`headway_secs`**: Interval in seconds between consecutive train departures from the first station (e.g. `180` = 3 minutes headway).
- **`offsets`**: Pre-calculated travel duration (in seconds) from the line's starting terminus to each respective station.

---

## 3. Departure Calculation Algorithm (`gtfs-schedule.ts`)

When a user views a station page, `getNextDepartures()` computes the upcoming arrival times using the following step-by-step logic:

```
                  ┌─────────────────────────────────────┐
                  │    Current Date & Time (now)        │
                  └──────────────────┬──────────────────┘
                                     │
                        Calculate nowSecs & dayType
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │    Match Active Services (Calendar) │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │   Find Station Offset (seconds)     │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │ Loop through Frequency Windows:                                  │
   │   base_departure = start_secs                                    │
   │   while base_departure < end_secs:                               │
   │     arrivalAtStation = base_departure + offsetSecs               │
   │     if (nowSecs < arrivalAtStation <= nowSecs + 3 hours):        │
   │       add arrivalAtStation to upcoming list                      │
   │     base_departure += headway_secs                               │
   └─────────────────────────────────┬────────────────────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │  Sort, Deduplicate & Slice Top N    │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │ Format to HH:MM & Return TargetSecs │
                  └──────────────────┬──────────────────┘
```

### Formula

For a given station $S$ and frequency window $W$:

$$\text{Arrival Time at Station } S = t_{\text{base}} + \text{Offset}(S)$$

where:
* $t_{\text{base}} = \text{start\_secs} + k \times \text{headway\_secs}$ for integer $k \ge 0$ such that $t_{\text{base}} < \text{end\_secs}$
* $\text{Offset}(S)$ is the trip duration from origin to station $S$.

---

## 4. Real-time Live Ticker & Status Thresholds (`StationInfoView.tsx`)

A 1-second interval ticker continuously evaluates the exact remaining time until arrival:

$$\text{secsAway} = \text{targetSecs} - \text{currentTotalSecs}$$

### Status Badge Thresholds

| Remaining Time (`secsAway`) | Display Format | Badge / Chip | Style & Effect |
| :--- | :--- | :--- | :--- |
| `secsAway < 0` | `Passed` / `15:20` | `None` | Dimmed / Past state |
| `0 <= secsAway <= 30` | `Arriving` (or `0m`) | `Arriving` | Green text & background (`text-emerald-500 bg-emerald-500/10`), **pulsing animation** |
| `30 < secsAway <= 120` | `1m45s` | `Approaching` | Amber text & background (`text-amber-500 bg-amber-500/10`), **pulsing animation** |
| `secsAway > 120` | `5m` / `12m30s` | `None` | Standard card styling |

- **Auto-Refresh**: The GTFS arrival dataset is re-fetched every **10 seconds** to ensure smooth window updates.

---

## 5. Route Planner Journey ETAs (`routing.ts` & `PlanView.tsx`)

For route planning between an Origin and Destination station:

1. **MyRapid API Query**: Queries `https://jp-web.myrapid.com.my/endpoint/geoservice/journeyPlanner`.
2. **Leg Extraction**: For each transit leg, extracts `estimated_departure_time` and `estimated_end_arrival_time`.
3. **Summary Times**:
   - `etaDepart`: Formatted departure time of the first transit leg (e.g. `08:15`).
   - `etaArrive`: Formatted arrival time of the final transit leg (e.g. `08:42`).
   - `totalDurationSec`: Total calculated duration in seconds between departure and destination arrival.

---

## 6. Summary Comparison Table

| Feature | Next Station Departures | Full Timetable | Route Planner Itinerary |
| :--- | :--- | :--- | :--- |
| **Data Source** | Local GTFS Frequency Spec (`gtfs_data.json`) | Local GTFS Frequency Spec (`gtfs_data.json`) | MyRapid Journey Planner API |
| **Calculation** | $t_{\text{start}} + k \cdot h + \text{offset}$ | All $t_{\text{start}} + k \cdot h + \text{offset}$ | Server-side itinerary graph solution |
| **Update Interval** | 1s live countdown + 10s data refetch | On tab selection | On user search |
| **Handling Past Midnight** | Normalizes modulo 86400 (up to 03:00 AM next day) | Groups hours 0-2 as late night | Displays exact departure/arrival times |
