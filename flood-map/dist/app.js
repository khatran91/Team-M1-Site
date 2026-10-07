const reports = [
  {
    id: 1,
    title: "Blocked drain",
    severity: "Low impact",
    location: "Elizabeth Street near Queen Victoria Market",
    lat: -37.8087,
    lng: 144.9607,
    date: "8 Nov 2024, 8:10 am",
    rainfall: "22 mm",
    notes: "Leaves blocked the corner drain and water spread into the bicycle lane.",
    duration: "20–30 min",
    depth: "Below kerb",
  },
  {
    id: 2,
    title: "Water pooling",
    severity: "Moderate impact",
    location: "Elizabeth Street, Melbourne",
    lat: -37.8139,
    lng: 144.9622,
    date: "14 Feb 2024, 5:20 pm",
    rainfall: "38 mm",
    notes: "Water pooled along the kerb after heavy rain. The drain cleared slowly.",
    duration: "45–60 min",
    depth: "Kerb height",
  },
  {
    id: 3,
    title: "Road flooding",
    severity: "High impact",
    location: "Flinders Lane near Swanston Street",
    lat: -37.8172,
    lng: 144.9653,
    date: "23 Dec 2023, 6:45 pm",
    rainfall: "44 mm",
    notes: "One traffic lane was covered and vehicles slowed to pass the intersection.",
    duration: "60–90 min",
    depth: "Above kerb",
  },
];

const searchPlaces = [
  { label: "Elizabeth Street, Melbourne", lat: -37.8139, lng: 144.9622, reportId: 2 },
  { label: "Queen Victoria Market", lat: -37.8076, lng: 144.9568, reportId: 1 },
  { label: "Flinders Street Station", lat: -37.8183, lng: 144.9671, reportId: 3 },
  { label: "Swanston Street, Melbourne", lat: -37.8147, lng: 144.966, reportId: 3 },
  { label: "Bourke Street, Melbourne", lat: -37.8134, lng: 144.9635, reportId: 2 },
];

const map = L.map("map", {
  zoomControl: true,
  minZoom: 13,
  maxZoom: 19,
}).setView([-37.8138, 144.9634], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);
const heatLayer = L.layerGroup().addTo(map);

const markerIcon = (number) =>
  L.divIcon({
    className: "incident-marker",
    html: `<div class="incident-pin"><span>${number}</span></div>`,
    iconSize: [42, 48],
    iconAnchor: [21, 45],
  });

function drawHotspots(visible = true) {
  heatLayer.clearLayers();
  if (!visible) return;
  const rings = [
    [-37.8087, 144.9607, 180],
    [-37.8139, 144.9622, 245],
    [-37.8172, 144.9653, 165],
  ];

  rings.forEach(([lat, lng, radius], index) => {
    L.circle([lat, lng], {
      radius,
      stroke: false,
      fillColor: index === 1 ? "#ef554c" : "#f8ad43",
      fillOpacity: index === 1 ? 0.22 : 0.18,
      interactive: false,
    }).addTo(heatLayer);
    L.circle([lat, lng], {
      radius: radius * 0.58,
      stroke: false,
      fillColor: index === 1 ? "#ef554c" : "#ffca61",
      fillOpacity: 0.24,
      interactive: false,
    }).addTo(heatLayer);
  });
}

function addMarker(report) {
  const marker = L.marker([report.lat, report.lng], {
    icon: markerIcon(report.id),
    keyboard: true,
    title: `${report.id}. ${report.title}`,
  }).addTo(markerLayer);
  marker.on("click", () => selectReport(report.id, true));
  report.marker = marker;
}

reports.forEach(addMarker);
drawHotspots(true);

const ui = {
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
  legend: document.querySelector("#legend"),
  evidence: document.querySelector("#evidence-details"),
  evidenceButton: document.querySelector("#evidence-button"),
  toast: document.querySelector("#toast"),
};

let selectedReportId = 2;
let currentView = "hotspots";
let toastTimer;

function selectReport(id, pan = false) {
  const report = reports.find((item) => item.id === Number(id));
  if (!report) return false;
  selectedReportId = report.id;
  ui.areaName.textContent = report.location;
  ui.reportNumber.querySelector("span").textContent = report.id;
  ui.severity.textContent = report.severity;
  ui.title.textContent = report.title;
  ui.meta.textContent = `Historical report · ${report.date}`;
  ui.rainfall.textContent = report.rainfall;
  ui.copy.textContent = report.notes;
  ui.duration.textContent = report.duration;
  ui.depth.textContent = report.depth;
  ui.evidence.hidden = true;
  ui.evidenceButton.textContent = "View details";
  if (pan) map.flyTo([report.lat, report.lng], 16, { duration: 0.6 });
  return true;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  toastTimer = window.setTimeout(() => ui.toast.classList.remove("show"), 2600);
}

document.querySelectorAll("[data-view]").forEach((tab) => {
  tab.addEventListener("click", () => {
    currentView = tab.dataset.view;
    document.querySelectorAll("[data-view]").forEach((item) => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    drawHotspots(currentView === "hotspots");
    ui.legend.hidden = currentView !== "hotspots";
    ui.summary.textContent = currentView === "hotspots"
      ? `${reports.length} sample hotspots shown · ${document.querySelector("#period-select").selectedOptions[0].textContent}`
      : `${reports.length} recent sample reports shown`;
  });
});

document.querySelector("#period-select").addEventListener("change", (event) => {
  if (currentView === "hotspots") {
    ui.summary.textContent = `${reports.length} sample hotspots shown · ${event.target.selectedOptions[0].textContent}`;
  }
});

ui.evidenceButton.addEventListener("click", () => {
  ui.evidence.hidden = !ui.evidence.hidden;
  ui.evidenceButton.textContent = ui.evidence.hidden ? "View details" : "Hide details";
});

document.querySelector("#update-button").addEventListener("click", () => {
  const report = reports.find((item) => item.id === selectedReportId);
  showToast(`Update noted for ${report.title}.`);
});

const searchInput = document.querySelector("#location-search");
const searchResults = document.querySelector("#search-results");

function renderSearchResults(query) {
  const matches = searchPlaces.filter((place) =>
    place.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  searchResults.replaceChildren();
  if (!query.trim() || matches.length === 0) {
    searchResults.hidden = true;
    return matches;
  }
  matches.slice(0, 5).forEach((place) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "option");
    button.textContent = place.label;
    button.addEventListener("click", () => choosePlace(place));
    searchResults.append(button);
  });
  searchResults.hidden = false;
  return matches;
}

function choosePlace(place) {
  searchInput.value = place.label;
  searchResults.hidden = true;
  map.flyTo([place.lat, place.lng], 16, { duration: 0.7 });
  selectReport(place.reportId, false);
}

searchInput.addEventListener("input", () => renderSearchResults(searchInput.value));
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") searchResults.hidden = true;
});

document.querySelector("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const matches = renderSearchResults(searchInput.value);
  if (matches.length) choosePlace(matches[0]);
  else showToast("Try Elizabeth Street, Swanston Street, or Flinders Street Station.");
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search")) searchResults.hidden = true;
});

const dialog = document.querySelector("#report-dialog");
const form = document.querySelector("#observation-form");
document.querySelector("#report-button").addEventListener("click", () => dialog.showModal());

function createReport({ type, location, notes }) {
  const center = map.getCenter();
  const report = {
    id: reports.length + 1,
    title: type,
    severity: "New observation",
    location,
    lat: center.lat,
    lng: center.lng,
    date: "Just now",
    rainfall: "Pending",
    notes,
    duration: "Not provided",
    depth: "Not provided",
  };
  reports.push(report);
  addMarker(report);
  selectReport(report.id, true);
  ui.summary.textContent = `${reports.length} sample reports shown`;
  return report;
}

form.addEventListener("submit", (event) => {
  const submitter = event.submitter;
  if (!submitter || submitter.id !== "submit-report") return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  const report = createReport({
    type: document.querySelector("#observation-type").value,
    location: document.querySelector("#observation-location").value.trim(),
    notes: document.querySelector("#observation-notes").value.trim(),
  });
  dialog.close();
  document.querySelector("#observation-notes").value = "";
  showToast(`Observation ${report.id} added to the sample map.`);
});

selectReport(2, false);

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
    description: "Read the flood observations currently displayed on the Melbourne map.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute() {
      return reports.map(({ id, title, location, date, severity }) => ({ id, title, location, date, severity }));
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
      if (!Number.isInteger(input?.reportId) || !selectReport(input.reportId, true)) {
        throw new Error("A visible report with that ID was not found.");
      }
      const report = reports.find((item) => item.id === input.reportId);
      return { selectedReportId: report.id, title: report.title, location: report.location };
    },
  });

  register({
    name: "add_flood_report",
    title: "Add flood report",
    description: "Add a new community flood observation at the current center of the visible map.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["Water pooling", "Blocked drain", "Road flooding"] },
        location: { type: "string", minLength: 3, maxLength: 120 },
        notes: { type: "string", minLength: 5, maxLength: 500 },
      },
      required: ["type", "location", "notes"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    execute(input) {
      if (
        !input ||
        !["Water pooling", "Blocked drain", "Road flooding"].includes(input.type) ||
        typeof input.location !== "string" ||
        input.location.trim().length < 3 ||
        typeof input.notes !== "string" ||
        input.notes.trim().length < 5
      ) {
        throw new Error("A valid type, location, and observation note are required.");
      }
      const report = createReport({
        type: input.type,
        location: input.location.trim(),
        notes: input.notes.trim(),
      });
      showToast(`Observation ${report.id} added to the sample map.`);
      return { reportId: report.id, status: "added", location: report.location };
    },
  });
}

registerWebMcpTools();
