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
    rainfall: "22 mm",
    notes: "Leaves blocked the corner drain and water spread into the bicycle lane.",
    duration: "20–30 min",
    depth: "Below kerb",
    isNew: false,
    photoUrl: null,
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
    rainfall: "38 mm",
    notes: "Water pooled along the kerb after heavy rain. The drain cleared slowly.",
    duration: "45–60 min",
    depth: "Kerb height",
    isNew: false,
    photoUrl: null,
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
    rainfall: "44 mm",
    notes: "One traffic lane was covered and vehicles slowed to pass the intersection.",
    duration: "60–90 min",
    depth: "Above kerb",
    isNew: false,
    photoUrl: null,
  },
];

const melbourneCbd = {
  west: 144.947,
  south: -37.825,
  east: 144.977,
  north: -37.799,
};

const melbourneCbdBounds = [
  [melbourneCbd.south, melbourneCbd.west],
  [melbourneCbd.north, melbourneCbd.east],
];

const maxPhotoBytes = 5 * 1024 * 1024;
const allowedPhotoTypes = ["image/jpeg", "image/png", "image/webp"];
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

const eastWestCbdStreets = [
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
  "Spencer Street",
  "King Street",
  "William Street",
  "Queen Street",
  "Elizabeth Street",
  "Swanston Street",
  "Russell Street",
  "Exhibition Street",
  "Spring Street",
];

const additionalCbdStreets = [
  "Batman Street",
  "Dudley Street",
  "Hardware Lane",
  "Market Street",
  "McKillop Street",
  "Degraves Street",
  "Wurundjeri Way",
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

const map = L.map("map", {
  zoomControl: true,
  minZoom: 13,
  maxZoom: 19,
  maxBounds: melbourneCbdBounds,
  maxBoundsViscosity: 0.8,
});

map.fitBounds(melbourneCbdBounds, { padding: [24, 24] });

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

L.rectangle(melbourneCbdBounds, {
  color: "#05879c",
  weight: 2,
  opacity: 0.62,
  dashArray: "7 7",
  fill: false,
  interactive: false,
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);
const heatLayer = L.layerGroup().addTo(map);
let selectedLocationMarker = null;

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

function isInsideMelbourneCbd(lat, lng) {
  return (
    lat >= melbourneCbd.south &&
    lat <= melbourneCbd.north &&
    lng >= melbourneCbd.west &&
    lng <= melbourneCbd.east
  );
}

function setSelectedLocation(lat, lng) {
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
  }).addTo(markerLayer);
  marker.on("click", () => selectReport(report.id, true));
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
  copy: document.querySelector("#report-copy"),
  duration: document.querySelector("#report-duration"),
  depth: document.querySelector("#report-depth"),
  summary: document.querySelector("#map-summary-text"),
  periodSelect: document.querySelector("#period-select"),
  legend: document.querySelector("#legend"),
  evidence: document.querySelector("#evidence-details"),
  evidenceButton: document.querySelector("#evidence-button"),
  evidenceVisual: document.querySelector("#evidence-visual"),
  evidenceTagText: document.querySelector("#evidence-tag-text"),
  reportPhoto: document.querySelector("#report-photo"),
  reportPhotoImage: document.querySelector("#report-photo-image"),
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
  observationLocation: document.querySelector("#observation-location"),
  observationLocationChoice: document.querySelector("#observation-location-choice"),
  reportLocationSearch: document.querySelector("#report-location-search"),
  reportLocationHelp: document.querySelector("#report-location-help"),
  observationLat: document.querySelector("#observation-lat"),
  observationLng: document.querySelector("#observation-lng"),
  observationNotes: document.querySelector("#observation-notes"),
  closeReportDialog: document.querySelector("#close-report-dialog"),
  cancelReport: document.querySelector("#cancel-report"),
  submitReport: document.querySelector("#submit-report"),
  photoInput: document.querySelector("#observation-photo"),
  photoError: document.querySelector("#photo-error"),
  photoPreview: document.querySelector("#photo-preview"),
  photoPreviewImage: document.querySelector("#photo-preview-image"),
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

function selectReport(id, pan = false) {
  const report = reports.find((item) => item.id === Number(id));
  if (!report) return false;

  selectedReportId = report.id;
  ui.areaTitle.textContent = "Around this location";
  ui.areaName.textContent = report.location;
  ui.reportNumber.querySelector("span").textContent = report.id;
  ui.reportNumber.classList.remove("severity-low", "severity-moderate", "severity-high");
  ui.reportNumber.classList.add(`severity-${severityClass(report.severity)}`);
  ui.severity.textContent = report.severity;
  ui.title.textContent = report.title;
  ui.meta.textContent = `${report.isNew ? "Community report" : "Historical report"} · ${report.date}`;
  ui.rainfall.textContent = report.rainfall;
  ui.copy.textContent = report.notes;
  ui.duration.textContent = report.duration;
  ui.depth.textContent = report.depth;
  ui.evidence.hidden = true;
  ui.evidenceButton.textContent = "View details";

  const hasPhoto = Boolean(report.photoUrl);
  ui.evidenceVisual.hidden = hasPhoto;
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

  if (pan) map.flyTo([report.lat, report.lng], 16, { duration: 0.6 });
  return true;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  toastTimer = window.setTimeout(() => ui.toast.classList.remove("show"), 2800);
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
  ui.copy.textContent = "No community observations fall inside this selected period yet.";
  ui.duration.textContent = "—";
  ui.depth.textContent = "—";
  ui.evidence.hidden = true;
  ui.evidenceVisual.hidden = true;
  ui.reportPhoto.hidden = true;
  ui.evidenceTagText.textContent = "No reports in period";
}

function applyPeriodFilter() {
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
  return String(result?.display_name || "Melbourne CBD location")
    .split(",")
    .slice(0, 4)
    .join(",");
}

async function searchMelbourneCbd(query) {
  const params = new URLSearchParams({
    q: `${query}, Melbourne CBD, Victoria, Australia`,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    viewbox: `${melbourneCbd.west},${melbourneCbd.north},${melbourneCbd.east},${melbourneCbd.south}`,
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
    .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng))
    .filter((place) => isInsideMelbourneCbd(place.lat, place.lng));
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
    empty.textContent = "No matching Melbourne CBD location was found. Try a street number, building or landmark.";
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
  map.flyTo([place.lat, place.lng], 17, { duration: 0.7 });
  showToast("Location found. Click the map to report an observation there.");
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
    showToast("Enter at least two characters to search Melbourne CBD.");
    return;
  }

  ui.searchForm.setAttribute("aria-busy", "true");
  ui.searchButton.disabled = true;
  ui.searchButton.textContent = "Searching";
  ui.searchStatus.textContent = "Searching Melbourne CBD locations.";
  ui.searchResults.hidden = true;

  try {
    const matches = await searchMelbourneCbd(query);
    renderSearchResults(matches);
    ui.searchStatus.textContent = matches.length
      ? `${matches.length} Melbourne CBD locations found.`
      : "No matching Melbourne CBD locations found.";
  } catch (_error) {
    ui.searchStatus.textContent = "Location search is temporarily unavailable.";
    showToast("Location search is temporarily unavailable. You can still click the map to report.");
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
  placeholder.textContent = "Choose a street or intersection";
  select.append(placeholder);

  if (pinnedReportLocation) {
    const pinnedOption = document.createElement("option");
    pinnedOption.value = "map-pin";
    pinnedOption.textContent = `Map pin — ${pinnedReportLocation.label}`;
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
    emptyOption.textContent = "No matching CBD street or intersection";
    select.append(emptyOption);
  }

  const hasSelectedValue = [...select.options].some((option) => option.value === selectedValue);
  select.value = hasSelectedValue ? selectedValue : "";

  if (filter) {
    ui.reportLocationHelp.textContent = matches.length
      ? `${matches.length} matching locations. Choose one from the dropdown.`
      : "No list match. Try another street name, or click the map for an exact point.";
  } else {
    ui.reportLocationHelp.textContent = `${cbdLocationChoices.length} main CBD streets and intersections available, plus your map pin.`;
  }
}

function useReportLocation({ label, lat, lng }) {
  ui.observationLocation.value = label;
  ui.observationLat.value = String(lat);
  ui.observationLng.value = String(lng);
  setSelectedLocation(lat, lng);
}

function setReportLocationBusy(isBusy) {
  ui.observationLocationChoice.disabled = isBusy;
  ui.submitReport.disabled = isBusy;
  if (isBusy) ui.reportLocationHelp.textContent = "Finding that location on the CBD map…";
}

async function chooseReportLocation(value) {
  locationRequestId += 1;
  reportLocationRequestId += 1;
  const requestId = reportLocationRequestId;

  if (!value) {
    ui.observationLocation.value = "";
    ui.observationLat.value = "";
    ui.observationLng.value = "";
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
    const [match] = await searchMelbourneCbd(choice.query);
    if (requestId !== reportLocationRequestId || !ui.dialog.open) return;
    if (!match) throw new Error("Location not found");

    useReportLocation({ label: choice.label, lat: match.lat, lng: match.lng });
    ui.reportLocationHelp.textContent = `${choice.label} selected.`;
  } catch (_error) {
    if (requestId !== reportLocationRequestId || !ui.dialog.open) return;
    ui.observationLocationChoice.value = "";
    ui.observationLocation.value = "";
    ui.observationLat.value = "";
    ui.observationLng.value = "";
    ui.reportLocationHelp.textContent = "That location could not be placed. Try again, or close this form and click the map.";
    showToast("We could not place that location. Try another option or click the map.");
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

ui.closeReportDialog.addEventListener("click", closeObservationDialog);
ui.cancelReport.addEventListener("click", closeObservationDialog);

ui.dialog.addEventListener("click", (event) => {
  if (event.target !== ui.dialog) return;
  const bounds = ui.dialog.getBoundingClientRect();
  const clickedInside =
    event.clientX >= bounds.left &&
    event.clientX <= bounds.right &&
    event.clientY >= bounds.top &&
    event.clientY <= bounds.bottom;
  if (!clickedInside) closeObservationDialog();
});

function openObservationDialogAt(lat, lng, initialLabel) {
  if (!isInsideMelbourneCbd(lat, lng)) {
    showToast("Choose a location inside the Melbourne CBD boundary.");
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
  ui.observationNotes.value = "";
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
  openObservationDialogAt(event.latlng.lat, event.latlng.lng);
});

document.querySelector("#report-button").addEventListener("click", () => {
  const center = map.getCenter();
  openObservationDialogAt(center.lat, center.lng, "Map centre, Melbourne CBD");
});

ui.dialog.addEventListener("close", () => {
  locationRequestId += 1;
  reportLocationRequestId += 1;
  setReportLocationBusy(false);
  if (pendingPhotoUrl) clearPendingPhoto();
});

function createReport({ type, severity = "Moderate impact", location, notes, lat, lng, photoUrl = null }) {
  const center = map.getCenter();
  const reportLat = Number.isFinite(Number(lat)) ? Number(lat) : center.lat;
  const reportLng = Number.isFinite(Number(lng)) ? Number(lng) : center.lng;
  const report = {
    id: reports.length + 1,
    title: type,
    severity: observationSeverities.includes(severity) ? severity : "Moderate impact",
    location,
    lat: reportLat,
    lng: reportLng,
    createdAt: new Date().toISOString(),
    date: formatReportDate(new Date()),
    rainfall: "Pending",
    notes,
    duration: "Not provided",
    depth: "Not provided",
    isNew: true,
    photoUrl,
  };

  reports.push(report);
  applyPeriodFilter();
  selectReport(report.id, true);
  return report;
}

ui.form.addEventListener("submit", (event) => {
  const submitter = event.submitter;
  if (!submitter || submitter.id !== "submit-report") return;
  event.preventDefault();
  if (!ui.form.reportValidity()) return;

  const photoUrl = pendingPhotoUrl;
  pendingPhotoUrl = null;
  const report = createReport({
    type: ui.observationType.value,
    severity: ui.observationSeverity.value,
    location: ui.observationLocation.value.trim(),
    notes: ui.observationNotes.value.trim(),
    lat: Number(ui.observationLat.value),
    lng: Number(ui.observationLng.value),
    photoUrl,
  });

  ui.photoInput.value = "";
  ui.photoPreview.hidden = true;
  ui.photoPreviewImage.removeAttribute("src");
  ui.dialog.close();
  showToast(`Observation ${report.id} added to the map.`);
});

document.querySelectorAll("[data-view]").forEach((tab) => {
  tab.addEventListener("click", () => {
    currentView = tab.dataset.view;
    document.querySelectorAll("[data-view]").forEach((item) => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    ui.legend.hidden = currentView !== "hotspots";
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

document.querySelector("#update-button").addEventListener("click", () => {
  const report = reports.find((item) => item.id === selectedReportId);
  showToast(`Update noted for ${report.title}.`);
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
    description: "Read the flood observations currently displayed on the Melbourne CBD map.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute() {
      return reportsForCurrentPeriod().map(({ id, title, location, date, severity }) => ({
        id,
        title,
        location,
        date,
        severity,
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
    description: "Add a new community flood observation at a Melbourne CBD coordinate or the current map centre.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: observationTypes },
        severity: { type: "string", enum: observationSeverities },
        location: { type: "string", minLength: 3, maxLength: 160 },
        notes: { type: "string", minLength: 5, maxLength: 500 },
        latitude: { type: "number", minimum: melbourneCbd.south, maximum: melbourneCbd.north },
        longitude: { type: "number", minimum: melbourneCbd.west, maximum: melbourneCbd.east },
      },
      required: ["type", "location", "notes"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    execute(input) {
      if (
        !input ||
        !observationTypes.includes(input.type) ||
        typeof input.location !== "string" ||
        input.location.trim().length < 3 ||
        typeof input.notes !== "string" ||
        input.notes.trim().length < 5
      ) {
        throw new Error("A valid type, location, and observation note are required.");
      }

      if (
        (input.latitude !== undefined || input.longitude !== undefined) &&
        !isInsideMelbourneCbd(Number(input.latitude), Number(input.longitude))
      ) {
        throw new Error("The report coordinate must be inside Melbourne CBD.");
      }

      const report = createReport({
        type: input.type,
        severity: input.severity,
        location: input.location.trim(),
        notes: input.notes.trim(),
        lat: input.latitude,
        lng: input.longitude,
      });
      showToast(`Observation ${report.id} added to the map.`);
      return { reportId: report.id, status: "added", location: report.location };
    },
  });
}

registerWebMcpTools();
