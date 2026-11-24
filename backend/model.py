# ==========================================================
# Delhi Bus Traffic Model
# College Project - 1st Year CSE
# File: model.py
# Speed, congestion and amenity distance calculations
# ==========================================================

import json
import math
import os
import time

# standard haversine formula to calculate distance between two coordinates on earth
# learnt in high school / physics class
def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0  # earth radius in kilometers
    # convert degrees to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    # formula
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    dist = R * c
    return dist

# file paths for our json data
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
MODEL_PATH = os.path.join(DATA_DIR, 'delhi_traffic_model.json')
FLEET_PATH = os.path.join(DATA_DIR, 'live_fleet_snapshot.json')
AMENITIES_PATH = os.path.join(DATA_DIR, 'delhi_amenities.json')

# official speed limits from delhi traffic police table
STATUTORY_SPEED_LIMITS = {
    "inner_ring_road": {
        "road_name": "Inner Ring Road (Mahatma Gandhi Marg)",
        "cars_2wheelers_limit_kmh": 60,
        "buses_hcv_limit_kmh": 40,
        "guideline_authority": "Delhi Traffic Police Notification No. 1289/TE(D-I)",
        "road_category": "Grade-Separated Urban Arterial Ring"
    },
    "outer_ring_road": {
        "road_name": "Outer Ring Road",
        "cars_2wheelers_limit_kmh": 65,
        "buses_hcv_limit_kmh": 40,
        "guideline_authority": "Delhi Traffic Police Gazette Notification",
        "road_category": "Grade-Separated Express Arterial"
    },
    "nh48_airport_corridor": {
        "road_name": "NH-48 (Dhaula Kuan to IGI Airport & Rajokri)",
        "cars_2wheelers_limit_kmh": 70,
        "buses_hcv_limit_kmh": 50,
        "guideline_authority": "NHAI & Delhi Traffic Police Highway Notification",
        "road_category": "National Highway / Airport Corridor"
    },
    "mathura_road": {
        "road_name": "Mathura Road (NH-2 / Badarpur to ITO)",
        "cars_2wheelers_limit_kmh": 50,
        "buses_hcv_limit_kmh": 40,
        "guideline_authority": "Delhi Master Plan 2021 Arterial Guidelines",
        "road_category": "Primary Urban Arterial"
    },
    "vikas_marg": {
        "road_name": "Vikas Marg & Trans-Yamuna Spine",
        "cars_2wheelers_limit_kmh": 50,
        "buses_hcv_limit_kmh": 40,
        "guideline_authority": "Delhi Traffic Police Arterial Guidelines",
        "road_category": "Major Urban Connector"
    },
    "mehrauli_badarpur_road": {
        "road_name": "Mehrauli-Badarpur (MB) Road",
        "cars_2wheelers_limit_kmh": 50,
        "buses_hcv_limit_kmh": 40,
        "guideline_authority": "Delhi Traffic Police Speed Notification",
        "road_category": "South Delhi Arterial"
    },
    "aurobindo_marg": {
        "road_name": "Sri Aurobindo Marg (Qutub Minar to AIIMS)",
        "cars_2wheelers_limit_kmh": 50,
        "buses_hcv_limit_kmh": 40,
        "guideline_authority": "Delhi Traffic Police Speed Regulation",
        "road_category": "Radial Commercial Corridor"
    },
    "rohtak_road": {
        "road_name": "Rohtak Road (NH-10 / Peera Garhi to Zakhira)",
        "cars_2wheelers_limit_kmh": 50,
        "buses_hcv_limit_kmh": 40,
        "guideline_authority": "Delhi Traffic Police Speed Notification",
        "road_category": "Industrial & Freight Spine"
    },
    "najafgarh_road": {
        "road_name": "Najafgarh Road / Shivaji Marg (Uttam Nagar - Janakpuri)",
        "cars_2wheelers_limit_kmh": 50,
        "buses_hcv_limit_kmh": 40,
        "guideline_authority": "Delhi Traffic Police Urban Arterial Notification",
        "road_category": "West Delhi Commercial Spine"
    },
    "gt_karnal_road": {
        "road_name": "Grand Trunk (GT) Karnal Road (Azadpur to Singhu)",
        "cars_2wheelers_limit_kmh": 60,
        "buses_hcv_limit_kmh": 40,
        "guideline_authority": "Delhi Traffic Police Highway Regulation",
        "road_category": "Interstate Arterial Corridor"
    },
    "central_delhi": {
        "road_name": "Connaught Place Inner/Outer Circle & Radial Roads",
        "cars_2wheelers_limit_kmh": 40,
        "buses_hcv_limit_kmh": 30,
        "guideline_authority": "NDMC & Delhi Traffic Police Urban Core Regulation",
        "road_category": "Pedestrian-Dense Urban Core"
    },
    "trans_yamuna_north": {
        "road_name": "Wazirabad Road & GT Road East (Shahdara - Seelampur)",
        "cars_2wheelers_limit_kmh": 50,
        "buses_hcv_limit_kmh": 40,
        "guideline_authority": "Delhi Traffic Police Notification",
        "road_category": "East Delhi Arterial"
    }
}

# main class that stores data and does calculations
class DelhiTrafficModel:
    def __init__(self):
        # load json data files on start
        self.load_models()
        self.live_speed_modifiers = {}

    def load_models(self):
        # 1. load traffic model json
        with open(MODEL_PATH, 'r') as f:
            self.model_data = json.load(f)

        # 2. load active bus fleet snapshot
        with open(FLEET_PATH, 'r') as f:
            fleet_raw = json.load(f)
            self.fleet = fleet_raw.get("vehicles", [])

        # assign dictionaries
        self.corridors = self.model_data.get("corridors", {})
        self.grid = self.model_data.get("grid", {})
        self.hourly_network = self.model_data.get("hourly_network_profile", {})

        # 3. load nearby amenities (hospitals, metro, police, cafes)
        if os.path.exists(AMENITIES_PATH):
            with open(AMENITIES_PATH, 'r') as f:
                self.amenities = json.load(f)
        else:
            self.amenities = {
                "metro_stations": [],
                "hospitals": [],
                "police_stations": [],
                "cafes": []
            }

    # parse input time string into integer hour (0 to 23)
    def get_hour_from_time(self, time_val):
        # default to 9 AM for "now" (peak morning time)
        if time_val is None or time_val == "now":
            return 9
        if isinstance(time_val, int):
            return time_val % 24
        if isinstance(time_val, str):
            try:
                parts = time_val.split(':')
                return int(parts[0]) % 24
            except (ValueError, IndexError):
                return 9
        return 9

    # calculate bus speed for a road at a given hour
    def get_corridor_speed(self, corridor_id, hour=9, apply_live=True):
        hour_int = hour % 24
        c_info = self.corridors.get(corridor_id)
        free_flow = c_info.get("free_flow_speed", 42.0) if c_info else 40.0

        # different speed based on morning/evening rush hours
        if 8 <= hour_int <= 11:
            # morning peak: lots of traffic
            peak_factor = 0.33 if hour_int in [9, 10] else 0.37
            base_speed = free_flow * peak_factor
        elif 17 <= hour_int <= 20:
            # evening peak: office return crowd
            peak_factor = 0.32 if hour_int in [18, 19] else 0.36
            base_speed = free_flow * peak_factor
        elif 12 <= hour_int <= 16:
            # afternoon normal traffic
            base_speed = free_flow * 0.72
        elif 21 <= hour_int or hour_int <= 6:
            # night time: empty roads, buses run fast
            base_speed = free_flow * 0.82
        else:
            # early morning transition
            base_speed = free_flow * 0.55

        # special road conditions in delhi
        if corridor_id in ["central_delhi", "najafgarh_road", "aurobindo_marg"]:
            base_speed = base_speed * 0.90  # narrow roads and traffic signals
        elif corridor_id in ["nh48_airport_corridor", "outer_ring_road"]:
            base_speed = base_speed * 1.10  # wide highway roads

        # clamp speed between 9 km/h minimum and free flow maximum
        corridor_speed = max(9.0, min(free_flow, base_speed))

        # check if live modifier is set
        if apply_live and corridor_id in self.live_speed_modifiers:
            corridor_speed = corridor_speed * self.live_speed_modifiers[corridor_id]

        # calculate congestion index (0.0 to 1.0)
        # formula: (free_flow - actual_speed) / free_flow
        ci = (free_flow - corridor_speed) / free_flow
        ci = max(0.0, min(1.0, ci))

        # traffic status label and color code
        if ci < 0.25:
            status = "Free Flow"
            color = "#10b981"  # green
        elif ci < 0.45:
            status = "Moderate Traffic"
            color = "#f59e0b"  # yellow
        elif ci < 0.65:
            status = "Heavy Traffic"
            color = "#ef4444"  # red
        else:
            status = "Severe Congestion"
            color = "#991b1b"  # dark red

        # get speed limit info for this road
        limit_info = STATUTORY_SPEED_LIMITS.get(corridor_id, {
            "road_name": c_info.get("name", "Delhi Road") if c_info else "Delhi Road",
            "cars_2wheelers_limit_kmh": 50,
            "buses_hcv_limit_kmh": 40,
            "guideline_authority": "Delhi Traffic Police Speed Regulation",
            "road_category": "Standard Urban Arterial"
        })

        bus_limit = limit_info["buses_hcv_limit_kmh"]
        car_limit = limit_info["cars_2wheelers_limit_kmh"]

        # check if speed is within government limit
        if corridor_speed <= bus_limit:
            compliance = "Within Guideline Limit"
        else:
            compliance = "Above Guideline Limit"

        # delay multiplier compared to free flow
        delay_mult = free_flow / max(corridor_speed, 6.0)

        return {
            "corridor_id": corridor_id,
            "name": c_info.get("name", "Delhi Transit Corridor") if c_info else "Delhi Corridor",
            "speed_kmh": round(corridor_speed, 1),
            "free_flow_speed": free_flow,
            "statutory_bus_speed_limit_kmh": bus_limit,
            "statutory_cars_speed_limit_kmh": car_limit,
            "guideline_authority": limit_info["guideline_authority"],
            "road_category": limit_info["road_category"],
            "speed_limit_compliance": compliance,
            "congestion_index": round(ci, 3),
            "delay_multiplier": round(delay_mult, 2),
            "status": status,
            "color": color
        }

    # lookup speed from 1km grid cells
    def get_spatial_speed(self, lat, lng, hour=9):
        lat_bin = round(lat, 2)
        lng_bin = round(lng, 2)
        key = f"{lat_bin}_{lng_bin}"
        hour_str = str(hour % 24)

        if key in self.grid:
            cell = self.grid[key]
            if hour_str in cell.get("hourly_speeds", {}):
                return cell["hourly_speeds"][hour_str]

        # if not in grid, use citywide average for this hour
        net_h = self.hourly_network.get(hour_str, {})
        return net_h.get("median_speed_kmh", 16.5)

    # calculate time taken to travel a segment: time = distance / speed
    def calculate_segment_time(self, distance_km, corridor_id=None, lat=None, lng=None, hour=9):
        if corridor_id:
            c_metrics = self.get_corridor_speed(corridor_id, hour)
            speed = c_metrics["speed_kmh"]
        elif lat is not None and lng is not None:
            speed = self.get_spatial_speed(lat, lng, hour)
        else:
            speed = self.hourly_network.get(str(hour), {}).get("median_speed_kmh", 16.0)

        # minimum speed is 6 km/h (heavy traffic crawl)
        speed = max(6.0, speed)
        travel_time_mins = (distance_km / speed) * 60.0
        return travel_time_mins, speed

    # return traffic data for all 12 corridors
    def get_all_corridors_status(self, hour=9):
        results = []
        for c_id, c_info in self.corridors.items():
            metrics = self.get_corridor_speed(c_id, hour)
            results.append({
                "id": c_id,
                "name": c_info["name"],
                "type": c_info["type"],
                "description": c_info["description"],
                "bounds": c_info["bounds"],
                "speed_kmh": metrics["speed_kmh"],
                "free_flow_speed": metrics["free_flow_speed"],
                "statutory_bus_speed_limit_kmh": metrics["statutory_bus_speed_limit_kmh"],
                "statutory_cars_speed_limit_kmh": metrics["statutory_cars_speed_limit_kmh"],
                "guideline_authority": metrics["guideline_authority"],
                "road_category": metrics["road_category"],
                "speed_limit_compliance": metrics["speed_limit_compliance"],
                "congestion_index": metrics["congestion_index"],
                "delay_multiplier": metrics["delay_multiplier"],
                "status": metrics["status"],
                "color": metrics["color"]
            })
        return results

    # find nearest metro, hospitals, police stations, cafes using haversine
    def get_nearest_amenities(self, lat, lng, max_results=4):
        if os.path.exists(AMENITIES_PATH):
            try:
                with open(AMENITIES_PATH, 'r', encoding='utf-8') as f:
                    self.amenities = json.load(f)
            except Exception:
                pass

        result = {}
        for category in ["cafes", "hospitals", "police_stations", "metro_stations"]:
            items = self.amenities.get(category, [])
            scored = []
            for item in items:
                # calculate distance using haversine formula
                dist_km = haversine(lat, lng, item["lat"], item["lng"])
                scored.append({
                    **item,
                    "distance_km": round(dist_km, 2),
                    "distance_m": int(round(dist_km * 1000))
                })
            # sort by nearest distance first
            scored.sort(key=lambda x: x["distance_km"])
            result[category] = scored[:max_results]
        return result

    def get_all_amenities(self):
        return self.amenities

    def get_active_fleet(self, limit=200):
        return self.fleet[:limit]

# create single instance to be used everywhere
traffic_engine = DelhiTrafficModel()
