# Klang Valley Transit Map & Route Planner

An interactive transit map, GTFS static schedule explorer, and multi-line route planner for the Klang Valley rail transit network in Kuala Lumpur, Malaysia.

Built using **React, TypeScript, Vite, Tailwind CSS, and Leaflet**.

---

## 🚀 Key Features

* **Interactive Real-Scale Map**: Realistic GPS-aligned vector rail tracks, walkway transfer links, and interactive station markers with custom line badges. Click track lines to view line-specific summaries.
* **Schematic Map Viewer**: Quick access to the standard Klang Valley Rail Map and the upcoming Circle Line Map.
* **GTFS Static Schedule Engine**: Calculates live departure timetables mathematically using Template Trips (`stop_times.txt`) and Frequency Windows (`frequencies.txt`) from Malaysia's open static GTFS feeds.
* **Live Dynamic Countdowns**: Real-time ticket ticker counting down arrival minutes and seconds for the nearest trains (updates every 10 seconds), with flashing status indicators.
* **Smart Route Planner**: Finds the fastest path across the network with exact transfer instructions, cashless fare calculations, and total travel distance estimation.
* **Lines Explorer**: Explores stations by transit lines (sorted MRT > LRT > Monorail > BRT), featuring interchange codes, walking walkway connections, and a global search tool.
* **Dark / Light Theme Support**: Custom system-preference styling with modern dark and light theme toggles.

---

## 🛠️ Technology Stack

* **Framework**: React 18, Vite, TypeScript
* **Styling**: Tailwind CSS, Lucide React Icons
* **Mapping**: Leaflet (via OSM)
* **Routing**: Dijkstra's algorithm for multi-modal pathfinding

---

## 📂 Project Architecture

```
├── fetch_gtfs_data.py          # Python utility to download & build local GTFS database
├── fetch_schedules.py          # Pre-compiles timetables for faster offline access
├── public/
│   ├── gtfs_data.json          # Pre-parsed static frequency parameters
│   ├── station_coords.json     # Station coordinates for Leaflet mapping
│   ├── station_schedules.json  # Pre-compiled static timetable data
│   └── maps/                   # Schematic rail maps (JPG, PDF)
└── src/
    ├── context/                # Theme and settings state providers
    ├── components/
    │   └── layout/             # Layout components (Header, Footer, Settings)
    ├── lib/
    │   ├── gtfs-schedule.ts    # Main countdown schedule algorithm
    │   ├── routing.ts          # Pathfinding & fare calculation engine
    │   └── transit-data.ts     # Station coordinates & structural definitions
    └── pages/
        ├── MapView.tsx         # OSM Leaflet / Schematic map page
        ├── PlanView.tsx        # Pathfinding and journey query page
        ├── LinesView.tsx       # Transit line explorer with global search
        └── StationInfoView.tsx # Live schedules & timetables info page
```

---

## 💻 Getting Started

### Prerequisites

* Node.js (v18 or higher recommended)
* npm or yarn

### Installation & Run

1. Clone this repository to your local directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the local development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

---

## 📑 GTFS Data Extraction

The static timetables and shapes are parsed directly from Malaysia's Open Data GTFS feeds. To pull and compile the raw data yourself:

1. Run the GTFS downloader to scrape static agency files:
   ```bash
   python fetch_gtfs_data.py
   ```
2. Compile and compile coordinates and shapes:
   ```bash
   python fetch_schedules.py
   ```
This generates the compressed schedule datasets in `public/` that are consumed client-side by the application.
