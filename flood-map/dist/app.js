function daysAgo(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function formatReportDate(value) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const reports = [
  {
    id: 1,
    title: "Blocked drain",
    severity: "Low impact",
    location: "Elizabeth Street near Queen Victoria Market",
    lat: -37.8087,
    lng: 144.9607,
    createdAt: daysAgo(5),
    date: formatReportDate(daysAgo(5)),
    rainfall: {
      amountMm: 22,
      averageMm: 4.1,
      comparison: "17.9 mm above the recent daily average",
      source: "Sample weather data",
    },
    notes: "Leaves blocked the corner drain and water spread into the bicycle lane.",
    depth: "Below typical kerb (<150 mm)",
    isNew: false,
    photoUrl: null,
    updates: [],
  },
  {
    id: 2,
    title: "Water pooling",
    severity: "Moderate impact",
    location: "Elizabeth Street, Melbourne",
    lat: -37.8139,
    lng: 144.9622,
    createdAt: daysAgo(20),
    date: formatReportDate(daysAgo(20)),
    rainfall: {
      amountMm: 38,
      averageMm: 5.3,
      comparison: "32.7 mm above the recent daily average",
      source: "Sample weather data",
    },
    notes: "Water pooled along the kerb after heavy rain. The drain cleared slowly.",
    depth: "At or above typical kerb (≥150 mm)",
    isNew: false,
    photoUrl: null,
    updates: [
      {
        text: "Water had receded by the next inspection and the footpath was clear.",
        createdAt: daysAgo(19),
      },
    ],
  },
  {
    id: 3,
    title: "Road flooding",
    severity: "High impact",
    location: "Flinders Lane near Swanston Street",
    lat: -37.8172,
    lng: 144.9653,
    createdAt: daysAgo(240),
    date: formatReportDate(daysAgo(240)),
    rainfall: {
      amountMm: 44,
      averageMm: 4.8,
      comparison: "39.2 mm above the recent daily average",
      source: "Sample weather data",
    },
    notes: "One traffic lane was covered and vehicles slowed to pass the intersection.",
    depth: "At or above typical kerb (≥150 mm)",
    isNew: false,
    photoUrl: null,
    updates: [],
  },
];

// Indicative tracing of the boundary shown in the City of Melbourne's 2015
// Elizabeth Street Catchment plan. The UI labels this as a concept boundary.
const elizabethCatchmentBoundary = [
  [-37.7913, 144.9567],
  [-37.7909, 144.9652],
  [-37.7926, 144.9693],
  [-37.7963, 144.9701],
  [-37.8004, 144.9696],
  [-37.8052, 144.9691],
  [-37.8101, 144.9687],
  [-37.8147, 144.9685],
  [-37.8184, 144.9687],
  [-37.8213, 144.9665],
  [-37.8215, 144.9628],
  [-37.8197, 144.9596],
  [-37.8157, 144.9575],
  [-37.8112, 144.9562],
  [-37.8064, 144.9555],
  [-37.8018, 144.9542],
  [-37.7974, 144.9533],
  [-37.7935, 144.9539],
];

const catchmentBounds = L.latLngBounds(elizabethCatchmentBoundary);
const searchBounds = {
  west: catchmentBounds.getWest(),
  south: catchmentBounds.getSouth(),
  east: catchmentBounds.getEast(),
  north: catchmentBounds.getNorth(),
};

const maxPhotoBytes = 5 * 1024 * 1024;
const allowedPhotoTypes = ["image/jpeg", "image/png", "image/webp"];
const updateStorageKey = "melbourneFloodMapUpdatesV2";
const surveyStorageKey = "melbourneFloodMapSurveyV2";
const surveySkippedKey = "melbourneFloodMapSurveySkippedThisSessionV2";
const wsudPreferenceStorageKey = "melbourneFloodMapWsudPreferencesV1";
const wsudDatasetUrl = "https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/laneways-with-greening-potential/exports/geojson?lang=en&timezone=Australia%2FMelbourne";
const surveyLaunchAt = new Date("2026-10-10T00:00:00+11:00");
const surveyEndAt = new Date("2026-11-10T23:59:59+11:00");
const observationTypes = [
  "Water pooling",
  "Blocked drain",
  "Road flooding",
  "Footpath flooding",
  "Building entrance flooding",
  "Car park flooding",
  "Underpass flooding",
  "Stormwater overflow",
  "Creek or river overflow",
  "Debris blocking water flow",
  "Traffic disruption",
  "Other flood impact",
];
const observationSeverities = ["Low impact", "Moderate impact", "High impact"];
const observationDepths = [
  "Below typical kerb (<150 mm)",
  "At or above typical kerb (≥150 mm)",
  "Unable to tell",
];

const eastWestCbdStreets = [
  "College Crescent",
  "Grattan Street",
  "Pelham Street",
  "Victoria Street",
  "Franklin Street",
  "A'Beckett Street",
  "La Trobe Street",
  "Little Lonsdale Street",
  "Lonsdale Street",
  "Little Bourke Street",
  "Bourke Street",
  "Little Collins Street",
  "Collins Street",
  "Flinders Lane",
  "Flinders Street",
];

const northSouthCbdStreets = [
  "William Street",
  "Queen Street",
  "Elizabeth Street",
  "Swanston Street",
  "Russell Street",
  "Bouverie Street",
  "Leicester Street",
  "Cardigan Street",
];

const additionalCbdStreets = [
  "Hardware Lane",
  "Market Street",
  "McKillop Street",
  "Degraves Street",
  "Royal Parade",
];

const cbdLocationChoices = [
  ...[...eastWestCbdStreets, ...northSouthCbdStreets, ...additionalCbdStreets].map((label) => ({
    id: `street:${label}`,
    label,
    query: label,
    group: "Streets and lanes",
  })),
  ...eastWestCbdStreets.flatMap((eastWestStreet) =>
    northSouthCbdStreets.map((northSouthStreet) => ({
      id: `intersection:${eastWestStreet}|${northSouthStreet}`,
      label: `${eastWestStreet} & ${northSouthStreet}`,
      query: `${eastWestStreet} ${northSouthStreet}`,
      group: "Intersections",
    })),
  ),
];

function pointInPolygon(lat, lng, polygon = elizabethCatchmentBoundary) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function isInsideCatchment(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && pointInPolygon(lat, lng);
}

function readStoredUpdates() {
  try {
    return JSON.parse(localStorage.getItem(updateStorageKey) || "{}") || {};
  } catch (_error) {
    return {};
  }
}

const storedUpdates = readStoredUpdates();
reports.forEach((report) => {
  const saved = Array.isArray(storedUpdates[report.id]) ? storedUpdates[report.id] : [];
  report.updates = [...(report.updates || []), ...saved];
});

function persistReportUpdates(report) {
  if (!report) return;
  const persisted = readStoredUpdates();
  persisted[report.id] = (report.updates || [])
    .filter((update) => update.persisted)
    .map(({ text, createdAt }) => ({ text, createdAt, persisted: true }));
  try {
    localStorage.setItem(updateStorageKey, JSON.stringify(persisted));
  } catch (_error) {
    // The update remains available for the current page session.
  }
}

const map = L.map("map", {
  zoomControl: true,
  minZoom: 13,
  maxZoom: 19,
  maxBounds: catchmentBounds.pad(0.45),
  maxBoundsViscosity: 0.8,
});

map.fitBounds(catchmentBounds, { padding: [22, 22] });

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const worldRing = [[-90, -180], [-90, 180], [90, 180], [90, -180]];

L.polygon([worldRing, elizabethCatchmentBoundary], {
  stroke: false,
  fillColor: "#53616e",
  fillOpacity: 0.48,
  fillRule: "evenodd",
  interactive: false,
}).addTo(map);

L.polygon(elizabethCatchmentBoundary, {
  color: "#046f83",
  weight: 3,
  opacity: 0.9,
  dashArray: "8 7",
  fillColor: "#bfeef0",
  fillOpacity: 0.06,
  interactive: false,
}).addTo(map);

const markerLayer = typeof L.markerClusterGroup === "function"
  ? L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 54,
      iconCreateFunction(cluster) {
        return L.divIcon({
          className: "report-cluster",
          html: `<span>${cluster.getChildCount()}</span>`,
          iconSize: [44, 44],
        });
      },
    }).addTo(map)
  : L.layerGroup().addTo(map);
const heatLayer = L.layerGroup().addTo(map);
const wsudLayer = L.layerGroup();
let selectedLocationMarker = null;
let lastSelectedLocation = null;
let wsudFeatures = [];
let wsudLoadPromise = null;

function severityClass(severity) {
  const value = String(severity || "").toLowerCase();
  if (value.includes("high")) return "high";
  if (value.includes("low")) return "low";
  return "moderate";
}

const markerIcon = (number, severity) =>
  L.divIcon({
    className: "incident-marker",
    html: `<div class="incident-pin severity-${severityClass(severity)}"><span>${number}</span></div>`,
    iconSize: [42, 48],
    iconAnchor: [21, 45],
  });

const mapPickIcon = L.divIcon({
  className: "map-pick-marker",
  html: "<span>+</span>",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function setSelectedLocation(lat, lng) {
  lastSelectedLocation = { lat, lng };
  if (!selectedLocationMarker) {
    selectedLocationMarker = L.marker([lat, lng], {
      icon: mapPickIcon,
      keyboard: false,
      interactive: false,
    }).addTo(map);
  } else {
    selectedLocationMarker.setLatLng([lat, lng]);
  }
}

function drawHotspots(visible = true, visibleReports = reports) {
  heatLayer.clearLayers();
  if (!visible) return;

  const rings = visibleReports.map((report) => ({
    lat: report.lat,
    lng: report.lng,
    radius: severityClass(report.severity) === "high" ? 245 : severityClass(report.severity) === "low" ? 155 : 205,
    severity: severityClass(report.severity),
  }));

  rings.forEach(({ lat, lng, radius, severity }) => {
    const fillColor = severity === "high" ? "#ef554c" : severity === "low" ? "#f3c84b" : "#f28b32";
    L.circle([lat, lng], {
      radius,
      stroke: false,
      fillColor,
      fillOpacity: severity === "high" ? 0.22 : 0.18,
      interactive: false,
    }).addTo(heatLayer);
    L.circle([lat, lng], {
      radius: radius * 0.58,
      stroke: false,
      fillColor,
      fillOpacity: 0.24,
      interactive: false,
    }).addTo(heatLayer);
  });
}

function addMarker(report) {
  const marker = L.marker([report.lat, report.lng], {
    icon: markerIcon(report.id, report.severity),
    keyboard: true,
    title: `${report.id}. ${report.title}`,
  });
  marker.on("click", () => selectReport(report.id, true));
  markerLayer.addLayer(marker);
  report.marker = marker;
}

reports.forEach(addMarker);
drawHotspots(true);

const ui = {
  areaTitle: document.querySelector("#area-title"),
  areaName: document.querySelector("#area-name"),
  reportNumber: document.querySelector("#report-number"),
  severity: document.querySelector("#report-severity"),
  title: document.querySelector("#report-title"),
  meta: document.querySelector("#report-meta"),
  rainfall: document.querySelector("#rainfall-value"),
  rainfallLabel: document.querySelector("#rainfall-label"),
  rainfallComparison: document.querySelector("#rainfall-comparison"),
  rainfallSource: document.querySelector("#rainfall-source"),
  reportCoordinates: document.querySelector("#report-coordinates"),
  copy: document.querySelector("#report-copy"),
  depth: document.querySelector("#report-depth"),
  summary: document.querySelector("#map-summary-text"),
  periodSelect: document.querySelector("#period-select"),
  periodControl: document.querySelector("#period-control"),
  legend: document.querySelector("#legend"),
  wsudLegend: document.querySelector("#wsud-legend"),
  wsudDataStatus: document.querySelector("#wsud-data-status"),
  legendToggle: document.querySelector("#legend-toggle"),
  legendToggleLabel: document.querySelector("#legend-toggle-label"),
  mapInstructionText: document.querySelector("#map-instruction-text"),
  evidence: document.querySelector("#evidence-details"),
  evidenceButton: document.querySelector("#evidence-button"),
  evidenceVisual: document.querySelector("#evidence-visual"),
  evidenceTagText: document.querySelector("#evidence-tag-text"),
  reportPhoto: document.querySelector("#report-photo"),
  reportPhotoImage: document.querySelector("#report-photo-image"),
  updateList: document.querySelector("#update-list"),
  updateCount: document.querySelector("#update-count"),
  emptyUpdates: document.querySelector("#empty-updates"),
  toast: document.querySelector("#toast"),
  searchForm: document.querySelector("#search-form"),
  searchInput: document.querySelector("#location-search"),
  searchResults: document.querySelector("#search-results"),
  searchStatus: document.querySelector("#search-status"),
  searchButton: document.querySelector("#search-form button[type='submit']"),
  dialog: document.querySelector("#report-dialog"),
  form: document.querySelector("#observation-form"),
  observationType: document.querySelector("#observation-type"),
  observationSeverity: document.querySelector("#observation-severity"),
  observationDepth: document.querySelector("#observation-depth"),
  observationLocation: document.querySelector("#observation-location"),
  observationLocationChoice: document.querySelector("#observation-location-choice"),
  reportLocationSearch: document.querySelector("#report-location-search"),
  reportLocationHelp: document.querySelector("#report-location-help"),
  observationLat: document.querySelector("#observation-lat"),
  observationLng: document.querySelector("#observation-lng"),
  coordinateReadout: document.querySelector("#coordinate-readout"),
  observationNotes: document.querySelector("#observation-notes"),
  closeReportDialog: document.querySelector("#close-report-dialog"),
  cancelReport: document.querySelector("#cancel-report"),
  submitReport: document.querySelector("#submit-report"),
  rainfallFormHelp: document.querySelector("#rainfall-form-help"),
  photoInput: document.querySelector("#observation-photo"),
  photoError: document.querySelector("#photo-error"),
  photoPreview: document.querySelector("#photo-preview"),
  photoPreviewImage: document.querySelector("#photo-preview-image"),
  updateDialog: document.querySelector("#update-dialog"),
  updateForm: document.querySelector("#update-form"),
  updateReportContext: document.querySelector("#update-report-context"),
  updateNotes: document.querySelector("#update-notes"),
  surveyDialog: document.querySelector("#survey-dialog"),
  surveyForm: document.querySelector("#survey-form"),
  surveyComment: document.querySelector("#survey-comment"),
  floodReportPanel: document.querySelector("#flood-report-panel"),
  solutionsPanel: document.querySelector("#solutions-panel"),
  solutionList: document.querySelector("#solution-list"),
  solutionZoneLabel: document.querySelector("#solution-zone-label"),
  solutionCharacteristics: document.querySelector("#solution-characteristics"),
  nearbyDataNote: document.querySelector("#nearby-data-note"),
  solutionPreferenceForm: document.querySelector("#solution-preference-form"),
  solutionPreferenceStatus: document.querySelector("#solution-preference-status"),
  solutionOtherField: document.querySelector("#solution-other-field"),
  solutionOtherText: document.querySelector("#solution-other-text"),
};

let selectedReportId = 2;
let currentView = "hotspots";
let currentPeriod = ui.periodSelect.value || "1y";
let toastTimer;
let pendingPhotoUrl = null;
let locationRequestId = 0;
let reportLocationRequestId = 0;
let pinnedReportLocation = null;
let lastNominatimRequestAt = 0;
let nominatimQueue = Promise.resolve();
let selectedSolutionLocation = {
  lat: reports[1].lat,
  lng: reports[1].lng,
  label: reports[1].location,
};
let solutionPreferenceDirty = false;

const mobileLegendQuery = window.matchMedia("(max-width: 620px)");

function setLegendExpanded(expanded) {
  ui.legend.classList.toggle("is-collapsed", !expanded);
  ui.legendToggle.setAttribute("aria-expanded", String(expanded));
  ui.legendToggleLabel.textContent = expanded ? "Hide key" : "Show key";
}

setLegendExpanded(!mobileLegendQuery.matches);

ui.legendToggle.addEventListener("click", () => {
  setLegendExpanded(ui.legend.classList.contains("is-collapsed"));
});

const syncLegendForViewport = (event) => setLegendExpanded(!event.matches);
if (typeof mobileLegendQuery.addEventListener === "function") {
  mobileLegendQuery.addEventListener("change", syncLegendForViewport);
} else {
  mobileLegendQuery.addListener(syncLegendForViewport);
}

if (typeof ResizeObserver === "function") {
  const mapResizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
  mapResizeObserver.observe(document.querySelector("#map"));
}

const wsudProfiles = {
  upstream: {
    label: "Upstream catchment",
    characteristics: "More opportunities to intercept runoff near its source, with some wider verges and planting interfaces.",
    order: ["rain-garden", "tree-pit", "permeable-pavement"],
    reasons: {
      "rain-garden": "Recommended first where wider planting space can slow and filter runoff.",
      "tree-pit": "A distributed option for kerbside capture and added tree canopy.",
      "permeable-pavement": "Useful on suitable paved areas after checking soil and underground services.",
    },
  },
  central: {
    label: "Central catchment",
    characteristics: "Dense mixed-use streets and laneways create tighter surface-space and access constraints.",
    order: ["tree-pit", "permeable-pavement", "rain-garden"],
    reasons: {
      "tree-pit": "Recommended first as a compact kerbside intervention where space permits.",
      "permeable-pavement": "Can use existing paved areas, subject to loading, soil and service checks.",
      "rain-garden": "Still valuable where a larger verge, median or corner space can be found.",
    },
  },
  downstream: {
    label: "Downstream catchment",
    characteristics: "Highly paved streets near the catchment outlet favour distributed treatments with a smaller surface footprint.",
    order: ["permeable-pavement", "tree-pit", "rain-garden"],
    reasons: {
      "permeable-pavement": "Recommended first for dense paved areas where planting space is limited.",
      "tree-pit": "Can capture local runoff while adding shade along suitable kerb alignments.",
      "rain-garden": "Best reserved for sites with enough footprint and safe overflow routing.",
    },
  },
};

function catchmentProfileFor(lat) {
  const north = catchmentBounds.getNorth();
  const south = catchmentBounds.getSouth();
  const progressDownstream = Math.max(0, Math.min(1, (north - Number(lat)) / (north - south)));
  if (progressDownstream < 0.4) return "upstream";
  if (progressDownstream < 0.72) return "central";
  return "downstream";
}

function readWsudPreferences() {
  try {
    return JSON.parse(localStorage.getItem(wsudPreferenceStorageKey) || "{}") || {};
  } catch (_error) {
    return {};
  }
}

function solutionLocationKey(location = selectedSolutionLocation) {
  return `${Number(location.lat).toFixed(4)},${Number(location.lng).toFixed(4)}`;
}

function distanceMeters(latA, lngA, latB, lngB) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const deltaLat = toRadians(latB - latA);
  const deltaLng = toRadians(lngB - lngA);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function featurePoint(feature) {
  const point = feature?.properties?.geo_point_2d;
  if (!point) return null;
  const lat = Number(point.lat ?? point[0]);
  const lng = Number(point.lon ?? point[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function nearestWsudFeature(lat, lng) {
  return wsudFeatures.reduce((nearest, feature) => {
    const point = featurePoint(feature);
    if (!point) return nearest;
    const distance = distanceMeters(lat, lng, point.lat, point.lng);
    if (!nearest || distance < nearest.distance) return { feature, distance };
    return nearest;
  }, null);
}

function restoreSolutionPreference() {
  const preferences = readWsudPreferences();
  const saved = preferences[solutionLocationKey()];
  const radios = ui.solutionPreferenceForm.querySelectorAll('input[name="solution-preference"]');
  radios.forEach((radio) => {
    radio.checked = Boolean(saved && radio.value === saved.value);
  });
  ui.solutionOtherText.value = saved?.value === "other" ? saved.otherText || "" : "";
  syncOtherSolutionField();
  ui.solutionPreferenceStatus.textContent = saved
    ? `Saved on this device for ${saved.label}.`
    : "";
}

function syncOtherSolutionField() {
  const selected = ui.solutionPreferenceForm.querySelector('input[name="solution-preference"]:checked');
  const showOther = selected?.value === "other";
  ui.solutionOtherField.hidden = !showOther;
  ui.solutionOtherText.required = showOther;
  if (!showOther) ui.solutionOtherText.setCustomValidity("");
}

function renderSolutionRecommendations(location = selectedSolutionLocation) {
  const profileKey = catchmentProfileFor(location.lat);
  const profile = wsudProfiles[profileKey];
  ui.solutionZoneLabel.textContent = profile.label;
  ui.solutionCharacteristics.textContent = profile.characteristics;

  profile.order.forEach((solutionId, index) => {
    const card = ui.solutionList.querySelector(`[data-solution="${solutionId}"]`);
    if (!card) return;
    card.querySelector(".solution-rank").textContent = String(index + 1);
    card.querySelector(".solution-rank").setAttribute("aria-label", `Recommendation rank ${index + 1}`);
    card.querySelector(".solution-reason").textContent = profile.reasons[solutionId];
    ui.solutionList.append(card);
  });

  const nearby = nearestWsudFeature(location.lat, location.lng);
  if (nearby && nearby.distance <= 300) {
    const properties = nearby.feature.properties || {};
    const name = properties.mapbase_1 || "A nearby mapped laneway";
    const suitability = properties.wsud || "Requires assessment";
    ui.nearbyDataNote.textContent = `City of Melbourne open data: ${name}, about ${Math.round(nearby.distance)} m away, is marked “${suitability}” for WSUD. This informs context, not approval.`;
  } else if (wsudFeatures.length) {
    ui.nearbyDataNote.textContent = "City of Melbourne open data: no mapped laneway record was found within 300 m of this point. The catchment-position ranking is shown instead.";
  } else {
    ui.nearbyDataNote.textContent = "City of Melbourne opportunity data will be checked when available; the current ranking uses catchment position.";
  }
  if (!solutionPreferenceDirty) restoreSolutionPreference();
}

function setSolutionLocation(lat, lng, label) {
  if (!isInsideCatchment(Number(lat), Number(lng))) return false;
  const previousKey = solutionLocationKey();
  selectedSolutionLocation = {
    lat: Number(lat),
    lng: Number(lng),
    label: label || `Selected point (${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)})`,
  };
  if (solutionLocationKey() !== previousKey) solutionPreferenceDirty = false;
  renderSolutionRecommendations(selectedSolutionLocation);
  return true;
}

function setDetailView(view) {
  const showSolutions = view === "solutions";
  ui.floodReportPanel.hidden = showSolutions;
  ui.solutionsPanel.hidden = !showSolutions;
  document.querySelectorAll("[data-detail-view]").forEach((tab) => {
    const active = tab.dataset.detailView === view;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  if (showSolutions) renderSolutionRecommendations();
}

function wsudFeaturePopup(feature) {
  const properties = feature.properties || {};
  const wrapper = document.createElement("div");
  const title = document.createElement("strong");
  const status = document.createElement("p");
  title.textContent = properties.mapbase_1 || "Mapped laneway";
  status.textContent = `City of Melbourne WSUD field: ${properties.wsud || "Further assessment"}`;
  status.style.margin = "5px 0 0";
  wrapper.append(title, status);
  return wrapper;
}

function renderWsudFallback() {
  wsudLayer.clearLayers();
  [
    { lat: -37.7992, lng: 144.9613, label: "Upstream concept area", radius: 170 },
    { lat: -37.8118, lng: 144.9627, label: "Central concept area", radius: 145 },
    { lat: -37.8181, lng: 144.9645, label: "Downstream concept area", radius: 130 },
  ].forEach((area) => {
    L.circle([area.lat, area.lng], {
      radius: area.radius,
      color: "#087b54",
      weight: 2,
      dashArray: "6 5",
      fillColor: "#68c796",
      fillOpacity: 0.22,
    }).bindTooltip(area.label).addTo(wsudLayer);
  });
  ui.wsudDataStatus.textContent = "Live dataset unavailable — showing indicative catchment zones.";
  ui.summary.textContent = "3 indicative WSUD zones shown";
  renderSolutionRecommendations();
}

function renderWsudFeatures(features) {
  wsudLayer.clearLayers();
  wsudFeatures = features.filter((feature) => {
    const point = featurePoint(feature);
    return point && isInsideCatchment(point.lat, point.lng);
  });

  L.geoJSON({ type: "FeatureCollection", features: wsudFeatures }, {
    style(feature) {
      const consider = String(feature?.properties?.wsud || "").toLowerCase() === "consider";
      return {
        color: consider ? "#087b54" : "#bc7415",
        weight: consider ? 2.2 : 1.2,
        opacity: consider ? 0.95 : 0.65,
        fillColor: consider ? "#49bd82" : "#f3b54a",
        fillOpacity: consider ? 0.42 : 0.16,
      };
    },
    onEachFeature(feature, layer) {
      layer.bindPopup(wsudFeaturePopup(feature));
    },
  }).addTo(wsudLayer);

  const considered = wsudFeatures.filter(
    (feature) => String(feature?.properties?.wsud || "").toLowerCase() === "consider",
  ).length;
  ui.wsudDataStatus.textContent = `${wsudFeatures.length} mapped catchment laneway areas · ${considered} marked “Consider”.`;
  ui.summary.textContent = `${considered} WSUD opportunities · City of Melbourne data`;
  renderSolutionRecommendations();
}

function loadWsudOpportunities() {
  if (wsudLoadPromise) return wsudLoadPromise;
  ui.wsudDataStatus.textContent = "Loading City of Melbourne open data…";
  ui.summary.textContent = "Loading WSUD opportunities…";
  wsudLoadPromise = fetch(wsudDatasetUrl, { headers: { Accept: "application/geo+json, application/json" } })
    .then((response) => {
      if (!response.ok) throw new Error(`City data service returned ${response.status}`);
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data?.features)) throw new Error("City data response did not include map features");
      renderWsudFeatures(data.features);
      return wsudFeatures;
    })
    .catch(() => {
      wsudFeatures = [];
      renderWsudFallback();
      return [];
    });
  return wsudLoadPromise;
}

document.querySelectorAll("[data-detail-view]").forEach((tab) => {
  tab.addEventListener("click", () => setDetailView(tab.dataset.detailView));
});

ui.solutionPreferenceForm.addEventListener("change", (event) => {
  if (event.target.matches('input[name="solution-preference"]')) {
    solutionPreferenceDirty = true;
    syncOtherSolutionField();
    if (event.target.value === "other") {
      window.setTimeout(() => ui.solutionOtherText.focus(), 0);
    }
  }
});

ui.solutionOtherText.addEventListener("input", () => {
  if (ui.solutionOtherText.value.trim()) ui.solutionOtherText.setCustomValidity("");
});

ui.solutionPreferenceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = new FormData(ui.solutionPreferenceForm).get("solution-preference");
  const otherText = value === "other" ? ui.solutionOtherText.value.trim() : "";
  ui.solutionOtherText.setCustomValidity(
    value === "other" && !otherText ? "Describe the other solution you would put here." : "",
  );
  if (!ui.solutionPreferenceForm.reportValidity()) return;
  const preferences = readWsudPreferences();
  preferences[solutionLocationKey()] = {
    value,
    otherText,
    label: selectedSolutionLocation.label,
    lat: selectedSolutionLocation.lat,
    lng: selectedSolutionLocation.lng,
    submittedAt: new Date().toISOString(),
  };
  solutionPreferenceDirty = false;
  try {
    localStorage.setItem(wsudPreferenceStorageKey, JSON.stringify(preferences));
    ui.solutionPreferenceStatus.textContent = `Saved on this device for ${selectedSolutionLocation.label}.`;
    showToast("Solution preference saved for this location.");
  } catch (_error) {
    ui.solutionPreferenceStatus.textContent = "Preference noted for this session only.";
  }
});

function rainfallDisplay(rainfall) {
  if (!rainfall || rainfall.available === false) {
    return {
      value: "Unavailable",
      label: "rainfall data",
      comparison: "The weather service could not be reached when this report was submitted.",
      source: "Unavailable",
    };
  }
  if (typeof rainfall === "string") {
    return {
      value: rainfall,
      label: "rainfall that day",
      comparison: "No comparison available",
      source: "Sample data",
    };
  }
  return {
    value: `${Number(rainfall.amountMm).toFixed(1).replace(".0", "")} mm`,
    label: rainfall.capturedAt ? `rainfall to ${rainfall.capturedAt}` : "rainfall that day",
    comparison: rainfall.comparison || "No comparison available",
    source: rainfall.source || "Weather data",
  };
}

function renderUpdates(report) {
  const updates = [...(report.updates || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  ui.updateCount.textContent = String(updates.length);
  ui.emptyUpdates.hidden = updates.length > 0;
  ui.updateList.replaceChildren();
  updates.forEach((update) => {
    const item = document.createElement("li");
    const text = document.createElement("p");
    const time = document.createElement("time");
    text.textContent = update.text;
    time.dateTime = update.createdAt;
    time.textContent = formatReportDate(update.createdAt);
    item.append(text, time);
    ui.updateList.append(item);
  });
}

function selectReport(id, pan = false) {
  const report = reports.find((item) => item.id === Number(id));
  if (!report) return false;

  selectedReportId = report.id;
  const rainfall = rainfallDisplay(report.rainfall);
  ui.areaTitle.textContent = "Around this location";
  ui.areaName.textContent = report.location;
  ui.reportNumber.querySelector("span").textContent = report.id;
  ui.reportNumber.classList.remove("severity-low", "severity-moderate", "severity-high");
  ui.reportNumber.classList.add(`severity-${severityClass(report.severity)}`);
  ui.severity.textContent = report.severity;
  ui.title.textContent = report.title;
  ui.meta.textContent = `${report.isNew ? "Community report" : "Historical report"} · ${report.date}`;
  ui.rainfall.textContent = rainfall.value;
  ui.rainfallLabel.textContent = rainfall.label;
  ui.rainfallComparison.textContent = rainfall.comparison;
  ui.rainfallSource.textContent = rainfall.source;
  ui.reportCoordinates.textContent = `${report.lat.toFixed(5)}, ${report.lng.toFixed(5)}`;
  ui.copy.textContent = report.notes;
  ui.depth.textContent = report.depth || "Not provided";
  ui.evidence.hidden = true;
  ui.evidenceButton.textContent = "View details";

  const hasPhoto = Boolean(report.photoUrl);
  ui.evidenceVisual.hidden = false;
  ui.reportPhoto.hidden = !hasPhoto;
  ui.evidenceTagText.textContent = hasPhoto
    ? "Photo-supported community report"
    : "Community reported";

  if (hasPhoto) {
    ui.reportPhotoImage.src = report.photoUrl;
    ui.reportPhotoImage.alt = `${report.title} at ${report.location}`;
  } else {
    ui.reportPhotoImage.removeAttribute("src");
  }

  renderUpdates(report);
  setSolutionLocation(report.lat, report.lng, report.location);
  setDetailView("reports");
  if (pan) map.flyTo([report.lat, report.lng], 16, { duration: 0.6 });
  return true;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  toastTimer = window.setTimeout(() => ui.toast.classList.remove("show"), 3200);
}

const periodLabels = {
  today: "Today",
  "7d": "Past 7 days",
  "30d": "Past 30 days",
  "6m": "Past 6 months",
  "1y": "Past 1 year",
};

function periodStart(period) {
  const start = new Date();
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === "7d") {
    start.setDate(start.getDate() - 7);
    return start;
  }
  if (period === "30d") {
    start.setDate(start.getDate() - 30);
    return start;
  }
  if (period === "6m") {
    start.setMonth(start.getMonth() - 6);
    return start;
  }
  start.setFullYear(start.getFullYear() - 1);
  return start;
}

function reportsForCurrentPeriod() {
  const start = periodStart(currentPeriod);
  const end = new Date();
  return reports.filter((report) => {
    const createdAt = new Date(report.createdAt || report.date);
    return createdAt >= start && createdAt <= end;
  });
}

function showNoReportsState() {
  ui.areaTitle.textContent = "No reports in this period";
  ui.areaName.textContent = periodLabels[currentPeriod];
  ui.reportNumber.querySelector("span").textContent = "—";
  ui.reportNumber.classList.remove("severity-low", "severity-moderate", "severity-high");
  ui.reportNumber.classList.add("severity-moderate");
  ui.severity.textContent = "No matching observations";
  ui.title.textContent = "Try another time range";
  ui.meta.textContent = "Choose a wider period to see reports.";
  ui.rainfall.textContent = "—";
  ui.rainfallLabel.textContent = "rainfall data";
  ui.rainfallComparison.textContent = "No report selected";
  ui.copy.textContent = "No community observations fall inside this selected period yet.";
  ui.depth.textContent = "—";
  ui.rainfallSource.textContent = "—";
  ui.reportCoordinates.textContent = "—";
  ui.evidence.hidden = true;
  ui.evidenceVisual.hidden = true;
  ui.reportPhoto.hidden = true;
  ui.evidenceTagText.textContent = "No reports in period";
  ui.updateCount.textContent = "0";
  ui.emptyUpdates.hidden = false;
  ui.updateList.replaceChildren();
}

function applyPeriodFilter() {
  if (currentView === "wsud") {
    markerLayer.clearLayers();
    heatLayer.clearLayers();
    return;
  }
  const visibleReports = reportsForCurrentPeriod();
  markerLayer.clearLayers();
  visibleReports.forEach(addMarker);
  drawHotspots(currentView === "hotspots", visibleReports);

  if (visibleReports.some((report) => report.id === selectedReportId)) {
    selectReport(selectedReportId, false);
  } else if (visibleReports[0]) {
    selectReport(visibleReports[0].id, false);
  } else {
    showNoReportsState();
  }

  const noun = currentView === "hotspots" ? "hotspots" : "reports";
  ui.summary.textContent = `${visibleReports.length} ${noun} shown · ${periodLabels[currentPeriod]}`;
}

function requestNominatim(url) {
  const run = async () => {
    const elapsed = Date.now() - lastNominatimRequestAt;
    const waitMs = Math.max(0, 1000 - elapsed);
    if (waitMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, waitMs));
    }

    lastNominatimRequestAt = Date.now();
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Location service returned ${response.status}.`);
    return response.json();
  };

  const result = nominatimQueue.then(run, run);
  nominatimQueue = result.catch(() => undefined);
  return result;
}

function compactLocation(result) {
  const address = result?.address || {};
  const street = [address.house_number, address.road || address.pedestrian].filter(Boolean).join(" ");
  const district = address.neighbourhood || address.quarter || address.suburb;
  const parts = [result?.name, street, district, "Melbourne", address.postcode].filter(Boolean);
  const uniqueParts = parts.filter((part, index) => parts.indexOf(part) === index);
  if (uniqueParts.length) return uniqueParts.join(", ");
  return String(result?.display_name || "Elizabeth Street catchment location")
    .split(",")
    .slice(0, 4)
    .join(",");
}

async function searchCatchment(query) {
  const params = new URLSearchParams({
    q: `${query}, Melbourne, Victoria, Australia`,
    format: "jsonv2",
    addressdetails: "1",
    limit: "8",
    viewbox: `${searchBounds.west},${searchBounds.north},${searchBounds.east},${searchBounds.south}`,
    bounded: "1",
    countrycodes: "au",
  });

  const results = await requestNominatim(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
  );

  return results
    .map((result) => ({
      label: compactLocation(result),
      fullLabel: result.display_name,
      lat: Number(result.lat),
      lng: Number(result.lon),
    }))
    .filter((place) => isInsideCatchment(place.lat, place.lng))
    .slice(0, 5);
}

async function reverseGeocode(lat, lng) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "jsonv2",
    addressdetails: "1",
    zoom: "18",
  });
  const result = await requestNominatim(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
  );
  return compactLocation(result);
}

function renderSearchResults(matches) {
  ui.searchResults.replaceChildren();

  if (!matches.length) {
    const empty = document.createElement("div");
    empty.className = "empty-result";
    empty.textContent = "No matching location was found inside the indicative catchment.";
    ui.searchResults.append(empty);
    ui.searchResults.hidden = false;
    return;
  }

  matches.forEach((place) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "option");
    button.title = place.fullLabel;
    button.textContent = place.label;
    button.addEventListener("click", () => choosePlace(place));
    ui.searchResults.append(button);
  });
  ui.searchResults.hidden = false;
}

function choosePlace(place) {
  ui.searchInput.value = place.label;
  ui.searchResults.hidden = true;
  ui.areaTitle.textContent = "Selected location";
  ui.areaName.textContent = place.label;
  setSelectedLocation(place.lat, place.lng);
  setSolutionLocation(place.lat, place.lng, place.label);
  map.flyTo([place.lat, place.lng], 17, { duration: 0.7 });
  if (currentView === "wsud") {
    setDetailView("solutions");
    showToast("Location found. Review the ranked WSUD options for this point.");
  } else {
    showToast("Location found. Click its exact point on the map, or use Report an observation.");
  }
}

ui.searchInput.addEventListener("input", () => {
  ui.searchResults.hidden = true;
  ui.searchStatus.textContent = "";
});

ui.searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") ui.searchResults.hidden = true;
});

ui.searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = ui.searchInput.value.trim();
  if (query.length < 2) {
    showToast("Enter at least two characters to search the catchment.");
    return;
  }

  ui.searchForm.setAttribute("aria-busy", "true");
  ui.searchButton.disabled = true;
  ui.searchButton.textContent = "Searching";
  ui.searchStatus.textContent = "Searching locations inside the Elizabeth Street catchment.";
  ui.searchResults.hidden = true;

  try {
    const matches = await searchCatchment(query);
    renderSearchResults(matches);
    ui.searchStatus.textContent = matches.length
      ? `${matches.length} catchment locations found.`
      : "No matching location found inside the catchment.";
  } catch (_error) {
    ui.searchStatus.textContent = "Location search is temporarily unavailable.";
    showToast("Location search is unavailable. You can still click inside the catchment.");
  } finally {
    ui.searchForm.removeAttribute("aria-busy");
    ui.searchButton.disabled = false;
    ui.searchButton.textContent = "Find";
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search")) ui.searchResults.hidden = true;
});

function clearPendingPhoto({ revoke = true, clearInput = true } = {}) {
  if (pendingPhotoUrl && revoke) URL.revokeObjectURL(pendingPhotoUrl);
  pendingPhotoUrl = null;
  if (clearInput) ui.photoInput.value = "";
  ui.photoPreview.hidden = true;
  ui.photoPreviewImage.removeAttribute("src");
  ui.photoError.hidden = true;
  ui.photoError.textContent = "";
}

ui.photoInput.addEventListener("change", () => {
  const file = ui.photoInput.files?.[0];
  clearPendingPhoto({ clearInput: false });
  if (!file) return;

  if (!allowedPhotoTypes.includes(file.type)) {
    ui.photoInput.value = "";
    ui.photoError.textContent = "Choose a JPG, PNG or WebP image.";
    ui.photoError.hidden = false;
    return;
  }

  if (file.size > maxPhotoBytes) {
    ui.photoInput.value = "";
    ui.photoError.textContent = "The photo must be 5 MB or smaller.";
    ui.photoError.hidden = false;
    return;
  }

  pendingPhotoUrl = URL.createObjectURL(file);
  ui.photoPreviewImage.src = pendingPhotoUrl;
  ui.photoPreview.hidden = false;
});

document.querySelector("#remove-photo").addEventListener("click", () => clearPendingPhoto());

function matchesLocationFilter(choice, filter) {
  const terms = filter.toLowerCase().split(/\s+/).filter(Boolean);
  const searchableLabel = choice.label.toLowerCase();
  return terms.every((term) => searchableLabel.includes(term));
}

function renderReportLocationChoices(filter = "", selectedValue = "") {
  const select = ui.observationLocationChoice;
  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose a map pin, street or intersection";
  select.append(placeholder);

  if (pinnedReportLocation) {
    const pinnedOption = document.createElement("option");
    pinnedOption.value = "map-pin";
    pinnedOption.textContent = `Exact map pin — ${pinnedReportLocation.label}`;
    select.append(pinnedOption);
  }

  const matches = cbdLocationChoices.filter((choice) => matchesLocationFilter(choice, filter));
  ["Streets and lanes", "Intersections"].forEach((groupName) => {
    const groupedMatches = matches.filter((choice) => choice.group === groupName);
    if (!groupedMatches.length) return;

    const group = document.createElement("optgroup");
    group.label = groupName;
    groupedMatches.forEach((choice) => {
      const option = document.createElement("option");
      option.value = choice.id;
      option.textContent = choice.label;
      group.append(option);
    });
    select.append(group);
  });

  if (!matches.length && !pinnedReportLocation) {
    const emptyOption = document.createElement("option");
    emptyOption.disabled = true;
    emptyOption.textContent = "No matching catchment street or intersection";
    select.append(emptyOption);
  }

  const hasSelectedValue = [...select.options].some((option) => option.value === selectedValue);
  select.value = hasSelectedValue ? selectedValue : "";

  if (filter) {
    ui.reportLocationHelp.textContent = matches.length
      ? `${matches.length} matching choices. The selected choice will be placed as an exact pin.`
      : "No list match. Close this form and click the exact location on the map.";
  } else if (pinnedReportLocation) {
    ui.reportLocationHelp.textContent = "Using the exact point selected on the map.";
  } else {
    ui.reportLocationHelp.textContent = "Choose a location, or close this form and click the exact point on the map.";
  }
}

function useReportLocation({ label, lat, lng }) {
  if (!isInsideCatchment(Number(lat), Number(lng))) return false;
  ui.observationLocation.value = label;
  ui.observationLat.value = String(lat);
  ui.observationLng.value = String(lng);
  ui.coordinateReadout.textContent = `Exact pin: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
  setSelectedLocation(Number(lat), Number(lng));
  return true;
}

function setReportLocationBusy(isBusy) {
  ui.observationLocationChoice.disabled = isBusy;
  ui.submitReport.disabled = isBusy;
  if (isBusy) ui.reportLocationHelp.textContent = "Placing that location inside the catchment…";
}

async function chooseReportLocation(value) {
  locationRequestId += 1;
  reportLocationRequestId += 1;
  const requestId = reportLocationRequestId;

  if (!value) {
    ui.observationLocation.value = "";
    ui.observationLat.value = "";
    ui.observationLng.value = "";
    ui.coordinateReadout.textContent = "Exact pin: not selected";
    return;
  }

  if (value === "map-pin" && pinnedReportLocation) {
    useReportLocation(pinnedReportLocation);
    ui.reportLocationHelp.textContent = "Using the exact point selected on the map.";
    return;
  }

  const choice = cbdLocationChoices.find((item) => item.id === value);
  if (!choice) return;

  setReportLocationBusy(true);
  try {
    const [match] = await searchCatchment(choice.query);
    if (requestId !== reportLocationRequestId || !ui.dialog.open) return;
    if (!match) throw new Error("Location not found in catchment");

    useReportLocation({ label: choice.label, lat: match.lat, lng: match.lng });
    ui.reportLocationHelp.textContent = `${choice.label} placed at the exact coordinates shown below.`;
  } catch (_error) {
    if (requestId !== reportLocationRequestId || !ui.dialog.open) return;
    ui.observationLocationChoice.value = "";
    ui.observationLocation.value = "";
    ui.observationLat.value = "";
    ui.observationLng.value = "";
    ui.coordinateReadout.textContent = "Exact pin: not selected";
    ui.reportLocationHelp.textContent = "That choice could not be placed inside the catchment. Close this form and click the map.";
    showToast("That location is outside the catchment or could not be placed.");
  } finally {
    if (requestId === reportLocationRequestId) setReportLocationBusy(false);
  }
}

ui.reportLocationSearch.addEventListener("input", () => {
  const currentValue = ui.observationLocationChoice.value;
  renderReportLocationChoices(ui.reportLocationSearch.value.trim(), currentValue);
});

ui.observationLocationChoice.addEventListener("change", () => {
  void chooseReportLocation(ui.observationLocationChoice.value);
});

function closeObservationDialog() {
  if (ui.dialog.open) ui.dialog.close("cancel");
}

function enableBackdropClose(dialog, close) {
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    const clickedInside =
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom;
    if (!clickedInside) close();
  });
}

ui.closeReportDialog.addEventListener("click", closeObservationDialog);
ui.cancelReport.addEventListener("click", closeObservationDialog);

enableBackdropClose(ui.dialog, closeObservationDialog);

function openObservationDialogAt(lat, lng, initialLabel) {
  if (!isInsideCatchment(lat, lng)) {
    showToast("Choose a location inside the outlined Elizabeth Street catchment.");
    return;
  }

  locationRequestId += 1;
  const requestId = locationRequestId;
  const coordinateLabel = `Pinned location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

  pinnedReportLocation = {
    label: initialLabel || coordinateLabel,
    lat,
    lng,
  };
  useReportLocation(pinnedReportLocation);
  ui.reportLocationSearch.value = "";
  renderReportLocationChoices("", "map-pin");
  ui.observationType.value = "";
  ui.observationSeverity.value = "Moderate impact";
  ui.observationDepth.value = "";
  ui.observationNotes.value = "";
  ui.rainfallFormHelp.textContent = "Today’s rainfall and a 30-day comparison will be attached automatically when available.";
  clearPendingPhoto();
  ui.dialog.showModal();

  void reverseGeocode(lat, lng)
    .then((label) => {
      if (requestId !== locationRequestId || !ui.dialog.open) return;
      pinnedReportLocation = { label, lat, lng };
      useReportLocation(pinnedReportLocation);
      renderReportLocationChoices(ui.reportLocationSearch.value.trim(), "map-pin");
      ui.reportLocationHelp.textContent = "Using the exact point selected on the map.";
    })
    .catch(() => {
      if (requestId === locationRequestId) {
        ui.reportLocationHelp.textContent = "Using the map pin. Address lookup is temporarily unavailable.";
      }
    });
}

map.on("click", (event) => {
  const { lat, lng } = event.latlng;
  if (!isInsideCatchment(lat, lng)) {
    showToast("Choose a location inside the outlined Elizabeth Street catchment.");
    return;
  }

  if (currentView === "wsud") {
    const coordinateLabel = `Selected point (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
    setSelectedLocation(lat, lng);
    setSolutionLocation(lat, lng, coordinateLabel);
    ui.areaTitle.textContent = "Around this location";
    ui.areaName.textContent = coordinateLabel;
    setDetailView("solutions");
    showToast("WSUD recommendations updated for the selected point.");
    void reverseGeocode(lat, lng)
      .then((label) => {
        setSolutionLocation(lat, lng, label);
        ui.areaName.textContent = label;
      })
      .catch(() => undefined);
    return;
  }

  openObservationDialogAt(lat, lng);
});

document.querySelector("#report-button").addEventListener("click", () => {
  if (lastSelectedLocation && isInsideCatchment(lastSelectedLocation.lat, lastSelectedLocation.lng)) {
    openObservationDialogAt(lastSelectedLocation.lat, lastSelectedLocation.lng, "Selected map location");
    return;
  }
  document.querySelector("#map").scrollIntoView({ behavior: "smooth", block: "center" });
  showToast("Click the exact location inside the outlined catchment to start the report.");
});

ui.dialog.addEventListener("close", () => {
  locationRequestId += 1;
  reportLocationRequestId += 1;
  setReportLocationBusy(false);
  ui.submitReport.textContent = "Add to map";
  if (pendingPhotoUrl) clearPendingPhoto();
});

function melbourneDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

async function fetchRainfallSnapshot(lat, lng) {
  try {
    const params = new URLSearchParams({
      latitude: Number(lat).toFixed(5),
      longitude: Number(lng).toFixed(5),
      hourly: "precipitation",
      past_days: "30",
      forecast_days: "1",
      timezone: "Australia/Melbourne",
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
    const data = await response.json();
    const times = data?.hourly?.time;
    const values = data?.hourly?.precipitation;
    if (!Array.isArray(times) || !Array.isArray(values) || times.length !== values.length) {
      throw new Error("Weather data was incomplete");
    }

    const nowParts = melbourneDateParts();
    const today = `${nowParts.year}-${nowParts.month}-${nowParts.day}`;
    const cutoffHour = Number(nowParts.hour);
    const totals = new Map();
    times.forEach((time, index) => {
      const [dateKey, timeKey] = String(time).split("T");
      const hour = Number(String(timeKey || "00").slice(0, 2));
      const amount = Number(values[index]);
      if (!Number.isFinite(amount) || hour > cutoffHour) return;
      totals.set(dateKey, (totals.get(dateKey) || 0) + amount);
    });

    const amountMm = Math.round((totals.get(today) || 0) * 10) / 10;
    const comparisonDays = [...totals.entries()]
      .filter(([dateKey]) => dateKey < today)
      .slice(-30)
      .map(([, total]) => total);
    const averageMm = comparisonDays.length
      ? Math.round((comparisonDays.reduce((sum, value) => sum + value, 0) / comparisonDays.length) * 10) / 10
      : 0;
    const difference = Math.round((amountMm - averageMm) * 10) / 10;
    const comparison = Math.abs(difference) < 0.1
      ? `About the same as the recent average to this time (${averageMm.toFixed(1)} mm)`
      : `${Math.abs(difference).toFixed(1)} mm ${difference > 0 ? "above" : "below"} the 30-day average to this time (${averageMm.toFixed(1)} mm)`;
    return {
      available: true,
      amountMm,
      averageMm,
      comparison,
      capturedAt: `${nowParts.hour}:${nowParts.minute}`,
      source: "Open-Meteo model data",
    };
  } catch (_error) {
    return { available: false };
  }
}

function createReport({
  type,
  severity = "Moderate impact",
  depth,
  location,
  notes,
  lat,
  lng,
  photoUrl = null,
  rainfall = { available: false },
}) {
  const reportLat = Number(lat);
  const reportLng = Number(lng);
  if (!isInsideCatchment(reportLat, reportLng)) {
    throw new Error("Report location must be inside the catchment.");
  }
  const report = {
    id: Math.max(0, ...reports.map((item) => item.id)) + 1,
    title: type,
    severity: observationSeverities.includes(severity) ? severity : "Moderate impact",
    depth: observationDepths.includes(depth) ? depth : "Unable to tell",
    location,
    lat: reportLat,
    lng: reportLng,
    createdAt: new Date().toISOString(),
    date: formatReportDate(new Date()),
    rainfall,
    notes,
    isNew: true,
    photoUrl,
    updates: [],
  };

  reports.push(report);
  applyPeriodFilter();
  selectReport(report.id, true);
  return report;
}

function surveyIsActive() {
  const now = new Date();
  return now >= surveyLaunchAt && now <= surveyEndAt;
}

function showSurveyIfEligible() {
  if (!surveyIsActive()) return;
  if (localStorage.getItem(surveyStorageKey) || sessionStorage.getItem(surveySkippedKey)) return;
  if (!ui.surveyDialog.open) ui.surveyDialog.showModal();
}

ui.form.addEventListener("submit", async (event) => {
  const submitter = event.submitter;
  if (!submitter || submitter.id !== "submit-report") return;
  event.preventDefault();
  if (!ui.form.reportValidity()) return;

  const lat = Number(ui.observationLat.value);
  const lng = Number(ui.observationLng.value);
  if (!isInsideCatchment(lat, lng)) {
    showToast("Place the report pin inside the outlined catchment.");
    return;
  }

  ui.submitReport.disabled = true;
  ui.submitReport.textContent = "Adding rainfall…";
  ui.rainfallFormHelp.textContent = "Connecting to the weather service. Your report will still be added if it is unavailable.";
  const rainfall = await fetchRainfallSnapshot(lat, lng);
  const photoUrl = pendingPhotoUrl;
  pendingPhotoUrl = null;
  const report = createReport({
    type: ui.observationType.value,
    severity: ui.observationSeverity.value,
    depth: ui.observationDepth.value,
    location: ui.observationLocation.value.trim(),
    notes: ui.observationNotes.value.trim(),
    lat,
    lng,
    photoUrl,
    rainfall,
  });

  ui.photoInput.value = "";
  ui.photoPreview.hidden = true;
  ui.photoPreviewImage.removeAttribute("src");
  ui.dialog.close("submitted");
  showToast(`Observation ${report.id} added at the exact map pin.`);
  window.setTimeout(showSurveyIfEligible, 450);
});

document.querySelectorAll("[data-view]").forEach((tab) => {
  tab.addEventListener("click", () => {
    currentView = tab.dataset.view;
    document.querySelectorAll("[data-view]").forEach((item) => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });

    const showingWsud = currentView === "wsud";
    ui.periodControl.hidden = showingWsud;
    ui.legend.hidden = currentView !== "hotspots";
    ui.wsudLegend.hidden = !showingWsud;
    ui.mapInstructionText.textContent = showingWsud
      ? "Select any point inside the catchment to compare potential WSUD solutions"
      : "Click inside the outlined catchment to report the exact location";

    if (showingWsud) {
      if (map.hasLayer(markerLayer)) map.removeLayer(markerLayer);
      heatLayer.clearLayers();
      if (!map.hasLayer(wsudLayer)) wsudLayer.addTo(map);
      setDetailView("solutions");
      void loadWsudOpportunities();
      applyPeriodFilter();
      return;
    }

    if (map.hasLayer(wsudLayer)) map.removeLayer(wsudLayer);
    if (!map.hasLayer(markerLayer)) markerLayer.addTo(map);
    setDetailView("reports");
    applyPeriodFilter();
  });
});

ui.periodSelect.addEventListener("change", (event) => {
  currentPeriod = event.target.value;
  applyPeriodFilter();
});

ui.evidenceButton.addEventListener("click", () => {
  ui.evidence.hidden = !ui.evidence.hidden;
  ui.evidenceButton.textContent = ui.evidence.hidden ? "View details" : "Hide details";
});

function openUpdateDialog() {
  const report = reports.find((item) => item.id === selectedReportId);
  if (!report) return;
  ui.updateReportContext.textContent = `Report ${report.id}: ${report.title} at ${report.location}`;
  ui.updateNotes.value = "";
  ui.updateDialog.showModal();
  window.setTimeout(() => ui.updateNotes.focus(), 0);
}

document.querySelector("#update-button").addEventListener("click", openUpdateDialog);
document.querySelector("#close-update-dialog").addEventListener("click", () => {
  if (ui.updateDialog.open) ui.updateDialog.close("cancel");
});
document.querySelector("#cancel-update").addEventListener("click", () => {
  if (ui.updateDialog.open) ui.updateDialog.close("cancel");
});
enableBackdropClose(ui.updateDialog, () => {
  if (ui.updateDialog.open) ui.updateDialog.close("cancel");
});
ui.updateForm.addEventListener("submit", (event) => {
  if (event.submitter?.id !== "submit-update") return;
  event.preventDefault();
  if (!ui.updateForm.reportValidity()) return;
  const report = reports.find((item) => item.id === selectedReportId);
  if (!report) return;
  report.updates.push({
    text: ui.updateNotes.value.trim(),
    createdAt: new Date().toISOString(),
    persisted: true,
  });
  persistReportUpdates(report);
  renderUpdates(report);
  ui.updateDialog.close("submitted");
  showToast(`Update added to report ${report.id}.`);
});

document.querySelector("#close-survey-dialog").addEventListener("click", () => {
  if (ui.surveyDialog.open) ui.surveyDialog.close("cancel");
});
document.querySelector("#skip-survey").addEventListener("click", () => {
  sessionStorage.setItem(surveySkippedKey, "true");
  if (ui.surveyDialog.open) ui.surveyDialog.close("skipped");
});
enableBackdropClose(ui.surveyDialog, () => {
  if (ui.surveyDialog.open) ui.surveyDialog.close("cancel");
});
ui.surveyForm.addEventListener("submit", (event) => {
  if (event.submitter?.id !== "submit-survey") return;
  event.preventDefault();
  if (!ui.surveyForm.reportValidity()) return;
  const response = {
    rating: Number(new FormData(ui.surveyForm).get("survey-rating")),
    comment: ui.surveyComment.value.trim(),
    submittedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(surveyStorageKey, JSON.stringify(response));
  } catch (_error) {
    // The submission is still acknowledged if browser storage is unavailable.
  }
  ui.surveyDialog.close("submitted");
  showToast("Thank you for the feedback.");
});

selectReport(2, false);
applyPeriodFilter();

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;

  const register = (tool) => {
    try {
      void Promise.resolve(context.registerTool(tool)).catch(() => {});
    } catch (_error) {
      // WebMCP is optional and not available in every browser.
    }
  };

  register({
    name: "list_flood_reports",
    title: "List flood reports",
    description: "Read the flood observations currently displayed in the Elizabeth Street catchment.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute() {
      return reportsForCurrentPeriod().map(({ id, title, location, date, severity, depth, updates }) => ({
        id,
        title,
        location,
        date,
        severity,
        depth,
        updateCount: updates.length,
      }));
    },
  });

  register({
    name: "focus_flood_report",
    title: "Focus flood report",
    description: "Open one displayed flood report and move the visible map to its marker.",
    inputSchema: {
      type: "object",
      properties: { reportId: { type: "integer", minimum: 1 } },
      required: ["reportId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute(input) {
      const visibleIds = new Set(reportsForCurrentPeriod().map((report) => report.id));
      if (!Number.isInteger(input?.reportId) || !visibleIds.has(input.reportId) || !selectReport(input.reportId, true)) {
        throw new Error("A visible report with that ID was not found.");
      }
      const report = reports.find((item) => item.id === input.reportId);
      return { selectedReportId: report.id, title: report.title, location: report.location };
    },
  });

  register({
    name: "add_flood_report",
    title: "Add flood report",
    description: "Add a community flood observation at an exact coordinate inside the Elizabeth Street catchment.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: observationTypes },
        severity: { type: "string", enum: observationSeverities },
        depth: { type: "string", enum: observationDepths },
        location: { type: "string", minLength: 3, maxLength: 160 },
        notes: { type: "string", minLength: 5, maxLength: 500 },
        latitude: { type: "number", minimum: searchBounds.south, maximum: searchBounds.north },
        longitude: { type: "number", minimum: searchBounds.west, maximum: searchBounds.east },
      },
      required: ["type", "severity", "depth", "location", "notes", "latitude", "longitude"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    async execute(input) {
      if (
        !input ||
        !observationTypes.includes(input.type) ||
        !observationSeverities.includes(input.severity) ||
        !observationDepths.includes(input.depth) ||
        typeof input.location !== "string" ||
        input.location.trim().length < 3 ||
        typeof input.notes !== "string" ||
        input.notes.trim().length < 5 ||
        !isInsideCatchment(Number(input.latitude), Number(input.longitude))
      ) {
        throw new Error("A valid report and exact coordinate inside the catchment are required.");
      }

      const rainfall = await fetchRainfallSnapshot(input.latitude, input.longitude);
      const report = createReport({
        type: input.type,
        severity: input.severity,
        depth: input.depth,
        location: input.location.trim(),
        notes: input.notes.trim(),
        lat: input.latitude,
        lng: input.longitude,
        rainfall,
      });
      showToast(`Observation ${report.id} added to the map.`);
      return { reportId: report.id, status: "added", location: report.location };
    },
  });

  register({
    name: "add_flood_report_update",
    title: "Add flood report update",
    description: "Add a brief time-stamped update to an existing flood report.",
    inputSchema: {
      type: "object",
      properties: {
        reportId: { type: "integer", minimum: 1 },
        update: { type: "string", minLength: 3, maxLength: 300 },
      },
      required: ["reportId", "update"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    execute(input) {
      const report = reports.find((item) => item.id === Number(input?.reportId));
      const text = String(input?.update || "").trim();
      if (!report || text.length < 3 || text.length > 300) {
        throw new Error("A valid report and update are required.");
      }
      report.updates.push({ text, createdAt: new Date().toISOString(), persisted: true });
      persistReportUpdates(report);
      if (report.id === selectedReportId) renderUpdates(report);
      return { reportId: report.id, status: "updated", updateCount: report.updates.length };
    },
  });
}

registerWebMcpTools();
