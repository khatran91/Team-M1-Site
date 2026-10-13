# Team M1 — Melbourne Community Flood Map

A responsive flood-observation map for the Elizabeth Street catchment. The prototype uses sample community reports to demonstrate hotspots, exact map-pin reporting, report updates, live rainfall context, location search, and a guided observation form.

> This prototype displays sample community observations. It is not a flood forecast or emergency service.

## Public site and QR code

GitHub Pages URL: [https://khatran91.github.io/Team-M1-Site/](https://khatran91.github.io/Team-M1-Site/)

The printable QR code below opens that public URL directly. The source image is stored at `flood-map/dist/assets/melbourne-flood-map-qr.png`.

![QR code for the Melbourne Community Flood Map](flood-map/dist/assets/melbourne-flood-map-qr.png)

## Requirements

You only need:

- **Python 3** to run a local web server.
- A modern browser such as Chrome, Edge, Firefox, or Safari.
- An internet connection while using the map. Leaflet and its marker-clustering plugin are loaded from a CDN, map tiles come from OpenStreetMap, location search uses Nominatim, and rainfall context uses Open-Meteo.

You do **not** need Node.js, npm, a database, or an API key.

Check that Python is installed:

```bash
python3 --version
```

On Windows, use this command if `python3` is unavailable:

```powershell
py --version
```

## Download and run

Clone the repository:

```bash
git clone https://github.com/khatran91/Team-M1-Site.git
cd Team-M1-Site
```

### macOS or Linux

From the repository folder, run:

```bash
cd flood-map
python3 -m http.server 4173 --directory dist
```

Open [http://localhost:4173](http://localhost:4173) in your browser.

### Windows

From the repository folder, run in PowerShell:

```powershell
cd flood-map
py -m http.server 4173 --directory dist
```

Open [http://localhost:4173](http://localhost:4173) in your browser.

Keep the terminal open while using the site. Press `Control + C` to stop the server.

## If port 4173 is already in use

Choose another port, for example 8080:

```bash
python3 -m http.server 8080 --directory dist
```

On Windows, use `py` instead of `python3`. Then open [http://localhost:8080](http://localhost:8080).

## Project structure

```text
Team-M1-Site/
├── flood-map/
│   ├── dist/
│   │   ├── index.html    # Page structure and content
│   │   ├── style.css     # Layout, colours, and responsive styles
│   │   └── app.js        # Map data and interactions
│   └── .openai/
│       └── hosting.json  # Hosting configuration
└── README.md
```

## Current functionality

- Interactive Elizabeth Street catchment map powered by Leaflet and OpenStreetMap.
- An indicative catchment boundary based on the City of Melbourne's published 2015 catchment plan, with the area outside greyed out.
- No sign-in is required to view the map or add a temporary report.
- Search for addresses, buildings and landmarks inside the catchment.
- Click an exact point inside the catchment to open a pre-filled observation form and record its coordinates.
- Search and choose from catchment streets and intersections inside the report form.
- Filter visible reports by today, the past 7 or 30 days, 6 months, or 1 year.
- See low-impact pins in yellow, moderate-impact pins in orange, and high-impact pins in red.
- Cluster nearby report pins so concentrated observations remain readable.
- Sample flood hotspots and numbered incident markers.
- Recent reports and past hotspots views.
- Time-period selector.
- Incident detail panel.
- Expanded observation categories and a report form that can be dismissed with Close, Cancel, Escape, or a backdrop click.
- Required severity selection on new reports, which controls the yellow, orange, or red pin colour.
- Required observed-depth selection using below or at/above a typical 150 mm kerb reference; rainfall is not used to infer floodwater depth.
- Automatic rainfall-to-report-time lookup and comparison with the previous 30 days to the same time, using Open-Meteo model data.
- Optional JPG, PNG or WebP photo attachment.
- Functional time-stamped community updates and an update log for every report.
- A one-time usability survey shown after reporting during the platform's first month (10 October to 10 November 2026).
- Responsive layout for desktop and mobile screens.

## Important prototype limitations

- All flood reports are sample data stored in `flood-map/dist/app.js`.
- New observations and attached photos are temporary and disappear when the page is refreshed.
- Reports are currently stored only in each visitor's browser session, so they are not shared with other visitors.
- Community updates and survey responses are stored only in that browser's local storage; they are not sent to a shared database.
- Location search and address lookup depend on the public OpenStreetMap Nominatim service.
- Rainfall is model data from Open-Meteo, not an on-site rain gauge, and may be unavailable. It is shown as context only and is never used to estimate water depth.
- The catchment outline is an indicative concept tracing from the published plan, not a survey-grade GIS boundary. Replace it with an authoritative GeoJSON boundary before operational use.
- The map should not be used for emergency decisions or as an official flood warning.

## Data sources and assumptions

- Catchment extent: [City of Melbourne — Elizabeth Street Catchment Integrated Water Cycle Management Plan 2015](https://mvga-prod-files.s3.ap-southeast-4.amazonaws.com/public/2024-05/elizabeth-street-catchment-plan.pdf). The prototype boundary is an indicative tracing of the published map.
- Rainfall: [Open-Meteo Weather Forecast API](https://open-meteo.com/en/docs). The site sums modelled hourly precipitation from midnight to the report time, then compares it with the previous 30 days over the same elapsed hours.
- Typical kerb reference: 150 mm, based on the project team's stated 125–175 mm bluestone kerb range. The reporter chooses below or at/above this reference; the site does not infer water depth from rainfall.

## Editing the site

Edit the files inside `flood-map/dist/`, save your changes, and refresh the browser. No build command is required.

If a change does not appear, perform a hard refresh:

- macOS: `Command + Shift + R`
- Windows/Linux: `Control + Shift + R`

## Troubleshooting

### The map is blank

Check your internet connection. The page needs access to `unpkg.com`, `tile.openstreetmap.org`, `nominatim.openstreetmap.org`, and `api.open-meteo.com`.

### The terminal says the port is already in use

Stop the other local server or follow the alternate-port instructions above.

### `python3` is not recognised

- On Windows, try `py` instead of `python3`.
- Otherwise, install Python 3 from [python.org](https://www.python.org/downloads/).

### The page was opened directly from the file system

Run the local server and use a `http://localhost:...` address. Do not rely on opening `flood-map/dist/index.html` by double-clicking it.
