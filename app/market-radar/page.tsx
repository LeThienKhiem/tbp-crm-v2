"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Box,
  Calculator,
  FileText,
  Filter,
  Globe2,
  LayoutGrid,
  Menu,
  Ship,
  TrendingDown,
  TrendingUp,
  Minus,
  Users,
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
const customers = ["Truck Centers, Inc.", "Neobrake"] as const;
const products = ["16.5x7 Heavy Duty Brake Drum", "Hub Assembly"] as const;

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

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<Rate | null>(null);
  const [customer, setCustomer] = useState<(typeof customers)[number]>("Truck Centers, Inc.");
  const [product, setProduct] = useState<(typeof products)[number]>("16.5x7 Heavy Duty Brake Drum");
  const [quantity, setQuantity] = useState(1000);
  const [unitWeightLbs, setUnitWeightLbs] = useState(40);
  const [unitExwPrice, setUnitExwPrice] = useState(25);
  const [dutyRate, setDutyRate] = useState(2.5);
  const [targetMargin, setTargetMargin] = useState(20);
  const validityDate = mockRates[0]?.validUntil ?? "N/A";

  const filteredRates = useMemo(() => {
    if (regionFilter === "All") {
      return mockRates;
    }
    return mockRates.filter((rate) => rate.region === regionFilter);
  }, [regionFilter]);

  const totalWeight = quantity * unitWeightLbs;
  const containerPayloadLimit = 44000;
  const containersNeeded = Math.ceil(totalWeight / containerPayloadLimit);
  const singleContainerFreight = selectedRate
    ? selectedRate.baseFreight +
      selectedRate.thc +
      selectedRate.bunker +
      selectedRate.pss +
      selectedRate.inlandTrucking
    : 0;
  const totalFreightCost = singleContainerFreight * containersNeeded;
  const totalExwCost = quantity * unitExwPrice;
  const totalDuties = totalExwCost * (dutyRate / 100);
  const totalLandedCost = totalExwCost + totalFreightCost + totalDuties;
  const unitLandedCost = quantity > 0 ? totalLandedCost / quantity : 0;
  const finalSellingPrice =
    targetMargin < 100 ? totalLandedCost / (1 - targetMargin / 100) : 0;
  const unitSellingPrice = quantity > 0 ? finalSellingPrice / quantity : 0;

  const openQuoteModal = (rate: Rate) => {
    setSelectedRate(rate);
    setCustomer("Truck Centers, Inc.");
    setProduct("16.5x7 Heavy Duty Brake Drum");
    setQuantity(1000);
    setUnitWeightLbs(40);
    setUnitExwPrice(25);
    setDutyRate(2.5);
    setTargetMargin(20);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRate(null);
  };

  const handleSaveQuote = () => {
    if (!selectedRate) {
      return;
    }

    const now = new Date();
    const validityDate = new Date(now);
    validityDate.setDate(validityDate.getDate() + 30);
    const quoteId = `TBP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const unitSellingPriceText = formatCurrency(unitSellingPrice);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      return;
    }

    const printHtml = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${quoteId} - TBP Quotation</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-white text-slate-800">
    <main class="mx-auto w-full max-w-[210mm] p-4 sm:p-8 print:min-h-[297mm] print:p-8">
      <header class="border-b border-slate-200 pb-6">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">TBP</div>
            <h1 class="mt-3 text-xl font-bold text-slate-900">TBP Auto Manufacturing Co., Ltd.</h1>
            <p class="mt-1 text-sm text-slate-600">Hai Phong Industrial Zone, Vietnam</p>
            <p class="text-sm text-slate-600">sales@tbpauto.com | +84 22 5123 4567</p>
          </div>
          <div class="text-left sm:text-right">
            <h2 class="text-2xl font-bold tracking-wide text-blue-700">PROFORMA INVOICE / QUOTATION</h2>
            <p class="mt-3 text-sm text-slate-600"><span class="font-semibold text-slate-800">Quote No:</span> ${quoteId}</p>
            <p class="text-sm text-slate-600"><span class="font-semibold text-slate-800">Date:</span> ${formatDate(now)}</p>
            <p class="text-sm text-slate-600"><span class="font-semibold text-slate-800">Validity:</span> ${formatDate(validityDate)} (30 days)</p>
          </div>
        </div>
      </header>

      <section class="mt-6 rounded-lg border border-slate-200 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill To</p>
        <p class="mt-1 text-lg font-semibold text-slate-900">${customer}</p>
      </section>

      <section class="mt-6">
        <table class="w-full border-collapse overflow-hidden rounded-lg border border-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-slate-700">
            <tr>
              <th class="border-b border-slate-200 px-4 py-3">Description</th>
              <th class="border-b border-slate-200 px-4 py-3 text-right">Quantity</th>
              <th class="border-b border-slate-200 px-4 py-3 text-right">Unit Weight</th>
              <th class="border-b border-slate-200 px-4 py-3 text-right">Unit Selling Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="px-4 py-3">
                <p class="font-semibold text-slate-900">${product}</p>
                <p class="text-xs text-slate-500">Delivery: DDP US Door (${selectedRate.port})</p>
              </td>
              <td class="px-4 py-3 text-right">${quantity.toLocaleString()}</td>
              <td class="px-4 py-3 text-right">${unitWeightLbs} lbs</td>
              <td class="px-4 py-3 text-right font-semibold text-slate-900">${unitSellingPriceText}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="mt-6 flex justify-end">
        <div class="w-full max-w-md rounded-lg border border-slate-200 p-4">
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Summary</h3>
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-slate-600">Subtotal (Product only)</span>
              <span class="font-medium text-slate-900">${formatCurrency(totalExwCost)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600">Shipping & Logistics</span>
              <span class="font-medium text-slate-900">${formatCurrency(totalFreightCost)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600">US Duties & Fees</span>
              <span class="font-medium text-slate-900">${formatCurrency(totalDuties)}</span>
            </div>
            <div class="border-t border-slate-200 pt-2 text-base">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-800">Grand Total (DDP US Door)</span>
                <span class="font-bold text-blue-700">${formatCurrency(finalSellingPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer class="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600">
        <p><span class="font-semibold text-slate-800">Terms & Conditions:</span> Incoterms: DDP, Payment: T/T, Lead time: 45 days.</p>
        <div class="mt-10 flex justify-end">
          <div class="w-64 border-t border-slate-400 pt-2 text-center text-sm text-slate-700">Authorized Signature</div>
        </div>
      </footer>
    </main>

    <script>
      window.onload = function () {
        setTimeout(function () { window.print(); }, 300);
      };
    </script>
  </body>
</html>
`;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();

    console.log("Generated Quote Payload", {
      customer,
      product,
      origin,
      destination: selectedRate.port,
      region: selectedRate.region,
      equipment,
      quantity,
      unitWeightLbs,
      unitExwPrice,
      dutyRate,
      targetMargin,
      carrier: selectedRate.carrier,
      transit: selectedRate.transit,
      containersNeeded,
      singleContainerFreight,
      totalFreightCost,
      totalExwCost,
      totalDuties,
      totalLandedCost,
      finalSellingPrice,
      unitLandedCost,
      unitSellingPrice,
    });

    closeModal();
  };

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
                onChange={(event) =>
                  setRegionFilter(event.target.value as (typeof regionFilters)[number])
                }
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
                  onChange={(event) =>
                    setEquipment(event.target.value as (typeof equipmentOptions)[number])
                  }
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
              const total =
                rate.baseFreight + rate.thc + rate.bunker + rate.pss + rate.inlandTrucking;
              const regionColor =
                rate.region === "US"
                  ? "bg-blue-50 text-blue-700 ring-blue-200"
                  : rate.region === "EU"
                    ? "bg-violet-50 text-violet-700 ring-violet-200"
                    : "bg-amber-50 text-amber-700 ring-amber-200";

              return (
                <div key={rate.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{rate.port}</p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${regionColor}`}
                      >
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

                  <button
                    type="button"
                    onClick={() => openQuoteModal(rate)}
                    className="mt-4 min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Create Quote
                  </button>
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
                  const total =
                    rate.baseFreight + rate.thc + rate.bunker + rate.pss + rate.inlandTrucking;
                  return (
                    <tr key={rate.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{rate.port}</p>
                        <p className="text-xs text-slate-500">
                          Transit: {rate.transit} | Carrier:{" "}
                          <span className="font-semibold text-slate-700">{rate.carrier}</span>
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(rate.baseFreight)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(rate.thc)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(rate.bunker)}</td>
                      <td className="px-4 py-3 text-right font-medium text-orange-600">
                        {formatCurrency(rate.pss)}
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(rate.inlandTrucking)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <TrendBadge trend={rate.trend} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => openQuoteModal(rate)}
                          className="min-h-[36px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          Create Quote
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isModalOpen && selectedRate ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-2 sm:p-4">
          <div className="mt-2 w-[95%] max-h-[90vh] max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl sm:mt-6 sm:w-full">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Create B2B Product Quote (DDP to US Door)
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
              <div className="space-y-4 rounded-lg bg-slate-50 p-4 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Order & Cargo Specs
                </p>
                <label className="grid gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                    <Users className="h-4 w-4" />
                    Customer
                  </span>
                  <select
                    value={customer}
                    onChange={(event) => setCustomer(event.target.value as (typeof customers)[number])}
                    className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {customers.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-600">Product</span>
                  <select
                    value={product}
                    onChange={(event) => setProduct(event.target.value as (typeof products)[number])}
                    className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {products.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-600">Quantity (pieces)</span>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value) || 0)}
                    className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-600">Unit EXW Price ($)</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={unitExwPrice}
                      onChange={(event) => setUnitExwPrice(Number(event.target.value) || 0)}
                      className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-600">Unit Weight (lbs)</span>
                    <input
                      type="number"
                      min={0}
                      value={unitWeightLbs}
                      onChange={(event) => setUnitWeightLbs(Number(event.target.value) || 0)}
                      className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                </div>
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-blue-800">
                  Total Weight: {totalWeight.toLocaleString()} lbs. Requires {containersNeeded}x
                  Containers (Max 44k lbs/cont).
                </div>
              </div>

              <div className="space-y-4 p-2">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-3 inline-flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-slate-600" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      True Landed Cost (Internal)
                    </p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Product Cost (EXW)</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(totalExwCost)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-800">US Import Duties</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          value={dutyRate}
                          onChange={(event) => setDutyRate(Number(event.target.value) || 0)}
                          className="min-h-[44px] w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-slate-700">%</span>
                      </div>
                      <span className="font-semibold text-slate-900">{formatCurrency(totalDuties)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-slate-600">
                        Total Freight{" "}
                        <span className="text-xs text-slate-500">
                          ({containersNeeded} cont. x {formatCurrency(singleContainerFreight)})
                        </span>
                      </div>
                      <span className="font-semibold text-slate-900">{formatCurrency(totalFreightCost)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">Total Landed Cost</span>
                        <span className="text-lg font-bold text-slate-800">
                          {formatCurrency(totalLandedCost)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        Unit Landed Cost: {formatCurrency(unitLandedCost)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Customer Pricing (External)
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">Target Margin</span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      step="0.1"
                      value={targetMargin}
                      onChange={(event) => setTargetMargin(Number(event.target.value) || 0)}
                      className="min-h-[44px] w-24 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">%</span>
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Final Selling Price
                  </p>
                  <p className="text-4xl font-bold text-blue-600">{formatCurrency(finalSellingPrice)}</p>
                  <p className="mt-2 text-2xl font-semibold text-blue-600">
                    {formatCurrency(unitSellingPrice)} / drum
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                className="min-h-[44px] w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuote}
                className="min-h-[44px] w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
              >
                Save &amp; Generate Quote
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
