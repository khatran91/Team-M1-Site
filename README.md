# Team M1 — Melbourne Community Flood Map

A basic, responsive flood-observation map for Melbourne CBD. The prototype uses sample community reports to demonstrate hotspots, report details, location search, and a simple observation form.

> This prototype displays sample community observations. It is not a flood forecast or emergency service.

## Requirements

You only need:

- **Python 3** to run a local web server.
- A modern browser such as Chrome, Edge, Firefox, or Safari.
- An internet connection while using the map. Leaflet is loaded from a CDN, map tiles come from OpenStreetMap, and Melbourne CBD location search uses Nominatim.

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

- Interactive Melbourne CBD map powered by Leaflet and OpenStreetMap.
- Search for addresses, buildings and landmarks throughout Melbourne CBD.
- Click any CBD location on the map to open a pre-filled observation form.
- Sample flood hotspots and numbered incident markers.
- Recent reports and past hotspots views.
- Time-period selector.
- Incident detail panel.
- Observation form with an optional JPG, PNG or WebP photo attachment.
- Responsive layout for desktop and mobile screens.

## Important prototype limitations

- All flood reports are sample data stored in `flood-map/dist/app.js`.
- New observations and attached photos are temporary and disappear when the page is refreshed.
- Location search and address lookup depend on the public OpenStreetMap Nominatim service.
- The map should not be used for emergency decisions or as an official flood warning.

## Editing the site

Edit the files inside `flood-map/dist/`, save your changes, and refresh the browser. No build command is required.

If a change does not appear, perform a hard refresh:

- macOS: `Command + Shift + R`
- Windows/Linux: `Control + Shift + R`

## Troubleshooting

### The map is blank

Check your internet connection. The page needs access to `unpkg.com`, `tile.openstreetmap.org`, and `nominatim.openstreetmap.org`.

### The terminal says the port is already in use

Stop the other local server or follow the alternate-port instructions above.

### `python3` is not recognised

- On Windows, try `py` instead of `python3`.
- Otherwise, install Python 3 from [python.org](https://www.python.org/downloads/).

### The page was opened directly from the file system

Run the local server and use a `http://localhost:...` address. Do not rely on opening `flood-map/dist/index.html` by double-clicking it.
