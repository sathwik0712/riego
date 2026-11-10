# Riego Progress Log

## Project Summary
- **Project:** Riego — AI-Powered Smart Irrigation System for Smallholder Farmers
- **Developer:** G Sathvik
- **Internship:** Infosys Springboard (8 Weeks)
- **Current Milestone:** Week 1 — Mobile-first UI Prototype with static data

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
