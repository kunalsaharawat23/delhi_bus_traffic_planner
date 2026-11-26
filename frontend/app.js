// =======================================================
// Title: Delhi Bus Transit Tracker & Route Finder
// Course: CSE 102 - Web Development Lab Project
// Team: 1st Year B.Tech CSE
// File: app.js
// Description: Frontend script for Leaflet map, API calls, and UI interactions
// =======================================================

// global variable to keep track of map, layers, and fetched data
var state = {
  map: null,
  corridorsData: [],
  vehiclesData: [],
  stopsData: [],
  amenitiesData: null,
  activeRouteLayer: null,
  trafficLayersGroup: null,
  busMarkersGroup: null,
  stopMarkersGroup: null,
  metroMarkersGroup: null,
  hospitalMarkersGroup: null,
  policeMarkersGroup: null,
  cafeMarkersGroup: null,
  selectedOption: null,
  benchmarkData: null,
  liveSimInterval: null
};

// run main functions once the html document is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("Delhi Transit Flow app starting...");
  initMap();
  bindEvents();
  fetchInitialData();
  initDelhiClock();

  // auto plan default journey after small delay (Kashmere Gate to Nehru Place)
  setTimeout(function () {
    planJourney();
  }, 600);
});

// step 1: create and setup the Leaflet map
function initMap() {
  console.log("Initializing map...");
  
  // center map on Delhi coordinates (latitude: 28.625, longitude: 77.215)
  state.map = L.map("map", {
    zoomControl: false,
    minZoom: 10,
    maxZoom: 19
  }).setView([28.625, 77.215], 11);

  // setup google maps tile layers
  // roadmap tiles
  var gmapsRoadmap = L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
    subdomains: ["0", "1", "2", "3"],
    maxZoom: 20,
    attribution: '&copy; <a href="https://maps.google.com" target="_blank">Google Maps</a>'
  });

  // satellite hybrid tiles
  var gmapsHybrid = L.tileLayer("https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
    subdomains: ["0", "1", "2", "3"],
    maxZoom: 20,
    attribution: '&copy; <a href="https://maps.google.com" target="_blank">Google Maps</a>'
  });

  // terrain tiles
  var gmapsTerrain = L.tileLayer("https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}", {
    subdomains: ["0", "1", "2", "3"],
    maxZoom: 20,
    attribution: '&copy; <a href="https://maps.google.com" target="_blank">Google Maps</a>'
  });

  // set roadmap as default
  gmapsRoadmap.addTo(state.map);

  // layer switcher control in top right
  var baseMaps = {
    "🗺️ Google Roadmap": gmapsRoadmap,
    "🛰️ Google Satellite": gmapsHybrid,
    "⛰️ Google Terrain": gmapsTerrain
  };
  L.control.layers(baseMaps, null, { position: "topright" }).addTo(state.map);

  // zoom buttons at bottom right
  L.control.zoom({ position: "bottomright" }).addTo(state.map);

  // create layer groups and add them to the map
  state.trafficLayersGroup = L.layerGroup().addTo(state.map);
  state.busMarkersGroup    = L.layerGroup().addTo(state.map);
  state.stopMarkersGroup   = L.layerGroup().addTo(state.map);
  state.metroMarkersGroup  = L.layerGroup().addTo(state.map);
  state.hospitalMarkersGroup = L.layerGroup().addTo(state.map);
  state.policeMarkersGroup = L.layerGroup().addTo(state.map);
  state.cafeMarkersGroup   = L.layerGroup().addTo(state.map);
  state.activeRouteLayer   = L.layerGroup().addTo(state.map);
}

// step 2: attach click and change listeners to buttons and inputs
function bindEvents() {
  // search button click
  var planBtn = document.getElementById("btn-plan-journey");
  if (planBtn) {
    planBtn.addEventListener("click", function () {
      planJourney();
    });
  }

  // clear input buttons
  var clearOrigBtn = document.getElementById("btn-clear-origin");
  if (clearOrigBtn) {
    clearOrigBtn.addEventListener("click", function () {
      var origInput = document.getElementById("input-origin");
      origInput.value = "";
      origInput.focus();
    });
  }

  var clearDestBtn = document.getElementById("btn-clear-dest");
  if (clearDestBtn) {
    clearDestBtn.addEventListener("click", function () {
      var destInput = document.getElementById("input-dest");
      destInput.value = "";
      destInput.focus();
    });
  }

  // swap button - interchange origin and destination
  var swapBtn = document.getElementById("btn-swap");
  if (swapBtn) {
    swapBtn.addEventListener("click", function () {
      var origInput = document.getElementById("input-origin");
      var destInput = document.getElementById("input-dest");
      var temp = origInput.value;
      origInput.value = destInput.value;
      destInput.value = temp;
      planJourney();
    });
  }

  // preset chips for quick testing during demo
  var chips = document.querySelectorAll(".chip");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      // remove active class from all chips
      document.querySelectorAll(".chip").forEach(function (c) {
        c.classList.remove("active");
      });
      // add active class to clicked chip
      chip.classList.add("active");
      document.getElementById("input-origin").value = chip.dataset.orig;
      document.getElementById("input-dest").value = chip.dataset.dest;
      planJourney();
    });
  });

  // time dropdown change listener
  var timeSelect = document.getElementById("select-time");
  if (timeSelect) {
    timeSelect.addEventListener("change", function () {
      updateTrafficForSelectedHour();
      planJourney();
    });
  }

  // preference dropdown change listener
  var prefSelect = document.getElementById("select-preference");
  if (prefSelect) {
    prefSelect.addEventListener("change", function () {
      planJourney();
    });
  }

  // layer toggle checkboxes (show / hide markers)
  var toggleBuses = document.getElementById("toggle-buses");
  if (toggleBuses) {
    toggleBuses.addEventListener("change", function (e) {
      if (e.target.checked) {
        state.map.addLayer(state.busMarkersGroup);
      } else {
        state.map.removeLayer(state.busMarkersGroup);
      }
    });
  }

  var toggleTraffic = document.getElementById("toggle-traffic");
  if (toggleTraffic) {
    toggleTraffic.addEventListener("change", function (e) {
      if (e.target.checked) {
        state.map.addLayer(state.trafficLayersGroup);
      } else {
        state.map.removeLayer(state.trafficLayersGroup);
      }
    });
  }

  var toggleStops = document.getElementById("toggle-stops");
  if (toggleStops) {
    toggleStops.addEventListener("change", function (e) {
      if (e.target.checked) {
        state.map.addLayer(state.stopMarkersGroup);
      } else {
        state.map.removeLayer(state.stopMarkersGroup);
      }
    });
  }

  var toggleMetro = document.getElementById("toggle-metro");
  if (toggleMetro) {
    toggleMetro.addEventListener("change", function (e) {
      if (e.target.checked) {
        state.map.addLayer(state.metroMarkersGroup);
      } else {
        state.map.removeLayer(state.metroMarkersGroup);
      }
    });
  }

  var toggleHosp = document.getElementById("toggle-hospitals");
  if (toggleHosp) {
    toggleHosp.addEventListener("change", function (e) {
      if (e.target.checked) {
        state.map.addLayer(state.hospitalMarkersGroup);
      } else {
        state.map.removeLayer(state.hospitalMarkersGroup);
      }
    });
  }

  var togglePolice = document.getElementById("toggle-police");
  if (togglePolice) {
    togglePolice.addEventListener("change", function (e) {
      if (e.target.checked) {
        state.map.addLayer(state.policeMarkersGroup);
      } else {
        state.map.removeLayer(state.policeMarkersGroup);
      }
    });
  }

  var toggleCafes = document.getElementById("toggle-cafes");
  if (toggleCafes) {
    toggleCafes.addEventListener("change", function (e) {
      if (e.target.checked) {
        state.map.addLayer(state.cafeMarkersGroup);
      } else {
        state.map.removeLayer(state.cafeMarkersGroup);
      }
    });
  }

  // benchmark accuracy & live API perfection modal buttons
  var btnBenchmark = document.getElementById("btn-benchmark-modal");
  if (btnBenchmark) {
    btnBenchmark.addEventListener("click", function () {
      openBenchmarkModal();
    });
  }

  var badgeApiHealth = document.getElementById("badge-api-health");
  if (badgeApiHealth) {
    badgeApiHealth.addEventListener("click", function () {
      openBenchmarkModal();
    });
  }

  var btnRerunBench = document.getElementById("btn-rerun-api-bench");
  if (btnRerunBench) {
    btnRerunBench.addEventListener("click", function () {
      runLiveApiDiagnostics(true);
    });
  }

  var btnCloseBm = document.getElementById("btn-close-benchmark");
  if (btnCloseBm) {
    btnCloseBm.addEventListener("click", function () {
      closeBenchmarkModal();
    });
  }

  var modalBm = document.getElementById("modal-benchmark");
  if (modalBm) {
    modalBm.addEventListener("click", function (e) {
      if (e.target.id === "modal-benchmark") {
        closeBenchmarkModal();
      }
    });
  }

  // google maps comparison modal buttons
  var btnSplit = document.getElementById("btn-gmaps-split-view");
  if (btnSplit) {
    btnSplit.addEventListener("click", function () {
      openGmapsCompareModal();
    });
  }

  var btnCloseGmaps = document.getElementById("btn-close-gmaps-compare");
  if (btnCloseGmaps) {
    btnCloseGmaps.addEventListener("click", function () {
      closeGmapsCompareModal();
    });
  }

  var modalGmaps = document.getElementById("modal-gmaps-compare");
  if (modalGmaps) {
    modalGmaps.addEventListener("click", function (e) {
      if (e.target.id === "modal-gmaps-compare") {
        closeGmapsCompareModal();
      }
    });
  }

  // initialize the autocomplete suggestions for pickup and drop places
  setupPlaceSuggestions();
}

// step 2b: autocomplete dropdown suggestions for confirmed pickup/drop places in delhi
function setupPlaceSuggestions() {
  console.log("Setting up place suggestions dropdown...");

  // list of major confirmed pickup/drop transit hubs in delhi
  var popularHubs = [
    "Kashmere Gate ISBT",
    "Connaught Place (Rajiv Chowk)",
    "AIIMS / Safdarjung Hospital",
    "Nehru Place Bus Terminal",
    "Anand Vihar ISBT",
    "Sarai Kale Khan ISBT (Hazrat Nizamuddin)",
    "Dhaula Kuan Interchange",
    "Hauz Khas Metro / Aurobindo Market",
    "Karol Bagh (Pusa Road)",
    "Rajouri Garden Interchange",
    "Punjabi Bagh Chowk",
    "Janakpuri West District Centre",
    "Dwarka Mor",
    "Dwarka Sector 21 Interchange",
    "IGI Airport Terminal 3",
    "Rohini West / Madhuban Chowk",
    "Azadpur Terminal",
    "Vishwavidyalaya (Delhi University North Campus)",
    "New Delhi Railway Station (Ajmeri Gate)",
    "Old Delhi Railway Station (Chandni Chowk)",
    "Lajpat Nagar Ring Road",
    "Mehrauli Terminal",
    "Badarpur Border Terminal",
    "Akshardham Temple / Commonwealth Games Village",
    "Mayur Vihar Phase 1 Pocket 1",
    "Laxmi Nagar Metro (Vikas Marg)",
    "Shahdara Terminal",
    "Vasant Kunj (Promenade / Ambience Mall)"
  ];

  function getStopsList() {
    if (state.stopsData && state.stopsData.length > 0) {
      return state.stopsData;
    }
    // fallback to popular hubs list if stops are still loading
    return popularHubs.map(function (name) {
      return { name: name, zone: "Delhi Transit", is_hub: true };
    });
  }

  function setupInput(inputId, dropdownId) {
    var input = document.getElementById(inputId);
    var dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    var activeIndex = -1;

    function renderDropdown(items, queryText, isPopular) {
      dropdown.innerHTML = "";
      if (items.length === 0) {
        dropdown.innerHTML = 
          '<div class="suggestion-empty">' +
            'No confirmed stop found for "<strong>' + queryText + '</strong>".<br>' +
            '<span style="font-size:0.75rem; color:#94a3b8;">Try searching by area (e.g. Rohini, CP, Dwarka, AIIMS)</span>' +
          '</div>';
        dropdown.classList.add("open");
        return;
      }

      var header = document.createElement("div");
      header.className = "suggestions-header";
      header.innerText = isPopular ? "⭐ Confirmed Delhi Pickup & Drop Locations" : "🚏 Matching Verified Stops (" + items.length + ")";
      dropdown.appendChild(header);

      items.forEach(function (stop, idx) {
        var itemDiv = document.createElement("div");
        itemDiv.className = "suggestion-item";
        itemDiv.dataset.index = idx;

        // highlight matching query letters
        var displayName = stop.name;
        if (queryText && queryText.length > 0) {
          var escapedQuery = queryText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          var reg = new RegExp("(" + escapedQuery + ")", "gi");
          displayName = stop.name.replace(reg, "<mark>$1</mark>");
        }

        var isHub = stop.is_hub;
        var iconHtml = isHub ? "🚏" : "📍";
        var badgeText = isHub ? "Terminal Hub" : "Confirmed Stop";
        var badgeClass = isHub ? "suggestion-badge hub" : "suggestion-badge";
        var zoneText = (stop.zone ? stop.zone + " Zone • " : "") + (isHub ? "Major DTC Terminal" : "Confirmed Passenger Stop");

        itemDiv.innerHTML = 
          '<div class="suggestion-icon-col ' + (isHub ? "hub" : "stop") + '">' + iconHtml + '</div>' +
          '<div class="suggestion-info">' +
            '<div class="suggestion-name">' + displayName + '</div>' +
            '<div class="suggestion-sub">' + zoneText + '</div>' +
          '</div>' +
          '<span class="' + badgeClass + '">' + badgeText + '</span>';

        // select place when clicked
        itemDiv.addEventListener("click", function (e) {
          e.stopPropagation();
          input.value = stop.name;
          closeDropdown();
          planJourney();
        });

        dropdown.appendChild(itemDiv);
      });

      dropdown.classList.add("open");
      activeIndex = -1;
    }

    function closeDropdown() {
      dropdown.classList.remove("open");
      dropdown.innerHTML = "";
      activeIndex = -1;
    }

    function showSuggestions() {
      var query = input.value.trim().toLowerCase();
      var allStops = getStopsList();

      if (query.length === 0) {
        // show popular confirmed hubs when input is blank
        var popularList = allStops.filter(function (s) {
          return s.is_hub || popularHubs.indexOf(s.name) !== -1;
        }).slice(0, 10);
        renderDropdown(popularList, "", true);
        return;
      }

      // filter stops matching query
      var filtered = allStops.filter(function (s) {
        var nameLower = s.name.toLowerCase();
        var zoneLower = (s.zone || "").toLowerCase();
        var idLower = (s.id || "").toLowerCase();

        // check direct substring match
        if (nameLower.indexOf(query) !== -1 || zoneLower.indexOf(query) !== -1 || idLower.indexOf(query) !== -1) {
          return true;
        }

        // common delhi abbreviations and aliases
        if ((query === "cp" || query === "connaught") && nameLower.indexOf("connaught") !== -1) return true;
        if ((query === "airport" || query === "t3") && (nameLower.indexOf("airport") !== -1 || nameLower.indexOf("igi") !== -1)) return true;
        if (query === "aiims" && nameLower.indexOf("aiims") !== -1) return true;
        if (query === "isbt" && nameLower.indexOf("isbt") !== -1) return true;
        if (query === "du" && nameLower.indexOf("vishwavidyalaya") !== -1) return true;
        if (query === "metro" && nameLower.indexOf("metro") !== -1) return true;
        if (query === "railway" && nameLower.indexOf("railway") !== -1) return true;

        return false;
      });

      renderDropdown(filtered.slice(0, 12), query, false);
    }

    // event listeners on input
    input.addEventListener("focus", function () {
      showSuggestions();
    });

    input.addEventListener("click", function () {
      showSuggestions();
    });

    input.addEventListener("input", function () {
      showSuggestions();
    });

    // keyboard navigation
    input.addEventListener("keydown", function (e) {
      if (!dropdown.classList.contains("open")) return;

      var items = dropdown.querySelectorAll(".suggestion-item");
      if (items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
        updateActiveItem(items);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        updateActiveItem(items);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < items.length) {
          items[activeIndex].click();
        } else {
          closeDropdown();
          planJourney();
        }
      } else if (e.key === "Escape") {
        closeDropdown();
      }
    });

    function updateActiveItem(items) {
      items.forEach(function (el, i) {
        if (i === activeIndex) {
          el.classList.add("active");
          el.scrollIntoView({ block: "nearest" });
        } else {
          el.classList.remove("active");
        }
      });
    }
  }

  // attach autocomplete to both origin and destination inputs
  setupInput("input-origin", "suggestions-origin");
  setupInput("input-dest", "suggestions-dest");

  // click outside closes any open suggestions
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".input-wrapper")) {
      var d1 = document.getElementById("suggestions-origin");
      var d2 = document.getElementById("suggestions-dest");
      if (d1) d1.classList.remove("open");
      if (d2) d2.classList.remove("open");
    }
  });
}

// step 3: fetch all initial data from python backend using fetch()
async function fetchInitialData() {
  console.log("Fetching data from python backend...");
  try {
    // 1. fetch traffic status
    var trafficRes = await fetch("/api/traffic");
    var trafficJson = await trafficRes.json();
    state.corridorsData = trafficJson.corridors;
    updateTopBarStats(trafficJson);
    renderTrafficCorridors(trafficJson.corridors);

    // 2. fetch bus locations
    var vehiclesRes = await fetch("/api/vehicles?limit=300");
    var vehiclesJson = await vehiclesRes.json();
    state.vehiclesData = vehiclesJson.vehicles;
    document.getElementById("map-bus-count").innerText = vehiclesJson.count;
    var activeBusesEl = document.getElementById("stat-active-buses");
    if (activeBusesEl) {
      activeBusesEl.innerText = vehiclesJson.count + " Working";
    }
    renderLiveBusMarkers(vehiclesJson.vehicles);
    startLiveSimulation();

    // 3. fetch bus stops
    var stopsRes = await fetch("/api/stops");
    var stopsJson = await stopsRes.json();
    state.stopsData = stopsJson.stops;
    renderStopMarkers(stopsJson.stops);

    // 4. fetch nearby places (metro, hospital, police, cafe)
    var amenitiesRes = await fetch("/api/amenities");
    var amenitiesJson = await amenitiesRes.json();
    state.amenitiesData = amenitiesJson;
    renderAmenityMarkers(amenitiesJson);

    console.log("Initial data loaded successfully!");

    // 5. measure live API health & update heading bar benchmark status
    runLiveApiDiagnostics(false);
  } catch (err) {
    console.error("Error fetching data from server:", err);
  }
}

// update the top header statistics badges
function updateTopBarStats(trafficJson) {
  var speedEl = document.getElementById("stat-network-speed");
  if (speedEl) {
    speedEl.innerText = trafficJson.citywide_average_bus_speed_kmh + " km/h";
  }

  var statusEl = document.getElementById("stat-congestion-status");
  if (statusEl) {
    statusEl.innerText = trafficJson.overall_status;
  }

  var congBadge = document.getElementById("badge-congestion");
  if (congBadge) {
    if (trafficJson.citywide_congestion_index > 0.6) {
      congBadge.style.borderColor = "var(--accent-danger)";
    } else if (trafficJson.citywide_congestion_index > 0.35) {
      congBadge.style.borderColor = "var(--accent-warning)";
    } else {
      congBadge.style.borderColor = "var(--accent-success)";
    }
  }
}

// initialize live clock according to GMT+5:30 (Indian Standard Time)
function initDelhiClock() {
  updateDelhiClock();
  setInterval(updateDelhiClock, 1000);
}

// update the top-bar clock strictly to GMT+5:30 (Asia/Kolkata)
function updateDelhiClock() {
  var clockEl = document.getElementById("stat-current-time");
  if (!clockEl) {
    return;
  }

  try {
    // Current time according to GMT+5:30 (Asia/Kolkata timezone)
    var now = new Date();
    var timeStr = now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    clockEl.innerText = timeStr;
  } catch (err) {
    // Math fallback for GMT+5:30
    var now = new Date();
    var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    var istDate = new Date(utc + (3600000 * 5.5));
    var hours = istDate.getHours();
    var minutes = istDate.getMinutes();
    var seconds = istDate.getSeconds();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    var hStr = hours < 10 ? '0' + hours : hours;
    var mStr = minutes < 10 ? '0' + minutes : minutes;
    var sStr = seconds < 10 ? '0' + seconds : seconds;
    clockEl.innerText = hStr + ':' + mStr + ':' + sStr + ' ' + ampm;
  }
}

// no colored lines drawn over the map so google maps remains clean
function renderTrafficCorridors(corridors) {
  state.trafficLayersGroup.clearLayers();
  // removed colored lines as requested
}

// draw buses as moving circles on the map
function renderLiveBusMarkers(vehicles) {
  state.busMarkersGroup.clearLayers();

  var activeBusesEl = document.getElementById("stat-active-buses");
  if (activeBusesEl && vehicles) {
    activeBusesEl.innerText = vehicles.length + " Working";
  }

  vehicles.forEach(function (v) {
    // color based on bus speed
    var circleColor = "#10b981"; // green for fast
    if (v.speed_kmh < 12) {
      circleColor = "#ef4444"; // red for jam
    } else if (v.speed_kmh < 24) {
      circleColor = "#f59e0b"; // yellow for medium
    }

    var marker = L.circleMarker([v.lat, v.lng], {
      radius: 6,
      fillColor: circleColor,
      color: "#ffffff",
      weight: 1.5,
      opacity: 1,
      fillOpacity: 0.9
    });

    // popup when bus is clicked
    var popupContent = 
      '<div style="font-family: var(--font-sans); min-width: 170px;">' +
        '<div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">🚌 DTC Bus ' + v.vehicle_id + '</div>' +
        '<div style="font-size: 12px; color: #475569;">Route ID: <strong>' + (v.route_id || 'In Service') + '</strong></div>' +
        '<div style="font-size: 12px; color: #475569;">Current Speed: <strong>' + v.speed_kmh + ' km/h</strong></div>' +
        '<div style="font-size: 12px; color: #475569;">Heading: <strong>' + v.heading + '°</strong></div>' +
        '<div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Last updated: ' + v.last_updated + '</div>' +
      '</div>';

    marker.bindPopup(popupContent);

    v._markerRef = marker;
    state.busMarkersGroup.addLayer(marker);
  });
}

// interval to simulate live movement of buses every 2 seconds
function startLiveSimulation() {
  if (state.liveSimInterval) {
    clearInterval(state.liveSimInterval);
  }

  state.liveSimInterval = setInterval(function () {
    state.vehiclesData.forEach(function (v) {
      if (v._markerRef && v.speed_kmh > 3.0) {
        // simple math to move bus slightly along its heading angle
        var rad = (v.heading * Math.PI) / 180.0;
        var step = (v.speed_kmh / 3600.0) * 0.005;
        v.lat += step * Math.cos(rad);
        v.lng += step * Math.sin(rad);
        v._markerRef.setLatLng([v.lat, v.lng]);
      }
    });
  }, 2000);
}

// draw bus stop dots on map
function renderStopMarkers(stops) {
  state.stopMarkersGroup.clearLayers();

  stops.forEach(function (s) {
    var isHub = s.is_hub;
    var marker = L.circleMarker([s.lat, s.lng], {
      radius: isHub ? 6 : 4,
      fillColor: isHub ? "#2563eb" : "#64748b",
      color: "#ffffff",
      weight: 1.5,
      opacity: 1,
      fillOpacity: 0.8
    });

    var tooltipContent = 
      '<div style="font-family: var(--font-sans);">' +
        '<strong>' + s.name + '</strong><br>' +
        '<span style="font-size: 11px; color: #64748b;">' + s.zone + ' Zone ' + (isHub ? '• Transit Hub' : '') + '</span>' +
      '</div>';

    marker.bindTooltip(tooltipContent);

    // clicking stop auto fills input boxes
    marker.on("click", function () {
      var origInput = document.getElementById("input-origin");
      var destInput = document.getElementById("input-dest");
      if (!origInput.value) {
        origInput.value = s.name;
      } else {
        destInput.value = s.name;
        planJourney();
      }
    });

    state.stopMarkersGroup.addLayer(marker);
  });
}

// helper to create emoji icons for places
function createPlaceIcon(emoji, bg) {
  return L.divIcon({
    className: 'amenity-div-icon',
    html: '<div style="background: ' + bg + '; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 2px 5px rgba(0,0,0,0.25); border: 2px solid white;">' + emoji + '</div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14]
  });
}

// add metro, hospital, police, cafe icons to map
function renderAmenityMarkers(amenities) {
  state.metroMarkersGroup.clearLayers();
  state.hospitalMarkersGroup.clearLayers();
  state.policeMarkersGroup.clearLayers();
  state.cafeMarkersGroup.clearLayers();

  // 1. metro stations
  var metroList = amenities.metro_stations || [];
  metroList.forEach(function (m) {
    var icon = createPlaceIcon("🚇", "#0284c7");
    var gmapsLink = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(m.name + " Delhi Metro Station");
    var marker = L.marker([m.lat, m.lng], { icon: icon });

    var popupHtml = 
      '<div class="amenity-popup">' +
        '<div class="amenity-popup-header metro">🚇 Metro Station</div>' +
        '<div class="amenity-popup-name">' + m.name + '</div>' +
        '<div class="amenity-popup-meta">Lines: <strong>' + (m.lines || []).join(", ") + '</strong></div>' +
        '<div class="amenity-popup-meta">Connecting Depot: ' + (m.depot_connect || "DTC Network") + '</div>' +
        '<a href="' + gmapsLink + '" target="_blank" class="amenity-gmaps-link">🗺️ Open in Google Maps ↗</a>' +
      '</div>';

    marker.bindPopup(popupHtml);
    state.metroMarkersGroup.addLayer(marker);
  });

  // 2. hospitals
  var hospList = amenities.hospitals || [];
  hospList.forEach(function (h) {
    var icon = createPlaceIcon("🏥", "#dc2626");
    var gmapsLink = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(h.name + " Delhi");
    var marker = L.marker([h.lat, h.lng], { icon: icon });

    var popupHtml = 
      '<div class="amenity-popup">' +
        '<div class="amenity-popup-header hosp">🏥 Hospital / Medical</div>' +
        '<div class="amenity-popup-name">' + h.name + '</div>' +
        '<div class="amenity-popup-meta">Type: <strong>' + h.type + '</strong></div>' +
        '<div class="amenity-popup-meta" style="color: #dc2626; font-weight: 600;">🚨 ' + h.emergency + '</div>' +
        '<a href="' + gmapsLink + '" target="_blank" class="amenity-gmaps-link">🗺️ Open in Google Maps ↗</a>' +
      '</div>';

    marker.bindPopup(popupHtml);
    state.hospitalMarkersGroup.addLayer(marker);
  });

  // 3. police stations
  var policeList = amenities.police_stations || [];
  policeList.forEach(function (p) {
    var icon = createPlaceIcon("👮", "#1e3a8a");
    var gmapsLink = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.name + " Delhi");
    var marker = L.marker([p.lat, p.lng], { icon: icon });

    var popupHtml = 
      '<div class="amenity-popup">' +
        '<div class="amenity-popup-header police">👮 Police Station</div>' +
        '<div class="amenity-popup-name">' + p.name + '</div>' +
        '<div class="amenity-popup-meta">Jurisdiction: <strong>' + p.jurisdiction + '</strong></div>' +
        '<div class="amenity-popup-meta">Control Room: <strong>' + p.contact + '</strong></div>' +
        '<a href="' + gmapsLink + '" target="_blank" class="amenity-gmaps-link">🗺️ Open in Google Maps ↗</a>' +
      '</div>';

    marker.bindPopup(popupHtml);
    state.policeMarkersGroup.addLayer(marker);
  });

  // 4. cafes
  var cafeList = amenities.cafes || [];
  cafeList.forEach(function (c) {
    var icon = createPlaceIcon("☕", "#d97706");
    var gmapsLink = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.name + " Delhi");
    var marker = L.marker([c.lat, c.lng], { icon: icon });

    var popupHtml = 
      '<div class="amenity-popup">' +
        '<div class="amenity-popup-header cafe">☕ Cafe & Refreshment</div>' +
        '<div class="amenity-popup-name">' + c.name + '</div>' +
        '<div class="amenity-popup-meta">Specialty: <strong>' + c.specialty + '</strong></div>' +
        '<div class="amenity-popup-meta">Rating: ⭐ <strong>' + c.rating + ' / 5.0</strong></div>' +
        '<a href="' + gmapsLink + '" target="_blank" class="amenity-gmaps-link">🗺️ Open in Google Maps ↗</a>' +
      '</div>';

    marker.bindPopup(popupHtml);
    state.cafeMarkersGroup.addLayer(marker);
  });
}

// fetch updated traffic when departure time is changed
async function updateTrafficForSelectedHour() {
  var timeVal = document.getElementById("select-time").value;
  var hour = 9;
  if (timeVal !== "now" && timeVal.indexOf(":") !== -1) {
    hour = parseInt(timeVal.split(":")[0]);
  }

  try {
    var res = await fetch("/api/traffic?hour=" + hour);
    var data = await res.json();
    state.corridorsData = data.corridors;
    updateTopBarStats(data);
    renderTrafficCorridors(data.corridors);
  } catch (err) {
    console.error("Error updating traffic for hour:", err);
  }
}

// main function to plan journey between origin and destination
async function planJourney() {
  var origin = document.getElementById("input-origin").value.trim();
  var destination = document.getElementById("input-dest").value.trim();
  var departureTime = document.getElementById("select-time").value;
  var preference = document.getElementById("select-preference").value;

  if (!origin || !destination) {
    console.log("Origin or destination empty, skipping search.");
    return;
  }

  var loadingEl = document.getElementById("results-loading");
  var listEl = document.getElementById("results-list");

  loadingEl.style.display = "flex";
  listEl.innerHTML = "";

  console.log("Planning route: " + origin + " -> " + destination);

  try {
    var url = "/api/directions?origin=" + encodeURIComponent(origin) + 
              "&destination=" + encodeURIComponent(destination) + 
              "&departure_time=" + encodeURIComponent(departureTime) + 
              "&preference=" + encodeURIComponent(preference);

    var res = await fetch(url);
    var data = await res.json();

    loadingEl.style.display = "none";

    // check if routes were found
    if (!data.options || data.options.length === 0) {
      listEl.innerHTML = 
        '<div style="padding: 24px; text-align: center; color: var(--text-secondary);">' +
          '<p>No direct bus routes found between these locations.</p>' +
          '<span style="font-size: 12px; color: var(--text-muted);">Try selecting one of the major transit hubs or presets.</span>' +
        '</div>';
      return;
    }

    // render cards on sidebar
    renderJourneyOptions(data.options, data.origin, data.destination);
    
    // auto select first route (fastest option)
    selectJourneyOption(data.options[0]);

  } catch (err) {
    loadingEl.style.display = "none";
    listEl.innerHTML = 
      '<div style="padding: 20px; color: var(--accent-danger); font-size: 13px;">' +
        'Error planning journey: ' + err.message +
      '</div>';
    console.error("Journey plan error:", err);
  }
}

// renders the "NEAREST TRANSIT, CAFES & HOSPITALS" panel matching student lab design
function renderAmenitiesPanel(originInfo, destInfo) {
  var origAmenities = originInfo && originInfo.nearest_amenities ? originInfo.nearest_amenities : null;
  var destAmenities = destInfo && destInfo.nearest_amenities ? destInfo.nearest_amenities : null;

  if (!origAmenities && !destAmenities) {
    return null;
  }

  var container = document.createElement("div");
  container.className = "journey-amenities-card";

  // clean display names for origin and destination
  var origName = originInfo && originInfo.name ? originInfo.name : "Origin";
  var destName = destInfo && destInfo.name ? destInfo.name : "Destination";

  // shorten for pill button display
  var origShort = origName.replace(/\b(Bus Terminal|Terminal|ISBT|Metro Station|Bus Stop)\b/gi, '').trim();
  var destShort = destName.replace(/\b(Bus Terminal|Terminal|ISBT|Metro Station|Bus Stop)\b/gi, '').trim();
  if (origShort.length > 16) origShort = origShort.substring(0, 14) + '..';
  if (destShort.length > 16) destShort = destShort.substring(0, 14) + '..';

  // default to origin active
  var currentTab = 'origin';

  function formatDist(item) {
    var distM = item.distance_m || (item.distance_km ? Math.round(item.distance_km * 1000) : 0);
    if (distM < 1000) {
      return distM + "m";
    }
    return (distM / 1000).toFixed(2) + "km";
  }

  function formatWalk(item) {
    var distM = item.distance_m || (item.distance_km ? Math.round(item.distance_km * 1000) : 0);
    var mins = Math.max(1, Math.round(distM / 80));
    return "🚶 ~" + mins + " min";
  }

  function generateRowsHtml(amenitiesData) {
    if (!amenitiesData) {
      return '<div style="padding: 12px; color: #64748b; font-size: 12px;">No nearby services recorded for this point.</div>';
    }

    var html = '';

    // 1. Metro stations
    var metros = amenitiesData.metro_stations || [];
    if (metros.length > 0) {
      html += 
        '<div class="amenity-category-block">' +
          '<div class="amenity-cat-header metro-header">' +
            '<span>🚇 NEAREST METRO STATIONS</span>' +
            '<span>LINE CONNECTION</span>' +
          '</div>';

      metros.slice(0, 3).forEach(function (m) {
        var lineText = m.line || (m.lines ? m.lines.join(' / ') : 'Metro Line');
        html += 
          '<div class="amenity-row-item" data-lat="' + m.lat + '" data-lng="' + m.lng + '" data-name="' + m.name + '">' +
            '<div class="amenity-row-left">' +
              '<div class="amenity-icon-box">🚇</div>' +
              '<div class="amenity-text-box">' +
                '<div class="amenity-main-name">' + m.name + '</div>' +
                '<div class="amenity-sub-desc"><span class="line-yellow">' + lineText + '</span></div>' +
              '</div>' +
            '</div>' +
            '<div class="amenity-row-right">' +
              '<div class="amenity-dist-val">' + formatDist(m) + '</div>' +
              '<div class="amenity-walk-time">' + formatWalk(m) + '</div>' +
            '</div>' +
          '</div>';
      });
      html += '</div>';
    }

    // 2. Cafes & Coffee
    var cafes = amenitiesData.cafes || [];
    if (cafes.length > 0) {
      html += 
        '<div class="amenity-category-block">' +
          '<div class="amenity-cat-header cafe-header">' +
            '<span>☕ NEAREST CAFES & COFFEE</span>' +
            '<span>SPECIALTY</span>' +
          '</div>';

      cafes.slice(0, 3).forEach(function (c) {
        var subText = c.specialty || 'Fresh Brews';
        if (c.rating) {
          subText += ' · <span class="rating-star">⭐ ' + c.rating + '</span>';
        }
        html += 
          '<div class="amenity-row-item" data-lat="' + c.lat + '" data-lng="' + c.lng + '" data-name="' + c.name + '">' +
            '<div class="amenity-row-left">' +
              '<div class="amenity-icon-box">☕</div>' +
              '<div class="amenity-text-box">' +
                '<div class="amenity-main-name">' + c.name + '</div>' +
                '<div class="amenity-sub-desc">' + subText + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="amenity-row-right">' +
              '<div class="amenity-dist-val">' + formatDist(c) + '</div>' +
              '<div class="amenity-walk-time">' + formatWalk(c) + '</div>' +
            '</div>' +
          '</div>';
      });
      html += '</div>';
    }

    // 3. Hospitals & Care
    var hosps = amenitiesData.hospitals || [];
    if (hosps.length > 0) {
      html += 
        '<div class="amenity-category-block">' +
          '<div class="amenity-cat-header hosp-header">' +
            '<span>🏥 NEAREST HOSPITALS & CARE</span>' +
            '<span>24X7 EMERGENCY</span>' +
          '</div>';

      hosps.slice(0, 3).forEach(function (h) {
        var subText = (h.type || 'Hospital') + ' · <span class="emergency-alert">' + (h.emergency || '24x7 Emergency') + '</span>';
        html += 
          '<div class="amenity-row-item" data-lat="' + h.lat + '" data-lng="' + h.lng + '" data-name="' + h.name + '">' +
            '<div class="amenity-row-left">' +
              '<div class="amenity-icon-box">🏥</div>' +
              '<div class="amenity-text-box">' +
                '<div class="amenity-main-name">' + h.name + '</div>' +
                '<div class="amenity-sub-desc">' + subText + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="amenity-row-right">' +
              '<div class="amenity-dist-val">' + formatDist(h) + '</div>' +
              '<div class="amenity-walk-time">' + formatWalk(h) + '</div>' +
            '</div>' +
          '</div>';
      });
      html += '</div>';
    }

    return html;
  }

  function renderCard() {
    var activeAmenities = currentTab === 'origin' ? origAmenities : destAmenities;
    container.innerHTML = 
      '<div class="amenities-panel-title">' +
        '📍 NEAREST TRANSIT, CAFES & HOSPITALS' +
      '</div>' +
      '<div class="amenities-tabs-nav">' +
        '<button type="button" class="amenities-tab-btn ' + (currentTab === 'origin' ? 'active' : '') + '" id="tab-near-orig">' +
          '<span class="tab-dot green"></span>' +
          'Near Origin (' + origShort + ')' +
        '</button>' +
        '<button type="button" class="amenities-tab-btn ' + (currentTab === 'dest' ? 'active' : '') + '" id="tab-near-dest">' +
          '<span class="tab-dot red"></span>' +
          'Near Dest (' + destShort + ')' +
        '</button>' +
      '</div>' +
      '<div class="amenities-content-area">' +
        generateRowsHtml(activeAmenities) +
      '</div>';

    // attach click event listeners to tabs
    var btnOrig = container.querySelector("#tab-near-orig");
    var btnDest = container.querySelector("#tab-near-dest");
    if (btnOrig) {
      btnOrig.addEventListener("click", function (e) {
        e.stopPropagation();
        if (currentTab !== 'origin') {
          currentTab = 'origin';
          renderCard();
        }
      });
    }
    if (btnDest) {
      btnDest.addEventListener("click", function (e) {
        e.stopPropagation();
        if (currentTab !== 'dest') {
          currentTab = 'dest';
          renderCard();
        }
      });
    }

    // click on any row to pan map to that amenity
    var rowItems = container.querySelectorAll(".amenity-row-item");
    rowItems.forEach(function (row) {
      row.addEventListener("click", function () {
        var lat = parseFloat(this.getAttribute("data-lat"));
        var lng = parseFloat(this.getAttribute("data-lng"));
        var name = this.getAttribute("data-name");
        if (state.map && !isNaN(lat) && !isNaN(lng)) {
          state.map.flyTo([lat, lng], 15, { duration: 1.2 });
          L.popup().setLatLng([lat, lng]).setContent('<strong>' + name + '</strong>').openOn(state.map);
        }
      });
    });
  }

  renderCard();
  return container;
}

// display journey option cards in the left sidebar
function renderJourneyOptions(options, originInfo, destInfo) {
  var listEl = document.getElementById("results-list");
  listEl.innerHTML = "";

  // 1. show nearby amenities banner at top of results matching student transit design
  var amenitiesCard = renderAmenitiesPanel(originInfo, destInfo);
  if (amenitiesCard) {
    listEl.appendChild(amenitiesCard);
  }

  // 2. build route cards for each journey option
  options.forEach(function (opt, idx) {
    var card = document.createElement("div");
    card.className = "route-card" + (idx === 0 ? " selected" : "");
    card.id = "card-" + opt.option_id;

    // delay badge
    var delayBadge = "";
    if (opt.traffic_delay_mins > 2) {
      delayBadge = '<span class="badge badge-delay">⏱️ +' + Math.round(opt.traffic_delay_mins) + 'm Traffic Delay</span>';
    } else {
      delayBadge = '<span class="badge badge-bus">🟢 Flowing Well</span>';
    }

    // transfers badge
    var xferBadge = "";
    if (opt.transfers_count > 0) {
      xferBadge = '<span class="badge badge-transfers">🔄 ' + opt.transfers_count + ' Transfer</span>';
    } else {
      xferBadge = '<span class="badge badge-bus">Direct Bus</span>';
    }

    // itinerary steps for this option
    var stepsHtml = "";
    opt.legs.forEach(function (leg) {
      var timeWindowPill = "";
      if (leg.time_window) {
        timeWindowPill = '<span class="step-clock-pill">' + leg.time_window + ' (' + Math.round(leg.duration_mins) + ' min)</span>';
      } else {
        timeWindowPill = '<span class="step-clock-pill">' + Math.round(leg.duration_mins) + ' min</span>';
      }

      if (leg.type === "connect" || leg.type === "walk") {
        stepsHtml += 
          '<div class="itinerary-step">' +
            '<div class="step-icon-col">' +
              '<div class="step-icon-bubble connect">📍</div>' +
              '<div class="step-line"></div>' +
            '</div>' +
            '<div class="step-content">' +
              '<div class="step-header-row">' +
                '<span class="step-title">' + leg.instruction + '</span>' +
                timeWindowPill +
              '</div>' +
              '<div class="step-meta">' + leg.distance_km + ' km to bus terminal/stop</div>' +
            '</div>' +
          '</div>';
      } else if (leg.type === "transit") {
        var stopsDetailId = "stops-" + opt.option_id + "-" + leg.route_id;
        var speedLimitHtml = "";
        if (leg.statutory_bus_speed_limit_kmh) {
          var okClass = leg.speed_limit_compliance === "Within Guideline Limit" ? "ok" : "warn";
          speedLimitHtml = 
            '<div class="leg-speed-guideline">' +
              '<span class="speed-guideline-badge">⚡ Guideline Max Bus Speed: <strong>' + leg.statutory_bus_speed_limit_kmh + ' km/h</strong></span>' +
              '<span class="speed-authority-text">(' + (leg.guideline_authority || 'Delhi Traffic Police Guidelines') + ')</span>' +
              '<span class="speed-status-text ' + okClass + '">✓ ' + (leg.speed_limit_compliance || 'Within Limit') + '</span>' +
            '</div>';
        }

        var stopsListHtml = "";
        if (leg.stops_list) {
          stopsListHtml = leg.stops_list.map(function (s) {
            return "<div>• " + s + "</div>";
          }).join("");
        }

        stepsHtml += 
          '<div class="itinerary-step">' +
            '<div class="step-icon-col">' +
              '<div class="step-icon-bubble bus">🚌</div>' +
              '<div class="step-line"></div>' +
            '</div>' +
            '<div class="step-content">' +
              '<div class="step-header-row">' +
                '<span class="step-title">' + leg.instruction + '</span>' +
                timeWindowPill +
              '</div>' +
              '<div class="step-meta">' +
                leg.distance_km + ' km' +
                (leg.avg_speed_kmh ? ' • Commercial speed ' + leg.avg_speed_kmh + ' km/h' : '') +
                (leg.traffic_delay_mins > 2 ? ' • <span style="color: var(--accent-danger); font-weight:600;">+' + Math.round(leg.traffic_delay_mins) + 'm traffic delay</span>' : '') +
              '</div>' +
              speedLimitHtml +
              '<button class="stops-toggle" onclick="toggleStopsList(\'' + stopsDetailId + '\')">' +
                '▼ ' + leg.stop_count + ' stops on route' +
              '</button>' +
              '<div class="stops-sublist" id="' + stopsDetailId + '" style="display: none;">' +
                stopsListHtml +
              '</div>' +
            '</div>' +
          '</div>';
      } else if (leg.type === "transfer") {
        stepsHtml += 
          '<div class="itinerary-step">' +
            '<div class="step-icon-col">' +
              '<div class="step-icon-bubble transfer">🔄</div>' +
              '<div class="step-line"></div>' +
            '</div>' +
            '<div class="step-content">' +
              '<div class="step-header-row">' +
                '<span class="step-title">' + leg.instruction + '</span>' +
                timeWindowPill +
              '</div>' +
              '<div class="step-meta">Platform transfer & connection buffer</div>' +
            '</div>' +
          '</div>';
      }
    });

    var formattedDur = opt.formatted_duration || (Math.round(opt.total_duration_mins) + " min");
    var depTime = opt.departure_clock_time || "09:00 AM";
    var arrTime = opt.arrival_clock_time || "10:30 AM";
    var googleUrl = opt.google_maps_url || "https://maps.google.com";

    card.innerHTML = 
      '<div class="journey-completion-hero">' +
        '<div class="completion-main">' +
          '<span class="completion-badge-label">TOTAL TIME TO COMPLETE JOURNEY</span>' +
          '<div class="completion-duration-text">' + formattedDur + '</div>' +
        '</div>' +
        '<div class="completion-clock-range">' +
          '<div class="clock-slot">' +
            '<span class="clock-slot-label">DEPARTS</span>' +
            '<span class="clock-slot-time">' + depTime + '</span>' +
          '</div>' +
          '<span class="clock-slot-arrow">➔</span>' +
          '<div class="clock-slot highlight">' +
            '<span class="clock-slot-label">ESTIMATED ARRIVAL</span>' +
            '<span class="clock-slot-time">' + arrTime + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="route-card-header">' +
        '<div class="route-line-summary">' +
          '<span class="route-line-name">' + opt.summary_route + '</span>' +
        '</div>' +
        '<div class="route-badges">' +
          xferBadge +
          delayBadge +
          '<span class="badge badge-crowd">👥 ' + opt.crowd_level + ' Crowd</span>' +
        '</div>' +
      '</div>' +

      '<div class="gmaps-comparison-pill">' +
        '<div>' +
          '<span>Google Maps Transit: <strong>' + Math.round(opt.google_maps_comparison.google_maps_time_mins) + ' min</strong></span>' +
          '<span style="margin-left: 6px; color: var(--text-muted);">(Δ ' + opt.google_maps_comparison.difference_mins + 'm)</span>' +
        '</div>' +
        '<span class="pill-match">' + opt.google_maps_comparison.accuracy_match_pct + '% Match</span>' +
      '</div>' +

      '<div class="gmaps-action-bar">' +
        '<a href="' + googleUrl + '" target="_blank" class="btn-gmaps-connect" onclick="event.stopPropagation()">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">' +
            '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>' +
          '</svg>' +
          'Open & Track Route in Google Maps ↗' +
        '</a>' +
      '</div>' +

      '<div class="itinerary-steps">' +
        stepsHtml +
      '</div>';

    // click event on the route card to highlight route on map
    card.addEventListener("click", function () {
      document.querySelectorAll(".route-card").forEach(function (c) {
        c.classList.remove("selected");
      });
      card.classList.add("selected");
      selectJourneyOption(opt);
    });

    listEl.appendChild(card);
  });
}

// toggle button to show or hide the list of intermediate stops
window.toggleStopsList = function (id) {
  var el = document.getElementById(id);
  if (el) {
    if (el.style.display === "none") {
      el.style.display = "flex";
    } else {
      el.style.display = "none";
    }
  }
};

// draw the selected route on the leaflet map
function selectJourneyOption(opt) {
  state.selectedOption = opt;
  state.activeRouteLayer.clearLayers();

  if (!opt.path_coordinates || opt.path_coordinates.length < 2) {
    return;
  }

  var latLngs = opt.path_coordinates.map(function (p) {
    return [p[0], p[1]];
  });

  // glow effect behind route line
  var glowLine = L.polyline(latLngs, {
    color: "#2563eb",
    weight: 8,
    opacity: 0.35,
    lineCap: "round",
    lineJoin: "round"
  });

  // main dark blue route line
  var mainLine = L.polyline(latLngs, {
    color: "#1d4ed8",
    weight: 5,
    opacity: 0.95,
    lineCap: "round",
    lineJoin: "round"
  });

  state.activeRouteLayer.addLayer(glowLine);
  state.activeRouteLayer.addLayer(mainLine);

  // green start pin and red destination pin
  var startCoord = latLngs[0];
  var endCoord = latLngs[latLngs.length - 1];

  var startPin = L.circleMarker(startCoord, {
    radius: 9,
    fillColor: "#10b981",
    color: "#ffffff",
    weight: 2.5,
    fillOpacity: 1
  }).bindTooltip("<strong>Origin</strong>");

  var endPin = L.circleMarker(endCoord, {
    radius: 9,
    fillColor: "#ef4444",
    color: "#ffffff",
    weight: 2.5,
    fillOpacity: 1
  }).bindTooltip("<strong>Destination</strong>");

  state.activeRouteLayer.addLayer(startPin);
  state.activeRouteLayer.addLayer(endPin);

  // fit map viewport to the route line
  state.map.fitBounds(mainLine.getBounds(), { padding: [60, 60], maxZoom: 14 });
}

// open benchmark dialog modal & run fresh live endpoint diagnostics
async function openBenchmarkModal() {
  var modal = document.getElementById("modal-benchmark");
  if (modal) {
    modal.style.display = "flex";
  }

  await runLiveApiDiagnostics(true);
}

function closeBenchmarkModal() {
  var modal = document.getElementById("modal-benchmark");
  if (modal) {
    modal.style.display = "none";
  }
}

// helper to time and verify one API endpoint
async function probeSingleApi(label, roleText, url, methodName, bodyPayload, verifyFn) {
  var t0 = performance.now();
  try {
    var fetchOpts = { method: methodName || "GET" };
    if (bodyPayload) {
      fetchOpts.headers = { "Content-Type": "application/json" };
      fetchOpts.body = JSON.stringify(bodyPayload);
    }
    var res = await fetch(url, fetchOpts);
    var jsonData = await res.json();
    var elapsedMs = Math.max(1, Math.round(performance.now() - t0));
    var detailMsg = verifyFn(jsonData);
    var effLabel = "Optimal";
    var effClass = "optimal";
    if (elapsedMs <= 25) {
      effLabel = "Ultra Fast";
      effClass = "fast";
    } else if (elapsedMs > 250) {
      effLabel = "High Latency";
      effClass = "slow";
    }
    return {
      label: label,
      roleText: roleText,
      ok: res.ok,
      statusCode: res.status,
      ms: elapsedMs,
      detail: detailMsg,
      effLabel: effLabel,
      effClass: effClass,
      data: jsonData
    };
  } catch (err) {
    var failMs = Math.max(1, Math.round(performance.now() - t0));
    return {
      label: label,
      roleText: roleText,
      ok: false,
      statusCode: 0,
      ms: failMs,
      detail: "Request failed: " + err.message,
      effLabel: "Error",
      effClass: "slow",
      data: null
    };
  }
}

// run live probes across all internal APIs + OSRM cache + benchmark accuracy
async function runLiveApiDiagnostics(updateModalTable) {
  console.log("Running live API perfection & benchmark checks...");

  var statusBadgeEl = document.getElementById("bm-live-check-status");
  if (updateModalTable && statusBadgeEl) {
    statusBadgeEl.className = "bench-live-badge running";
    statusBadgeEl.innerText = "Running live HTTP probes...";
  }

  var probes = [
    probeSingleApi(
      "GET /api/health",
      "System Readiness & Cache Probe",
      "/api/health",
      "GET",
      null,
      function (d) {
        return d.stops_loaded + " stops, " + d.routes_loaded + " routes, " + d.osrm_cache_files + " cached OSRM files";
      }
    ),
    probeSingleApi(
      "GET /api/directions",
      "Bus Routing + OSRM Road Geometry",
      "/api/directions?origin=Kashmere%20Gate%20ISBT&destination=Nehru%20Place%20Bus%20Terminal&departure_time=09:00",
      "GET",
      null,
      function (d) {
        var firstPts = (d.options && d.options[0] && d.options[0].path_coordinates) ? d.options[0].path_coordinates.length : 0;
        return d.options_count + " route options • " + firstPts + " OSRM street coords";
      }
    ),
    probeSingleApi(
      "POST /api/directions",
      "JSON Body Route Planner",
      "/api/directions",
      "POST",
      { origin: "Connaught Place (Rajiv Chowk)", destination: "Dwarka Mor", departure_time: "now" },
      function (d) {
        var firstPts = (d.options && d.options[0] && d.options[0].path_coordinates) ? d.options[0].path_coordinates.length : 0;
        return d.options_count + " options • " + firstPts + " road points";
      }
    ),
    probeSingleApi(
      "GET /api/traffic?hour=9",
      "12-Corridor Peak Traffic Model",
      "/api/traffic?hour=9",
      "GET",
      null,
      function (d) {
        return d.corridors.length + " corridors • Avg " + d.citywide_average_bus_speed_kmh + " km/h (" + d.overall_status + ")";
      }
    ),
    probeSingleApi(
      "GET /api/vehicles?limit=300",
      "Live DTC Bus Fleet Telemetry",
      "/api/vehicles?limit=300",
      "GET",
      null,
      function (d) {
        return d.count + " live bus GPS coordinates active";
      }
    ),
    probeSingleApi(
      "GET /api/stops",
      "Confirmed Bus Stops & Hubs",
      "/api/stops",
      "GET",
      null,
      function (d) {
        return d.count + " transit hubs & passenger stops indexed";
      }
    ),
    probeSingleApi(
      "GET /api/routes",
      "Directional DTC Route Master",
      "/api/routes",
      "GET",
      null,
      function (d) {
        return d.count + " directional routes loaded";
      }
    ),
    probeSingleApi(
      "GET /api/amenities",
      "Haversine Nearby POI Finder",
      "/api/amenities",
      "GET",
      null,
      function (d) {
        var total = (d.metro_stations || []).length + (d.hospitals || []).length + (d.police_stations || []).length + (d.cafes || []).length;
        return total + " POIs (" + (d.metro_stations || []).length + " Metro, " + (d.hospitals || []).length + " Hosp, " + (d.cafes || []).length + " Cafes)";
      }
    ),
    probeSingleApi(
      "GET /api/speed-limits",
      "Delhi Traffic Police Gazette Limits",
      "/api/speed-limits",
      "GET",
      null,
      function (d) {
        var cnt = d.corridors ? Object.keys(d.corridors).length : 0;
        return cnt + " statutory corridor rules loaded";
      }
    ),
    probeSingleApi(
      "GET /api/benchmark",
      "Google Maps 10-Pair Accuracy Suite",
      "/api/benchmark",
      "GET",
      null,
      function (d) {
        return d.benchmark_pairs_tested + " pairs • " + d.overall_model_accuracy_score + "% accuracy (" + d.solver_execution_ms + "ms solver)";
      }
    )
  ];

  var results = await Promise.all(probes);

  var passed = 0;
  var totalMs = 0;
  var minMs = 999999;
  var maxMs = 0;
  var healthData = null;
  var benchData = null;
  var roadPtsSample = 0;

  results.forEach(function (r, idx) {
    if (r.ok) passed += 1;
    totalMs += r.ms;
    if (r.ms < minMs) minMs = r.ms;
    if (r.ms > maxMs) maxMs = r.ms;

    if (idx === 0 && r.data) healthData = r.data;
    if (idx === 1 && r.data && r.data.options && r.data.options[0] && r.data.options[0].path_coordinates) {
      roadPtsSample = r.data.options[0].path_coordinates.length;
    }
    if (idx === 9 && r.data) benchData = r.data;
  });

  var healthPct = Math.round((passed / results.length) * 100);
  var avgMs = Math.max(1, Math.round(totalMs / results.length));

  // Update top heading bar live indicators
  var headerApiEl = document.getElementById("stat-api-perfection");
  var headerApiBadge = document.getElementById("badge-api-health");
  if (headerApiEl) {
    if (passed === results.length) {
      headerApiEl.innerText = healthPct + "% Optimal (" + avgMs + "ms)";
      if (headerApiBadge) headerApiBadge.classList.remove("warn");
    } else {
      headerApiEl.innerText = passed + "/" + results.length + " Active (" + healthPct + "%)";
      if (headerApiBadge) headerApiBadge.classList.add("warn");
    }
  }

  var headerBmPill = document.getElementById("header-bm-pill");
  if (headerBmPill && benchData) {
    headerBmPill.innerText = benchData.overall_model_accuracy_score + "%";
  }

  if (benchData) {
    state.benchmarkData = benchData;
    populateBenchmarkModal(benchData);
  }

  if (!updateModalTable) {
    return;
  }

  // Update modal Section 1 diagnostic KPI cards
  var pctEl = document.getElementById("bm-api-health-pct");
  var passSubEl = document.getElementById("bm-api-pass-sub");
  var avgLatEl = document.getElementById("bm-avg-latency");
  var latSubEl = document.getElementById("bm-latency-sub");
  var cacheEl = document.getElementById("bm-osrm-cache");
  var cacheSubEl = document.getElementById("bm-osrm-sub");
  var solverEl = document.getElementById("bm-solver-speed");
  var covEl = document.getElementById("bm-system-coverage");

  if (pctEl) pctEl.innerText = healthPct + "%";
  if (passSubEl) passSubEl.innerText = passed + " / " + results.length + " Endpoints Working (HTTP 200)";
  if (avgLatEl) avgLatEl.innerText = avgMs + " ms";
  if (latSubEl) latSubEl.innerText = "Min " + minMs + "ms • Max " + maxMs + "ms";

  if (healthData) {
    if (cacheEl) cacheEl.innerText = (healthData.osrm_cache_files || 0) + " Files";
    if (cacheSubEl) cacheSubEl.innerText = (healthData.osrm_cache_size_kb || 0) + " KB on disk • " + roadPtsSample + " street coords";
    if (covEl) covEl.innerText = healthData.stops_loaded + " Stops • " + healthData.routes_loaded + " Routes • " + healthData.amenities_loaded + " POIs";
  }

  if (benchData && solverEl) {
    solverEl.innerText = (benchData.solver_execution_ms || avgMs) + " ms";
  }

  if (statusBadgeEl) {
    statusBadgeEl.className = "bench-live-badge";
    statusBadgeEl.innerText = passed + "/" + results.length + " APIs Verified Live (" + avgMs + "ms avg)";
  }

  // Fill Live API Diagnostic rows
  var diagBody = document.getElementById("api-health-table-body");
  if (diagBody) {
    diagBody.innerHTML = "";
    results.forEach(function (r) {
      var tr = document.createElement("tr");
      var statusBadge = r.ok
        ? '<span class="api-status-pill ok">✓ ' + r.statusCode + ' OK</span>'
        : '<span class="api-status-pill fail">✗ FAIL</span>';
      var effBadge = '<span class="api-eff-pill ' + r.effClass + '">' + r.effLabel + '</span>';

      tr.innerHTML =
        '<td><span class="api-ep-code">' + r.label + '</span></td>' +
        '<td>' + r.roleText + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td><strong>' + r.ms + ' ms</strong></td>' +
        '<td>' + effBadge + '</td>' +
        '<td style="color: #475569;">' + r.detail + '</td>';
      diagBody.appendChild(tr);
    });

    // Add row showing Leaflet Google Maps tile layers & OSRM status
    var extTr = document.createElement("tr");
    var osrmActive = roadPtsSample > 20;
    extTr.innerHTML =
      '<td><span class="api-ep-code">EXTERNAL: OSRM + Cache</span></td>' +
      '<td>Street-Following Road Geometry</td>' +
      '<td>' + (osrmActive ? '<span class="api-status-pill ok">✓ ACTIVE</span>' : '<span class="api-status-pill fail">FALLBACK</span>') + '</td>' +
      '<td><strong>0ms cache</strong></td>' +
      '<td><span class="api-eff-pill fast">Disk Cached</span></td>' +
      '<td style="color: #475569;">' + roadPtsSample + ' road points active • ' + (healthData ? healthData.osrm_cache_files : 0) + ' cached JSON routes</td>';
    diagBody.appendChild(extTr);
  }
}

// fill the benchmark table with accuracy numbers
function populateBenchmarkModal(bm) {
  document.getElementById("bm-overall-accuracy").innerText = bm.overall_model_accuracy_score + "%";
  document.getElementById("bm-r2").innerText = bm.correlation_with_google_maps_r2;
  document.getElementById("bm-peak-error").innerText = bm.mean_absolute_percentage_error_peak + "%";
  document.getElementById("bm-offpeak-error").innerText = bm.mean_absolute_percentage_error_off_peak + "%";

  var tbody = document.getElementById("benchmark-table-body");
  tbody.innerHTML = "";

  bm.sample_pairs.forEach(function (p) {
    var tr = document.createElement("tr");
    tr.innerHTML = 
      "<td><strong>" + p.origin + "</strong><br><span style='color: #64748b;'>➔ " + p.destination + "</span></td>" +
      "<td>" + p.corridor + "</td>" +
      "<td>" + p.distance_km + " km</td>" +
      "<td><strong>" + p.peak_0900.model_estimated_mins + "m</strong></td>" +
      "<td>" + p.peak_0900.google_maps_mins + "m</td>" +
      "<td><span class='accuracy-badge-high'>" + p.peak_0900.accuracy_pct + "%</span></td>" +
      "<td><strong>" + p.off_peak_1400.model_estimated_mins + "m</strong></td>" +
      "<td>" + p.off_peak_1400.google_maps_mins + "m</td>" +
      "<td><span class='accuracy-badge-high'>" + p.off_peak_1400.accuracy_pct + "%</span></td>";
    tbody.appendChild(tr);
  });
}

// open split view comparison modal with Google Maps
function openGmapsCompareModal() {
  var modal = document.getElementById("modal-gmaps-compare");
  if (!modal) return;
  modal.style.display = "flex";

  var origInput = document.getElementById("input-origin").value || "Kashmere Gate ISBT, Delhi";
  var destInput = document.getElementById("input-dest").value || "Nehru Place Bus Terminal, Delhi";

  document.getElementById("split-route-title").innerText = origInput + " ➔ " + destInput;

  if (state.selectedOption) {
    var opt = state.selectedOption;
    document.getElementById("split-model-time").innerText = opt.formatted_duration || (Math.round(opt.total_duration_mins) + " min");
    document.getElementById("split-dep-time").innerText = opt.departure_clock_time || "09:00 AM";
    document.getElementById("split-arr-time").innerText = opt.arrival_clock_time || "10:30 AM";
    document.getElementById("split-traffic-delay").innerText = "+" + Math.round(opt.traffic_delay_mins || 0) + " min";
    document.getElementById("split-match-score").innerText = opt.google_maps_comparison.accuracy_match_pct + "% Accuracy (Δ " + opt.google_maps_comparison.difference_mins + "m)";

    // find first transit bus leg for corridor speed limit
    var transitLeg = null;
    for (var i = 0; i < opt.legs.length; i++) {
      if (opt.legs[i].type === "transit") {
        transitLeg = opt.legs[i];
        break;
      }
    }

    if (transitLeg) {
      document.getElementById("split-corridor-name").innerText = transitLeg.corridor_name || "Delhi Transit Corridor";
      document.getElementById("split-guideline-info").innerText = 
        "Max " + (transitLeg.statutory_bus_speed_limit_kmh || 40) + " km/h for Buses (" + (transitLeg.guideline_authority || 'Delhi Traffic Police') + ")";
    }

    if (opt.google_maps_url) {
      document.getElementById("btn-open-gmaps-direct").href = opt.google_maps_url;
    }

    var previewHtml = "";
    opt.legs.forEach(function (l) {
      var icon = l.type === "transit" ? "🚌" : "🚶";
      var timeText = l.time_window || (Math.round(l.duration_mins) + "m");
      previewHtml += 
        '<div style="margin-bottom: 4px; font-size: 0.76rem; color: #334155;">' +
          icon + ' <strong>' + l.instruction + '</strong>' +
          '<span style="color:#64748b;"> (' + timeText + ')</span>' +
        '</div>';
    });
    document.getElementById("split-itinerary-preview").innerHTML = previewHtml;
  }

  // embed Google Maps live directions iframe
  var iframe = document.getElementById("gmaps-preview-iframe");
  if (iframe) {
    var cleanOrig = encodeURIComponent(origInput + " Delhi");
    var cleanDest = encodeURIComponent(destInput + " Delhi");
    iframe.src = "https://maps.google.com/maps?q=" + cleanOrig + "+to+" + cleanDest + "&output=embed";
  }
}

function closeGmapsCompareModal() {
  var modal = document.getElementById("modal-gmaps-compare");
  if (modal) {
    modal.style.display = "none";
  }
}
