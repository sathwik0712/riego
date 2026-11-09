# Software Requirements Specification: Riego

**Project:** AI-Powered Smart Irrigation System for Predictive Water Management and Crop Optimization
**Short name:** Riego (Spanish for "irrigation")
**Context:** Infosys Springboard internship, AI domain, 8 weeks (started early November 2026)
**Author:** G Sathvik
**Status:** Draft v0.1. Currently in Week 1, building the UI with static data.

---

## 0. Note for the AI coding assistant

Read this whole file before writing any code.

- **Current phase:** build the farmer-facing dashboard UI with static sample data only. No backend, no database, no real API calls yet.
- The developer is a student who is new to TypeScript. Keep code simple and readable, keep types minimal, and add short comments.
- Do not install new packages without asking. Everything needed for the UI is already installed (section 7).
- Do not build features from later weeks yet (section 8), but structure the code so they can be added later (for example, keep sample data in one file so it can be swapped for real API calls).
- Project folder: `~/Documents/MyProjects/Riego/riego` (the inner `riego` folder contains `package.json`).

---

## 1. Introduction

### 1.1 Purpose
This document describes what the Riego platform must do, who it is for, and how it will be built over 8 weeks. It is the shared reference for the developer, the mentor, and the AI coding assistant.

### 1.2 Problem statement
Farmers often overuse or underuse water because they have no real-time, data-driven guidance. This wastes water and lowers crop yield. Most existing precision-agriculture tools assume desktop access and English literacy, which puts them out of reach for most smallholder farmers in India.

### 1.3 Product summary
A full-stack platform that combines soil moisture sensor readings, weather forecasts, crop information and past irrigation data. Machine learning models (Random Forest, Gradient Boosting, LSTM) predict when and how much water each field needs. The farmer sees the recommendation in a mobile-first Progressive Web App (PWA), in their own language (Hindi, Kannada, English), with voice support through Sarvam AI.

### 1.4 Definitions
| Term | Meaning |
|---|---|
| PWA | Progressive Web App: a website that can be installed on a phone and works offline, with no app store |
| ML | Machine learning |
| LSTM | A type of neural network for time-based data |
| MQTT | A light messaging method used by sensors and IoT devices |
| Sarvam AI | An Indian-language AI service for translation and voice |
| Field | One registered plot of land with a crop and a sensor |

---

## 2. Overall description

### 2.1 Users
- **Primary: smallholder farmers.** Often low literacy, using a mid-range Android phone, sometimes on weak internet. Prefer Hindi or Kannada.
- **Secondary: supervisors.** Receive email alerts and can download field reports.

### 2.2 Product perspective
Four connected parts: sensor and weather data in, the ML engine in the middle, the farmer PWA and alerts out.

```
Soil sensors ─┐
              ├─> Data ingestion ─> Database ─> ML scheduler (FastAPI) ─> Alert engine ─> Farmer PWA
Weather APIs ─┘                                                              │
                                                                             └─> Push / SMS / Email
```

### 2.3 Constraints
- 8-week internship scope.
- PWA chosen over a native Android app: it runs in any Android browser and needs no Play Store approval.
- Farmer interface must be usable without English literacy.
- Must work reasonably on low-bandwidth rural connections.

### 2.4 Assumptions
- Real sensor hardware may not be available, so sensor data may be simulated or sample data.
- Free tiers of the third-party services are enough for the internship.

---

## 3. Functional requirements

Priority: **M** = must have, **S** = should have, **C** = could have.

### Module 1: Sensor data ingestion and weather (Weeks 1–2)
| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | Receive soil moisture readings from sensors through MQTT or a REST API | M |
| FR-1.2 | Fetch temperature, rainfall and humidity forecasts from OpenWeatherMap or Tomorrow.io | M |
| FR-1.3 | Let a farmer register fields: field name, crop, sensor ID | M |
| FR-1.4 | Clean and normalise data; handle missing sensor readings and weather API downtime without crashing | M |
| FR-1.5 | Store relational data in PostgreSQL and sensor history in TimescaleDB or InfluxDB | M |

### Module 2: ML irrigation scheduling engine (Weeks 3–4)
| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | Build features from soil moisture, weather forecast, crop growth stage and past water use | M |
| FR-2.2 | Train and compare Random Forest, Gradient Boosting and LSTM models | M |
| FR-2.3 | Convert model output into a time-slotted irrigation plan per field | M |
| FR-2.4 | Serve recommendations through a FastAPI endpoint | M |
| FR-2.5 | Track model versions and scores with MLflow | S |

### Module 3: Farmer PWA, alerts and notifications (Weeks 5–6)
| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | Next.js app installable as a PWA (service worker, web app manifest with name, icons, theme colour) | M |
| FR-3.2 | Mobile-first dashboard (see section 4) | M |
| FR-3.3 | Fixed UI text available in English, Hindi and Kannada | M |
| FR-3.4 | Read advice and alerts aloud in Hindi or Kannada using Sarvam AI; accept voice questions if time allows | S |
| FR-3.5 | Field overview page with sensor reading timeline, weekly irrigation history, and simple usage trend charts | M |
| FR-3.6 | Alerts through web push, SMS (Twilio) and email (SendGrid), with per-field thresholds | M |
| FR-3.7 | Alert engine (rules plus ML) for drought risk, over-watering and sensor failure | M |
| FR-3.8 | Downloadable field report as PDF or CSV | S |
| FR-3.9 | Deploy frontend and backend with Docker and CI/CD on a cloud provider | S |

### Module 4: Integration, testing and finalisation (Weeks 7–8)
| ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | End-to-end test: sensor, then ML scheduler, then alert engine, then dashboard | M |
| FR-4.2 | Load and stress tests on backend APIs; cross-browser checks | S |
| FR-4.3 | UX refinements: clearer layout, help tooltips, full mobile and tablet responsiveness | M |
| FR-4.4 | Check Sarvam translations and voice output for Hindi and Kannada; test on a slow connection | S |
| FR-4.5 | Documentation: architecture, data flow, API reference, model evaluation report, deployment guide, known limitations | M |
| FR-4.6 | Final presentation (PPT) and a rehearsed demo | M |

---

## 4. Farmer dashboard: UI requirements (current task)

### 4.1 Design principles
- Mobile-first: design for a phone, then scale up to tablet and desktop.
- Big, tap-friendly buttons (at least 56px tall).
- Icons over words wherever possible; no tables or dense analytics.
- Colour is never the only signal: pair it with an icon and a word.
- Earthy look: soft green and cream background, dark readable text, large type.

### 4.2 Home screen layout (top to bottom)

```
┌────────────────────────────────┐
│ (👤)    Riego      (?) EN|हिं|ಕ │   Top bar
├────────────────────────────────┤
│ 💧 TODAY'S ADVICE   (highlight)│   Biggest, brightest element
│ Water Field 1 at 6 AM          │
│ for 30 minutes          [🔊]   │
├────────────────────────────────┤
│ 🌤 32°C   Rain: No   💧 60%    │   Weather near the fields
├────────────────────────────────┤
│ 🟢 Field 1  Wheat              │   Field cards
│ Moisture ████████░░ 80%  Good  │
├────────────────────────────────┤
│ 🔴 Field 2  Rice               │
│ Moisture ██░░░░░░░░ 20%  Dry   │
├────────────────────────────────┤
│ 🏠 Home  🕒 Plan  🌾 Fields  🔔 Alerts │   Bottom bar
└────────────────────────────────┘
```

| ID | Requirement |
|---|---|
| UI-1 | **Top bar:** round profile circle on the left (farmer's initial or photo); "Riego" in the middle; on the right, a "?" help button next to the language switcher EN / हिं / ಕ, clearly visible |
| UI-2 | **Today's advice card:** highlighted so it is the first thing the farmer sees; one plain sentence; water-drop icon; speaker button |
| UI-3 | **Weather strip** below the advice: temperature, rain yes/no, humidity |
| UI-4 | **Field cards:** field name, crop, moisture bar with percentage. Green = good, yellow = okay, red = dry, each with an icon and a word |
| UI-5 | **Bottom navigation:** Home, Plan, Fields, Alerts. Fixed to the bottom. The Alerts tab holds all received notifications |
| UI-6 | **Language switcher** on the first version is visual only (highlights the selected language); translation is added in Weeks 5–6 |
| UI-7 | The speaker button and "?" are visual only in the first version |

### 4.3 Other screens (later, same visual style)
- **Plan (Today's Schedule):** icon cards in time order (clock, drop, duration) with a big "Done" button
- **Fields:** field overview with sensor timeline and weekly history
- **Alerts:** list of notifications with a red, yellow or green dot

### 4.4 Field registration form (current task)

**Scope:** UI only. Static data, no backend, no login. On "Save", show a success message and add the field to the sample data in memory (or just log it). Keep the form in its own component so it can later be connected to a real API.

**Location:** new page at `/fields/new`, opened from an "Add field" button on the Fields page. Same layout shell as the other pages.

**Form behaviour**
- Multi-step form with 5 screens, one at a time
- Progress indicator at the top (Step 1 of 5)
- Big "Next" and "Back" buttons (at least 56px tall)
- Icons plus words on every option; tap-friendly option cards instead of small dropdowns where possible
- Phone first, then scale up to tablet and desktop (form centred, max width about 600px)
- Required fields are checked before moving to the next screen; show a short, plain error message

**Screen 1: Field basics**
| Field | Input | Required |
|---|---|---|
| Field ID | Auto-generated, not editable | Auto |
| Nickname | Text, e.g. "North field" | No |
| Location | "Use my current location" button, or "Pick on map" (visual placeholder for now) | Yes |
| Area | Number plus unit (acres or guntas) | Yes |

**Screen 2: Crop**
| Field | Input | Required |
|---|---|---|
| Crop name | Dropdown or option cards (Wheat, Rice, Tomato, etc. from a sample list) | Yes |
| Sowing date | Date picker (approximate), or a "Not sown yet" option | Yes |

**Screen 3: Soil and water**
| Field | Input | Required |
|---|---|---|
| Soil type | Option cards: Sandy, Loamy, Clay (with a short hint on each) | Yes |
| Water source | Option cards: Borewell, Canal, Tank, Rain-fed only | Yes |
| Irrigation method | Option cards: Drip, Sprinkler, Flood | Yes |
| Pump flow rate | Number input with an "I don't know" button | No |

**Screen 4: Sensor device**
| Field | Input | Required |
|---|---|---|
| Sensor device installed? | Yes / Not yet | Yes |
| Device ID | Text input, shown only if "Yes". QR scan button is visual only | If "Yes" |

If "Not yet", the field still saves and shows a note: "You can add the device later."

**Screen 5: Review and save**
- Summary card showing everything entered, grouped by screen
- "Edit" button on each group that jumps back to that screen
- Big "Save field" button
- After saving, show a success message and a button back to the Fields page

**Filled automatically (not asked in the form)**
- Farmer account ID (use a fixed sample value for now)
- Registration date
- Crop growth stage (calculated from the sowing date)

**Not in this task**
- Language switching inside the form (the EN / हिं / ಕ switcher stays visual only)
- Real GPS, map, QR scanning, backend or database
- Farmer signup and login (separate flow, later)

**Code notes**
- Keep the form data type in one place (for example `lib/types.ts`)
- Keep the crop list, soil types and other options in one sample data file
- Do not install new packages without asking
---

## 5. Non-functional requirements
These are targets to aim for, not measured guarantees.

| ID | Requirement |
|---|---|
| NFR-1 | Usable on a phone from about 360px wide upward |
| NFR-2 | Works on Android Chrome without installing from an app store |
| NFR-3 | Loads acceptably on a slow connection; show the last known data when offline |
| NFR-4 | Text and buttons readable and tappable for low-literacy users |
| NFR-5 | The system keeps working when a sensor or weather API fails (show a message, never a blank screen) |
| NFR-6 | Code is readable and documented so the mentor and teammates can follow it |

---

## 6. External interfaces
- **Weather:** OpenWeatherMap or Tomorrow.io (API key needed)
- **Language and voice:** Sarvam AI (API key needed)
- **SMS:** Twilio. **Email:** SendGrid
- **Sensors:** MQTT broker (only if MQTT is chosen) or REST
- **Hosting:** a cloud provider, not yet chosen

---

## 7. Tech stack and current setup status

Developer machine: MacBook Air, macOS. Node.js 26.

### 7.1 Frontend (installed)
- Next.js 16 (App Router), TypeScript, Tailwind CSS, ESLint (created with `create-next-app 16.4.5`, recommended defaults, no `src/` folder)
- `@serwist/next` and `serwist` (PWA)
- `next-intl` (Hindi, Kannada and English text)
- `recharts` (charts)
- `jspdf` (PDF reports)
- Dev server tested and working (`npm run dev`)

### 7.2 Backend and ML (installed, in a Python virtual environment called `myenv`)
- Already present: numpy, pandas, scikit-learn, xgboost, matplotlib, seaborn, scipy, fastapi, uvicorn, pydantic, httpx, requests, python-dotenv, jupyter
- Newly installed: mlflow, torch (PyTorch chosen over TensorFlow), sqlalchemy, psycopg2-binary, paho-mqtt, reportlab, pywebpush, twilio, sendgrid, pytest, locust

### 7.3 Not yet set up (to do later)
- Docker Desktop (to run PostgreSQL with TimescaleDB)
- MQTT broker such as Mosquitto (only if MQTT is chosen)
- Accounts and API keys: OpenWeatherMap or Tomorrow.io (Week 1), Sarvam AI, Twilio and SendGrid (Weeks 5–6)
- Cloud provider (Weeks 5–6)

### 7.4 Decisions that differ from the original problem statement
| Original | Used instead | Reason |
|---|---|---|
| `next-pwa` | `@serwist/next` | `next-pwa` is no longer maintained and does not suit current Next.js |
| `next-i18next` | `next-intl` | `next-i18next` was built for the older Pages Router; this project uses the App Router |
| Web push, SMS and email from the Next.js side (`web-push`, `twilio`, `@sendgrid/mail`) | Sent from the Python backend | Avoids duplicating the same job in two places |
| TensorFlow (implied for LSTM) | PyTorch | Easier to debug and learn |

---

## 8. Timeline and milestones

| Weeks | Milestone |
|---|---|
| 1–2 | Sensor and weather data ingestion, field registration, database. **UI prototype with static data comes first (current task).** |
| 3–4 | ML models, schedule optimiser, FastAPI serving, MLflow tracking |
| 5–6 | Full PWA, language support and voice, alerts, reports, deployment |
| 7–8 | Integration and load testing, UX polish, documentation, final PPT and demo |

**Working method:** prototyping for the UI (build with sample data, review with the mentor, refine) and incremental delivery for the modules (each module adds to the working app). A short update is sent to the mentor every day.

---

## 9. Out of scope for the current task
- Real database, sensors, weather APIs, ML models
- Real translation, voice and notifications
- Login and user accounts
- Deployment

---

## 10. Open items
- Choose MQTT or REST for sensors
- Choose TimescaleDB or InfluxDB (the plan is TimescaleDB through Docker)
- Choose the cloud provider
- Confirm with the mentor that Serwist and next-intl are acceptable replacements
