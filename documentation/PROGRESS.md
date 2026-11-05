# Riego Progress Log

## Project Summary
- **Project:** Riego — AI-Powered Smart Irrigation System for Smallholder Farmers
- **Developer:** G Sathvik
- **Internship:** Infosys Springboard (8 Weeks)
- **Current Milestone:** Week 1 — Mobile-first UI Prototype with static data

---

## Session 1: Week 1 — Farmer Home Dashboard & Growth Foundation

### What Was Built

1. **Growth-Oriented Architecture (`riego/lib/`)**:
   - `lib/types.ts`: Clean, minimal TypeScript definitions for `FarmerProfile`, `Advice`, `Weather`, and `Field` with `MoistureStatus`.
   - `lib/strings.ts`: Central repository for all user-facing strings (app title, languages, advice text, weather labels, field status labels, tab names, placeholder text) to prepare for `next-intl` translation in Weeks 5–6.
   - `lib/sampleData.ts`: Realistic static data (Farmer: Ramesh Kumar; Advice: "Water Field 1 at 6 AM for 30 minutes"; Weather: 32°C, Rain: No, Humidity: 60%; Fields: Wheat [80% Good], Rice [20% Dry], Mustard [48% Okay]).
   - `lib/api.ts`: Thin asynchronous accessor functions (`getFarmerProfile()`, `getAdvice()`, `getWeather()`, `getFields()`) returning sample data. This allows swapping to FastAPI backend endpoints later without altering any UI components.

2. **Persistent Shell in Root Layout (`riego/app/layout.tsx` & `globals.css`)**:
   - Placed `TopBar` and `BottomNav` directly inside `layout.tsx` to maintain DRY code across all routes.
   - Configured font stack with system fonts and fallback support for Indian scripts: `"Noto Sans Devanagari"` (Hindi) and `"Noto Sans Kannada"` (Kannada).
   - Removed external Google Fonts web-fetch dependencies to ensure fast loading and offline resilience on low-bandwidth rural connections (NFR-3).
   - Applied earthy palette: soft cream background (`#FAF7EE`), dark readable text (`#1B2D21`), and forest green primary (`#235334`).

3. **Reusable Mobile-First Components (`riego/components/`)**:
   - `TopBar.tsx`: Farmer profile avatar circle (`R`), central `Riego` brand title, accessible `?` help button, and language switcher (`EN | हिं | ಕ`) with active language highlight. Touch targets are $\ge 56\text{px}$.
   - `BottomNav.tsx`: Fixed navigation bar with 4 tabs (`Home`, `Plan`, `Fields`, `Alerts`), large icons, route-aware active state highlighting via `usePathname()`, and $\ge 56\text{px}$ touch targets.
   - `AdviceCard.tsx`: Most prominent screen element in deep forest green (`#1A3E27`), water drop icon, bold plain recommendation text, and a visual speaker button (`🔊`).
   - `WeatherStrip.tsx`: Clean horizontal strip with Temperature (`32°C 🌤️`), Rain forecast (`Rain: No 🌧️`), and Humidity (`60% 💧`).
   - `FieldCard.tsx`: Reusable field card featuring field name, crop type, soil moisture progress bar, and **triple cue status** (Color + Icon + Word: Good / Okay / Dry) to ensure accessibility for low-literacy users.

4. **Routes & Placeholder Screens (`riego/app/`)**:
   - `app/page.tsx`: Home screen assembling the advice card, weather strip, and field cards.
   - `app/plan/page.tsx`: Placeholder for irrigation scheduling timeline (Week 2).
   - `app/fields/page.tsx`: Placeholder for sensor timeline and weekly history charts (Weeks 3–5).
   - `app/alerts/page.tsx`: Placeholder for drought, sensor, and weather warnings (Weeks 5–6).

5. **Build & Bundler Resolution (`next.config.ts` & `package.json`)**:
   - Resolved the Turbopack Node 26 process spawn issue by configuring Webpack with `@tailwindcss/turbopack` loader in [next.config.ts](file:///Users/sathivik/Documents/MyProjects/Riego/riego/next.config.ts).
   - Tailwind CSS v4 utility styles are compiled into `.next/static/css` (generating all colors, borders, cards, and grid utilities).

---

### Verification
- `npm run build`: Successfully built all pages as static routes (`/`, `/plan`, `/fields`, `/alerts`, `/_not-found`) with fully compiled Tailwind CSS (20KB stylesheet). TypeScript compiled with 0 errors.
- `npm run dev`: Development server running cleanly on `http://localhost:3000` with hot-reloading and CSS processing.

---

### What's Next
- **Week 1–2 Ingestion & Backend Prep**:
  - Set up FastAPI project skeleton in backend.
  - Define data schemas for sensor readings and weather forecasts (OpenWeatherMap / Tomorrow.io).
  - Prepare field registration endpoints to connect with `lib/api.ts`.
