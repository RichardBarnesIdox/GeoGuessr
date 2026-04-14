# Mini GeoGuessr UK

A minimal browser game where you view a Google Street View panorama, click a guess on a Leaflet UK map, and score points based on distance from the real location.

## Install

No package install is required for the app itself.

You only need:

- A modern browser
- A Google Maps JavaScript API key with Street View support enabled
- A Firebase Realtime Database for the shared leaderboard
- A simple local web server

## Run locally

1. Open [config.js](/c:/Users/richard.barnes/OneDrive%20-%20Idox%20Software%20Ltd/Documents/RB/Python%20Learning/GeoGuessr/geoguessr/config.js) and replace:
   - `YOUR_GOOGLE_MAPS_API_KEY` with your real Google Maps key
   - `YOUR-PROJECT-ID...` with your Firebase Realtime Database URL
2. From this repository folder, start a local server:

```powershell
python -m http.server 8000
```

3. Open `http://localhost:8000` in your browser.

## Google Maps API key

- The app reads the key from [config.js](/c:/Users/richard.barnes/OneDrive%20-%20Idox%20Software%20Ltd/Documents/RB/Python%20Learning/GeoGuessr/geoguessr/config.js).
- A sample file is included at [config.example.js](/c:/Users/richard.barnes/OneDrive%20-%20Idox%20Software%20Ltd/Documents/RB/Python%20Learning/GeoGuessr/geoguessr/config.example.js).
- If the key is missing or invalid, the map game still loads, but Street View will show a simple fallback message.

## Shared leaderboard setup

The leaderboard is now shared by storing the top five scores in Firebase Realtime Database.

1. Create a Firebase project and enable Realtime Database.
2. Copy your database URL into `leaderboardDatabaseUrl` in [config.js](/c:/Users/richard.barnes/OneDrive%20-%20Idox%20Software%20Ltd/Documents/RB/Python%20Learning/GeoGuessr/geoguessr/config.js).
3. Add database rules that allow this app to read and write the `leaderboard` node.

For a simple public demo, rules like this are enough:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "leaderboard": {
      ".read": true,
      ".write": true
    }
  }
}
```

This is fine for a casual internal game, but it is not secure against deliberate tampering because the app runs entirely in the browser and scores are client-generated.

## Project structure

- [index.html](/c:/Users/richard.barnes/OneDrive%20-%20Idox%20Software%20Ltd/Documents/RB/Python%20Learning/GeoGuessr/geoguessr/index.html) contains the page structure.
- [styles.css](/c:/Users/richard.barnes/OneDrive%20-%20Idox%20Software%20Ltd/Documents/RB/Python%20Learning/GeoGuessr/geoguessr/styles.css) contains the minimal styling.
- [app.js](/c:/Users/richard.barnes/OneDrive%20-%20Idox%20Software%20Ltd/Documents/RB/Python%20Learning/GeoGuessr/geoguessr/app.js) contains the game logic and hardcoded round data.

## Notes

- The guess map uses Leaflet with OpenStreetMap tiles.
- Google Maps JavaScript API is used only for Street View.
- Round data is hardcoded in the frontend.
- The leaderboard is shared across all users of the same deployed site when they point at the same Firebase database URL.
