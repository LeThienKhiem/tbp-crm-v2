"use client";

import { useState, useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
interface ZipSuggestion {
  zip_code: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  label?: string;
}

export interface RateResult {
  low: number;
  mid: number;
  high: number;
  miles: number;
  zone: number;
  multiplier: number;
  warning?: string | null;
  zip: string;
  city: string;
  state: string;
}

interface Props {
  portCode: string; // e.g. "USLAX"
  containerType: string; // e.g. "40HC"
  onRateCalculated: (rate: RateResult) => void;
}

// ── Zone labels ────────────────────────────────────────────────────────────
const ZONE_LABEL: Record<number, string> = {
  1: "< 50 mi",
  2: "50–100 mi",
  3: "100–200 mi",
  4: "200–400 mi",
  5: "400+ mi",
};

// ── Component ──────────────────────────────────────────────────────────────
export function ZipDeliveryInput({
  portCode,
  containerType,
  onRateCalculated,
}: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ZipSuggestion[]>([]);
  const [filtered, setFiltered] = useState<ZipSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [rateResult, setRateResult] = useState<RateResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [zipStatus, setZipStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [sugLoading, setSugLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Load suggestions when portCode changes ───────────────────────────────
  useEffect(() => {
    if (!portCode) return;
    setSugLoading(true);
    fetch(`/api/trucking-rates/suggestions?port=${portCode}`)
      .then((r) => r.json())
      .then(({ data }) => {
        setSuggestions(data ?? []);
        setFiltered(data ?? []);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSugLoading(false));

    // Reset when port changes
    setQuery("");
    setRateResult(null);
    setZipStatus("idle");
  }, [portCode]);

  // ── Close dropdown on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Handle text input ────────────────────────────────────────────────────
  function handleInput(val: string) {
    setQuery(val);
    setRateResult(null);
    setZipStatus("idle");

    // Filter suggestions client-side
    const q = val.toLowerCase().trim();
    setFiltered(
      q.length === 0
        ? suggestions
        : suggestions.filter(
            (s) =>
              s.zip_code.includes(q) ||
              s.city.toLowerCase().includes(q) ||
              (s.label ?? "").toLowerCase().includes(q)
          )
    );
    setOpen(true);

    // If exactly 5 digits → debounce then validate new ZIP
    clearTimeout(debounceRef.current);
    if (/^\d{5}$/.test(val)) {
      debounceRef.current = setTimeout(() => validateNewZip(val), 500);
    }
  }

  // ── Validate a ZIP not in suggestions (free-text entry) ──────────────────
  async function validateNewZip(zip: string) {
    setZipStatus("loading");
    setOpen(false);
    try {
      // Step 1: validate ZIP + get city/state via existing proxy
      const validateRes = await fetch(`/api/zip-validate?zip=${zip}`);
      const validateData = await validateRes.json();
      if (validateData.error || !validateData.data) {
        setZipStatus("invalid");
        return;
      }
      const { city, state } = validateData.data;

      // Step 2: get lat/lng from Zippopotam directly
      const rawRes = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!rawRes.ok) {
        setZipStatus("invalid");
        return;
      }
      const rawData = await rawRes.json();
      const place = rawData.places?.[0];
      const lat = parseFloat(place?.latitude ?? "0");
      const lng = parseFloat(place?.longitude ?? "0");

      setZipStatus("valid");
      await calculateRate(zip, city, state, lat, lng);
    } catch {
      setZipStatus("invalid");
    }
  }

  // ── User selects a suggestion from dropdown ──────────────────────────────
  async function selectSuggestion(s: ZipSuggestion) {
    setQuery(`${s.zip_code} – ${s.label ?? `${s.city}, ${s.state}`}`);
    setOpen(false);
    setZipStatus("valid");
    await calculateRate(s.zip_code, s.city, s.state, s.lat, s.lng);
  }

  // ── Core: call trucking-rates API with coordinates ───────────────────────
  async function calculateRate(
    zip: string,
    city: string,
    state: string,
    lat: number,
    lng: number
  ) {
    setCalcLoading(true);
    try {
      const params = new URLSearchParams({
        port: portCode,
        container: containerType,
        zip,
        lat: String(lat),
        lng: String(lng),
      });
      const res = await fetch(`/api/trucking-rates?${params}`);
      const { data, error } = await res.json();
      if (error || !data) throw new Error(error ?? "Rate fetch failed");

      const result: RateResult = { ...data, zip, city, state };
      setRateResult(result);
      onRateCalculated(result);
    } catch (err) {
      console.error("Rate calculation failed:", err);
    } finally {
      setCalcLoading(false);
    }
  }

  // ── Border color based on zip status ────────────────────────────────────
  const borderClass = {
    idle: "border-slate-200",
    loading: "border-slate-300",
    valid: "border-green-400 bg-green-50",
    invalid: "border-red-400 bg-red-50",
  }[zipStatus];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Search input */}
      <div ref={wrapperRef} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search ZIP or area... (e.g. 90744 or Wilmington)"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className={`w-full rounded-lg border px-3 py-2 pr-8 text-sm text-slate-900 transition-colors ${borderClass}`}
        />

        {/* Status icon */}
        <span className="absolute right-3 top-2.5 select-none text-sm">
          {zipStatus === "loading" && (
            <span className="animate-pulse text-xs text-slate-400">···</span>
          )}
          {zipStatus === "valid" && <span className="text-green-500">✓</span>}
          {zipStatus === "invalid" && <span className="text-red-400">✗</span>}
        </span>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {/* Header */}
            <div className="sticky top-0 border-b border-slate-100 bg-slate-50 px-3 py-2">
              <span className="text-xs font-medium text-slate-400">
                {sugLoading
                  ? "Loading destinations..."
                  : `Common destinations near ${portCode}`}
              </span>
            </div>

            {/* Suggestion rows */}
            {filtered.map((s) => (
              <button
                key={s.zip_code}
                type="button"
                onMouseDown={() => selectSuggestion(s)}
                className="w-full border-b border-slate-100 px-4 py-2.5 text-left last:border-0 transition-colors hover:bg-blue-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-sm font-medium text-slate-800">
                      {s.zip_code}
                    </span>
                    <span className="truncate text-xs text-slate-500">
                      {s.label ?? `${s.city}, ${s.state}`}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {s.city}, {s.state}
                  </span>
                </div>
              </button>
            ))}

            {/* No matches — prompt for free-text ZIP */}
            {filtered.length === 0 && !sugLoading && (
              <div className="px-4 py-3 text-center text-xs text-slate-400">
                No match — type a 5-digit ZIP to calculate a custom rate
              </div>
            )}
          </div>
        )}
      </div>

      {/* Validation messages */}
      {zipStatus === "invalid" && (
        <p className="text-xs text-red-500">
          ZIP code not found — please check and try again
        </p>
      )}

      {/* Loading indicator */}
      {calcLoading && (
        <p className="animate-pulse text-xs text-slate-400">
          Calculating trucking estimate...
        </p>
      )}

      {/* Rate result */}
      {rateResult && !calcLoading && (
        <div className="space-y-2">
          {/* Distance + zone badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">
              📍 {rateResult.miles} miles from {portCode}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">
              Zone {rateResult.zone} · {ZONE_LABEL[rateResult.zone]}
            </span>
            {rateResult.multiplier > 1 && (
              <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-600">
                ×{rateResult.multiplier} distance factor
              </span>
            )}
          </div>

          {/* Long-haul warning */}
          {rateResult.warning && (
            <div className="flex items-start gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-800">
              <span>⚠️</span>
              <span>{rateResult.warning}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
