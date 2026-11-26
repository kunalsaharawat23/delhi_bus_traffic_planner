# -*- coding: utf-8 -*-
"""
Script to generate a comprehensive, professional PDF:
'all the apis used in this.pdf'
Updated for OSRM real-road routing + persistent disk cache + Google Maps tiles.
"""
import os
import sys
from fpdf import FPDF
from datetime import datetime


class APIDocPDF(FPDF):
    def header(self):
        # Header banner
        self.set_fill_color(15, 23, 42)  # Slate dark
        self.rect(0, 0, 210, 18, 'F')
        self.set_text_color(56, 189, 248)  # Sky blue
        self.set_font('Helvetica', 'B', 10)
        self.set_xy(12, 5)
        self.cell(0, 8, 'DELHI TRANSIT FLOW  |  Comprehensive API Reference & System Architecture', 0, 0, 'L')
        self.set_text_color(148, 163, 184)
        self.set_font('Helvetica', '', 8)
        self.set_xy(150, 5)
        self.cell(48, 8, 'B.Tech CSE Lab Project', 0, 0, 'R')
        self.ln(16)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(148, 163, 184)
        self.cell(
            0, 10,
            f'Page {self.page_no()} of {{nb}}   |   All APIs Used in Delhi Transit Flow   |   Updated: {datetime.now().strftime("%d %B %Y")}',
            0, 0, 'C'
        )

    def chapter_title(self, num, title, color=(30, 58, 138)):
        self.set_fill_color(*color)
        self.set_text_color(255, 255, 255)
        self.set_font('Helvetica', 'B', 12)
        self.cell(0, 9, f'  {num}. {title}', 0, 1, 'L', fill=True)
        self.set_text_color(15, 23, 42)
        self.ln(3)

    def api_card_header(self, method, endpoint, name):
        self.set_fill_color(241, 245, 249)
        self.rect(self.get_x(), self.get_y(), 186, 10, 'F')

        # Method badge
        if method == 'GET':
            self.set_fill_color(16, 185, 129)  # green
        elif method == 'POST':
            self.set_fill_color(59, 130, 246)  # blue
        elif method == 'CACHE':
            self.set_fill_color(217, 119, 6)   # amber
        else:
            self.set_fill_color(100, 116, 139)

        self.set_text_color(255, 255, 255)
        self.set_font('Helvetica', 'B', 8)
        self.cell(18, 6, f' {method} ', 0, 0, 'C', fill=True)

        # Endpoint
        self.set_text_color(15, 23, 42)
        self.set_font('Courier', 'B', 9)
        self.cell(78, 6, f'  {endpoint}', 0, 0, 'L')

        # Name
        self.set_text_color(71, 85, 105)
        self.set_font('Helvetica', 'B', 8.5)
        self.cell(90, 6, f'({name})', 0, 1, 'R')
        self.ln(2)

    def key_value(self, key, value, indent=4):
        self.set_x(self.l_margin + indent)
        self.set_font('Helvetica', 'B', 8.5)
        self.set_text_color(30, 41, 59)
        self.cell(32, 5, key, 0, 0, 'L')
        self.set_font('Helvetica', '', 8.5)
        self.set_text_color(51, 65, 85)
        self.multi_cell(150, 5, value)

    def note_box(self, text, title='Note'):
        self.set_fill_color(248, 250, 252)
        self.set_draw_color(203, 213, 225)
        self.set_font('Helvetica', 'B', 8.5)
        self.set_text_color(30, 41, 59)
        self.cell(0, 6, f'  [i] {title}:', 1, 1, 'L', fill=True)
        self.set_font('Helvetica', '', 8)
        self.set_text_color(71, 85, 105)
        self.multi_cell(0, 5, f'  {text}', 1, 'L')
        self.ln(3)


def generate_pdf(out_path):
    pdf = APIDocPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    # Title Block
    pdf.set_font('Helvetica', 'B', 19)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 10, 'Delhi Transit Flow: Complete API Specification', 0, 1, 'L')

    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 6, 'Updated documentation of all Internal Backend REST APIs, External Services & OSRM Disk Cache', 0, 1, 'L')
    pdf.ln(3)

    # Executive Summary Card
    pdf.set_fill_color(240, 249, 255)
    pdf.set_draw_color(186, 230, 253)
    pdf.rect(pdf.get_x(), pdf.get_y(), 190, 27, 'DF')
    pdf.set_xy(pdf.get_x() + 4, pdf.get_y() + 2)
    pdf.set_font('Helvetica', 'B', 9)
    pdf.set_text_color(3, 105, 161)
    pdf.cell(0, 5, 'EXECUTIVE SUMMARY', 0, 1, 'L')
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(15, 23, 42)
    pdf.multi_cell(
        182, 4.2,
        'Delhi Transit Flow is an urban bus transit planner and traffic simulator for Delhi. '
        'It integrates DTC GTFS & ONDC e-ticketing telemetry, a time-of-day corridor velocity model, '
        'direct and 1-transfer hub graph matching, the OSRM Public Driving Route API with persistent '
        'file-based disk caching (backend/osrm_cache/*.json) for real road-following polylines, Haversine '
        'proximity search across 70 POIs, and Google Maps Tiles & Live Transit comparison.'
    )
    pdf.ln(6)

    # ---------------------------------------------------------
    # Chapter 1: Core Backend REST APIs
    # ---------------------------------------------------------
    pdf.chapter_title('1', 'Internal Backend REST APIs (FastAPI on 127.0.0.1:8000)', color=(15, 23, 42))
    pdf.set_font('Helvetica', '', 8.5)
    pdf.set_text_color(51, 65, 85)
    pdf.multi_cell(
        0, 5,
        'All internal APIs are built in Python using FastAPI and Uvicorn on port 8000. '
        'They communicate over HTTP/JSON with CORS enabled and no-cache headers on the HTML entry page.'
    )
    pdf.ln(3)

    # API 1: /api/directions
    pdf.api_card_header('GET/POST', '/api/directions', 'Journey Planner & OSRM Road Routing')
    pdf.key_value('Purpose:', 'Computes top direct and 1-transfer DTC bus itineraries with real road geometry.')
    pdf.key_value('Parameters:', 'origin (str), destination (str), departure_time ("now", "09:00"), preference ("fastest", "fewer_transfers", "least_walking")')
    pdf.key_value(
        'Internal Logic:',
        'Resolves origin and destination to nearby DTC stops (50 hubs loaded), finds matching direct and 1-transfer '
        'bus routes (46 directional routes), scores travel times using peak/off-peak corridor speed curves, snaps '
        'sampled stop waypoints to real streets via OSRM API (with MD5 JSON disk cache in backend/osrm_cache/), '
        'and attaches Haversine-sorted nearby amenities for both origin and destination.'
    )
    pdf.key_value('Output Payload:', 'origin/destination info & amenities, departure time, options array with legs, stops list, traffic delay, Google Maps URL, and path_coordinates polyline.')
    pdf.ln(3)

    # API 2: /api/vehicles
    pdf.api_card_header('GET', '/api/vehicles', 'Live Fleet Telemetry & Bus Positions')
    pdf.key_value('Purpose:', 'Returns GPS locations, speed, and heading for active DTC buses.')
    pdf.key_value('Parameters:', 'limit (int, default=250; live snapshot contains 350 buses)')
    pdf.key_value('Internal Logic:', 'Reads live_fleet_snapshot.json calibrated from the DTC GTFS-Realtime feed. Frontend fetches limit=300 and updates the top bar "Live Buses: 300 Working" badge.')
    pdf.key_value('Output Payload:', 'count, timestamp, and vehicles list: [{vehicle_id, route_id, lat, lng, speed_kmh, heading, last_updated}].')
    pdf.ln(3)

    # API 3: /api/traffic
    pdf.api_card_header('GET', '/api/traffic', 'Corridor Speed Curves & Congestion Engine')
    pdf.key_value('Purpose:', 'Provides hourly traffic velocity and congestion metrics across 12 major Delhi arterial corridors.')
    pdf.key_value('Parameters:', 'hour (int 0 to 23, optional - defaults to 9 AM morning peak)')
    pdf.key_value('Internal Logic:', 'Computes time-of-day speeds and congestion index (0.0 to 1.0) across Inner/Outer Ring Road, NH-48, Vikas Marg, Mathura Road, Aurobindo Marg, etc., using 1,004 spatial grid cells.')
    pdf.key_value('Output Payload:', 'hour, citywide_average_bus_speed_kmh, citywide_congestion_index, overall_status, active_bottlenecks, and corridors list.')
    pdf.ln(3)

    # API 4: /api/amenities
    pdf.api_card_header('GET', '/api/amenities', 'Proximity Amenities & Multi-Modal POIs')
    pdf.key_value('Purpose:', 'Powers the "Nearest Transit, Cafes & Hospitals" sidebar card and map POI layers.')
    pdf.key_value('Parameters:', 'category (optional: "metro_stations", "cafes", "hospitals", "police_stations"), lat (float), lng (float)')
    pdf.key_value('Internal Logic:', 'Applies Haversine great-circle distance over 70 curated Delhi POIs (23 Metro stations, 15 Hospitals, 13 Police stations, 19 Cafes). Frontend computes walk mins (~80m/min).')
    pdf.key_value('Output Payload:', 'Nearest sorted items with distance_km, distance_m, Metro line tags, Cafe ratings/specialties, and Hospital 24x7 emergency labels.')
    pdf.ln(4)

    # API 5: /api/stops
    pdf.api_card_header('GET', '/api/stops', 'Bus Stops & Terminal Directory')
    pdf.key_value('Purpose:', 'Supplies the 50 confirmed Delhi transit stops and hubs for autocomplete search and map pins.')
    pdf.key_value('Parameters:', 'query (str, optional filter by name, ID, or zone)')
    pdf.key_value('Output Payload:', 'count and stops list: [{id, name, lat, lng, zone, is_hub}].')
    pdf.ln(3)

    # API 6: /api/routes
    pdf.api_card_header('GET', '/api/routes', 'DTC Route Master Directory')
    pdf.key_value('Purpose:', 'Exposes all 46 directional bus routes (24 base routes + return paths) with stop sequences and headways.')
    pdf.key_value('Output Payload:', 'count and routes array: [{route_id, name, long_name, corridor, headway_mins, stops}].')
    pdf.ln(3)

    # API 7: /api/speed-limits
    pdf.api_card_header('GET', '/api/speed-limits', 'Statutory Speed Limits Authority')
    pdf.key_value('Purpose:', 'Returns official statutory speed limits differentiated by vehicle class across 12 Delhi corridors.')
    pdf.key_value('Internal Logic:', 'Serves Delhi Traffic Police Gazette & MoRTH limits (Cars/2-wheelers: 40-70 km/h vs Buses/HCVs: 30-50 km/h) used in speed-limit compliance badges.')
    pdf.key_value('Output Payload:', 'authority, guideline_summary, and corridor speed-limit mapping.')
    pdf.ln(3)

    # API 8: /api/benchmark
    pdf.api_card_header('GET', '/api/benchmark', 'Algorithmic Accuracy Benchmark API')
    pdf.key_value('Purpose:', 'Benchmarks peak (09:00) and off-peak (14:00) predictions against Google Maps references across 10 Delhi corridors.')
    pdf.key_value('Internal Logic:', 'Runs transit_router.plan_journey() on 10 canonical corridor pairs and computes peak/off-peak percentage error, R^2 correlation, and overall accuracy score (~87.2%, R^2 = 0.8204). (Header Validation Suite button was removed from UI; API stays active.)')
    pdf.key_value('Output Payload:', 'status, benchmark_pairs_tested (10), MAPE peak/off-peak, correlation_with_google_maps_r2, overall_model_accuracy_score, and sample_pairs.')
    pdf.ln(3)

    # API 9: /api/health
    pdf.api_card_header('GET', '/api/health', 'System Readiness & Health Probe')
    pdf.key_value('Purpose:', 'Reports live counts of loaded stops, directional routes, and active fleet telemetry.')
    pdf.key_value('Output Payload:', '{"status": "healthy", "stops_loaded": 50, "routes_loaded": 46, "active_fleet_count": 350, ...}.')
    pdf.ln(6)

    # ---------------------------------------------------------
    # Chapter 2: External Third-Party APIs & Disk Cache
    # ---------------------------------------------------------
    pdf.chapter_title('2', 'External APIs, Map Tiles & Persistent Disk Cache', color=(30, 58, 138))

    # 1. OSRM API + Cache
    pdf.api_card_header('EXTERNAL', 'OSRM Public Driving Route API (router.project-osrm.org)', 'Road Geometry')
    pdf.key_value('Endpoint:', 'http://router.project-osrm.org/route/v1/driving/{lng},{lat};...?overview=full&geometries=geojson')
    pdf.key_value(
        'Working:',
        'Replaces straight stop-to-stop lines with real Delhi road-following polylines. '
        'router.py samples key waypoints (up to 6 for direct routes, up to 8 for transfer routes), sends [lng,lat] coordinates '
        'to OSRM (8s timeout, User-Agent: DelhiTransitFlow/1.0), and flips returned GeoJSON [lng,lat] pairs to [lat,lng] for Leaflet. '
        'Free public API requiring no API key; falls back cleanly to straight segments if offline.'
    )
    pdf.ln(2)

    pdf.api_card_header('CACHE', 'backend/osrm_cache/*.json (MD5 Disk Cache)', 'Zero-Delete Cache')
    pdf.key_value('Location:', 'backend/osrm_cache/<md5_hash>.json (auto-created, never deleted between requests; ignored in .gitignore)')
    pdf.key_value(
        'Working:',
        '_get_cache_key() rounds each waypoint to 4 decimal places and builds an MD5 hash filename. '
        'First search for a route calls OSRM and saves compact JSON via _save_to_cache(). '
        'Every repeat search loads instantly from disk via _load_from_cache() with zero external API calls.'
    )
    pdf.ln(3)

    # 2. Google Maps Tile CDN
    pdf.api_card_header('EXTERNAL', 'Google Maps Tile CDN (mt0-mt3.google.com)', 'Basemap Tiles')
    pdf.key_value('URL Pattern:', 'https://mt{s}.google.com/vt/lyrs={m|y|p}&x={x}&y={y}&z={z}')
    pdf.key_value(
        'Working:',
        'Rendered inside Leaflet.js v1.9.4 with a top-right switcher offering three layers: '
        'Google Roadmap (lyrs=m), Google Satellite Hybrid (lyrs=y), and Google Terrain (lyrs=p).'
    )
    pdf.ln(3)

    # 3. Google Maps Directions, Embed & Search
    pdf.api_card_header('EXTERNAL', 'Google Maps Directions, Embed & Search URLs', 'Live Comparison')
    pdf.key_value('Directions:', 'https://www.google.com/maps/dir/?api=1&origin={lat},{lng}&destination={lat},{lng}&travelmode=transit')
    pdf.key_value('Live Compare:', 'https://maps.google.com/maps?q={origin}+to+{destination}&output=embed (rendered in side-by-side modal iframe)')
    pdf.key_value('POI Search:', 'https://www.google.com/maps/search/?api=1&query=... (used inside map marker popups for Metro, Hospitals, Police, Cafes)')
    pdf.ln(3)

    # 4. DTC & ONDC Open Data
    pdf.api_card_header('DATA', 'DTC GTFS-Realtime & ONDC E-Ticketing Datasets', 'Offline Models')
    pdf.key_value(
        'Working:',
        '31.29M DTC GPS records and 2.56M ONDC ticket rows are pre-processed into fast local JSON models '
        '(delhi_traffic_model.json, delhi_transit_network.json, live_fleet_snapshot.json, delhi_amenities.json).'
    )
    pdf.ln(6)

    # ---------------------------------------------------------
    # Chapter 3: Mathematical & Algorithmic Core
    # ---------------------------------------------------------
    pdf.chapter_title('3', 'Mathematical Algorithms & Routing Logic', color=(15, 23, 42))

    pdf.set_font('Helvetica', 'B', 9.5)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 6, 'A. Hub-Prioritized Direct/Transfer Graph Solver + OSRM Geometry', 0, 1, 'L')
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(71, 85, 105)
    pdf.multi_cell(
        0, 4.5,
        'TransitRouter searches nearest origin/destination stops via Haversine distance, evaluates direct bus routes '
        'and 1-transfer interchange routes (prioritizing is_hub=True terminals), calculates corridor-weighted travel times '
        'plus 0.35 min/stop dwell and half-headway waits, sorts by user preference (fastest / fewer_transfers / least_walking), '
        'and resolves road-accurate coordinates via fetch_osrm_road_coords() backed by persistent JSON disk caching.'
    )
    pdf.ln(2)

    pdf.set_font('Helvetica', 'B', 9.5)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 6, 'B. Haversine Formula for Stop & Amenity Proximity', 0, 1, 'L')
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(71, 85, 105)
    pdf.multi_cell(
        0, 4.5,
        'Calculates great-circle Earth distance between two (lat, lng) points without external geocoding:\n'
        '  a = sin^2(dlat / 2) + cos(lat1) * cos(lat2) * sin^2(dlng / 2)\n'
        '  c = 2 * atan2(sqrt(a), sqrt(1 - a))\n'
        '  Distance = R * c   (where R = 6,371 km Earth radius)\n'
        'Pedestrian walk estimates use ~4.5 km/h for bus-stop access and ~80 m/min for nearby amenities.'
    )
    pdf.ln(2)

    pdf.set_font('Helvetica', 'B', 9.5)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 6, 'C. Corridor Velocity & Congestion Model', 0, 1, 'L')
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(71, 85, 105)
    pdf.multi_cell(
        0, 4.5,
        'Each of the 12 Delhi corridors applies peak/off-peak speed multipliers (morning 08:00-11:00 and evening 17:00-20:00 '
        'down to ~32-37% of free-flow speed; midday 72%; night 82%) and clamps speed above 9 km/h to model realistic bottlenecks.'
    )
    pdf.ln(6)

    # ---------------------------------------------------------
    # Chapter 4: End-to-End System Flow Summary
    # ---------------------------------------------------------
    pdf.chapter_title('4', 'End-to-End Architecture Flow', color=(30, 58, 138))

    flow_steps = [
        ('1. Map & Telemetry Boot', 'index.html loads Leaflet.js with Google Maps tiles; fetches /api/traffic, /api/vehicles, /api/stops, and /api/amenities.'),
        ('2. Live Header Status', 'Top bar shows active fleet count ("Live Buses: 300 Working") and live GMT+5:30 clock (Validation Suite removed from header).'),
        ('3. Journey Request', 'User picks origin, destination, time, and preference -> app sends GET /api/directions?origin=...&destination=...'),
        ('4. Route & Cache Solver', 'FastAPI computes direct/1-transfer routes; checks backend/osrm_cache/*.json first, calls OSRM on cache miss, saves JSON.'),
        ('5. Single-Scroll Sidebar', 'Left sidebar scrolls top-to-bottom in one unified bar: Nearest Transit/Cafes/Hospitals tabs + Journey Result Cards + Blue OSRM Road Line.'),
        ('6. Live Compare Modal', 'Clicking "Google Maps Live Compare" opens side-by-side comparison synced to the currently selected journey.')
    ]

    for step_title, step_desc in flow_steps:
        pdf.set_font('Helvetica', 'B', 8.5)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(45, 5, step_title, 0, 0, 'L')
        pdf.set_font('Helvetica', '', 8)
        pdf.set_text_color(71, 85, 105)
        pdf.multi_cell(140, 5, step_desc)
        pdf.ln(1)

    pdf.ln(4)
    pdf.note_box(
        'This API architecture runs locally with zero paid API keys. Interactive Swagger docs are live at http://127.0.0.1:8000/docs.',
        title='Zero-Cost Academic Stack'
    )

    pdf.output(out_path)
    print(f"Successfully generated PDF: {out_path}")


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'all the apis used in this.pdf'
    generate_pdf(target)
