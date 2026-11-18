# Riego Progress Log

## Project Summary
- **Project:** Riego — AI-Powered Smart Irrigation System for Smallholder Farmers
- **Developer:** G Sathvik
- **Internship:** Infosys Springboard (8 Weeks)
- **Current Milestone:** Week 1–2 — Field Registration API and Sensor Data Ingestion (Backend)

---

## Session 2: Week 1 — Responsive Layout Update (Phone, Tablet, Desktop)

### Problem Addressed
The initial home dashboard was mobile-first but rendered as a narrow, constrained 512px column on tablets and laptops, leaving large empty margins. The layout has now been updated to responsively adapt across phone, tablet, and desktop viewports using Tailwind breakpoints while keeping mobile as the primary reference design.

### What Was Built & Changed

1. **Responsive App Shell (`riego/app/layout.tsx`)**:
   - **Phone (<640px)**: Retains the exact mobile single-column layout with sticky TopBar, bottom navigation bar, and padding (`pb-28`) for navigation clearance.
   - **Tablet (640px to 1023px)**: Expands content to full width with comfortable padding (`sm:px-6 md:px-8`), eliminating the narrow column while keeping the bottom navigation bar active.
   - **Desktop ($\ge$1024px)**: Replaces the bottom navigation with a fixed left sidebar (`w-64`). Content area is offset by `lg:pl-64` with a maximum width of ~1200px (`max-w-6xl mx-auto`) and zero horizontal scrolling (`overflow-x-hidden`).

2. **Desktop Sidebar Navigation (`riego/components/Sidebar.tsx`)**:
   - Fixed left sidebar visible only on desktop (`hidden lg:flex`).
   - Displays Riego branding header and farmer profile badge at the bottom.
   - 4 large navigation items (`Home`, `Plan`, `Fields`, `Alerts`) with icons, labels, and active tab highlighting via Next.js `usePathname()`.
   - All touch/click targets meet accessibility requirements ($\ge 56\text{px}$).

3. **Responsive TopBar (`riego/components/TopBar.tsx`)**:
   - Spans the content area at every breakpoint.
   - On desktop ($\ge$1024px), displays full language names (`English`, `हिन्दी`, `ಕನ್ನಡ`) and adds a visible `"Help"` text label next to the `?` button.
   - On mobile/tablet, retains the compact `EN | हिं | ಕ` switcher and profile circle.

4. **Responsive Dashboard Grid (`riego/app/page.tsx`)**:
   - **Advice & Weather Row**:
     - Phone & Tablet: Stacked vertically full-width.
     - Desktop ($\ge$1024px): Side-by-side in a 12-column row (`AdviceCard` takes 7 cols, `WeatherStrip` takes 5 cols).
   - **Field Cards Grid**:
     - Phone (<640px): 1-column list.
     - Tablet (640px to 1023px): 2-column grid (`sm:grid-cols-2 gap-4`).
     - Desktop ($\ge$1024px): 3-column grid (`lg:grid-cols-3 gap-6`).

5. **Component Scaling & Placeholder Shells**:
   - `AdviceCard.tsx`: Scaled typography (`text-xl sm:text-2xl lg:text-3xl`), optimal watering window hint on larger screens, and balanced button sizes.
   - `WeatherStrip.tsx`: Adapts from a horizontal strip on mobile to a telemetry card on desktop matching the row height.
   - `FieldCard.tsx`: Preserves triple cue status (Color + Icon + Word: Good / Okay / Dry) with equal card heights in 2-column and 3-column grids.
   - `plan/page.tsx`, `fields/page.tsx`, `alerts/page.tsx`: Share the responsive shell (sidebar on desktop, bottom nav on tablet/mobile).

---

### Verification
- `npm run build`: Successfully built all pages with 0 errors. All routes (`/`, `/plan`, `/fields`, `/alerts`) prerendered statically.
- `npm run dev`: Development server running cleanly on `http://localhost:3000`.
- Verified layout responsiveness across 390px (Phone), 768px (Tablet), 1024px (Desktop), and 1440px (Wide screen) with zero horizontal overflow.

---

## Session 3: Week 1 — Field Registration Form UI (/fields/new)

### Problem Addressed
Implemented the multi-step field registration form specified in SRS Section 4.4 to let farmers register new plots, select crops and soil characteristics, and attach IoT sensor device IDs without backend dependencies.

### What Was Built & Changed

1. **Fields Page & Route Creation (`riego/app/fields/page.tsx`, `riego/app/fields/new/page.tsx`)**:
   - Added an accessible "Add Field" action button ($\ge 56\text{px}$) on the Fields page and shortcut card.
   - Created `/fields/new` route centered with max width ~600px, responsive across mobile, tablet, and desktop viewports.

2. **Multi-Step Form Component (`riego/components/FieldRegistrationForm.tsx`)**:
   - **Progress Indicator**: Step 1 to 5 counter, active step title, percentage completion, progress bar, and clickable completed step pills.
   - **Screen 1 (Field Basics)**: Auto-generated read-only Field ID, optional nickname, location picker (GPS or Map Pin), area size number input, and unit cards (Acres/Guntas).
   - **Screen 2 (Crop)**: Tap-friendly option cards for regional crops (Wheat, Rice, Tomato, Maize, Cotton, Mustard, Sugarcane, Potato) and sowing date picker paired with a "Not sown yet" toggle.
   - **Screen 3 (Soil & Water)**: Option cards with descriptive hints for Soil type (Sandy, Loamy, Clay), Water source (Borewell, Canal, Tank, Rain-fed), Irrigation method (Drip, Sprinkler, Flood), and optional Pump flow rate with an "I don't know" button.
   - **Screen 4 (Sensor Device)**: "Yes, installed" vs. "Not yet" toggle cards. Conditional Device ID input with visual QR scan button, and reassurance note when sensor is deferred.
   - **Screen 5 (Review & Save)**: Grouped summary cards with "Edit" buttons linking back to each step, automatic growth stage calculation from sowing date, in-memory saving via `addSampleField()`, and celebratory success screen.
   - **Validation & Accessibility**: Strict field validation on each step with plain error alerts; all touch targets $\ge 56\text{px}$; color is always paired with icons and text.

3. **Data Types & Sample Option Lists (`riego/lib/types.ts`, `riego/lib/sampleData.ts`, `riego/lib/api.ts`)**:
   - Added `FieldFormData` and `FormOption` interfaces.
   - Centralized all option lists (`cropOptions`, `soilTypeOptions`, `waterSourceOptions`, `irrigationMethodOptions`, `areaUnitOptions`) in `sampleData.ts`.
   - Added in-memory mutation helpers (`addSampleField`, `createField`) so saved fields appear in `getFields()`.

---

### Verification
- `npm run build`: Successfully built all pages with 0 errors (`/`, `/plan`, `/fields`, `/fields/new`, `/alerts`).
- Validated all 5 steps with required input checks, backward/forward navigation, edit shortcuts, and memory persistence.

---

## Session 4: Week 1 — TopBar & Dashboard Card Polish (Phone & Desktop Consistency)

### Problem Addressed
Refined the mobile top bar layout to include the Riego drop logo without overlapping at 360px and 390px widths, and unified the Advice and Weather cards so their content and styling remain clean and identical across phone and desktop viewports.

### What Was Built & Changed

1. **Mobile TopBar Layout (`riego/components/TopBar.tsx`)**:
   - Far left retains the farmer profile circle (`farmerInitial`).
   - Center displays the Riego logo (square emerald card with water drop `💧`, matching the desktop sidebar) directly before the "Riego" brand title.
   - Right maintains the accessible "?" help button and language switcher (`EN | हिं | ಕ`).
   - Compact spacing and padding ensures zero overlap on 360px and 390px viewports.

2. **AdviceCard Cleanup (`riego/components/AdviceCard.tsx`)**:
   - Removed desktop-only footer metadata ("AI recommendation updated 15m ago" and "Optimal window: 6:00 - 6:30 AM").
   - Card content and styling now match identically across phone and desktop.

3. **WeatherStrip Content & Wrapping Fix (`riego/components/WeatherStrip.tsx`)**:
   - Removed the "Farm Weather Telemetry" heading, "OpenWeather" label, and "Evaporation: Normal" footer.
   - Weather card now focuses solely on the three telemetry metrics: Temperature, Rain Forecast, and Humidity.
   - Added `whitespace-nowrap` to ensure "Rain: No" stays strictly on a single line.

---

### Verification
- `npm run build`: Successfully built all pages with 0 errors.
- Verified TopBar layout at 360px and 390px with comfortable spacing between left profile, center brand with logo, and right language/help controls.

---

### What's Next
- **Week 1–2: Sensor and Weather Ingestion (Module 1)**:
  - Setup FastAPI backend foundation.
  - Define data schemas for sensor telemetry (MQTT/REST) and weather forecasts (OpenWeatherMap).
  - Connect `riego/lib/api.ts` to backend endpoints.

---

## Session 5: Week 1–2 — Field Registration API and Sensor Data Ingestion (Backend)

### What Was Built & Changed

1. **Setup (`backend/`)**:
   - TimescaleDB running in Docker (`riego_db`, image `timescale/timescaledb:latest-pg16`, port 5432), with data persisted in a named Docker volume (`riego_data`).
   - FastAPI server entry point in `main.py`; secrets in `.env` (not committed).
   - `DATABASE_URL` uses the `postgresql+psycopg2://` driver scheme required by SQLAlchemy.

2. **Database (`models.py`)**:
   - `fields` table: stores all field metadata (location, crop, soil, irrigation, sensor flag, device ID, registration time).
   - `sensor_readings` converted to a TimescaleDB hypertable on the `time` column via `create_hypertable(..., if_not_exists => TRUE)` on startup — safe to run on every restart.

3. **Field API (`routers/fields.py`, `schemas.py`)**:
   - `POST /fields`: saves a new field; `farmer_id` is fixed to `"farmer_001"`; returns 409 if `device_id` is already in use.
   - `GET /fields`: lists all fields, newest first.
   - `GET /fields/{id}`: single field or 404.
   - Validation (Pydantic): `area_unit` ∈ {acres, guntas}, `soil_type` ∈ {Sandy, Loamy, Clay}, `water_source` ∈ {Borewell, Canal, Tank, Rain-fed}, `irrigation_method` ∈ {Drip, Sprinkler, Flood}, lat/lon bounds, area > 0, sowing date not in the future, `device_id` required when `has_sensor` is true.
   - `growth_stage` added to `FieldOut` (computed, not stored): Germination (0–14 days), Vegetative (15–45), Flowering (46–75), Maturity (76+), or "Not sown yet" — defined in `growth.py`.

4. **Sensor Ingestion (`routers/sensor_readings.py`, `models.py`)**:
   - `POST /sensor-readings`: accepts `device_id`, `raw_value`, optional `time`; looks up the field by `device_id` (404 if unknown); saves the reading with 201.
   - `GET /sensor-readings/{device_id}`: returns the latest 20 readings, newest first.

5. **Validation (`schemas.py`)**:
   - `raw_value` must be an integer in [0, 4095] (ESP32 12-bit ADC range).
   - `device_id` required and non-empty (spaces trimmed).
   - Timestamp (if supplied) must be within −7 days to +5 minutes of now.
   - Duplicate `(device_id, time)` returns 409 instead of a database crash; guarded both in the query and with `IntegrityError` rollback.

6. **Normalization (`normalize.py`, `calibration.py`)**:
   - `raw_to_moisture_percent()`: linear conversion from raw ADC to 0–100%, clamped and rounded to 1 decimal. Formula: `(DRY_RAW − raw) / (DRY_RAW − WET_RAW) × 100`.
   - Calibration placeholders in `calibration.py`: `DRY_RAW = 3500`, `WET_RAW = 1500` (to be replaced after real sensor calibration).
   - `to_utc()`: naive timestamps treated as UTC; timezone-aware timestamps converted to UTC before saving.
   - `moisture_percent` is stored with every reading and returned in the POST response.

7. **Missing Data Status (`routers/fields.py`)**:
   - `GET /fields/{id}/latest-reading`: returns `field_id`, `status`, `message`, `moisture_percent`, `time`, and `age_minutes`.
   - Four statuses: `no_sensor` (field has no sensor), `no_data` (sensor registered but no readings yet), `stale` (latest reading older than `STALE_AFTER_MINUTES = 15`), `ok`.
   - Reading fields are always `null` when there is no reading — no made-up values.

8. **Sensor Simulator (`fake_sensor.py`)**:
   - Simulates a capacitive moisture sensor: starts at raw ~2500, drifts up slowly (drying), with ~10% chance of a large drop (irrigation event).
   - CLI flags: `--device-id` (default `ESP32-001`), `--interval` (default 5s), `--url`, `--skip-chance` (0.0–1.0, simulates dropouts), `--stop-after` (auto-stop after N sent readings).
   - Prints timestamp, raw value, moisture %, and HTTP status each cycle. Fails gracefully if the server is down.

---

### Verification
- `GET /health` returned `{"status": "ok"}` immediately after server start.
- Registered a test field via `POST /fields` at `/docs`; confirmed 201 response and correct `growth_stage`.
- Duplicate `device_id` on a second field returned 409 as expected.
- Ran `fake_sensor.py` for 20 readings; all saved with correct `moisture_percent` values.
- `GET /sensor-readings/ESP32-001` returned 20 readings ordered newest first.
- `GET /fields/1/latest-reading` returned status `ok` during active simulation and `stale` after pausing.
- Duplicate timestamp injection via `/docs` returned 409 without crashing the server.
- Out-of-range `raw_value` (e.g. 5000) returned 422 with a plain error message.

---

## Session 6: Week 2 — Desktop Home Dashboard Redesign (Task 1)

### Problem Addressed
Mentor feedback noted that the mobile interface was working well, but the desktop dashboard had excessive empty space and needed better use of screen real estate.

### What Was Built & Changed

1. **Sample Data and Types (`lib/sampleData.ts`, `lib/types.ts`, `lib/api.ts`)**:
   - Added 7-day moisture history data points and `MOISTURE_TARGET` (40–70% range).
   - Added today's irrigation schedule (3 items with field name, duration, time, done status).
   - Expanded alerts data (4 items with severity, message, time label, recommended action, read state).
   - Added advice "best time" and "water amount" telemetry, calculated summary stats, and enriched field details (sensor status, last reading, next watering, sown date, area).

2. **Summary Tiles Row (Desktop only)**:
   - 4-tile header row showing average moisture with a 7-day sparkline, rain chance, active alerts count, and sensors online.
   - Each tile includes a single helper line and an explicit status word pill ("Low", "Rain-safe", "Check", "1 offline") alongside color cues.

3. **Home Layout (Desktop)**:
   - Greeting and date moved into the top navigation bar.
   - Advice card updated with best time and water amount telemetry glass pills.
   - Weather card and field cards upgraded with moisture progress bar, 7-day trend line, and a 2×3 details grid (Sensor, Stage, Last reading, Sown, Next watering, Area).
   - Tighter vertical rhythm and card gaps so the primary content fits comfortably within a 1440×900 viewport.

4. **Bottom Row (Desktop only)**:
   - Interactive 7-day moisture trend chart (`MoistureChart.tsx`) with shaded target band and distinct line styles (solid, dashed, dotted) so color is never the only signal.
   - Today's schedule preview (`SchedulePreview.tsx`) showing chronological irrigation events with link to `/plan`.
   - Recent alerts preview (`RecentAlerts.tsx`) showing the latest 2 alerts with stacked metadata and link to `/alerts`.

5. **Shared Style**:
   - Standardized on a strict 4-tier type scale (`text-4xl`, `text-xl`, `text-base`, `text-sm`), sentence-case labels (all uppercase letter-spaced labels removed), uniform `rounded-3xl` cards with `p-6` padding, `border-[#DCD6C0]`, `shadow-sm`, and 48px icon boxes.
   - Built reusable inline SVG line icons in `components/icons.tsx` (drop, cloud-rain, bell, signal, sun, thermometer, speaker, clock, tank, check, alert).

6. **Alerts Page (`app/alerts/page.tsx`)**:
   - Dedicated alerts screen with severity filter tabs and counts (All, Critical, Warning, Info).
   - 2-column responsive alert card grid with severity badges, plain-language recommended action boxes, bold unread borders, and empty state.

7. **Fixes**:
   - Removed decorative background bleed notch from the Advice card top right corner.
   - Fixed tablet 2-column field grid so odd last card spans both columns.
   - Fixed field card details grid with `whitespace-nowrap` to prevent text truncation.

8. **Phone and Tablet**:
   - Phone and tablet layouts remain unchanged, inheriting only the unified typography scale and card styling.

---

### Verification
- `npm run build` passed with 0 errors after each step; layouts checked at 390px, 768px, 1024px and 1440px.

---

### Known Gaps
- Alerts page still uses a few emoji icons (field icon, severity badges).
- Plan page and Fields page are still empty shells.
- All data is static sample data, not connected to the backend.
- Moisture chart has extra empty space above the lines (0–100% axis).

---

### What's Next
1. Farmer accounts, then signup, login and landing pages (fake OTP for now)
2. Weather API integration
3. Historical data storage (weather table, history endpoints)
4. Combine sensor and weather data
5. Add recommendations and irrigation log tables, then connect frontend to backend, plus manual reading entry screen
6. ML data set structure and fake data generator (lowest priority)

---

## Session 7: Week 2 (15 November 2026) — Task 2: Farmer Accounts, Signup, Login and Landing Page (Fake OTP)

### Backend
- Added `farmers` table and `Farmer` model. `fields.farmer_id` links to it (FK exists in the model only; existing tables were not recreated).
- `farmer_001` (Ramesh Kumar) is seeded on startup.
- Added endpoints: `POST /auth/signup`, `POST /auth/request-otp`, `POST /auth/verify-otp`, and `GET /auth/me`. Tested, all passing.
- OTP is fake (`123456`) and tokens are kept in memory. Both are placeholders for Twilio and JWT.

### Frontend
- Created route groups `(app)` and `(auth)`. The sidebar, top bar, and bottom nav appear only on app pages.
- Built `/welcome` landing page with full-screen photo, language switcher, and benefit rows.
- Built `/signup` (details, OTP, success) and `/login` (phone, OTP) using the shared `OtpInput` component.
- Created `Logo` component with the Riego logo, used on all pages.
- Added fake session in the browser. Logged-out visitors go to `/welcome`. Farmer name and initial are shown, with a Log out button on desktop and mobile.

### Not Connected Yet
- Signup and login screens do not call the backend. They use browser storage and the demo code `123456`.
- Language switchers are visual only.

### What's Next
- Task 3: Weather API integration.

---

## Session 8: Week 2 (15 November 2026) — Task 3: Weather API Integration

### Backend
- `backend/services/weather.py`: `get_current_weather` and `get_forecast` using OpenWeatherMap (free endpoints, metric units, 10 second timeout). Key is read from `backend/.env` (`OPENWEATHER_API_KEY`); `.env` is in `.gitignore`.
- Forecast is grouped into daily summaries (min/max temperature, average humidity, total rain, rain chance, `rain_expected`).
- `WeatherUnavailable` exception: the app never crashes when the weather API fails (FR-1.4, NFR-5).
- `backend/routers/weather.py`: `GET /weather/{field_id}` uses the field's latitude and longitude. Returns 404 for an unknown field and 503 with a plain message when weather is down.
- In-memory cache of 10 minutes per location to protect the free API limit.

### Verification
- Tested live: returned real current weather and a 5-day forecast for field 1 and the values matched the phone weather app.

### Not Done Yet
- Weather is not saved to the database (Task 4, weather history).
- Weather is not shown in the frontend yet (Task 6).
- Cache is in memory and is lost on restart.

### What's Next
- Task 4, historical data storage.

---

## Session 9: Week 2 (15 November 2026) — Task 4: Historical Data Storage

### Backend
- New `weather_readings` table (TimescaleDB hypertable, same pattern as `sensor_readings`): field, `recorded_at`, temperature, humidity, wind, rain in the last hour, `is_raining`, description. Index on field and time. Existing tables were not changed.
- `GET /weather/{field_id}` now saves a reading each time fresh weather is fetched. No duplicate is saved within 10 minutes (also after a restart). If saving fails, the farmer still gets the weather. Nothing is saved when the weather service is down.
- `GET /weather/{field_id}/history`: past weather for the last N hours (default 24, 1 to 720), oldest first, empty list when there is no data, 404 for an unknown field.
- `GET /sensor-readings/{field_id}/history`: same style for soil moisture readings (this endpoint did not exist before).
- All tested with temporary rows, which were deleted afterwards.

### Not Done Yet
- The 5-day forecast is not stored (it is still only in the 10-minute memory cache).
- Weather is only saved when someone opens the weather endpoint. No background job saves it automatically yet.
- No automatic deletion of old data.

### What's Next
- Task 5, combine sensor and weather data.

---

## Session 10: Week 2 (16 November 2026) — Task 5: Combine Sensor and Weather Data

### Backend
- `backend/services/conditions.py`: `get_field_conditions` gathers, for one field, the latest soil moisture (with status ok, stale, no_data or no_sensor), current weather, 5-day forecast, days since sowing, and a list of plain notes for anything missing or old. Moisture and weather work independently, so one failing never breaks the other (FR-1.4, NFR-5).
- Shared helpers so nothing is written twice: `services/sensor.py` (latest reading and stale rule) and `fetch_field_weather` in `services/weather.py` (10-minute cache and history saving). The weather and latest-reading endpoints behave exactly as before.
- `GET /fields/{field_id}/conditions` returns it all in one response. Always 200 for an existing field, 404 for an unknown one.
- Simple rules for now: moisture level dry (below 30), okay (30 to 59), good (60 and above), with the cut-offs as named constants; `rain_expected_soon` and `rain_total_mm_next_2_days` from today and tomorrow's forecast; a note when soil is dry but rain is expected.
- Tested with fake weather data and real fields; test rows were deleted.

### Not Done Yet
- The moisture cut-offs and rain rules are plain rules. The ML engine replaces them later.
- No watering advice is made yet.
- Frontend does not call this endpoint yet (Task 6).

### What's Next
- Task 6, connect the frontend to the backend, add the manual reading entry screen, and add the recommendations and irrigation-log tables just before it.

---

## Session 11: Week 2 (16 November 2026) — Task 6: Connect Frontend to Backend, Manual Reading Entry, Recommendations and Irrigation Log

### Backend
- New tables `recommendations` and `irrigation_log`, with endpoints `POST /recommendations`, `GET /fields/{field_id}/recommendations`, `POST /irrigation-log`, `GET /fields/{field_id}/irrigation-log`. A log entry linked to a recommendation marks it done.
- `POST /fields/{field_id}/manual-reading` saves a typed moisture value into `sensor_readings` as device `manual-<field_id>` (no table change). Manual readings count in latest reading, history and conditions, and conditions now has a source (sensor or manual).
- CORS allows only `http://localhost:3000` and `http://127.0.0.1:3000`.

### Frontend
- `lib/api.ts` connection layer with 10 second timeout and plain farmer-friendly errors; `ErrorNotice` and `LoadingCard` components.
- Fields page and the field registration form use the real backend (duplicate device ID shows a plain message).
- Dashboard uses real fields, weather strip, summary tiles and 7-day trends from sensor history; shows last saved data from the browser when the backend cannot be reached (NFR-3, NFR-5).
- Manual reading pop-up (bottom sheet on phone, centred on desktop) opened from each field card.
- Plan page Done button saves to the irrigation log and is remembered after reload.
- Field card fixes: device "null" now shows a dash, last reading shows the real age.

### Not Done Yet
- Login and signup still use the browser-only fake OTP and are not connected to the backend `/auth` endpoints.
- New fields use the fixed farmer `farmer_001` and a placeholder location (Use my current location is not real GPS).
- Advice card, schedule cards, recent alerts and the Active alerts tile are sample data until the ML engine and alert engine exist.
- No recommendations are created automatically yet.
- Weather history is saved only when someone opens a weather screen; no background job.

### What's Next
- Task 7, ML data set structure and fake data generator.

---

## Session 12: Weeks 3–4 (18 November 2026) — Task 7 (Part 1): ML Dataset Structure

### ML Engine & Dataset Specification
- `backend/ml/DATASET.md`: the dataset specification. One row is one field at one hour. 27 columns grouped by source (field registration, crop stage, soil moisture from sensor or manual reading, current weather, forecast, irrigation history). Each column has a type, unit, allowed range, source and meaning.
- Targets: `irrigate_now` (0 or 1) and `irrigation_duration_minutes`. Volume in litres can be worked out from duration and pump flow rate.
- Rules for missing values, data quality, and a warning about data leakage (only use information known at decision time).
- `backend/ml/example_rows.csv`: 8 made-up example rows, checked against the spec (column names, ranges and target consistency).

### Known Gaps Found
- The 5-day forecast is only kept in memory and is not saved, so past forecasts are not available for training.
- Growth stages are the same for all crops.
- Pump flow rate has no unit in the database (assumed litres per hour).
- Manual readings are told apart only by the device ID prefix `manual-`.
- Irrigation logs are not always linked to a recommendation, and farmers tap Done by hand, so labels can be noisy.

### Decision
- The mentor accepted synthetic data, so the training data will come from a fake data generator, not from public datasets.

### Not Done Yet
- The fake data generator (part 2 of Task 7).

### What's Next
- Weeks 3–4 list:
  1. Forecast snapshots and hourly collector.
  2. Crop-specific growth stages.
  3. Pump flow rate unit and horsepower on the form.
  4. Proper source column for manual readings.
  5. Noisy irrigation logs and labels.
  6. Fake data generator.
  7. Feature engineering.
  8. Train and evaluate Random Forest, Gradient Boosting and LSTM with MLflow.

---

## Session 13: Weeks 3–4 (18 November 2026) — Forecast Snapshots and Hourly Collector

### Backend
- New table `forecast_snapshots` (rain next 24h, rain chance, max temp, 5-day daily summary as JSON). Saved on each fresh weather fetch, with a 10-minute duplicate check in the database (works after restart). Endpoint `GET /weather/{field_id}/forecast-history`.
- `services/collector.py`: hourly background collector for all fields (60 min, 2 s pause between fields), started in `main.py` lifespan, cancels cleanly. One failing field never stops the others.

---

## Session 14: Weeks 3–4 (18 November 2026) — Crop-Specific Growth Stages

### Backend
- `growth.py` now has `CROP_GROWTH_STAGES` for the 8 crops (approximate values, mentor to confirm) and a default for unknown crops. Crop name ignores case and spaces. `FieldOut` passes the crop.

---

## Session 15: Weeks 3–4 (18 November 2026) — Pump Flow Rate Unit, Horsepower and Flow Source

### Backend & Frontend
- Flow rate unit is litres per hour. New columns `pump_hp` and `pump_flow_source` (typed, estimated_from_hp, default), added with a manual ALTER TABLE. `backend/pump.py` has `HP_TO_FLOW_LPH` and `DEFAULT_FLOW_LPH` 9000 (approximate).
- Field form Screen 3 has the litres-per-hour unit, horsepower cards and a hint; the Review screen shows the pump line. Tested by hand with 3 fields (ids 9, 10, 11), kept as sample data.

---

## Session 16: Weeks 3–4 (18 November 2026) — Source Column for Manual Readings

### Backend
- `sensor_readings.source` ("sensor" or "manual"), old rows backfilled. Code uses it, with the "manual-" prefix as fallback for old rows. Source added to both history outputs and to conditions.

---

## Session 17: Weeks 3–4 (18 November 2026) — Irrigation Log Labels and Detection

### Backend
- `irrigation_logs` got `event_source` (farmer_tap, manual_entry, sensor_detected) and `irrigated_at` (not in the future, at most 7 days old). The older source column is still there; use `event_source`.
- `services/irrigation_detection.py` finds moisture rises of at least 10 points within 60 minutes. `GET /fields/{field_id}/detected-irrigation` only returns the list; it does not write logs.

---

## Session 18: Weeks 3–4 (18 November 2026) — Fake Data Generator

### ML Engine
- `backend/ml/generate_data.py` writes a CSV that matches `DATASET.md` (27 columns). It uses a physics-based moisture model, weather, noise, sensor drift, missing readings and outages, and noisy labels. Fixed seed gives identical files. Output is git-ignored (`backend/ml/data/`).
- Bug fixed: `growth_stage` was shifted one stage because `growth.py` uses today's date. Now 0 of 115,200 rows disagree with `growth.py`.
- Default run (40 fields, 120 days): 115,200 rows, 3.78% irrigate_now = 1, 5.89% missing sensor moisture, average duration 42.4 minutes when irrigating.

### Known Gaps
- Only about 3.8% of rows are `irrigate_now = 1`; handle the imbalance when training.
- About 7.5% of rows are "Not sown yet"; filter or handle in feature engineering.
- Rain-fed fields can get a pump flow rate in the fake data.
- The growth-stage fix is a workaround; `get_growth_stage` could take an "as of" date.
- The hourly collector has no automatic deletion of old data.

### What's Next
1. Feature engineering
2. Train and evaluate Random Forest, Gradient Boosting and LSTM, tracked with MLflow
3. Schedule optimizer, FastAPI serving of recommendations



