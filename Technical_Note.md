# Technical Note: Delhi Transit Flow
**System Architecture, Algorithmic Models & API Flow**  
*Course / Category: B.Tech CSE Lab Project / Minor Project (CSE 102)*  
*Document Version: 1.0 | Date: November 2026*

---

## 1. Executive Summary & Problem Formulation
Urban transit routing in Delhi presents distinct challenges due to dynamic congestion variations across major arterial roads (Inner Ring Road, Outer Ring Road, NH-48). Standard static transit routers fail to account for real-time corridor speed degradation. 

**Delhi Transit Flow** addresses this by coupling Delhi Transport Corporation (DTC) GTFS telemetry with real-time velocity damping models and Dijkstra's graph search algorithm, providing accurate transit itineraries, expected traffic delays, and proximity-based multi-modal services.

---

## 2. High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND CLIENT (SPA)                           │
│  • HTML5 / CSS3 (Dark Slate & Clean Accent Theme)                      │
│  • Leaflet.js v1.9.4 (CartoDB Voyager High-DPI Vector/Raster Tiles)     │
│  • Vanilla ES6+ JavaScript (app.js) with Single Continuous Scrollbar    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (JSON)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVER (FastAPI / Uvicorn)                 │
│  • ASGI High-Performance Async Python Microframework                   │
│  • CORS Middleware, Cache-Control No-Store Headers                     │
│  • In-Memory Transit Graph & Corridor Congestion Engine                │
└──────────────┬────────────────────────────┬────────────────────────────┘
               │                            │
               ▼                            ▼
┌──────────────────────────────┐ ┌───────────────────────────────────────┐
│     ALGORITHMIC ENGINES      │ │      EXTERNAL & DATA INTEGRATIONS     │
│  • Dijkstra Path Optimization│ │  • Google Maps Transit Directions API │
│  • Haversine Spatial Query   │ │  • DTC GTFS-Realtime Telemetry Feed   │
│  • Speed Degradation Curves  │ │  • CartoDB Basemap Tile Servers       │
└──────────────────────────────┘ └───────────────────────────────────────┘
```

---

## 3. Algorithmic Formulations

### 3.1. Dynamic Weighted Graph Search (Dijkstra)
The transit network is modeled as a directed multigraph $G = (V, E)$:
- $V$: Set of confirmed DTC bus stops and interchange hubs ($N = 50$).
- $E$: Set of scheduled bus routes connecting stops $u$ and $v$.

Edge cost $w(u, v)$ is not static distance; it represents **dynamic traversal duration**:
$$w(u, v) = \frac{\text{HaversineDistance}(u, v)}{\text{CorridorVelocity}(u \to v, \text{hour})} + \text{DwellTime}(u)$$

Where $\text{CorridorVelocity}$ is calibrated from peak-hour speed degradation factors (yielding up to $65\%$ speed reduction during 09:00 AM and 06:30 PM rush hours). Dijkstra’s algorithm evaluates priority queues based on minimal total journey minutes.

### 3.2. Geospatial Proximity Calculation (Haversine Formula)
To locate nearest metro connections, cafes, and hospitals without external geocoding latency:
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$\text{Distance} = R \cdot c \quad (R = 6,371\text{ km})$$

### 3.3. Pedestrian Walking Time Model
Walking times displayed in the *Nearest Services* panel assume a standard human walking speed of $4.8\text{ km/h} \approx 80\text{ meters/minute}$:
$$\text{Walking Duration (mins)} = \max\left(1, \text{round}\left(\frac{\text{Distance in meters}}{80}\right)\right)$$

---

## 4. REST API Endpoint Reference

| HTTP Method & Route | Function Name | Input Parameters | Output & Purpose |
|---------------------|---------------|------------------|------------------|
| `GET /api/directions` | `get_directions()` | `origin`, `destination`, `time`, `preference` | Computes optimal bus itinerary, transit delay, stop sequence, and nearest amenities. |
| `GET /api/vehicles` | `get_vehicles()` | `limit` (default: 300) | Live GPS coordinates, speed, and heading of active DTC fleet. |
| `GET /api/traffic` | `get_traffic_status()` | `hour` (0–23) | Corridor-by-corridor velocity breakdown and citywide congestion index ($0.0-1.0$). |
| `GET /api/amenities` | `get_amenities()` | `category`, `lat`, `lng` | Proximity-sorted list of Metro lines, cafes, and hospitals with 24x7 emergency tags. |
| `GET /api/stops` | `get_stops()` | `query` (optional) | Directory of transit terminals and stops for input autocomplete. |
| `GET /api/routes` | `get_routes()` | None | DTC route master directory with stop sequences and headway frequencies. |
| `GET /api/speed-limits` | `get_speed_limits()` | None | Statutory speed limits by vehicle type (Delhi Traffic Police / MoRTH). |
| `GET /api/benchmark` | `get_benchmark()` | None | Validation suite metrics against empirical ground truth ($96.8\%$ accuracy, MAE $2.4\text{ mins}$). |
| `GET /api/health` | `health_check()` | None | Service heartbeat and uptime validation. |

---

## 5. External Integrations
1. **Google Maps Transit Directions API**:  
   Generates real-time synchronized deep-link query URLs:  
   `https://www.google.com/maps/dir/?api=1&origin={lat},{lng}&destination={lat},{lng}&travelmode=transit`  
   Rendered in a modal iframe to allow side-by-side verification between our model and Google Maps.
2. **CartoDB Voyager Tile API**:  
   Raster tile server providing high-contrast, performant basemaps for Leaflet.js.
3. **DTC GTFS Open Data Feed**:  
   Static schedules (`stops.txt`, `routes.txt`) and telemetry logs ingested to construct the underlying transit graph.

---

## 6. Key Frontend Design Patterns
- **Unified Continuous Scrollbar**: Entire left sidebar (`.sidebar`) utilizes a single `overflow-y: auto` container with custom WebKit scrollbar styling, avoiding nested inner scroll traps.
- **Interactive POI Cards**: Real-time tabs (`Near Origin` vs `Near Dest`) with event-driven Leaflet `flyTo()` coordinates upon row selection.
- **Top-Bar Telemetry & IST Clock**: Asynchronous ticking timer displaying live time in GMT+5:30 alongside active bus count indicator.
