"use client";

// LocationPicker Component
// Provides GPS geolocation ("Use my current location") and debounced place search (OpenWeatherMap Geo API).
// Displays selected location with place name, coordinates, and a Change button.

import { useState, useEffect, useRef } from "react";
import { searchPlaces, reversePlace } from "@/lib/api";
import { PlaceResult } from "@/lib/types";
import { MapPinIcon, AlertIcon, CheckIcon } from "@/components/icons";

export interface LocationValue {
  latitude: number;
  longitude: number;
  placeName?: string;
}

interface LocationPickerProps {
  value?: LocationValue | null;
  onChange: (val: LocationValue | null) => void;
  error?: string | null;
}

export default function LocationPicker({
  value,
  onChange,
  error,
}: LocationPickerProps) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Debounce ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced place search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults(null);
      setSearchError(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    setSearchError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(trimmed);
        setSearchResults(results);
        setSearchError(null);
      } catch {
        setSearchError("Place search is not available now. Try your current location.");
        setSearchResults(null);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Handle GPS location request
  const handleUseGps = () => {
    setGpsError(null);
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsError("Location is not supported on this device. Please search for your place below.");
      return;
    }

    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        let placeStr = `Near ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;

        try {
          const rev = await reversePlace(lat, lon);
          if (rev && rev.name) {
            const parts = [rev.name, rev.state].filter(Boolean);
            placeStr = `Near ${parts.join(", ")}`;
          }
        } catch {
          // Keep coordinate string if reverse lookup fails
        }

        onChange({
          latitude: lat,
          longitude: lon,
          placeName: placeStr,
        });
        setGpsLoading(false);
        setSearchQuery("");
        setSearchResults(null);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("Location permission was denied. Please allow location access or search below.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError("Location is currently unavailable. Please search for your place below.");
        } else if (err.code === err.TIMEOUT) {
          setGpsError("Location request timed out. Please try again or search below.");
        } else {
          setGpsError("Could not get your location. Please search for your place below.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectPlace = (place: PlaceResult) => {
    const parts = [place.name, place.state].filter(Boolean);
    const placeTitle = parts.join(", ");
    onChange({
      latitude: place.lat,
      longitude: place.lon,
      placeName: placeTitle,
    });
    setSearchQuery("");
    setSearchResults(null);
  };

  const handleClearSelection = () => {
    onChange(null);
    setSearchQuery("");
    setSearchResults(null);
    setGpsError(null);
    setSearchError(null);
  };

  const hasValue = value && value.latitude !== undefined && value.longitude !== undefined;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ── State 1: A location is already chosen ── */}
      {hasValue ? (
        <div className="p-4 rounded-2xl bg-[#EAF5EB] border-2 border-[#A3D9A5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#A3D9A5] text-[#235334] flex items-center justify-center shrink-0">
              <MapPinIcon className="w-5 h-5 text-[#235334]" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-[#1B2D21] truncate">
                {value.placeName || "Location chosen"}
              </p>
              <p className="text-xs text-[#5F6E62] font-mono mt-0.5">
                {value.latitude.toFixed(4)}°, {value.longitude.toFixed(4)}°
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearSelection}
            className="min-h-[44px] sm:min-h-[48px] px-4 py-2 rounded-xl bg-white hover:bg-[#F2EDDC] border border-[#DCD6C0] text-[#235334] font-bold text-sm shrink-0 self-start sm:self-auto transition-colors cursor-pointer"
          >
            Change
          </button>
        </div>
      ) : (
        /* ── State 2: Picking a location ── */
        <div className="flex flex-col gap-3 w-full">
          {/* Button: Use my current location */}
          <button
            type="button"
            onClick={handleUseGps}
            disabled={gpsLoading}
            className="min-h-[56px] w-full px-4 py-3 rounded-2xl border-2 border-[#DCD6C0] bg-[#FAF7EE] hover:bg-[#EFEAD8] hover:border-[#235334] text-[#1B2D21] font-bold text-base flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
          >
            <MapPinIcon className="w-5 h-5 text-[#235334] shrink-0" />
            <span>
              {gpsLoading ? "Finding your location…" : "Use my current location"}
            </span>
          </button>

          {/* GPS error message (search box remains usable) */}
          {gpsError && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs sm:text-sm flex items-start gap-2"
            >
              <AlertIcon className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-0.5">
            <div className="flex-1 h-px bg-[#E3DEC3]" />
            <span className="text-xs font-semibold text-[#5F6E62]">or search</span>
            <div className="flex-1 h-px bg-[#E3DEC3]" />
          </div>

          {/* Search Input */}
          <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor="geo-search-input" className="text-xs font-bold text-[#5F6E62]">
              Search place name
            </label>
            <div className="relative w-full">
              <input
                id="geo-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Village, town, or city name"
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border border-[#DCD6C0] bg-white text-base text-[#1B2D21] placeholder-[#8F9E92] focus:outline-none focus:ring-2 focus:ring-[#235334] focus:border-[#235334] transition-all"
              />
              {searching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#5F6E62] font-semibold">
                  Searching…
                </div>
              )}
            </div>
          </div>

          {/* Search error state */}
          {searchError && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs sm:text-sm flex items-start gap-2"
            >
              <AlertIcon className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <span>{searchError}</span>
            </div>
          )}

          {/* Search empty state */}
          {!searching && !searchError && searchResults && searchResults.length === 0 && (
            <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#DCD6C0] text-center text-xs sm:text-sm text-[#5F6E62]">
              No places found for &quot;{searchQuery.trim()}&quot;. Try nearby town or district.
            </div>
          )}

          {/* Search results list (up to 5 tap cards) */}
          {!searching && searchResults && searchResults.length > 0 && (
            <div className="flex flex-col gap-2 w-full mt-1">
              <span className="text-xs font-bold text-[#5F6E62]">
                Matching places (tap to select):
              </span>
              {searchResults.slice(0, 5).map((place, idx) => {
                const region = [place.state, place.country].filter(Boolean).join(", ");
                return (
                  <button
                    key={`${place.name}-${place.lat}-${place.lon}-${idx}`}
                    type="button"
                    onClick={() => handleSelectPlace(place)}
                    className="min-h-[56px] p-3.5 sm:p-4 rounded-2xl border border-[#DCD6C0] bg-white hover:bg-[#FAF7EE] hover:border-[#235334] active:scale-95 text-left flex items-center justify-between gap-3 transition-all cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MapPinIcon className="w-5 h-5 text-[#235334] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-base font-bold text-[#1B2D21] truncate">
                          {place.name}
                        </p>
                        {region && (
                          <p className="text-xs text-[#5F6E62] truncate">
                            {region}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#5F6E62] shrink-0">
                      {place.lat.toFixed(2)}°, {place.lon.toFixed(2)}°
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Validation error message */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#DC2626]">
          <AlertIcon className="w-4 h-4 text-[#DC2626] shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
