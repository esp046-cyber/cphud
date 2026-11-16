# CP HUD – iPhone 8 Plus Personal HUD (PWA)
Four buttons: **Home**, **Settings** (device monitoring), **Config** (customisation, export/import/backup), **Screens** (1/2/3/4/6/custom multi-panel grid with drag-to-swap, ratio sliders, presets).
20 panels: clock, calendar, GPS, location, weather, battery, device, network, internet, camera, gallery, notifications, messages, Facebook, storage, permissions, performance, emergency info, notes, diagnostics.

## Deploy (replaces the contents of github.com/esp046-cyber/cphud)
1. Unzip. 2. In the repo choose **Add file › Upload files**, drag in *everything inside* the `cphud` folder (index.html, manifest.json, service-worker.js, offline.html, css/, js/, icons/, README.md) and commit to `main`.
3. **Settings › Pages**: Deploy from branch `main` / root. 4. Open `https://esp046-cyber.github.io/cphud/` (HTTPS is required for GPS/camera).

## Install on iPhone
Open the URL in **Safari** › Share › **Add to Home Screen**. Launch from the icon. Allow Location/Camera when asked (Settings › Privacy & Security / Safari if you tapped Don't Allow).

## Updating
Bump `V` in `service-worker.js` and `VERSION` in `js/core.js`. Users see an "Update available" bar; settings/layouts/images live in localStorage/IndexedDB and are never cleared by cache cleanup.

## Compatibility / honest limits (iOS Safari)
| Feature | Status |
|---|---|
| GPS | Works while app is open; **no background tracking**; watch pauses when app is hidden |
| Camera | Works (HTTPS, user tap); stops when hidden/closed; Upload fallback |
| Battery API | **Not available on iOS** – shows "not supported" |
| Wi-Fi/cellular type, SSID, device model, storage total | **Not exposed** by Safari – shown as such |
| Notifications | Only for HUD's own alerts, iOS 16.4+ and installed app. Cannot read other apps' notifications |
| Messages / Facebook | Open via `sms:` / web links only; cannot read conversations |
| Weather | Open-Meteo (no key); cached copy with timestamp when offline |
| Drag/resize | Drag the ⠿ handle to swap; resize via ↔ ↕ sliders (20–80 %) |

## Testing report (honest)
Performed: JavaScript syntax validation of all modules (Node); code review of permission-denied, unsupported-API, timeout, offline, corrupt-settings, duplicate-panel and crash-recovery paths.
**Not performed:** testing on a physical iPhone 8 Plus or in a browser. Please verify on-device (layouts, drag, camera, GPS) and report issues.
Not implemented: per-panel individual settings dialogs (⚙ opens Config), free-form pixel resizing/merging of arbitrary panels (use layouts + sliders), image export.
