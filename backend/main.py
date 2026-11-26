# ==========================================================
# Delhi Bus Tracker & Journey Planner
# Minor Project - 1st Year B.Tech CSE
# Backend Server: main.py (FastAPI)
# ==========================================================

import os
import sys

# importing fastapi modules
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

# setup paths to project files
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(CURRENT_DIR)
FRONTEND_DIR = os.path.join(PROJECT_DIR, 'frontend')

# add current folder to python path so imports work
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

# import custom modules
from model import traffic_engine, STATUTORY_SPEED_LIMITS
from router import transit_router, get_osrm_cache_stats
from benchmark import run_benchmark

# create the main app
app = FastAPI(
    title="Delhi Bus Traffic Model & Journey Planner API",
    description="Delhi DTC Bus Journey Planner and Traffic Model",
    version="1.0.0"
)

# cors settings so frontend can access backend on port 8000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# request model for journey planner
class JourneyRequest(BaseModel):
    origin: str
    destination: str
    departure_time: Optional[str] = "now"
    preference: Optional[str] = "fastest"

# 1. simple health check endpoint
@app.get("/api/health")
def health_check():
    cache_stats = get_osrm_cache_stats()
    total_amenities = sum(len(v) for v in traffic_engine.amenities.values())
    # return simple status json with live loaded counts & cache stats
    return {
        "status": "healthy",
        "city": "Delhi, India",
        "agency": "Delhi Transport Corporation (DTC)",
        "dataset": "GTFS-Realtime October 2026 Vehicle Telemetry",
        "stops_loaded": len(transit_router.stops),
        "routes_loaded": len(transit_router.routes),
        "active_fleet_count": len(traffic_engine.fleet),
        "corridors_loaded": len(traffic_engine.corridors),
        "amenities_loaded": total_amenities,
        "osrm_cache_files": cache_stats["cached_routes_count"],
        "osrm_cache_size_kb": cache_stats["cache_size_kb"]
    }

# 2. journey directions endpoint (GET method)
@app.get("/api/directions")
def get_directions(
    origin: str = Query(..., description="Origin name, stop ID or 'lat,lng'"),
    destination: str = Query(..., description="Destination name, stop ID or 'lat,lng'"),
    departure_time: str = Query("now", description="Departure time ('now', '09:00', '18:30')"),
    preference: str = Query("fastest", description="Preference: 'fastest', 'fewer_transfers', 'least_walking'")
):
    try:
        # call router to get the best bus routes
        result = transit_router.plan_journey(
            origin=origin,
            destination=destination,
            departure_time=departure_time,
            preference=preference
        )
        return result
    except Exception as e:
        # return error message if something fails
        print("Error in /api/directions:", e)
        raise HTTPException(status_code=500, detail=str(e))

# post method for directions
@app.post("/api/directions")
def post_directions(req: JourneyRequest):
    return get_directions(
        origin=req.origin,
        destination=req.destination,
        departure_time=req.departure_time or "now",
        preference=req.preference or "fastest"
    )

# 3. traffic status for main delhi roads
@app.get("/api/traffic")
def get_traffic_status(hour: Optional[int] = Query(None, description="Hour of day (0-23)")):
    # default to 9 AM (morning college/office rush) if hour not given
    target_hour = 9 if hour is None else (hour % 24)
    corridors = traffic_engine.get_all_corridors_status(target_hour)

    # find average speed and congestion across all roads
    total_speed = 0.0
    total_cong = 0.0
    for c in corridors:
        total_speed += c["speed_kmh"]
        total_cong += c["congestion_index"]
    
    avg_speed = total_speed / len(corridors)
    avg_cong = total_cong / len(corridors)

    # list roads that have heavy traffic
    bottlenecks = []
    for c in corridors:
        if c["congestion_index"] >= 0.60:
            bottlenecks.append(c["name"])

    # decide status string based on congestion value
    if avg_cong > 0.65:
        traffic_status = "Severe Congestion"
    elif avg_cong > 0.45:
        traffic_status = "Heavy Traffic"
    elif avg_cong > 0.25:
        traffic_status = "Moderate Traffic"
    else:
        traffic_status = "Free Flow"

    return {
        "hour": target_hour,
        "citywide_average_bus_speed_kmh": round(avg_speed, 1),
        "citywide_congestion_index": round(avg_cong, 3),
        "overall_status": traffic_status,
        "active_bottlenecks_count": len(bottlenecks),
        "active_bottlenecks": bottlenecks,
        "corridors": corridors
    }

# 4. get active bus locations
@app.get("/api/vehicles")
def get_vehicles(limit: int = Query(250, description="Max vehicles to return")):
    vehicles = traffic_engine.get_active_fleet(limit=limit)
    return {
        "count": len(vehicles),
        "timestamp": "2026-10-01T09:30:00+05:30",
        "vehicles": vehicles
    }

# 5. get list of bus stops
@app.get("/api/stops")
def get_stops(query: Optional[str] = Query(None, description="Filter stops by search query")):
    stops = list(transit_router.stops.values())
    if query:
        q = query.lower().strip()
        # filter stops matching search text
        filtered = []
        for s in stops:
            if q in s["name"].lower() or q in s["id"].lower() or q in s.get("zone", "").lower():
                filtered.append(s)
        stops = filtered
    return {
        "count": len(stops),
        "stops": stops
    }

# 6. get all bus routes
@app.get("/api/routes")
def get_routes():
    return {
        "count": len(transit_router.routes),
        "routes": transit_router.routes
    }

# 7. comparison benchmark with google maps
@app.get("/api/benchmark")
def get_benchmark():
    return run_benchmark()

# 8. get nearest facilities (metro, hospital, police, cafe)
@app.get("/api/amenities")
def get_amenities(
    category: Optional[str] = Query(None, description="Filter category: 'cafes', 'hospitals', 'police_stations', 'metro_stations'"),
    lat: Optional[float] = Query(None, description="Optional center latitude for proximity search"),
    lng: Optional[float] = Query(None, description="Optional center longitude for proximity search")
):
    if lat is not None and lng is not None:
        nearest = traffic_engine.get_nearest_amenities(lat, lng, max_results=5)
        if category and category in nearest:
            return {"category": category, "items": nearest[category]}
        return nearest

    all_amenities = traffic_engine.get_all_amenities()
    if category and category in all_amenities:
        return {"category": category, "items": all_amenities[category]}
    return all_amenities

# 9. speed limits according to delhi traffic police
@app.get("/api/speed-limits")
def get_speed_limits():
    return {
        "authority": "Delhi Traffic Police Gazette & MoRTH Guidelines",
        "guideline_summary": "Maximum permissible speeds across Delhi road corridors differentiated by vehicle type (Cars/2-Wheelers vs Buses/HCVs)",
        "corridors": STATUTORY_SPEED_LIMITS
    }

# connect frontend static files
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

# serve html home page with no-cache headers so browser always loads latest updates
@app.get("/")
def serve_index():
    res = FileResponse(os.path.join(FRONTEND_DIR, 'index.html'))
    res.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    res.headers["Pragma"] = "no-cache"
    res.headers["Expires"] = "0"
    return res

# run the app directly if this file is executed
if __name__ == '__main__':
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
