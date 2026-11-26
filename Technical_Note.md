# Technical Note: Delhi Transit Flow
**System Architecture, Algorithmic Models & API Flow**  
*Course / Category: B.Tech CSE Lab Project / Minor Project (CSE 102)*  
*Document Version: 2.0 | Updated: November 2026*

---

## 1. Executive Summary & Problem Formulation
Urban transit routing in Delhi presents distinct challenges due to dynamic congestion variations across major arterial roads (Inner Ring Road, Outer Ring Road, NH-48, Vikas Marg, Mathura Road). Static transit schedules fail to account for time-of-day speed degradation.

**Delhi Transit Flow** couples Delhi Transport Corporation (DTC) GTFS & ONDC e-ticketing telemetry with time-of-day velocity degradation models, direct and 1-transfer stop-graph matching, **OSRM Driving Route road geometry** backed by persistent **JSON disk caching (`backend/osrm_cache/*.json`)**, and proximity-based nearby transit, cafe, and hospital services.

---

## 2. High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND CLIENT (SPA)                           │
│  • HTML5 / CSS3 (Dark Slate & Clean Accent Theme)                      │
│  • Leaflet.js v1.9.4 (Google Maps Tiles: Roadmap, Satellite, Terrain)  │
│  • Vanilla JS (app.js) with Unified Single-Sidebar Scrollbar           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (JSON)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVER (FastAPI / Uvicorn)                 │
│  • FastAPI REST Endpoints & Static Frontend Server (Port 8000)         │
│  • CORS Middleware + No-Cache Headers on Entry Document                │
│  • Corridor Congestion Engine + Stop-Graph Direct/Transfer Solver      │
└──────────────┬────────────────────────────┬────────────────────────────┘
               │                            │
               ▼                            ▼
┌──────────────────────────────┐ ┌───────────────────────────────────────┐
│   ALGORITHMS & LOCAL CACHE   │ │      EXTERNAL & DATA INTEGRATIONS     │
│  • Direct/1-Transfer Matching│ │  • OSRM Public Driving Route API      │
│  • OSRM Disk Cache (.json)   │ │  • Google Maps Tiles, Dir & Embed UI  │
│  • Haversine POI Search (70) │ │  • DTC GTFS-RT & ONDC JSON Models     │
└──────────────────────────────┘ └───────────────────────────────────────┘
```

---

## 3. Algorithmic Formulations & Road Routing

### 3.1. Direct & 1-Transfer Transit Graph Solver
The transit network models 50 transit stops/hubs (`is_hub` priority) and 24 base bus routes expanded into 46 directional routes:
- `find_nearest_stops()`: Ranks boarding and alighting candidates using Haversine great-circle distance.
- `_find_direct_routes()`: Identifies single-bus directional segments where the boarding index precedes alighting index.
- `_find_transfer_routes()`: Evaluates 1-transfer interchanges across shared stops, prioritizing major transit hubs (`is_hub=True`) and adding a 2-minute platform connection buffer.

Segment traversal time uses corridor-specific speed degradation:
$$t_{\text{seg}} = \frac{1.18 \times \text{HaversineDistance}(u, v)}{\text{CorridorVelocity}(u \to v, \text{hour})} + \text{DwellTime}$$
where $1.18$ accounts for Delhi street curvature when estimating in-vehicle time, peak multipliers reduce speed down to $32\%\text{–}37\%$ of free-flow during rush hours ($08:00\text{–}11:00$ AM and $17:00\text{–}20:00$ PM), and dwell time adds $0.35\text{ min/stop}$ ($\approx 20\text{ s}$).

### 3.2. Real Road Geometry via OSRM + Persistent Disk Cache
Rather than drawing straight lines between stops, `fetch_osrm_road_coords(waypoints)` in `backend/router.py` renders road-accurate polylines:
1. **Waypoint Sampling**: Direct routes sample up to 6 key stops and transfer routes sample up to 8 stops to stay within public rate limits.
2. **Persistent Disk Cache (`backend/osrm_cache/*.json`)**: `_get_cache_key()` rounds coordinates to 4 decimal places and computes an MD5 hash filename.
   - **Cache Hit**: Loaded immediately from disk via `_load_from_cache()` with zero external network latency. Cache files are never auto-deleted.
   - **Cache Miss**: Queries `http://router.project-osrm.org/route/v1/driving/{lng},{lat};...?overview=full&geometries=geojson` (8s timeout), flips GeoJSON `[lng, lat]` pairs into `[lat, lng]` for Leaflet, and saves compact JSON to disk via `_save_to_cache()`.
   - **Fallback**: If OSRM is unreachable, returns straight waypoint segments gracefully without corrupting the cache.

### 3.3. Geospatial Proximity Calculation (Haversine Formula)
Used for locating nearby bus stops and the 70 curated POIs (`23` Metro stations, `15` Hospitals, `13` Police stations, `19` Cafes):
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right), \quad \text{Distance} = R \cdot c \quad (R = 6,371\text{ km})$$

### 3.4. Pedestrian Walking Time Model
Walking durations in the *Nearest Transit, Cafes & Hospitals* panel use $80\text{ meters/minute}$ ($\approx 4.8\text{ km/h}$), while bus-stop boarding/alighting estimates use $4.5\text{ km/h}$.

---

## 4. REST API Endpoint Reference

| HTTP Method & Route | Function Name | Input Parameters | Output & Purpose |
|---------------------|---------------|------------------|------------------|
| `GET` & `POST /api/directions` | `get_directions()` / `post_directions()` | `origin`, `destination`, `departure_time`, `preference` | Direct/1-transfer bus itineraries, OSRM road polyline (disk-cached), traffic delay, stop sequence, and nearby amenities. |
| `GET /api/vehicles` | `get_vehicles()` | `limit` (default: 250; frontend uses 300 of 350) | GPS coordinates, speed, and heading telemetry of active DTC fleet snapshot. |
| `GET /api/traffic` | `get_traffic_status()` | `hour` (0–23, default 9) | Corridor-by-corridor speeds, bottlenecks, and citywide congestion index ($0.0\text{–}1.0$). |
| `GET /api/amenities` | `get_amenities()` | `category`, `lat`, `lng` | Proximity-sorted Metro lines (23), Hospitals (15), Police stations (13), and Cafes (19). |
| `GET /api/stops` | `get_stops()` | `query` (optional) | Directory of 50 Delhi transit terminals and confirmed bus stops. |
| `GET /api/routes` | `get_routes()` | None | Master directory of 46 directional DTC routes with stops and headways. |
| `GET /api/speed-limits` | `get_speed_limits()` | None | Statutory speed limits across 12 corridors (Delhi Traffic Police / MoRTH). |
| `GET /api/benchmark` | `get_benchmark()` | None | Evaluates 10 canonical corridor pairs (09:00 Peak & 14:00 Off-Peak): $87.2\%$ accuracy, $R^2 = 0.8204$. |
| `GET /api/health` | `health_check()` | None | Readiness probe returning loaded stops, directional routes, and active fleet size. |

---

## 5. External Integrations
1. **OSRM Public Driving Route API**: Free, no-key routing service returning GeoJSON road geometry (`router.project-osrm.org`), cached persistently to `backend/osrm_cache/*.json`.
2. **Google Maps Tile CDN**: Leaflet.js consumes Roadmap (`lyrs=m`), Satellite Hybrid (`lyrs=y`), and Terrain (`lyrs=p`) tiles from `mt{0-3}.google.com`.
3. **Google Maps Transit Directions, Search & Embed**: Generates `https://www.google.com/maps/dir/?api=1&origin=...&destination=...&travelmode=transit`, POI search links, and side-by-side Live Compare iframe.
4. **DTC GTFS & ONDC Open Data Foundation**: Pre-processed into local JSON caches (`delhi_traffic_model.json`, `delhi_transit_network.json`, `live_fleet_snapshot.json`, `delhi_amenities.json`).

---

## 6. Key Frontend Design Patterns
- **Single Unified Sidebar Scrollbar**: The entire left sidebar (`.sidebar`) scrolls from header form through amenities and journey cards in one continuous container (`overflow-y: auto`), eliminating nested scroll traps.
- **Clean Header Bar**: Top navigation retains Live Buses working count badge, live GMT+5:30 IST clock, and the `Google Maps Live Compare` modal action (Validation Suite button removed from header bar).
- **Interactive POI Panel**: Origin vs. Destination toggle tabs for nearest Metro stations, Cafes, and Hospitals with Leaflet `flyTo()` zoom on click.
