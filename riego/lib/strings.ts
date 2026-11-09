// Visible text strings for Riego UI
// Keeping all strings in one place makes it easy to wire next-intl later

export const STRINGS = {
  appName: "Riego",

  // Top bar & Language switcher
  helpButtonAria: "Help",
  helpLabel: "Help",
  profileAria: "Farmer profile",
  languages: [
    { code: "en", label: "EN", fullLabel: "English" },
    { code: "hi", label: "हिं", fullLabel: "हिन्दी" },
    { code: "kn", label: "ಕ", fullLabel: "ಕನ್ನಡ" },
  ],

  // Today's advice card
  adviceHeader: "TODAY'S ADVICE",
  speakerAria: "Read advice aloud",

  // Weather strip
  weather: {
    temperatureUnit: "°C",
    temperatureLabel: "Temperature",
    forecastLabel: "Forecast",
    rainLabel: "Rain",
    rainYes: "Yes",
    rainNo: "No",
    humidityLabel: "Humidity",
  },

  // Field cards
  fieldsHeader: "My Fields",
  moistureLabel: "Moisture",
  statusGood: "Good",
  statusOkay: "Okay",
  statusDry: "Dry",

  // Navigation items (used in BottomNav and Desktop Sidebar)
  nav: {
    home: "Home",
    plan: "Plan",
    fields: "Fields",
    alerts: "Alerts",
  },

  // Placeholders for coming soon screens
  comingSoon: {
    title: "Coming Soon",
    planDescription:
      "Your daily irrigation timeline and water management schedule will appear here in Week 2.",
    fieldsDescription:
      "Detailed sensor timelines, soil health, and weekly irrigation history will appear here.",
    alertsDescription:
      "Drought warnings, sensor notifications, and pump alerts will appear here.",
    backHome: "Go to Home",
  },
};
