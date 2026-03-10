"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Box,
  Filter,
  Globe2,
  LayoutGrid,
  Menu,
  Minus,
  RefreshCw,
  Ship,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

interface Rate {
  id: number;
  region: "US" | "EU" | "Arab";
  port: string;
  carrier: string;
  baseFreight: number;
  thc: number;
  bunker: number;
  pss: number;
  inlandTrucking: number;
  transit: string;
  trend: "up" | "down" | "stable";
  validUntil: string;
}

const origins = ["Hai Phong", "Ho Chi Minh"] as const;
const regionFilters: Array<"All" | "US" | "EU" | "Arab"> = ["All", "US", "EU", "Arab"];
const equipmentOptions = ["40ft HC", "20ft Standard", "LCL"] as const;

const mockRates: Rate[] = [
  { id: 1, region: "US", port: "Los Angeles, CA (USLAX)", carrier: "MSC", baseFreight: 3200, thc: 350, bunker: 400, pss: 0, inlandTrucking: 850, transit: "20-24 days", trend: "down", validUntil: "Mar 24, 2026" },
  { id: 2, region: "US", port: "Long Beach, CA (USLGB)", carrier: "COSCO", baseFreight: 3150, thc: 350, bunker: 400, pss: 0, inlandTrucking: 850, transit: "21-25 days", trend: "stable", validUntil: "Mar 24, 2026" },
  { id: 3, region: "US", port: "Seattle, WA (USSEA)", carrier: "ONE", baseFreight: 3400, thc: 360, bunker: 420, pss: 50, inlandTrucking: 900, transit: "24-28 days", trend: "up", validUntil: "Mar 24, 2026" },
  { id: 4, region: "US", port: "Oakland, CA (USOAK)", carrier: "Evergreen", baseFreight: 3300, thc: 350, bunker: 400, pss: 0, inlandTrucking: 800, transit: "22-26 days", trend: "down", validUntil: "Mar 24, 2026" },
  { id: 5, region: "US", port: "Houston, TX (USHOU)", carrier: "Maersk", baseFreight: 4500, thc: 380, bunker: 450, pss: 150, inlandTrucking: 600, transit: "30-35 days", trend: "up", validUntil: "Mar 24, 2026" },
  { id: 6, region: "US", port: "New York, NY (USNYC)", carrier: "Hapag-Lloyd", baseFreight: 4800, thc: 400, bunker: 480, pss: 200, inlandTrucking: 750, transit: "35-40 days", trend: "up", validUntil: "Mar 24, 2026" },
  { id: 7, region: "US", port: "Savannah, GA (USSAV)", carrier: "ZIM", baseFreight: 4650, thc: 390, bunker: 450, pss: 150, inlandTrucking: 550, transit: "32-37 days", trend: "stable", validUntil: "Mar 24, 2026" },
  { id: 8, region: "US", port: "Miami, FL (USMIA)", carrier: "CMA CGM", baseFreight: 4700, thc: 390, bunker: 450, pss: 100, inlandTrucking: 500, transit: "33-38 days", trend: "stable", validUntil: "Mar 24, 2026" },
  { id: 9, region: "US", port: "Norfolk, VA (USORF)", carrier: "ONE", baseFreight: 4750, thc: 400, bunker: 460, pss: 150, inlandTrucking: 600, transit: "34-39 days", trend: "up", validUntil: "Mar 24, 2026" },
  { id: 10, region: "EU", port: "Rotterdam, NL (NLRTM)", carrier: "Hapag-Lloyd", baseFreight: 2800, thc: 250, bunker: 300, pss: 0, inlandTrucking: 450, transit: "28-32 days", trend: "down", validUntil: "Mar 24, 2026" },
  { id: 11, region: "EU", port: "Hamburg, DE (DEHAM)", carrier: "CMA CGM", baseFreight: 2900, thc: 260, bunker: 300, pss: 50, inlandTrucking: 500, transit: "30-34 days", trend: "stable", validUntil: "Mar 24, 2026" },
  { id: 12, region: "EU", port: "Antwerp, BE (BEANR)", carrier: "MSC", baseFreight: 2850, thc: 250, bunker: 310, pss: 0, inlandTrucking: 480, transit: "29-33 days", trend: "down", validUntil: "Mar 24, 2026" },
  { id: 13, region: "EU", port: "Felixstowe, GB (GBFXT)", carrier: "Maersk", baseFreight: 3100, thc: 280, bunker: 320, pss: 100, inlandTrucking: 600, transit: "31-36 days", trend: "up", validUntil: "Mar 24, 2026" },
  { id: 14, region: "EU", port: "Valencia, ES (ESVLC)", carrier: "COSCO", baseFreight: 2600, thc: 230, bunker: 280, pss: 0, inlandTrucking: 400, transit: "25-29 days", trend: "stable", validUntil: "Mar 24, 2026" },
  { id: 15, region: "EU", port: "Le Havre, FR (FRLEH)", carrier: "ONE", baseFreight: 2950, thc: 260, bunker: 310, pss: 0, inlandTrucking: 520, transit: "30-35 days", trend: "stable", validUntil: "Mar 24, 2026" },
  { id: 16, region: "Arab", port: "Jebel Ali, UAE (AEJEA)", carrier: "Evergreen", baseFreight: 1800, thc: 200, bunker: 150, pss: 0, inlandTrucking: 300, transit: "15-18 days", trend: "down", validUntil: "Mar 24, 2026" },
  { id: 17, region: "Arab", port: "Jeddah, SA (SAJED)", carrier: "Yang Ming", baseFreight: 1950, thc: 210, bunker: 160, pss: 100, inlandTrucking: 350, transit: "18-21 days", trend: "up", validUntil: "Mar 24, 2026" },
  { id: 18, region: "Arab", port: "Dammam, SA (SADMM)", carrier: "MSC", baseFreight: 2050, thc: 220, bunker: 170, pss: 100, inlandTrucking: 380, transit: "20-23 days", trend: "up", validUntil: "Mar 24, 2026" },
  { id: 19, region: "Arab", port: "Salalah, OM (OMSLL)", carrier: "Maersk", baseFreight: 1700, thc: 190, bunker: 140, pss: 0, inlandTrucking: 250, transit: "14-17 days", trend: "stable", validUntil: "Mar 24, 2026" },
  { id: 20, region: "Arab", port: "Aqaba, JO (JOAQJ)", carrier: "Hapag-Lloyd", baseFreight: 2100, thc: 230, bunker: 180, pss: 50, inlandTrucking: 400, transit: "19-22 days", trend: "stable", validUntil: "Mar 24, 2026" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const TrendBadge = ({ trend }: { trend: Rate["trend"] }) => {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
        <TrendingUp className="h-3.5 w-3.5" />
        Up
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <TrendingDown className="h-3.5 w-3.5" />
        Down
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
      <Minus className="h-3.5 w-3.5" />
      Stable
    </span>
  );
};

export default function MarketRadarPage() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [origin, setOrigin] = useState<(typeof origins)[number]>("Hai Phong");
  const [regionFilter, setRegionFilter] = useState<(typeof regionFilters)[number]>("All");
  const [equipment, setEquipment] = useState<(typeof equipmentOptions)[number]>("40ft HC");
  const [rates, setRates] = useState<Rate[]>(mockRates);
  const [isSyncing, setIsSyncing] = useState(false);
  const [updatedRateIds, setUpdatedRateIds] = useState<number[]>([]);
  const validityDate = rates[0]?.validUntil ?? "N/A";

  const getDestinationPortCode = (portText: string) => {
    const match = portText.match(/\(([A-Z]{5})\)/);
    return match?.[1] ?? "USLAX";
  };

  const getOriginPortCode = () => (origin === "Hai Phong" ? "VNHPH" : "VNSGN");

  const syncLiveRates = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const topVisibleRates = filteredRates.slice(0, 5);

    try {
      const results = await Promise.allSettled(
        topVisibleRates.map(async (rate) => {
          const response = await fetch("/api/freightos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              originPort: getOriginPortCode(),
              destinationPort: getDestinationPortCode(rate.port),
            }),
          });

          if (!response.ok) {
            throw new Error(`Freightos sync failed for lane ${rate.id}`);
          }

          const payload = (await response.json()) as { estimatedPrice?: number };
          const livePrice = Number(payload.estimatedPrice);

          if (!Number.isFinite(livePrice) || livePrice <= 0) {
            throw new Error(`Invalid live price for lane ${rate.id}`);
          }

          return { id: rate.id, livePrice };
        })
      );

      const updates = new Map<number, number>();
      for (const result of results) {
        if (result.status === "fulfilled") {
          updates.set(result.value.id, result.value.livePrice);
        }
      }

      if (updates.size > 0) {
        const updatedIds = Array.from(updates.keys());
        setRates((prev) =>
          prev.map((rate) =>
            updates.has(rate.id)
              ? {
                  ...rate,
                  baseFreight: updates.get(rate.id) ?? rate.baseFreight,
                }
              : rate
          )
        );
        setUpdatedRateIds(updatedIds);
        window.setTimeout(() => setUpdatedRateIds([]), 1200);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredRates = useMemo(() => {
    if (regionFilter === "All") return rates;
    return rates.filter((rate) => rate.region === regionFilter);
  }, [rates, regionFilter]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div className="min-w-0">
            <p className="text-lg font-bold text-blue-700">TBP Auto</p>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Link href="/" className="hover:text-slate-900">
                Home
              </Link>
              <span>/</span>
              <span className="font-medium text-slate-800">Market Radar</span>
            </div>
          </div>
          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href="/market-radar"
              className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700"
            >
              <Ship className="h-4 w-4" />
              Shipping &amp; Quoting
            </Link>
            <button
              type="button"
              disabled
              title="This module is currently under development."
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400"
            >
              <LayoutGrid className="h-4 w-4" />
              Apollo API
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">Soon</span>
            </button>
          </nav>
          <button
            type="button"
            onClick={() => setIsNavOpen((prev) => !prev)}
            className="rounded-md border border-slate-200 bg-white p-2 text-slate-700 md:hidden"
            aria-label="Toggle navigation menu"
          >
            {isNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {isNavOpen ? (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="flex flex-col gap-2">
              <Link
                href="/market-radar"
                onClick={() => setIsNavOpen(false)}
                className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700"
              >
                <Ship className="h-4 w-4" />
                Shipping &amp; Quoting
              </Link>
              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400"
              >
                <LayoutGrid className="h-4 w-4" />
                Apollo API (Coming Soon)
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <div className="mx-auto max-w-7xl space-y-6 p-4 pt-6 md:p-8">
        <header className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
                <Globe2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Global Freight Radar</h1>
                <p className="text-sm text-slate-500">
                  Track live lane estimates and compare destination markets.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
              </span>
              <span className="text-sm font-medium text-green-600">Live API Connected</span>
            </div>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center gap-2 text-slate-800">
            <Filter className="h-4 w-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">Control Panel</h2>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row">
            <label className="grid w-full gap-2 lg:flex-1">
              <span className="text-sm font-medium text-slate-600">Origin</span>
              <select
                value={origin}
                onChange={(event) => setOrigin(event.target.value as (typeof origins)[number])}
                className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none ring-blue-200 focus:ring-2"
              >
                {origins.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid w-full gap-2 lg:flex-1">
              <span className="text-sm font-medium text-slate-600">Destination Region</span>
              <select
                value={regionFilter}
                onChange={(event) => setRegionFilter(event.target.value as (typeof regionFilters)[number])}
                className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none ring-blue-200 focus:ring-2"
              >
                {regionFilters.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid w-full gap-2 lg:flex-1">
              <span className="text-sm font-medium text-slate-600">Equipment</span>
              <div className="relative">
                <Box className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  value={equipment}
                  onChange={(event) => setEquipment(event.target.value as (typeof equipmentOptions)[number])}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none ring-blue-200 focus:ring-2"
                >
                  {equipmentOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>
          <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
            <Ship className="h-3.5 w-3.5" />
            Origin: <span className="font-semibold text-slate-800">{origin}</span>
            <span className="text-slate-400">|</span>
            Equipment: <span className="font-semibold text-slate-800">{equipment}</span>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={syncLiveRates}
              disabled={isSyncing}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing Live Rates..." : "Refresh Live Rates"}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="text-base font-semibold text-slate-900">Cost Breakdown Comparison</h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                Rates valid until {validityDate}
              </span>
            </div>
            <p className="text-xs text-slate-500">{filteredRates.length} lanes</p>
          </div>

          <div className="space-y-3 lg:hidden">
            {filteredRates.map((rate) => {
              const total = rate.baseFreight + rate.thc + rate.bunker + rate.pss + rate.inlandTrucking;
              const isUpdated = updatedRateIds.includes(rate.id);
              const regionColor =
                rate.region === "US"
                  ? "bg-blue-50 text-blue-700 ring-blue-200"
                  : rate.region === "EU"
                    ? "bg-violet-50 text-violet-700 ring-violet-200"
                    : "bg-amber-50 text-amber-700 ring-amber-200";
              return (
                <div
                  key={rate.id}
                  className={`rounded-xl border p-4 shadow-sm transition-colors duration-700 ${
                    isUpdated ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{rate.port}</p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${regionColor}`}>
                        {rate.region}
                      </span>
                    </div>
                    <TrendBadge trend={rate.trend} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Base Freight</p>
                      <p className="font-medium text-slate-800">{formatCurrency(rate.baseFreight)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Inland</p>
                      <p className="font-medium text-slate-800">{formatCurrency(rate.inlandTrucking)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Carrier</p>
                      <p className="font-medium text-slate-800">{rate.carrier}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Transit</p>
                      <p className="font-medium text-slate-800">{rate.transit}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Total Est.</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(total)}</p>
                  </div>
                  <Link
                    href={`/market-radar/quote/${rate.id}?liveBaseFreight=${encodeURIComponent(rate.baseFreight)}`}
                    className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Create Quote
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="hidden max-h-[600px] overflow-auto rounded-xl border border-slate-200 lg:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 z-10 bg-white text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Destination Port</th>
                  <th className="px-4 py-3 text-right font-semibold">Base Freight</th>
                  <th className="px-4 py-3 text-right font-semibold">THC</th>
                  <th className="px-4 py-3 text-right font-semibold">Bunker</th>
                  <th className="px-4 py-3 text-right font-semibold text-orange-600">PSS</th>
                  <th className="px-4 py-3 text-right font-semibold">Est. Inland</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Est.</th>
                  <th className="px-4 py-3 text-center font-semibold">Trend</th>
                  <th className="px-4 py-3 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRates.map((rate) => {
                  const total = rate.baseFreight + rate.thc + rate.bunker + rate.pss + rate.inlandTrucking;
                  const isUpdated = updatedRateIds.includes(rate.id);
                  return (
                    <tr
                      key={rate.id}
                      className={`transition-colors duration-700 hover:bg-slate-50 ${
                        isUpdated ? "bg-emerald-50/60" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{rate.port}</p>
                        <p className="text-xs text-slate-500">
                          Transit: {rate.transit} | Carrier: <span className="font-semibold text-slate-700">{rate.carrier}</span>
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(rate.baseFreight)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(rate.thc)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(rate.bunker)}</td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          rate.pss > 0 ? "text-orange-600" : "text-slate-600"
                        }`}
                      >
                        {formatCurrency(rate.pss)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(rate.inlandTrucking)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(total)}</td>
                      <td className="px-4 py-3 text-center">
                        <TrendBadge trend={rate.trend} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/market-radar/quote/${rate.id}?liveBaseFreight=${encodeURIComponent(rate.baseFreight)}`}
                          className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          Create Quote
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 px-1 text-xs text-slate-400">
              * Rates shown are estimates. Click &quot;Create Quote&quot; for a live breakdown.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
