# Klang Valley Transit Map & Route Planner

An interactive transit map, GTFS static schedule explorer, multi-line route planner, and bus network explorer for the Klang Valley transit system in Kuala Lumpur, Malaysia.

Built using **React, TypeScript, Vite, Tailwind CSS, Leaflet, and data.gov.my Open APIs**.

---

## 🚀 Key Features

* **Interactive Real-Scale Map**: Realistic GPS-aligned vector rail tracks, walkway transfer links, and interactive station markers with custom line badges. Click track lines to view line-specific summaries.
* **Real-Time GPS Location & Tracking**: Live GPS positioning on the interactive map with device heading orientation, pulse indicator, nearest station proximity detection, and continuous follow mode.
* **Smart Route Planner & Saved Routes**: Finds the fastest path across the network with exact transfer instructions, cashless fare calculations, total travel distance estimation, and station/route bookmarks.
* **Rapid Bus & Rail Explorer**: Explore stations by transit lines (sorted MRT > LRT > Monorail > BRT > KTM) and browse 100+ Rapid Bus routes with stops, schedules, and interchange badges.
* **GTFS Static Schedule Engine & Countdowns**: Real-time ticker counting down arrival minutes and seconds for the nearest trains (updates every 10 seconds), with dynamic frequency calculation.
* **RapidKL Ridership & Analytics**: Live transit insights and ridership trends powered by Malaysia's official `data.gov.my` Data Catalogue API.
* **Multilingual Localization**: Complete localized interface supporting English, Bahasa Melayu, and Chinese (Simplified).
* **Offline Readiness & PWA Caching**: Full client-side caching of map data, station floor plans, and schedules for reliable offline transit planning.
* **Dark / Light Theme Support**: Custom system-preference styling with modern dark and light theme toggles.

---

## 🛠️ Technology Stack

* **Framework**: React 18, Vite, TypeScript
* **Styling**: Tailwind CSS, Lucide React Icons
* **Mapping**: Leaflet (via OSM tile providers)
* **Routing**: Dijkstra's algorithm for multi-modal pathfinding and fare calculations
* **Data Sources**: Official GTFS static feeds & data.gov.my Open Data Catalogue API

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
    ├── context/                # Theme, language, and settings state providers
    ├── components/
    │   └── layout/             # Layout components (Header, Footer, Settings)
    ├── lib/
    │   ├── gtfs-schedule.ts    # Main countdown schedule algorithm
    │   ├── locationSimulator.ts# Mock GPS geolocation simulator
    │   ├── offlineSimulator.ts # Network simulation and storage manager
    │   ├── routing.ts          # Pathfinding & fare calculation engine
    │   ├── translations.ts     # Multilingual i18n dictionaries
    │   └── transit-data.ts     # Station coordinates & structural definitions
    └── pages/
        ├── MapView.tsx         # OSM Leaflet / Schematic map page
        ├── PlanView.tsx        # Pathfinding and journey query page
        ├── LinesView.tsx       # Transit line explorer with global search
        ├── BusView.tsx         # Rapid Bus network explorer
        ├── StationInfoView.tsx # Live schedules & station floor plan page
        ├── GuideView.tsx       # Transit guide and fare policy reference
        └── dev/                # Developer portal, GPS simulator & analytics
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
2. Compile schedules and coordinates:
   ```bash
   python fetch_schedules.py
   ```
This generates the compressed schedule datasets in `public/` that are consumed client-side by the application.
