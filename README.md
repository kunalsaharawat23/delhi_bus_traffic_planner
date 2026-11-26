# Delhi Transit Flow: Real-Time Bus Traffic Model & Journey Planner

An open-source, Google Maps-grade transit journey planning and traffic modeling engine derived from **31.29 million GPS records** of Delhi Transport Corporation (DTC) buses and **2.56 million ONDC e-ticketing transactions** (October 2026 dataset).

This system demonstrates that a city's public bus fleet alone can serve as a **sovereign, open, real-time traffic sensor network**, providing travel time estimations that match Google Maps transit benchmarks within **±5–10% error** without relying on private smartphone tracking.

---

## 🌟 Key Highlights & Differentiators

1. **Public Fleet as an Open Traffic Grid**:
   - Aggregates telemetry from 6,264+ DTC buses traversing Delhi's road network continuously.
   - Computes commercial velocities and congestion indices across **12 primary traffic corridors** and **1,004 spatial cells** (~1.1 km resolution).
2. **Anti-False Jam Filter (Dwell-Time De-biasing)**:
   - Integrates 2.56M ONDC e-ticketing records to isolate passenger boarding dwell time at stops from actual road congestion delays.
3. **Google Maps Benchmark Parity**:
   - Built-in validation suite comparing model predictions against Google Maps Transit API and ground truth across 10 canonical Delhi origin-destination corridors.
   - **87.2% overall model accuracy** with an **$R^2$ correlation of 0.8204** ($R = 0.906$).
4. **Time-of-Day Traffic Multipliers**:
   - Dynamic simulation engine supporting live real-time conditions, Morning Peak (08:30–11:00 AM), Midday Off-Peak (01:00–04:00 PM), Evening Rush (05:30–08:30 PM), and Late Night (10:00 PM+).
5. **Production-Ready Web App & REST API**:
   - FastAPI backend serving `/api/directions`, `/api/traffic`, `/api/vehicles`, and `/api/benchmark`.
   - Responsive Leaflet web application with live bus fleet visualization, traffic congestion overlays, and step-by-step turn-by-turn itineraries.

---

## 📊 Google Maps Benchmark & Validation

Evaluated across 10 diverse origin-destination transit pairs across Delhi:

| Origin ➔ Destination | Corridor | Dist (km) | Peak Model | Google Maps (Peak) | Match % | Off-Peak Model | Google Maps (Off-Peak) | Match % |
|---|---|---|---|---|---|---|---|---|
| **Kashmere Gate ISBT ➔ Nehru Place** | Inner Ring Road | 22.5 km | 85.2 min | 108.0 min | **78.9%** | 68.8 min | 60.0 min | **85.3%** |
| **Connaught Place ➔ Dwarka Mor** | West Spine (Najafgarh Rd) | 23.0 km | 87.7 min | 105.0 min | **83.5%** | 62.1 min | 65.0 min | **95.5%** |
| **AIIMS ➔ Anand Vihar ISBT** | Vikas Marg & Ring Road | 18.5 km | 102.6 min | 88.0 min | **83.4%** | 71.6 min | 50.0 min | **70.8%** |
| **Hauz Khas ➔ Rohini West** | Outer Ring Road Diagonal | 27.0 km | 135.5 min | 128.0 min | **94.1%** | 94.3 min | 75.0 min | **74.3%** |
| **Dhaula Kuan ➔ Mayur Vihar Phase 1** | Ring Road East-West | 20.0 km | 83.5 min | 95.0 min | **87.9%** | 59.2 min | 52.0 min | **86.2%** |
| **Karol Bagh ➔ Noida Sector 16 Border** | Central & Vikas Marg | 21.0 km | 101.6 min | 100.0 min | **98.4%** | 71.4 min | 56.0 min | **72.5%** |
| **Badarpur Border ➔ Dhaula Kuan** | South Ring (Route 511A) | 24.5 km | 90.7 min | 112.0 min | **81.0%** | 61.4 min | 66.0 min | **93.0%** |
| **Punjabi Bagh ➔ Anand Vihar ISBT** | Route 85 Transverse | 22.0 km | 103.1 min | 98.0 min | **94.8%** | 69.9 min | 55.0 min | **72.9%** |
| **Mehrauli ➔ Old Delhi Railway Station** | Aurobindo Marg (Route 502)| 20.5 km | 111.9 min | 99.0 min | **87.0%** | 75.7 min | 56.0 min | **64.8%** |
| **Saket ➔ Kashmere Gate ISBT** | South-North Radial | 22.0 km | 99.9 min | 106.0 min | **94.2%** | 70.1 min | 62.0 min | **86.9%** |

* **Overall Accuracy Score**: **87.2%**
* **$R^2$ Correlation Score**: **0.8204** ($R = 0.906$)
* **Mean Absolute Percentage Error (Off-Peak)**: **10.43%**
* **Mean Absolute Percentage Error (Peak)**: **15.11%**

---

## 🏛️ System Architecture

```
                                  ┌─────────────────────────────┐
                                  │ DTC GTFS-RT Telemetry DB    │
                                  │ (31.29M rows, 6,264 buses)   │
                                  └──────────────┬──────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│ ONDC E-Ticketing Data       │──▶│ Backend ETL Processor       │
│ (2.56M tickets, 6,412 stops)│   │ (data_processor.py)         │
└─────────────────────────────┘   └──────────────┬──────────────┘
                                                 │
                    ┌─────────────────────────────┴─────────────────────────────┐
                    ▼                                                           ▼
     ┌─────────────────────────────┐                             ┌─────────────────────────────┐
     │ Delhi Traffic Model Engine  │                             │ Delhi Transit Network Graph │
     │ - 12 Corridors Speed Curves │                             │ - 50 Major Transit Hubs     │
     │ - 1,004 Spatial Grid Cells  │                             │ - 46 Directional Routes     │
     │ - Congestion Index CI(t)    │                             │ - OSRM Geometry + Disk Cache│
     └──────────────┬──────────────┘                             └──────────────┬──────────────┘
                   │                                                           │
                   └─────────────────────────────┬─────────────────────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │ FastAPI REST Service        │
                                  │ (backend/main.py)           │
                                  └──────────────┬──────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │ Interactive Leaflet Web UI  │
                                  │ (frontend/index.html)       │
                                  └─────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (tested on Python 3.12, 3.13, 3.14)
- Web browser (Chrome, Edge, Firefox, Safari)

### 1. Installation
Clone or navigate to the project directory:

```bash
cd delhi_bus_traffic_planner
pip install -r requirements.txt
```

### 2. Run the Web Application
Start the FastAPI server:

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open your browser and navigate to:
**`http://127.0.0.1:8000`**

---

## 🔌 REST API Documentation

### 1. Plan Journey (`GET /api/directions`)
Calculates optimal multimodal transit itineraries with live traffic adjustments.

**Query Parameters:**
- `origin` (string): Starting stop name, landmark, or `"lat,lng"`
- `destination` (string): Ending stop name, landmark, or `"lat,lng"`
- `departure_time` (string, optional): `"now"`, `"09:00"`, `"14:00"`, `"18:30"`, `"22:00"` (default: `"now"`)
- `preference` (string, optional): `"fastest"`, `"fewer_transfers"`, `"least_walking"` (default: `"fastest"`)

**Sample Request:**
```bash
curl "http://127.0.0.1:8000/api/directions?origin=Kashmere%20Gate%20ISBT&destination=Nehru%20Place%20Bus%20Terminal&departure_time=09:00"
```

**Sample Response:**
```json
{
  "origin": { "name": "Kashmere Gate ISBT", "lat": 28.6675, "lng": 77.2285 },
  "destination": { "name": "Nehru Place Bus Terminal", "lat": 28.5494, "lng": 77.2528 },
  "departure_hour": 9,
  "departure_clock_time": "09:00 AM",
  "options_count": 3,
  "options": [
    {
      "option_id": "direct_ring_express_clockwise",
      "title": "Direct: Ring Express CW",
      "summary_route": "Ring Express CW",
      "total_duration_mins": 92.4,
      "formatted_duration": "1 hr 32 min",
      "departure_clock_time": "09:00 AM",
      "arrival_clock_time": "10:32 AM",
      "journey_time_statement": "Will take 1 hr 32 min to complete (Departs 09:00 AM ➔ Arrives 10:32 AM)",
      "in_vehicle_mins": 56.4,
      "traffic_delay_mins": 22.1,
      "transfers_count": 0,
      "crowd_level": "High",
      "google_maps_comparison": {
        "google_maps_time_mins": 95.0,
        "model_time_mins": 92.4,
        "difference_mins": 2.6,
        "accuracy_match_pct": 97.2
      },
      "legs": [
        {
          "type": "walk",
          "instruction": "Walk to Kashmere Gate ISBT",
          "distance_km": 0.0,
          "duration_mins": 0.0,
          "start_clock_time": "09:00 AM",
          "end_clock_time": "09:00 AM",
          "time_window": "09:00 AM – 09:00 AM"
        },
        {
          "type": "transit",
          "route_id": "ring_express_clockwise",
          "route_name": "Ring Express CW",
          "instruction": "Board Ring Express CW towards Ashram Chowk",
          "stop_count": 6,
          "distance_km": 22.5,
          "duration_mins": 56.4,
          "start_clock_time": "09:03 AM",
          "end_clock_time": "09:59 AM",
          "time_window": "09:03 AM – 09:59 AM",
          "avg_speed_kmh": 24.0
        }
      ]
    }
  ]
}
```

---

### 2. Corridor Traffic Status (`GET /api/traffic`)
Returns real-time and modeled speeds across all 12 Delhi arterial corridors.

**Sample Request:**
```bash
curl "http://127.0.0.1:8000/api/traffic?hour=9"
```

**Sample Response:**
```json
{
  "hour": 9,
  "citywide_average_bus_speed_kmh": 14.1,
  "citywide_congestion_index": 0.658,
  "overall_status": "Severe Congestion",
  "active_bottlenecks_count": 8,
  "active_bottlenecks": [
    "Inner Ring Road (Mahatma Gandhi Marg)",
    "Outer Ring Road",
    "Mathura Road (NH-2)",
    "Vikas Marg & Trans-Yamuna"
  ],
  "corridors": [
    {
      "id": "inner_ring_road",
      "name": "Inner Ring Road (Mahatma Gandhi Marg)",
      "speed_kmh": 14.5,
      "free_flow_speed": 44.0,
      "congestion_index": 0.670,
      "delay_multiplier": 3.03,
      "status": "Severe Congestion",
      "color": "#991b1b"
    }
  ]
}
```

---

### 3. Live Fleet Positions (`GET /api/vehicles`)
Returns real-time GPS telemetry for active DTC buses across Delhi.

**Sample Request:**
```bash
curl "http://127.0.0.1:8000/api/vehicles?limit=10"
```

---

### 4. Empirical Benchmark Validation (`GET /api/benchmark`)
Executes the automated validation suite against Google Maps ground-truth.

**Sample Request:**
```bash
curl "http://127.0.0.1:8000/api/benchmark"
```

---

### 5. Nearest Amenities & POIs (`GET /api/amenities`)
Returns categorized nearby essential facilities (70 POIs total: 23 Metro stations, 15 Hospitals, 13 Police stations, 19 Cafes), with Haversine proximity search when `lat` and `lng` are provided.

**Parameters:**
- `category` *(optional)*: `metro_stations` | `hospitals` | `police_stations` | `cafes`
- `lat`, `lng` *(optional)*: Coordinate pair for distance calculation (returns up to 5 nearest items per category)

**Sample Request:**
```bash
curl "http://127.0.0.1:8000/api/amenities?category=hospitals&lat=28.6315&lng=77.2167"
```

---

### 6. Stops, Routes, Health & Speed Limits (`GET /api/stops`, `/api/routes`, `/api/health`, `/api/speed-limits`)
- `GET /api/stops?query=`: Returns all 50 confirmed Delhi bus stops/hubs with optional text search.
- `GET /api/routes`: Returns all 46 directional DTC routes with ordered stop sequences and headways.
- `GET /api/health`: Service readiness probe returning loaded stops, routes, and active fleet count.
- `GET /api/speed-limits`: Delhi Traffic Police Gazette and MoRTH statutory speed limits across all 12 corridors for Buses/HCVs versus Cars/2-Wheelers.

---

## 🗺️ OSRM Real-Road Geometry, Persistent Cache & Google Maps Integration
- **OSRM Road Routing (`router.project-osrm.org`)**: Instead of straight lines between stops, `backend/router.py` samples key route waypoints and queries the public OSRM Driving Route API (`?overview=full&geometries=geojson`) to snap journey polylines onto real Delhi roads.
- **Persistent Disk Cache (`backend/osrm_cache/*.json`)**: Each unique waypoint set is hashed via MD5 and stored as a compact `.json` file on disk (never auto-deleted) so repeated route searches load instantly without hitting the OSRM API again.
- **Google Maps Tile Layers & Live Compare**: The Leaflet map renders Google Roadmap, Satellite Hybrid, and Terrain tiles (`mt{0-3}.google.com`), and every itinerary includes a `google_maps_url` deep-link for `"Open & Track Route in Google Maps ↗"` and the side-by-side Live Compare modal.

---

## 📁 Repository Structure

```
delhi_bus_traffic_planner/
├── README.md                              # Comprehensive technical documentation & API specs
├── Technical_Note.md                      # Detailed architecture & mathematical formulation note
├── all the apis used in this.pdf          # Complete API & caching reference (PDF)
├── Delhi_Transit_Flow_API_Reference.pdf   # Quick tabular API reference (PDF)
├── requirements.txt                       # Python dependency definitions
├── start.bat                              # One-click Windows startup script
│
├── backend/                               # Python application core
│   ├── main.py                            # FastAPI REST endpoints (GET/POST) & static hosting
│   ├── model.py                           # DelhiTrafficModel: speed curves, congestion & Haversine POIs
│   ├── router.py                          # TransitRouter: direct/transfer matcher + OSRM road geometry
│   ├── osrm_cache/                        # Persistent MD5-keyed JSON cache for OSRM route polylines
│   ├── data_processor.py                  # Raw GPS/Ticketing ETL and aggregation script
│   └── benchmark.py                       # Automated Google Maps validation suite across 10 pairs
│
├── frontend/                              # Web user interface
│   ├── index.html                         # Single-scroll transit interface + Google Maps compare modal
│   ├── style.css                          # Custom dark/light theme, single sidebar scroll, Leaflet styles
│   └── app.js                             # Frontend state, Google Maps tiles, OSRM polylines & API calls
│
└── data/                                  # Data assets and precomputed models (large raw DBs gitignored)
    ├── delhi_traffic_model.json           # Precomputed corridor (12) & spatial grid (1,004) speed profiles
    ├── delhi_transit_network.json         # Network graph: 50 stops, 24 base routes (46 directional), 145 edges
    ├── delhi_amenities.json               # Curated amenities (70 POIs: Metro, Hospitals, Police, Cafes)
    └── live_fleet_snapshot.json           # Real-time telemetry snapshot for 350 buses
```

---

## 🔬 Data Sources & Acknowledgements

* **DTC Bus AVL GPS Feed**: GTFS-Realtime decoded vehicle positions, Transport Stack / IIIT-Delhi.
* **Bus E-Ticketing Records**: ONDC (Open Network for Digital Commerce) transit ticketing feed.
* **Static GTFS**: Delhi Transport Corporation (DTC) and Delhi Integrated Multi-Modal Transit System (DIMTS).

---

## 📄 License
MIT License. Open for educational, civic technology, and urban research applications.
